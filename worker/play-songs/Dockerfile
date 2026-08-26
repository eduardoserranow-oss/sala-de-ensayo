FROM beveradb/audio-separator:gpu

USER root
WORKDIR /app

# Keep the CUDA/PyTorch runtime from the upstream GPU image. Install the
# separator package itself without dependencies, then add only the libraries
# required by FORTISSIMO and the chord-analysis pipeline.
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir --no-deps "audio-separator==0.44.5" \
    && python -m pip install --no-cache-dir \
      "supabase==2.31.0" \
      "librosa>=0.10.0,<0.12" \
      "scipy>=1.10,<2" \
      "hmmlearn>=0.3,<0.4" \
      "mir_eval>=0.7,<1" \
      "pydub>=0.25,<0.26" \
      "soundfile>=0.12,<0.14" \
      "tqdm>=4.65,<5" \
    && python -c "import importlib.metadata as m; assert m.version('audio-separator') == '0.44.5'; assert m.version('supabase') == '2.31.0'" \
    && audio-separator --env_info

# Pin the BTC chord engine source so inference behavior does not change behind
# our backs. The engine and original BTC code are MIT licensed. Model weights
# are fetched by the engine on first use from the upstream BTC repository.
ARG CHORD_ENGINE_COMMIT=df2c526a82b5a3df0bb9c8fbf36d4de4d659b520
RUN python -c "import os,pathlib,shutil,tarfile,urllib.request; commit=os.environ.get('CHORD_ENGINE_COMMIT','df2c526a82b5a3df0bb9c8fbf36d4de4d659b520'); archive='/tmp/chord-engine.tgz'; extract=pathlib.Path('/tmp/chord-engine-src'); urllib.request.urlretrieve('https://github.com/Jeremyszs/chord-engine/archive/'+commit+'.tar.gz',archive); extract.mkdir(parents=True,exist_ok=True); tarfile.open(archive).extractall(extract); src=next(extract.iterdir()); pathlib.Path('/opt').mkdir(parents=True,exist_ok=True); shutil.move(str(src),'/opt/chord-engine')"

COPY worker.py /app/worker.py
RUN mkdir -p /models /tmp/fortissimo-play-songs

ENV PYTHONUNBUFFERED=1 \
    FORTISSIMO_MODEL_DIR=/models \
    FORTISSIMO_WORK_ROOT=/tmp/fortissimo-play-songs \
    FORTISSIMO_MODEL=htdemucs_6s.yaml \
    FORTISSIMO_SAMPLE_RATE=44100 \
    FORTISSIMO_WAVEFORM_POINTS=1200 \
    FORTISSIMO_CHORD_ENGINE_DIR=/opt/chord-engine \
    FORTISSIMO_CHORD_DEVICE=cuda \
    FORTISSIMO_STALE_AFTER_MINUTES=120

CMD ["python", "/app/worker.py"]
