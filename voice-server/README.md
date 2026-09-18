# Sulti Voice Server

Meta SeamlessM4T v2 + Spirit LM integration for speech-to-speech translation.

## Features

- **SeamlessM4T v2**: All-in-one speech-to-speech, speech-to-text, text-to-speech, and text-to-text translation
- **Multi-language support**: Bisaya/Cebuano, Tagalog/Filipino, English (100 input languages, 36 output languages)
- **Auto language detection**: Automatically detects input language
- **Code-switching support**: Handles mixed languages like Taglish
- **Future Spirit LM integration**: Expressive speech with emotion preservation

## Requirements

- Python 3.9+
- CUDA-capable GPU (12GB+ VRAM for large model)
- 16GB+ RAM recommended

## Installation

### Linux/Mac (Recommended)
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

2. Install base dependencies:
```bash
pip install -r requirements.txt
```

3. Install Seamless Communication from GitHub (required - no PyPI package available):
```bash
pip install git+https://github.com/facebookresearch/seamless_communication.git
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

### Windows
**⚠️ Windows Compatibility Warning**: Seamless Communication has known compatibility issues on native Windows due to `fairseq2n` dependency conflicts.

**Recommended**: Use WSL2 (Windows Subsystem for Linux) or deploy on a Linux GPU server.

**Options**:
1. **WSL2** (Recommended): See `WINDOWS_SETUP.md` for WSL2 installation
2. **Linux GPU Server**: See `DEPLOYMENT.md` for production deployment
3. **Native Windows**: May work but requires troubleshooting - see `WINDOWS_SETUP.md`

The server will run in "demo mode" on Windows if Seamless Communication cannot be installed.

## Running the Server

Development:
```bash
python main.py
```

Production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

## API Endpoints

### Health Check
```
GET /health
```

### Model Information
```
GET /models
```

### Speech-to-Speech
```
POST /speech-to-speech
Content-Type: application/json

{
  "audio_base64": "base64_encoded_wav_audio",
  "source_lang": "auto",  // auto, ceb, tl, en
  "target_lang": "en",    // en, ceb, tl
  "task": "S2ST"          // S2ST, S2TT, T2ST
}
```

### Speech-to-Text
```
POST /speech-to-text
Content-Type: application/json

{
  "audio_base64": "base64_encoded_wav_audio",
  "source_lang": "auto"
}
```

### Text-to-Speech
```
POST /text-to-speech
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "target_lang": "en"
}
```

### Transcribe and Translate
```
POST /transcribe-and-translate
Content-Type: multipart/form-data

audio_base64: base64_encoded_wav_audio
source_lang: auto
target_lang: en
```

## Language Codes

- `auto` - Auto-detect
- `ceb` / `bisaya` / `cebuano` - Cebuano/Bisaya
- `tl` / `tagalog` / `fil` - Tagalog/Filipino
- `en` / `english` - English

## Model Sizes

- `seamlessM4T_v2_large` - Best quality, requires 12GB+ VRAM
- `seamlessM4T_v2_medium` - Balanced, requires 8GB+ VRAM
- `seamlessM4T_v2_small` - Fastest, requires 4GB+ VRAM

## Deployment on GPU Server

1. Ensure GPU drivers and CUDA are installed
2. Install PyTorch with CUDA support:
```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```
3. Set `SEAMLESS_DEVICE=cuda` in `.env`
4. Run with systemd or Docker for production

## Future: Spirit LM Integration

Spirit LM is Meta's newest model for expressive speech-to-speech that freely mixes text and speech. It uses phonetic, pitch and tone tokens to preserve emotion in speech.

### Current Status
- **SeamlessM4T v2**: ✅ Fully implemented and production-ready
- **Spirit LM**: 🚧 Infrastructure in place, awaiting public release

### What Spirit LM Will Enable
- **Emotional Expression**: Generate speech with anger, surprise, happiness, sadness
- **Natural Speech**: More human-like conversational flow
- **Sulti Alignment**: Match Sulti's avatar emotional states (thinking, error, speaking)

### Implementation Plan
When Spirit LM becomes publicly available:
1. Uncomment Spirit LM dependencies in `requirements.txt`
2. Set `SPIRITLM_ENABLED=true` in `.env`
3. Configure `SPIRITLM_MODEL` path
4. The server will automatically use Spirit LM for expressive TTS

### Current Solution
Until Spirit LM is available, the server uses SeamlessM4T's built-in TTS, which provides:
- High-quality speech synthesis
- Multi-language support
- Fast inference
- Good fallback chain with existing TTS providers

The infrastructure is ready for Spirit LM integration when it becomes available.
