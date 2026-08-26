FROM beveradb/audio-separator:gpu

USER root
WORKDIR /app

# The upstream GPU image already contains the CUDA/PyTorch runtime. Reinstalling
# audio-separator with dependencies can accidentally replace GPU PyTorch with a
# CPU wheel, so pin the package code with --no-deps and install only our client.
RUN python -m pip install --no-cache-dir --no-deps "audio-separator==0.44.5" \
    && python -m pip install --no-cache-dir "supabase==2.31.0" \
    && python -c "import importlib.metadata as m; assert m.version('audio-separator') == '0.44.5'; assert m.version('supabase') == '2.31.0'" \
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
