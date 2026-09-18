import os
import io
import base64
import logging
import tempfile
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import torch
import numpy as np
import soundfile as sf

# Try to import Seamless Communication
try:
    from seamless_communication.models.inference import Translator
    SEAMLESS_AVAILABLE = True
except ImportError:
    SEAMLESS_AVAILABLE = False
    Translator = None  # Define as None to avoid NameError
    logging.warning("Seamless Communication not installed. Server will run in demo mode without AI capabilities.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # Model settings
    seamless_model: str = Field(default="seamlessM4T_v2_large", description="SeamlessM4T model name")
    seamless_device: str = Field(default="cuda", description="Device for SeamlessM4T (cuda/cpu)")
    
    # Spirit LM settings (placeholder for future integration)
    spiritlm_enabled: bool = Field(default=False, description="Enable Spirit LM for expressive TTS")
    spiritlm_model: str = Field(default="facebook/spirit-lm-expressive-7b", description="Spirit LM model name")
    
    # Audio settings
    sample_rate: int = Field(default=16000, description="Audio sample rate")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

# Global model instances
seamless_translator: Optional[Translator] = None
spiritlm_model = None  # Placeholder for Spirit LM integration

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - load models on startup."""
    # Startup
    logger.info("Starting voice server...")
    
    if not SEAMLESS_AVAILABLE:
        logger.warning("Seamless Communication is not installed. Server will run in demo mode without AI capabilities.")
        logger.warning("For full functionality, install Seamless Communication on Linux/Mac or use WSL2 on Windows.")
        logger.warning("See WINDOWS_SETUP.md for Windows installation instructions.")
    else:
        logger.info(f"Loading SeamlessM4T model: {settings.seamless_model}")
        logger.info(f"Device: {settings.seamless_device}")
        
        try:
            global seamless_translator
            seamless_translator = Translator(
                settings.seamless_model,
                device=settings.seamless_device,
                vocoder_name_or_path="vocoder_36h"
            )
            logger.info("SeamlessM4T model loaded successfully")
            
            if settings.spiritlm_enabled:
                logger.info("Spirit LM integration - placeholder for future expressive TTS")
                # Future Spirit LM initialization:
                # from spiritlm.model import SpiritLM
                # spiritlm_model = SpiritLM.from_pretrained(settings.spiritlm_model)
                # logger.info("Spirit LM model loaded successfully")
            else:
                logger.info("Using SeamlessM4T built-in TTS (Spirit LM disabled)")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            logger.warning("Server will run in demo mode without AI capabilities.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down voice server...")
    if seamless_translator:
        del seamless_translator
    logger.info("Models unloaded")

# Create FastAPI app
app = FastAPI(
    title="Sulti Voice Server",
    description="Meta SeamlessM4T v2 + Spirit LM for speech-to-speech",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SpeechToSpeechRequest(BaseModel):
    """Request for speech-to-speech translation."""
    audio_base64: str = Field(..., description="Base64-encoded audio data")
    source_lang: str = Field(default="auto", description="Source language code (auto, ceb, tl, en)")
    target_lang: str = Field(default="en", description="Target language code (en, ceb, tl)")
    task: str = Field(default="S2ST", description="Task type: S2ST (speech-to-speech), S2TT (speech-to-text), T2ST (text-to-speech)")

class SpeechToTextRequest(BaseModel):
    """Request for speech-to-text transcription."""
    audio_base64: str = Field(..., description="Base64-encoded audio data")
    source_lang: str = Field(default="auto", description="Source language code (auto, ceb, tl, en)")

class TextToSpeechRequest(BaseModel):
    """Request for text-to-speech synthesis."""
    text: str = Field(..., description="Text to synthesize")
    target_lang: str = Field(default="en", description="Target language code (en, ceb, tl)")

def decode_base64_audio(base64_string: str, sample_rate: int = 16000) -> np.ndarray:
    """Decode base64 audio string to numpy array."""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:'):
            base64_string = base64_string.split(',')[1]
        
        audio_bytes = base64.b64decode(base64_string)
        audio, sr = sf.read(io.BytesIO(audio_bytes))
        
        # Resample if needed
        if sr != sample_rate:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
        
        # Ensure mono
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        
        return audio
    except Exception as e:
        logger.error(f"Audio decoding error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid audio data: {str(e)}")

def encode_audio_to_base64(audio: np.ndarray, sample_rate: int = 16000) -> str:
    """Encode numpy audio array to base64 string."""
    try:
        buffer = io.BytesIO()
        sf.write(buffer, audio, sample_rate, format='WAV')
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        logger.error(f"Audio encoding error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio encoding failed: {str(e)}")

def map_language_code(lang: str) -> str:
    """Map language codes to SeamlessM4T format."""
    lang_map = {
        'auto': None,
        'bisaya': 'ceb',
        'ceb': 'ceb',
        'cebuano': 'ceb',
        'tagalog': 'tl',
        'tl': 'tl',
        'fil': 'tl',
        'english': 'en',
        'en': 'en',
    }
    return lang_map.get(lang.lower(), lang)

def expressive_tts_with_spiritlm(text: str, emotion: str = "neutral") -> Optional[np.ndarray]:
    """
    Placeholder for Spirit LM expressive TTS.
    
    This function will be implemented when Spirit LM is integrated.
    Spirit LM can generate speech with emotional context (happy, sad, angry, etc.)
    by using phonetic, pitch, and tone tokens.
    
    Args:
        text: Text to synthesize
        emotion: Emotional context (happy, sad, angry, surprised, neutral)
    
    Returns:
        Audio array or None if not implemented
    """
    if not settings.spiritlm_enabled or spiritlm_model is None:
        return None
    
    # Future implementation:
    # audio = spiritlm_model.generate_speech(text, emotion=emotion)
    # return audio
    
    logger.warning("Spirit LM expressive TTS not yet implemented")
    return None

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "seamless_loaded": SEAMLESS_AVAILABLE and seamless_translator is not None,
        "seamless_available": SEAMLESS_AVAILABLE,
        "spiritlm_enabled": settings.spiritlm_enabled,
        "device": settings.seamless_device if SEAMLESS_AVAILABLE else "none",
        "demo_mode": not SEAMLESS_AVAILABLE
    }

@app.get("/models")
async def get_models_info():
    """Get information about loaded models."""
    return {
        "seamless_model": settings.seamless_model,
        "seamless_device": settings.seamless_device,
        "spiritlm_enabled": settings.spiritlm_enabled,
        "spiritlm_model": settings.spiritlm_model if settings.spiritlm_enabled else None,
        "supported_languages": {
            "input": ["auto", "ceb", "tl", "en"],
            "output": ["en", "ceb", "tl"]
        }
    }

@app.post("/speech-to-speech")
async def speech_to_speech(request: SpeechToSpeechRequest):
    """
    Speech-to-speech translation using SeamlessM4T.
    
    Supports:
    - Bisaya/Tagalog/Cebuano → English
    - English → Bisaya/Tagalog/Cebuano
    - Auto language detection
    """
    if not SEAMLESS_AVAILABLE or not seamless_translator:
        raise HTTPException(status_code=503, detail="SeamlessM4T model not available. Install on Linux/Mac or use WSL2 on Windows.")
    
    try:
        # Decode audio
        audio = decode_base64_audio(request.audio_base64, settings.sample_rate)
        
        # Map language codes
        source_lang = map_language_code(request.source_lang)
        target_lang = map_language_code(request.target_lang)
        
        logger.info(f"Processing S2ST: {request.source_lang} → {request.target_lang}")
        logger.info(f"Audio shape: {audio.shape}, duration: {len(audio)/settings.sample_rate:.2f}s")
        
        # Process with SeamlessM4T
        # Note: SeamlessM4T expects file path or numpy array
        # We'll save to temp file for compatibility
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        sf.write(temp_path, audio, settings.sample_rate)
        
        try:
            # Run S2ST translation
            output_audio, output_text = seamless_translator.predict(
                temp_path,
                request.task,
                source_lang,
                target_lang
            )
            
            # Convert output to base64
            output_base64 = encode_audio_to_base64(output_audio.cpu().numpy(), settings.sample_rate)
            
            return {
                "audio_base64": output_base64,
                "transcription": output_text if output_text else "",
                "source_language": request.source_lang,
                "target_language": request.target_lang,
                "format": "wav",
                "sample_rate": settings.sample_rate
            }
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        logger.error(f"S2ST error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-speech failed: {str(e)}")

@app.post("/speech-to-text")
async def speech_to_text(request: SpeechToTextRequest):
    """
    Speech-to-text transcription using SeamlessM4T.
    """
    if not SEAMLESS_AVAILABLE or not seamless_translator:
        raise HTTPException(status_code=503, detail="SeamlessM4T model not available. Install on Linux/Mac or use WSL2 on Windows.")
    
    try:
        # Decode audio
        audio = decode_base64_audio(request.audio_base64, settings.sample_rate)
        
        # Map language codes
        source_lang = map_language_code(request.source_lang)
        
        logger.info(f"Processing S2TT: {request.source_lang}")
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        sf.write(temp_path, audio, settings.sample_rate)
        
        try:
            # Run S2TT transcription
            output_text = seamless_translator.predict(
                temp_path,
                "S2TT",
                source_lang,
                None  # No target language for S2TT
            )
            
            return {
                "text": output_text if output_text else "",
                "source_language": request.source_lang
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        logger.error(f"S2TT error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

@app.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Text-to-speech synthesis using SeamlessM4T.
    """
    if not SEAMLESS_AVAILABLE or not seamless_translator:
        raise HTTPException(status_code=503, detail="SeamlessM4T model not available. Install on Linux/Mac or use WSL2 on Windows.")
    
    try:
        # Map language codes
        target_lang = map_language_code(request.target_lang)
        
        logger.info(f"Processing T2ST: {request.target_lang}")
        logger.info(f"Text length: {len(request.text)}")
        
        # Run T2ST synthesis
        output_audio = seamless_translator.predict(
            request.text,
            "T2ST",
            None,  # No source language for T2ST
            target_lang
        )
        
        # Convert output to base64
        output_base64 = encode_audio_to_base64(output_audio.cpu().numpy(), settings.sample_rate)
        
        return {
            "audio_base64": output_base64,
            "target_language": request.target_lang,
            "format": "wav",
            "sample_rate": settings.sample_rate
        }
        
    except Exception as e:
        logger.error(f"T2ST error: {e}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")

@app.post("/transcribe-and-translate")
async def transcribe_and_translate(
    audio_base64: str = Form(...),
    source_lang: str = Form(default="auto"),
    target_lang: str = Form(default="en")
):
    """
    Combined transcription and translation (S2TT + text translation).
    Useful for getting both the original transcription and translated text.
    """
    if not SEAMLESS_AVAILABLE or not seamless_translator:
        raise HTTPException(status_code=503, detail="SeamlessM4T model not available. Install on Linux/Mac or use WSL2 on Windows.")
    
    try:
        # Decode audio
        audio = decode_base64_audio(audio_base64, settings.sample_rate)
        
        # Map language codes
        source_lang_mapped = map_language_code(source_lang)
        target_lang_mapped = map_language_code(target_lang)
        
        logger.info(f"Processing transcribe+translate: {source_lang} → {target_lang}")
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        sf.write(temp_path, audio, settings.sample_rate)
        
        try:
            # First, transcribe
            transcription = seamless_translator.predict(
                temp_path,
                "S2TT",
                source_lang_mapped,
                None
            )
            
            # Then translate the text
            if target_lang_mapped and target_lang_mapped != source_lang_mapped:
                translation = seamless_translator.predict(
                    transcription,
                    "T2TT",
                    source_lang_mapped,
                    target_lang_mapped
                )
            else:
                translation = transcription
            
            return {
                "transcription": transcription if transcription else "",
                "translation": translation if translation else "",
                "source_language": source_lang,
                "target_language": target_lang
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        logger.error(f"Transcribe+translate error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription and translation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,  # Set to True for development
        log_level="info"
    )
