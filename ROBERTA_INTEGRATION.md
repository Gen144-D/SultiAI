# RoBERTa Tagalog Base Integration Guide

> **Historical document — the code it describes no longer exists.**
> This guide documented a RoBERTa integration inside `ai-service/`, the Python
> FastAPI microservice that has since been removed. Its endpoints
> (`/roberta/fill-mask`, `/roberta/vocabulary-exercise`,
> `/roberta/sentence-completion`) are not served by any component today.
>
> Pronunciation scoring — the other thing `ai-service/` did — now runs
> in-process in the Node server; see the "Pronunciation Analysis" section of
> `README.md`.
>
> The notes below are kept for reference in case the RoBERTa capability is
> revived on a different (non-Python-service) footing.

## Overview

Successfully integrated RoBERTa Tagalog Base (`jcblaise/roberta-tagalog-base`) into SultiAI for enhanced Filipino language learning capabilities. This model provides fill-mask predictions for vocabulary exercises and sentence completion tasks.

## What Was Integrated

### 1. Python AI Service Extension (`ai-service/main.py`)
- **Added RoBERTa Tagalog Base model loading** alongside existing Whisper and BART models
- **New API endpoints**:
  - `/roberta/fill-mask` - Fill masked words in Tagalog sentences
  - `/roberta/vocabulary-exercise` - Generate vocabulary exercises with answers
  - `/roberta/sentence-completion` - Complete Tagalog sentences with AI predictions
- **Health check** updated to include RoBERTa status
- **Graceful degradation** - service runs in reduced mode if RoBERTa fails to load

### 2. Backend Integration (`server/`)
- **Updated `pythonService.ts`**:
  - Added RoBERTa-specific interfaces and functions
  - New functions: `robertaFillMask`, `generateVocabularyExercise`, `completeSentence`
  - Added `isRobertaAvailable()` health check
- **Updated `speech.routes.ts`**:
  - Added `/api/speech/roberta/status` endpoint
  - Added `/api/speech/roberta/fill-mask` endpoint
  - Added `/api/speech/roberta/vocabulary-exercise` endpoint
  - Added `/api/speech/roberta/sentence-completion` endpoint
  - Proper error handling and fallback behavior

### 3. Frontend Components (`src/`)
- **Updated `api.js`**:
  - Added `robertaStatus()`, `robertaFillMask()`, `robertaVocabularyExercise()`, `robertaSentenceCompletion()`
- **Created `VocabularyExercise.js`**:
  - Interactive vocabulary practice with fill-in-the-blank exercises
  - Difficulty levels: beginner, intermediate, advanced
  - AI-powered suggestions and answer checking
  - Score tracking and progress
- **Created `SentenceCompletion.js`**:
  - Sentence completion exercises with AI predictions
  - Example templates and custom sentence input
  - Multiple completion options with confidence scores
  - Best match selection

## Architecture

```
Frontend (React Native)
    ↓
Backend (Node.js/Express)
    ↓
Python AI Service (FastAPI)
    ↓
RoBERTa Tagalog Base (Hugging Face Transformers)
```

## Features

### 1. Fill-Mask Predictions
- Predict missing words in Tagalog sentences
- Use `<mask>` token as placeholder
- Returns top-k predictions with confidence scores
- Example: "Mahal ko ang aking <mask>." → ["pamilya", "mga kaibigan", "trabaho"]

### 2. Vocabulary Exercises
- Difficulty-based exercises (beginner, intermediate, advanced)
- Pre-built templates for common scenarios
- AI-powered answer suggestions
- Instant feedback and scoring
- Topic filtering capability

### 3. Sentence Completion
- Custom sentence input with `<mask>` token
- Pre-built example templates
- Multiple AI completion options
- Confidence scores for each prediction
- Best match highlighting

## Usage

### Starting the Python AI Service

```bash
cd ai-service
pip install transformers torch
python main.py
```

The service will load:
- Whisper model (STT)
- BART MNLI classifier (intent detection)
- RoBERTa Tagalog Base (fill-mask predictions)

### Testing the Endpoints

#### Health Check
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "sulti-ai",
  "version": "2.1.0",
  "roberta_tagalog": "loaded"
}
```

#### Fill-Mask Prediction
```bash
curl -X POST "http://localhost:8001/roberta/fill-mask?text=Mahal%20ko%20ang%20aking%20<mask>.&top_k=5"
```

#### Vocabulary Exercise
```bash
curl -X POST "http://localhost:8001/roberta/vocabulary-exercise?difficulty=beginner"
```

#### Sentence Completion
```bash
curl -X POST "http://localhost:8001/roberta/sentence-completion?text=Ang%20pangalan%20ko%20ay%20<mask>."
```

### Frontend Integration

#### Using Vocabulary Exercises
```javascript
import VocabularyExercise from '../../components/learning/VocabularyExercise';

// In your screen
<VocabularyExercise onBack={() => navigation.goBack()} />
```

#### Using Sentence Completion
```javascript
import SentenceCompletion from '../../components/learning/SentenceCompletion';

// In your screen
<SentenceCompletion onBack={() => navigation.goBack()} />
```

#### Direct API Calls
```javascript
import { api } from '../../services/api';

// Check RoBERTa status
const status = await api.robertaStatus();

// Fill-mask prediction
const result = await api.robertaFillMask('Mahal ko ang aking <mask>.', 5);

// Generate vocabulary exercise
const exercise = await api.robertaVocabularyExercise('beginner', 'family');

// Complete sentence
const completion = await api.robertaSentenceCompletion('Ang pangalan ko ay <mask>.');
```

## Configuration

### Environment Variables

Add to your `server/.env`:
```env
PYTHON_SERVICE_URL=http://localhost:8001
ROBERTA_TAGALOG_MODEL=jcblaise/roberta-tagalog-base
```

### Model Selection

Default model: `jcblaise/roberta-tagalog-base`

To use a different RoBERTa model, set:
```env
ROBERTA_TAGALOG_MODEL=your-custom-model-name
```

## Important Notes

### Model Capabilities
- **Fill-mask task only** - predicts missing words, not full sentence generation
- **Tagalog-specific** - trained on Tagalog text, not Bisaya/Cebuano
- **Cased model** - respects uppercase/lowercase distinctions
- **Context-dependent** - predictions depend on surrounding words

### Limitations
- Not a conversational AI (use Groq/Llama for that)
- No grammar correction built-in
- No sentiment analysis (use existing NLP endpoint)
- Tagalog-focused (limited Bisaya/Cebuano support)

### Integration with Existing SultiAI Features
- **Complements** existing Groq LLM for conversations
- **Enhances** existing pronunciation analysis
- **Works alongside** existing TTS/STT services
- **Fallback behavior** if service unavailable

## Use Cases in SultiAI

### 1. Vocabulary Practice
- Daily vocabulary exercises
- Fill-in-the-blank quizzes
- Word prediction games
- Progress tracking

### 2. Sentence Building
- Sentence completion exercises
- Grammar practice
- Context learning
- Writing improvement

### 3. Assessment
- Vocabulary level assessment
- Language proficiency checks
- Learning progress measurement
- Personalized difficulty adjustment

## Performance Considerations

### Model Size
- RoBERTa Tagalog Base: ~500MB
- First load: 10-30 seconds (downloads from Hugging Face)
- Subsequent loads: 2-5 seconds (cached)
- Inference: 50-200ms per request

### Resource Requirements
- RAM: 2GB+ recommended
- CPU: Modern processor for acceptable performance
- GPU: Optional but significantly faster
- Storage: 1GB+ for model cache

### Scalability
- Single request: Fast
- Multiple concurrent requests: Consider load balancing
- Production: Deploy on dedicated server with GPU

## Troubleshooting

### RoBERTa Not Loading
```bash
# Check model download
python -c "from transformers import pipeline; model = pipeline('fill-mask', 'jcblaise/roberta-tagalog-base'); print('Model loaded successfully')"

# Check HuggingFace cache
ls ~/.cache/huggingface/hub/
```

### Service Unavailable
```bash
# Check if service is running
curl http://localhost:8001/health

# Check logs
# Look for RoBERTa loading errors
```

### API Errors
- **503 Service Unavailable**: Python service not running
- **400 Bad Request**: Missing `<mask>` token in text
- **500 Internal Error**: Model prediction failed

## Future Enhancements

### Potential Improvements
1. **Fine-tuning**: Train on Bisaya/Cebuano specific data
2. **Custom models**: Train domain-specific models
3. **Batch processing**: Handle multiple exercises at once
4. **Caching**: Cache common predictions
5. **Analytics**: Track learning progress and patterns

### Integration Opportunities
1. **Adaptive learning**: Adjust difficulty based on performance
2. **Personalization**: Custom exercises based on user progress
3. **Gamification**: Points and achievements for exercises
4. **Social features**: Share exercises with friends
5. **Assessment**: Placement tests using vocabulary exercises

## Documentation References

- **Hugging Face Model**: https://huggingface.co/jcblaise/roberta-tagalog-base
- **Transformers Docs**: https://huggingface.co/docs/transformers/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Research Paper**: Check model card for citation

## Testing Checklist

- [ ] Python service starts successfully
- [ ] RoBERTa model loads without errors
- [ ] Health endpoint returns correct status
- [ ] Fill-mask endpoint works with `<mask>` token
- [ ] Vocabulary exercises generate correctly
- [ ] Sentence completion provides valid predictions
- [ ] Backend can call all RoBERTa endpoints
- [ ] Frontend components render correctly
- [ ] Error handling works when service unavailable
- [ ] Performance is acceptable for user experience

## Conclusion

RoBERTa Tagalog Base integration adds powerful NLP capabilities to SultiAI specifically for Filipino language learning. The fill-mask functionality enables interactive vocabulary exercises and sentence completion tasks that complement the existing conversational AI features.

The integration follows SultiAI's existing architecture patterns, provides graceful fallback behavior, and enhances the language learning experience with AI-powered vocabulary practice.
