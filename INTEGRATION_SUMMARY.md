# Meta Voice Integration Summary

## Overview

Successfully integrated Meta's SeamlessM4T v2 (with infrastructure for Spirit LM) into Sulti's voice tutor screen. The integration provides advanced speech-to-speech capabilities with translation support for Bisaya/Tagalog/Cebuano to English and vice versa.

## What Was Implemented

### 1. Python Voice Server (`voice-server/`)
- **FastAPI server** with SeamlessM4T v2 integration
- **API endpoints**:
  - `/health` - Health check and model status
  - `/models` - Model information
  - `/speech-to-speech` - Direct speech-to-speech translation
  - `/speech-to-text` - Speech transcription
  - `/text-to-speech` - Text-to-speech synthesis
  - `/transcribe-and-translate` - Combined transcription and translation
- **Multi-language support**: Bisaya/Cebuano, Tagalog/Filipino, English
- **Auto language detection** with code-switching support (Taglish)
- **Spirit LM infrastructure** ready for future expressive TTS

### 2. Backend Integration (`server/`)
- **New service**: `metaVoiceService.ts` - Proxy to Python voice server
- **Updated routes**: `voice.routes.ts` - Added Meta Voice endpoints
- **Health checks**: Integrated Meta Voice status into `/api/voice/status`
- **Hybrid pipeline**: Can use either traditional TTS or Meta Voice based on configuration

### 3. Frontend Updates (`src/`)
- **VoiceModeScreen.js**: Added Meta Voice toggle and integration
- **SettingsSheet.js**: Added "Meta Voice AI" setting toggle
- **api.js**: Added new API methods for Meta Voice endpoints
- **Audio playback**: Support for both URL-based and base64 audio

### 4. Configuration
- **Environment variables**: Added `META_VOICE_URL` and `META_VOICE_TIMEOUT`
- **User preferences**: Added `voice_meta_voice` setting for toggle state
- **Fallback chain**: Seamlessly falls back to traditional TTS if Meta Voice unavailable

## Architecture

```
Frontend (React Native)
    ↓
Backend (Node.js/Express)
    ↓ (if Meta Voice enabled)
Python Voice Server (FastAPI + SeamlessM4T v2)
    ↓
GPU (CUDA)
```

## Usage

### For Users

1. **Enable Meta Voice**:
   - Open Voice Mode screen
   - Tap settings (gear icon)
   - Enable "Meta Voice AI" toggle

2. **Automatic Integration**:
   - When enabled, voice conversations use SeamlessM4T v2
   - Better translation for Bisaya/Tagalog → English
   - Auto-detects input language
   - Higher quality speech synthesis

### For Developers

#### Local Testing

1. **Start Python voice server**:
```bash
cd voice-server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install git+https://github.com/facebookresearch/seamless_communication.git
cp .env.example .env
python main.py
```

2. **Configure main server**:
```env
META_VOICE_URL=http://localhost:8000
META_VOICE_TIMEOUT=30000
```

3. **Test the integration**:
```bash
curl http://localhost:8000/health
```

#### Production Deployment

See `voice-server/DEPLOYMENT.md` for detailed GPU server deployment instructions.

## Key Features

### SeamlessM4T v2 Capabilities
- **100 input languages**, 36 output languages
- **Single-step speech-to-speech** (no separate ASR → LLM → TTS pipeline)
- **Auto language detection** handles mixed languages
- **High quality** better than Whisper + TTS chain
- **Open source** under CC BY-NC 4.0 (free for research/building)

### Sulti-Specific Benefits
- **Better translation** for Philippine languages (Bisaya, Tagalog, Cebuano)
- **Code-switching support** handles Taglish naturally
- **Faster response** with single-step processing
- **Offline capable** when deployed on local GPU server
- **Cost-effective** no API fees after initial hardware investment

## Files Modified/Created

### Created
- `voice-server/main.py` - FastAPI server with SeamlessM4T v2
- `voice-server/requirements.txt` - Python dependencies
- `voice-server/.env.example` - Environment configuration template
- `voice-server/README.md` - Server documentation
- `voice-server/DEPLOYMENT.md` - GPU server deployment guide
- `server/src/services/metaVoiceService.ts` - Backend proxy service

### Modified
- `server/src/routes/voice.routes.ts` - Added Meta Voice endpoints
- `server/.env.example` - Added Meta Voice configuration
- `src/services/api.js` - Added Meta Voice API methods
- `src/screens/VoiceModeScreen.js` - Added Meta Voice integration
- `src/components/voice/SettingsSheet.js` - Added Meta Voice toggle

## Testing Checklist

- [ ] Python voice server starts successfully
- [ ] Health endpoint returns healthy status
- [ ] Models load correctly on GPU
- [ ] Backend can connect to voice server
- [ ] Frontend toggle works and persists
- [ ] Speech-to-text functions correctly
- [ ] Text-to-speech functions correctly
- [ ] Speech-to-speech pipeline works end-to-end
- [ ] Fallback to traditional TTS works when Meta Voice unavailable
- [ ] Language detection works for Bisaya/Tagalog/English

## Next Steps

### Immediate
1. Deploy Python voice server to GPU machine
2. Configure `META_VOICE_URL` in production environment
3. Test with real users in target languages

### Future Enhancements
1. **Spirit LM Integration**: When publicly available, enable expressive TTS with emotion
2. **Emotion Detection**: Analyze user speech emotion and match Sulti's response
3. **Voice Cloning**: Integrate with existing Voicebox for character-specific voices
4. **Real-time Streaming**: Implement streaming for lower latency
5. **Batch Processing**: Add queue system for high-volume usage

## Troubleshooting

### Meta Voice Not Available
- Check GPU server is running: `curl http://your-server:8000/health`
- Verify network connectivity between servers
- Check `META_VOICE_URL` is correct in `.env`
- Review voice server logs for errors

### Model Loading Issues
- Ensure GPU has sufficient VRAM (12GB+ for large model)
- Check CUDA drivers are installed: `nvidia-smi`
- Try smaller model: `SEAMLESS_MODEL=seamlessM4T_v2_medium`
- Clear HuggingFace cache if needed

### Audio Quality Issues
- Verify sample rate matches (16000 Hz)
- Check audio format (WAV)
- Test with known good audio files
- Adjust model size based on GPU capacity

## Support

For issues or questions:
- Check `voice-server/DEPLOYMENT.md` for deployment issues
- Review server logs: `journalctl -u sulti-voice -f`
- Test endpoints directly with curl
- Verify GPU status: `nvidia-smi`

## Credits

- **SeamlessM4T v2**: Meta AI - https://github.com/facebookresearch/seamless_communication
- **Spirit LM**: Meta AI - https://github.com/facebookresearch/spiritlm
- **FastAPI**: Modern Python web framework
- **PyTorch**: Deep learning framework

## License

This integration follows the same licenses as the underlying models:
- SeamlessM4T v2: CC BY-NC 4.0 (free for research/building)
- Spirit LM: Custom open research license (free for non-commercial + research)
