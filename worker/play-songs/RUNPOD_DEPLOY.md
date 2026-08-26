# FORTISSIMO Play Songs — RunPod Serverless

Use this deployment when enabling the production stem processor.

## Source

- Repository: `eduardoserranow-oss/sala-de-ensayo`
- Branch: `main`
- Dockerfile path: `worker/play-songs/Dockerfile.runpod`
- Handler: `worker/play-songs/runpod_handler.py`

RunPod can build directly from the GitHub repository; no Docker Hub image is required.

## Endpoint

Create a **Queue** Serverless endpoint. Start with a 24 GB GPU class (L4/A5000/3090) for the baseline and raise VRAM only if model benchmarking requires it.

Recommended initial settings:

- Flex workers: scale to zero
- Active workers: 0
- Max workers: 1 while validating quality/cost
- Execution timeout: at least 60 minutes

## Server-only environment variables

Set these inside RunPod. Never commit their real values and never expose them to browser code.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FORTISSIMO_WORKER_ID=runpod-serverless`
- `FORTISSIMO_MODEL=htdemucs_6s.yaml`
- `FORTISSIMO_ENGINE_VERSION=baseline-demucs6s-btc-arrangement-v1`

## Supabase Edge Function secrets

Set these on the FORTISSIMO Supabase project so `play-songs-api` can dispatch the worker after an upload:

- `RUNPOD_ENDPOINT_ID`
- `RUNPOD_API_KEY`

The Edge Function sends only `{ maxJobs }` to RunPod. The private audio stays in Supabase Storage and is downloaded by the GPU worker using the server-only service role.

## Existing queued songs

After the endpoint and both Edge Function secrets are configured, call the authenticated Play Songs Edge Function action:

```json
{"action":"kick-processing","maxJobs":4}
```

This consumes songs that were uploaded before the GPU endpoint existed.

## Expected lifecycle

`queued` → RunPod request → worker claim → `processing` → chord analysis → stem separation → upload 4 stems → `ready`.

The web UI remains locked while the song is not `ready`, polls the library, verifies all four signed stem URLs exist, and enables the song automatically when processing completes.
