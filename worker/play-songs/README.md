# FORTISSIMO Play Songs worker

GPU worker for the Play Songs processing queue.

## Current baseline

The first engine deliberately optimizes for getting the complete pipeline working before claiming final Hi-Fi quality.

- Runtime wrapper: `audio-separator` 0.44.5
- Baseline model: `htdemucs_6s.yaml`
- Model outputs: Vocals, Drums, Bass, Other, Guitar, Piano
- FORTISSIMO outputs:
  - `drums` = model Drums
  - `bass` = model Bass
  - `guitars` = model Guitar
  - `other` = model Vocals + Piano + Other
- Delivery format: stereo 24-bit PCM WAV at model-native 44.1 kHz
- Output bucket: `play-songs-stems`

The model choice is intentionally controlled by `FORTISSIMO_MODEL` and the DB records a `processing_version`. That lets us A/B a better guitar/bass ensemble later without changing the Play Songs UI or storage contract.

## Queue lifecycle

1. The web app uploads an original to private `play-songs-originals` storage.
2. `fortissimo_play_song_mark_uploaded` creates a `play_song_jobs` row.
3. A worker atomically claims one queued row with `FOR UPDATE SKIP LOCKED`.
4. The worker downloads the private original with its server-side service role.
5. The model separates the song.
6. The worker uploads four private stems under:
   `ACCOUNT_ID/SONG_ID/ENGINE_VERSION/{drums,bass,guitars,other}.wav`
7. `fortissimo_play_song_worker_complete` commits all four stem metadata rows and marks the song `ready`.
8. The existing Edge Function gives the logged-in app temporary signed URLs.

A heartbeat refreshes the job lock while inference is active. Failed workers can be retried; abandoned locks are recycled automatically.

## Required secrets

Copy `.env.example` into your GPU provider's secret/environment settings. Never expose the service-role key in the browser or commit it to GitHub.

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run on a CUDA Docker host

From this directory:

```bash
docker build -t fortissimo-play-songs-worker .
docker run --rm --gpus all \
  --env-file .env \
  -v fortissimo-models:/models \
  fortissimo-play-songs-worker
```

The persistent `/models` volume avoids downloading a large separation model on every cold start.

To only warm/download the model:

```bash
docker run --rm --gpus all \
  --env-file .env \
  -v fortissimo-models:/models \
  fortissimo-play-songs-worker python /app/worker.py --warm-model
```

To process at most one queued song and exit:

```bash
docker run --rm --gpus all \
  --env-file .env \
  -v fortissimo-models:/models \
  fortissimo-play-songs-worker python /app/worker.py --once
```

## Quality roadmap

`htdemucs_6s` is the baseline because it gives Guitar and Piano separately, which is essential to FORTISSIMO's practice use-case. It is not being labeled as the final Hi-Fi engine.

After end-to-end verification, evaluate the same reference songs against:

1. Baseline Demucs 6-stem.
2. Specialist bass/drum models.
3. BS/Mel-Band RoFormer and SCNet candidates.
4. An ensemble/residual strategy aimed specifically at removing guitar from keys and removing bass bleed.

Keep a fixed evaluation set and increment `FORTISSIMO_ENGINE_VERSION` for every candidate so old stems remain reproducible during A/B tests.

## Chords

The queue/database already accepts timestamped chord records, and the browser player already follows them. This baseline worker deliberately returns an empty chord list until a chord detector is selected and evaluated; it does not generate fake chord data.
