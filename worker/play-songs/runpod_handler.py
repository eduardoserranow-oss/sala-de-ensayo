#!/usr/bin/env python3
"""RunPod Serverless entrypoint for FORTISSIMO Play Songs.

The request body stays tiny: the worker claims queued jobs from Supabase and
pulls the private original with the server-only service-role key configured in
RunPod. Audio is never sent through the RunPod request payload.
"""

from __future__ import annotations

import os
from typing import Any

import runpod

from worker import PlaySongsWorker

_worker: PlaySongsWorker | None = None


def get_worker() -> PlaySongsWorker:
    global _worker
    if _worker is None:
        _worker = PlaySongsWorker()
    return _worker


def handler(event: dict[str, Any]) -> dict[str, Any]:
    payload = event.get("input") or {}
    try:
        requested = int(payload.get("maxJobs", 1))
    except (TypeError, ValueError):
        requested = 1
    max_jobs = max(1, min(4, requested))

    worker = get_worker()
    claimed: list[dict[str, str]] = []

    for _ in range(max_jobs):
        job = worker.claim()
        if not job:
            break
        claimed.append({
            "jobId": str(job.get("id") or ""),
            "songId": str(job.get("songId") or ""),
        })
        worker.process(job)

    return {
        "ok": True,
        "workerId": os.environ.get("FORTISSIMO_WORKER_ID", "runpod-serverless"),
        "claimed": len(claimed),
        "jobs": claimed,
    }


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
