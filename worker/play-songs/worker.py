#!/usr/bin/env python3
"""FORTISSIMO Play Songs GPU worker.

Claims queued songs from Supabase, separates six model stems with Demucs 6s,
folds Vocals + Piano + model Other into FORTISSIMO's `other` channel, uploads
four lossless WAV stems, then marks the song ready.

This is a baseline engine, not the final Hi-Fi model. The storage contract is
stable so later bass/guitar specialist models can replace the baseline without
changing the Play Songs web UI.
"""

from __future__ import annotations

import argparse
import contextlib
import logging
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from audio_separator.separator import Separator
from supabase import Client, create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
WORKER_ID = os.environ.get("FORTISSIMO_WORKER_ID", f"gpu-{uuid.uuid4().hex[:10]}")
MODEL_FILENAME = os.environ.get("FORTISSIMO_MODEL", "htdemucs_6s.yaml")
MODEL_DIR = Path(os.environ.get("FORTISSIMO_MODEL_DIR", "/models"))
WORK_ROOT = Path(os.environ.get("FORTISSIMO_WORK_ROOT", "/tmp/fortissimo-play-songs"))
SAMPLE_RATE = int(os.environ.get("FORTISSIMO_SAMPLE_RATE", "44100"))
POLL_SECONDS = max(2.0, float(os.environ.get("FORTISSIMO_POLL_SECONDS", "8")))
HEARTBEAT_SECONDS = max(30.0, float(os.environ.get("FORTISSIMO_HEARTBEAT_SECONDS", "120")))
STALE_AFTER_MINUTES = max(10, min(240, int(os.environ.get("FORTISSIMO_STALE_AFTER_MINUTES", "120"))))
OUTPUT_BUCKET = "play-songs-stems"
ENGINE_VERSION = os.environ.get(
    "FORTISSIMO_ENGINE_VERSION",
    "baseline-demucs6s-audio-separator-0.44.5",
)
LOG_LEVEL_NAME = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME, logging.INFO)

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("fortissimo.play_songs.worker")


class WorkerError(RuntimeError):
    pass


def require_environment() -> None:
    missing = [
        name
        for name, value in (
            ("SUPABASE_URL", SUPABASE_URL),
            ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
        )
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing required environment variables: {', '.join(missing)}")
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise SystemExit("ffmpeg and ffprobe must be installed in the worker image")


def rpc(client: Client, name: str, payload: dict[str, Any]) -> Any:
    return client.rpc(name, payload).execute().data


def run(command: list[str]) -> None:
    log.debug("Running: %s", " ".join(command))
    completed = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise WorkerError(
            f"Command failed ({completed.returncode}): {completed.stderr[-4000:]}"
        )


def duration_seconds(path: Path) -> float | None:
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        return None
    try:
        value = float(completed.stdout.strip())
        return round(value, 3) if value >= 0 else None
    except ValueError:
        return None


def normalize_lossless(source: Path, destination: Path) -> None:
    """Change container/bit depth only; never loudness-normalize or alter gain."""
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-map_metadata",
            "-1",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "2",
            "-c:a",
            "pcm_s24le",
            str(destination),
        ]
    )


def combine_other(vocals: Path, piano: Path, model_other: Path, destination: Path) -> None:
    """Create FORTISSIMO Other = Vocals + Piano + Demucs Other."""
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(vocals),
            "-i",
            str(piano),
            "-i",
            str(model_other),
            "-filter_complex",
            "[0:a][1:a][2:a]amix=inputs=3:normalize=0:dropout_transition=0[m]",
            "-map",
            "[m]",
            "-map_metadata",
            "-1",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "2",
            "-c:a",
            "pcm_s24le",
            str(destination),
        ]
    )


def find_named_output(output_dir: Path, stem_name: str) -> Path:
    files = [p for p in output_dir.iterdir() if p.is_file()]
    exact = [p for p in files if p.stem.lower() == stem_name.lower()]
    if exact:
        return exact[0]
    fuzzy = [p for p in files if stem_name.lower() in p.stem.lower()]
    if fuzzy:
        return fuzzy[0]
    raise WorkerError(f"Separator did not create expected stem: {stem_name}")


class Heartbeat:
    def __init__(self, client: Client, job_id: str):
        self.client = client
        self.job_id = job_id
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)

    def __enter__(self) -> "Heartbeat":
        result = rpc(
            self.client,
            "fortissimo_play_song_worker_mark_processing",
            {"p_job_id": self.job_id},
        )
        if not result or not result.get("ok"):
            raise WorkerError(f"Could not mark job processing: {result}")
        self.thread.start()
        return self

    def _loop(self) -> None:
        while not self.stop_event.wait(HEARTBEAT_SECONDS):
            try:
                rpc(
                    self.client,
                    "fortissimo_play_song_worker_mark_processing",
                    {"p_job_id": self.job_id},
                )
            except Exception:
                log.exception("Heartbeat failed for job %s", self.job_id)

    def __exit__(self, exc_type, exc, tb) -> None:
        self.stop_event.set()
        self.thread.join(timeout=3)


class PlaySongsWorker:
    def __init__(self) -> None:
        require_environment()
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        self.client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        self.separator: Separator | None = None

    def warm_model(self) -> None:
        if self.separator is not None:
            return
        log.info("Loading separation model %s", MODEL_FILENAME)
        staging = WORK_ROOT / "model-warmup-output"
        staging.mkdir(parents=True, exist_ok=True)
        separator = Separator(
            log_level=LOG_LEVEL,
            model_file_dir=str(MODEL_DIR),
            output_dir=str(staging),
            output_format="WAV",
            # Do not independently attenuate stems at the library's default
            # 0.9 threshold; keeping unity is important for mixture consistency.
            normalization_threshold=1.0,
            amplification_threshold=0.0,
            sample_rate=SAMPLE_RATE,
        )
        separator.load_model(model_filename=MODEL_FILENAME)
        self.separator = separator
        log.info("Model ready")

    def claim(self) -> dict[str, Any] | None:
        data = rpc(
            self.client,
            "fortissimo_play_song_worker_claim",
            {
                "p_worker_id": WORKER_ID,
                "p_stale_after_minutes": STALE_AFTER_MINUTES,
            },
        )
        if not data or not data.get("ok"):
            raise WorkerError(f"Claim RPC failed: {data}")
        return data.get("job")

    def process(self, job: dict[str, Any]) -> None:
        job_id = str(job["id"])
        song_id = str(job["songId"])
        account_id = str(job["accountId"])
        original_bucket = str(job.get("originalBucket") or "play-songs-originals")
        original_path = str(job.get("originalPath") or "")
        if not original_path:
            self.fail(job_id, "Song has no original audio path", retry=False)
            return

        log.info("Processing job=%s song=%s title=%r", job_id, song_id, job.get("title"))
        try:
            with tempfile.TemporaryDirectory(
                prefix=f"ps-{song_id[:8]}-", dir=str(WORK_ROOT)
            ) as tmp:
                root = Path(tmp)
                input_path = root / (Path(original_path).name or "original.audio")
                raw = self.client.storage.from_(original_bucket).download(original_path)
                input_path.write_bytes(raw)

                with Heartbeat(self.client, job_id):
                    final_stems = self.separate(input_path, root)
                    uploaded = self.upload_stems(account_id, song_id, final_stems)

                    # Chord analysis is intentionally a separate quality step.
                    # Empty chords are valid and the browser already handles it.
                    completed = rpc(
                        self.client,
                        "fortissimo_play_song_worker_complete",
                        {
                            "p_job_id": job_id,
                            "p_processing_version": ENGINE_VERSION,
                            "p_stems": uploaded,
                            "p_chords": [],
                        },
                    )
                    if not completed or not completed.get("ok"):
                        raise WorkerError(f"Complete RPC failed: {completed}")
            log.info("Song ready song=%s", song_id)
        except Exception as exc:
            log.exception("Job failed job=%s", job_id)
            with contextlib.suppress(Exception):
                self.fail(job_id, f"{type(exc).__name__}: {exc}", retry=True)

    def separate(self, input_path: Path, root: Path) -> dict[str, Path]:
        self.warm_model()
        assert self.separator is not None

        output_dir = root / "model"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Separator copies output_dir into the architecture instance at model
        # load time, so update both when reusing one GPU-loaded model.
        self.separator.output_dir = str(output_dir)
        if self.separator.model_instance is not None:
            self.separator.model_instance.output_dir = str(output_dir)

        produced = self.separator.separate(
            str(input_path),
            {
                "Vocals": "vocals",
                "Drums": "drums_model",
                "Bass": "bass_model",
                "Other": "other_model",
                "Guitar": "guitars_model",
                "Piano": "piano",
            },
        )
        if not produced:
            raise WorkerError("Separation produced no output files")

        model = {
            key: find_named_output(output_dir, name)
            for key, name in {
                "vocals": "vocals",
                "drums": "drums_model",
                "bass": "bass_model",
                "model_other": "other_model",
                "guitars": "guitars_model",
                "piano": "piano",
            }.items()
        }

        final_dir = root / "final"
        final_dir.mkdir(parents=True, exist_ok=True)
        final = {
            "drums": final_dir / "drums.wav",
            "bass": final_dir / "bass.wav",
            "guitars": final_dir / "guitars.wav",
            "other": final_dir / "other.wav",
        }
        normalize_lossless(model["drums"], final["drums"])
        normalize_lossless(model["bass"], final["bass"])
        normalize_lossless(model["guitars"], final["guitars"])
        combine_other(
            model["vocals"],
            model["piano"],
            model["model_other"],
            final["other"],
        )
        return final

    def upload_stems(
        self,
        account_id: str,
        song_id: str,
        stems: dict[str, Path],
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        bucket = self.client.storage.from_(OUTPUT_BUCKET)
        for stem_type in ("drums", "bass", "guitars", "other"):
            path = stems[stem_type]
            object_path = (
                f"{account_id}/{song_id}/{ENGINE_VERSION}/{stem_type}.wav"
            )
            with path.open("rb") as file_handle:
                bucket.upload(
                    path=object_path,
                    file=file_handle,
                    file_options={
                        "cache-control": "31536000",
                        "upsert": "true",
                        "content-type": "audio/wav",
                    },
                )
            payload[stem_type] = {
                "bucket": OUTPUT_BUCKET,
                "path": object_path,
                "codec": "pcm_s24le",
                "sampleRate": SAMPLE_RATE,
                "bitDepth": 24,
                "durationSeconds": duration_seconds(path),
            }
        return payload

    def fail(self, job_id: str, message: str, retry: bool = True) -> None:
        result = rpc(
            self.client,
            "fortissimo_play_song_worker_fail",
            {
                "p_job_id": job_id,
                "p_error_message": message[:1000],
                "p_retry": retry,
            },
        )
        log.warning("Marked job failed/retry: %s", result)

    def run_once(self) -> bool:
        job = self.claim()
        if not job:
            return False
        self.process(job)
        return True

    def run_forever(self) -> None:
        self.warm_model()
        log.info("FORTISSIMO worker online id=%s", WORKER_ID)
        while True:
            try:
                if not self.run_once():
                    time.sleep(POLL_SECONDS)
            except KeyboardInterrupt:
                raise
            except Exception:
                log.exception("Worker loop error")
                time.sleep(POLL_SECONDS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--once",
        action="store_true",
        help="Claim at most one job then exit",
    )
    parser.add_argument(
        "--warm-model",
        action="store_true",
        help="Download/load the configured model then exit",
    )
    args = parser.parse_args()

    worker = PlaySongsWorker()
    if args.warm_model:
        worker.warm_model()
        return
    if args.once:
        worker.run_once()
        return
    worker.run_forever()


if __name__ == "__main__":
    main()
