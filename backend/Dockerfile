FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    XDG_CACHE_HOME=/tmp \
    HF_HOME=/tmp \
    DEMUCS_CACHE=/tmp/demucs

WORKDIR /app

# ffmpeg (yt-dlp/demucs), libsndfile (soundfile/librosa), git (demucs baixa modelos)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 git build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip wheel \
 && pip install --index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1+cpu torchaudio==2.3.1+cpu \
 && pip install -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["bash","-lc","python - <<'PY'\nimport os\nos.environ.setdefault('UPLOAD_DIR','/tmp/uploads')\nos.environ.setdefault('OUTPUT_DIR','/tmp/outputs')\nfrom main import app\nimport uvicorn\nuvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT',8080)))\nPY"]
