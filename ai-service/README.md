# SultiAI Python AI Service

Python FastAPI service providing offline AI capabilities for SultiAI language learning platform.

## Features

- **Whisper** - Speech-to-text transcription (local, offline)
- **BART MNLI** - Intent classification for voice commands
- **RoBERTa Tagalog Base** - Fill-mask predictions for vocabulary exercises
- **Edge TTS** - Text-to-speech synthesis (local voices)

## Installation

### Prerequisites
- Python 3.8+
- pip package manager

### Setup

1. **Navigate to ai-service directory**:
```bash
cd ai-service
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install fastapi uvicorn transformers torch faster-whisper edge-tts
```

4. **Configure environment** (optional):
```bash
# Default settings work for most cases
# Customize if needed:
export WHISPER_MODEL="small"        # tiny, small, medium, large
export WHISPER_DEVICE="cpu"         # cpu or cuda
export ROBERTA_TAGALOG_MODEL="jcblaise/roberta-tagalog-base"
```

## Running the Service

### Development
```bash
python main.py
```

### Production
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
```

## API Endpoints

### Health Check
```
GET /health
```

### Speech-to-Text (Whisper)
```
POST /stt
Content-Type: multipart/form-data

file: audio file (wav, mp3, m4a)
```

### Text-to-Speech (Edge TTS)
```
POST /tts?text=Hello&lang=bisaya
```

### Intent Classification (BART MNLI)
```
POST /suggest?text=Help me please
```

### RoBERTa Tagalog Base
```
POST /roberta/fill-mask?text=Mahal ko ang aking <mask>.&top_k=5
POST /roberta/vocabulary-exercise?difficulty=beginner
POST /roberta/sentence-completion?text=Ang pangalan ko ay <mask>.
```

### Full Pipeline
```
POST /full-pipeline
Content-Type: multipart/form-data

file: audio file
target_lang: bisaya
```

## Model Information

### Whisper (STT)
- **Models**: tiny, small, medium, large
- **Languages**: 99 languages including Bisaya, Tagalog, English
- **Size**: 40MB (tiny) to 3GB (large)
- **Recommended**: small for balance of speed/accuracy

### BART MNLI (Intent)
- **Model**: facebook/bart-large-mnli
- **Task**: Zero-shot classification
- **Intents**: greeting, ordering food, asking directions, etc.

### RoBERTa Tagalog Base
- **Model**: jcblaise/roberta-tagalog-base
- **Task**: Fill-mask predictions
- **Language**: Tagalog/Filipino
- **Size**: ~500MB

### Edge TTS
- **Voices**: Filipino-accented neural voices
- **Languages**: Bisaya, Tagalog, English
- **Offline**: Yes, uses Microsoft Edge voices

## Performance

### Startup Time
- First run: 30-60 seconds (downloads models)
- Subsequent runs: 5-10 seconds (cached models)

### Inference Time
- Whisper STT: 1-5 seconds per audio file
- BART Classification: 100-500ms
- RoBERTa Fill-mask: 50-200ms
- Edge TTS: 500-2000ms

### Resource Usage
- RAM: 2-4GB (depends on models)
- CPU: Moderate usage during inference
- GPU: Optional but 5-10x faster

## Configuration

### Environment Variables

```bash
# Whisper Settings
WHISPER_MODEL=small              # tiny, small, medium, large
WHISPER_COMPUTE=int8             # int8, float16, float32
WHISPER_DEVICE=cpu               # cpu, cuda

# Classifier Settings
CLASSIFIER_MODEL=facebook/bart-large-mnli

# RoBERTa Settings
ROBERTA_TAGALOG_MODEL=jcblaise/roberta-tagalog-base
```

### Port Configuration

Default port: 8001

To change:
```bash
uvicorn main:app --port 8002
```

## Troubleshooting

### Model Download Issues
```bash
# Clear HuggingFace cache
rm -rf ~/.cache/huggingface/hub/

# Check internet connection
ping huggingface.co
```

### Port Already in Use
```bash
# Find process using port 8001
lsof -i :8001  # Linux/Mac
netstat -ano | findstr :8001  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### CUDA Out of Memory
```bash
# Use smaller models
export WHISPER_MODEL=tiny
export WHISPER_DEVICE=cpu
```

### Import Errors
```bash
# Reinstall dependencies
pip install --upgrade fastapi uvicorn transformers torch

# Check Python version
python --version  # Should be 3.8+
```

## Integration with SultiAI

### Backend Configuration
In `server/.env`:
```env
PYTHON_SERVICE_URL=http://localhost:8001
ROBERTA_TAGALOG_MODEL=jcblaise/roberta-tagalog-base
```

### Frontend Usage
```javascript
import { api } from '../../services/api';

// Check service status
const status = await api.robertaStatus();

// Use RoBERTa features
const exercise = await api.robertaVocabularyExercise('beginner');
```

## Development

### Adding New Endpoints
1. Add function in `main.py`
2. Update health check if needed
3. Add corresponding backend proxy in `pythonService.ts`
4. Add API method in `api.js`
5. Create frontend component

### Testing Endpoints
```bash
# Health check
curl http://localhost:8001/health

# Test RoBERTa
curl -X POST "http://localhost:8001/roberta/fill-mask?text=Mahal%20ko%20ang%20aking%20<mask>."
```

## Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Systemd Service
```ini
[Unit]
Description=SultiAI Python AI Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ai-service
ExecStart=/path/to/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Logs
```bash
# View logs
python main.py  # Logs to console

# Or redirect to file
python main.py > service.log 2>&1
```

### Health Monitoring
```bash
# Continuous health check
watch -n 5 'curl http://localhost:8001/health'
```

## License

This service uses:
- Whisper: MIT License
- Transformers: Apache 2.0
- Edge TTS: Microsoft Edge license
- RoBERTa Tagalog Base: Check model card for license

## Support

For issues:
1. Check service logs for errors
2. Verify all dependencies are installed
3. Test health endpoint: `curl http://localhost:8001/health`
4. Check model downloads in HuggingFace cache
5. Verify port availability

## Future Enhancements

- [ ] Add more language models (Bisaya-specific)
- [ ] Implement model fine-tuning
- [ ] Add batch processing support
- [ ] Implement request caching
- [ ] Add monitoring and analytics
- [ ] Support for custom model deployment
