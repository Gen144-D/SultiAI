# SultiAI Pronunciation Scoring Service
# Acoustic analysis (librosa MFCC + Parselmouth/Praat pitch & formants).
FROM python:3.11-slim

WORKDIR /app

# ffmpeg is required by pydub to decode M4A/MP3 recordings; libsndfile1 is
# required by librosa/soundfile for WAV/FLAC decoding.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
