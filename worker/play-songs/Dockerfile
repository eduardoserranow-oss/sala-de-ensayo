FROM beveradb/audio-separator:gpu

USER root
WORKDIR /app

# Keep the worker dependencies reproducible even if the base image moves.
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade --force-reinstall -r /app/requirements.txt \
    && audio-separator --env_info

COPY worker.py /app/worker.py
RUN mkdir -p /models /tmp/fortissimo-play-songs

ENV PYTHONUNBUFFERED=1 \
    FORTISSIMO_MODEL_DIR=/models \
    FORTISSIMO_WORK_ROOT=/tmp/fortissimo-play-songs \
    FORTISSIMO_MODEL=htdemucs_6s.yaml \
    FORTISSIMO_SAMPLE_RATE=44100 \
    FORTISSIMO_STALE_AFTER_MINUTES=120

CMD ["python", "/app/worker.py"]
