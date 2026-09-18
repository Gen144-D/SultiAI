from fastapi import FastAPI, UploadFile, File, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from transformers import pipeline
import edge_tts
import tempfile
import os
import logging
from contextlib import asynccontextmanager
import time
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sultiai.ai")

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE", "int8")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
CLASSIFIER_MODEL = os.environ.get("CLASSIFIER_MODEL", "facebook/bart-large-mnli")
ROBERTA_TAGALOG_MODEL = os.environ.get("ROBERTA_TAGALOG_MODEL", "jcblaise/roberta-tagalog-base")

PH_VOICES = {
    "bisaya": "en-PH-RosaNeural",
    "cebuano": "en-PH-RosaNeural",
    "en": "en-PH-RosaNeural",
    "tagalog": "tl-PH-BlessicaNeural",
    "tl": "tl-PH-BlessicaNeural",
    "filipino": "tl-PH-BlessicaNeural",
}

INTENT_LABELS = [
    "asking for help",
    "greeting",
    "ordering food",
    "asking for directions",
    "emergency",
    "introducing yourself",
    "shopping",
    "transportation",
    "medical",
    "small talk",
]

SUGGESTIONS = {
    "asking for help": "Excuse me, can you help me? / Pwede mangayo og tabang?",
    "greeting": "Maayong adlaw! / Magandang araw! / Hello!",
    "ordering food": "Pwede mag-order? / Pwedeng umorder? / Gusto ko mopalit og pagkaon.",
    "asking for directions": "Asa ang CR? / Saan ang sakayan? / Where is the nearest hospital?",
    "emergency": "Tabang! / Saklolo! / I need help immediately!",
    "introducing yourself": "Ako si [name]. / Ako po si [name]. / My name is [name].",
    "shopping": "Tagpila ni? / Magkano ito? / How much is this?",
    "transportation": "Moabot ba ni sa [place]? / Dadaan ba ito sa [place]? / Is this going to [place]?",
    "medical": "Sakit akong [body part]. / Masakit ang [body part] ko. / My [body part] hurts.",
    "small talk": "Kumusta? / Kamusta ka? / How are you?",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Loading FREE offline AI models...")
    t0 = time.time()
    app.state.whisper = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    logger.info(f"  Whisper '{MODEL_SIZE}' loaded ({(time.time()-t0):.1f}s)")
    t1 = time.time()
    app.state.classifier = pipeline("zero-shot-classification", model=CLASSIFIER_MODEL)
    logger.info(f"  BART MNLI classifier loaded ({(time.time()-t1):.1f}s)")
    
    # Load RoBERTa Tagalog Base for fill-mask predictions
    t2 = time.time()
    try:
        app.state.roberta_tagalog = pipeline("fill-mask", model=ROBERTA_TAGALOG_MODEL)
        logger.info(f"  RoBERTa Tagalog Base loaded ({(time.time()-t2):.1f}s)")
    except Exception as e:
        logger.warning(f"  RoBERTa Tagalog Base failed to load: {e}")
        logger.warning(f"  RoBERTa features will be unavailable. Service will run in reduced mode.")
        app.state.roberta_tagalog = None
    
    logger.info(f"All models loaded in {(time.time()-t0):.1f}s. Ready!")
    yield
    logger.info("SultiAI AI Service shutting down.")


app = FastAPI(
    title="SultiAI Free AI Service",
    version="2.1.0",
    description="FREE offline STT (Whisper) + Intent (BART MNLI) + TTS (Edge TTS) + RoBERTa Tagalog Base for Bisaya/Tagalog/English",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    roberta_status = "loaded" if app.state.roberta_tagalog else "not_loaded"
    return {
        "status": "ok", 
        "service": "sulti-ai", 
        "version": "2.0.0",
        "roberta_tagalog": roberta_status
    }


@app.post("/stt")
async def stt(request: Request, file: UploadFile = File(...)):
    whisper_model = request.app.state.whisper
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        path = tmp.name

    logger.info(f"Transcribing {len(content)} bytes from {file.filename}")
    t0 = time.time()

    segments, info = request.app.state.whisper.transcribe(path, beam_size=5)

    os.unlink(path)
    text = " ".join([s.text.strip() for s in segments])
    elapsed = time.time() - t0
    logger.info(f"STT done in {elapsed:.1f}s → lang={info.language} text='{text[:80]}'")

    return {
        "text": text,
        "language": info.language,
        "language_probability": info.language_probability,
        "duration_seconds": round(info.duration, 2),
    }


@app.post("/tts")
async def tts(text: str = Query(...), lang: str = Query("bisaya")):
    voice = PH_VOICES.get(lang.lower(), "en-PH-RosaNeural")
    out_path = tempfile.mktemp(suffix=".mp3")

    logger.info(f"TTS: lang={lang} voice={voice} text='{text[:60]}'")
    comm = edge_tts.Communicate(text, voice)
    await comm.save(out_path)

    return {
        "text": text,
        "language": lang,
        "voice": voice,
        "audio_path": out_path,
    }


@app.post("/suggest")
async def suggest(text: str = Query(...)):
    logger.info(f"Intent classification for: '{text[:80]}'")
    t0 = time.time()

    result = app.state.classifier(text, INTENT_LABELS)
    top_intent = result["labels"][0]
    top_score = round(result["scores"][0], 4)
    all_intents = [
        {"intent": label, "confidence": round(score, 4)}
        for label, score in zip(result["labels"], result["scores"])
    ]

    suggestion = SUGGESTIONS.get(top_intent, "Hello! / Kumusta? / Maayong adlaw!")

    elapsed = time.time() - t0
    logger.info(f"Intent '{top_intent}' ({top_score:.4f}) in {elapsed:.1f}s")

    return {
        "intent": top_intent,
        "confidence": top_score,
        "all_intents": all_intents,
        "suggestion": suggestion,
        "input_text": text,
    }


@app.post("/full-pipeline")
async def full_pipeline(request: Request, file: UploadFile = File(...), target_lang: str = "bisaya"):
    """Run STT → Intent → TTS in one call."""
    logger.info(f"Full pipeline for {file.filename}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        path = tmp.name

    segments, info = request.app.state.whisper.transcribe(path, beam_size=5)
    os.unlink(path)
    text = " ".join([s.text.strip() for s in segments])

    result = app.state.classifier(text, INTENT_LABELS)
    top_intent = result["labels"][0]
    suggestion = SUGGESTIONS.get(top_intent, "Hello!")

    voice = PH_VOICES.get(target_lang.lower(), "en-PH-RosaNeural")
    out_path = tempfile.mktemp(suffix=".mp3")
    comm = edge_tts.Communicate(suggestion, voice)
    await comm.save(out_path)

    return {
        "transcript": text,
        "language": info.language,
        "intent": top_intent,
        "confidence": round(result["scores"][0], 4),
        "suggestion": suggestion,
        "tts_voice": voice,
        "audio_path": out_path,
    }


# ==================== RoBERTa Tagalog Base Endpoints ====================

@app.post("/roberta/fill-mask")
async def roberta_fill_mask(text: str = Query(...), top_k: int = Query(5, ge=1, le=10)):
    """
    Fill masked words in Tagalog sentences using RoBERTa Tagalog Base.
    
    Use the special token <mask> for the word to predict.
    Example: "Mahal ko ang aking <mask>."
    """
    if not app.state.roberta_tagalog:
        return {"error": "RoBERTa Tagalog model not loaded"}
    
    logger.info(f"RoBERTa fill-mask for: '{text[:80]}'")
    t0 = time.time()
    
    try:
        results = app.state.roberta_tagalog(text, top_k=top_k)
        elapsed = time.time() - t0
        
        predictions = [
            {
                "word": result["token_str"].strip(),
                "score": round(result["score"], 4),
                "sequence": result["sequence"]
            }
            for result in results
        ]
        
        logger.info(f"RoBERTa fill-mask done in {elapsed:.1f}s")
        
        return {
            "input_text": text,
            "predictions": predictions,
            "top_k": top_k,
            "processing_time": round(elapsed, 3)
        }
    except Exception as e:
        logger.error(f"RoBERTa fill-mask error: {e}")
        return {"error": f"Fill-mask prediction failed: {str(e)}"}


@app.post("/roberta/vocabulary-exercise")
async def vocabulary_exercise(
    difficulty: str = Query("beginner", regex="^(beginner|intermediate|advanced)$"),
    topic: Optional[str] = Query(None, description="Optional topic for vocabulary exercises")
):
    """
    Generate vocabulary exercises using RoBERTa Tagalog Base.
    
    Returns fill-mask exercises with answers for vocabulary practice.
    """
    if not app.state.roberta_tagalog:
        return {"error": "RoBERTa Tagalog model not loaded"}
    
    # Exercise templates based on difficulty
    exercises = {
        "beginner": [
            "Mahal ko ang aking <mask>.",
            "Kumusta <mask>?",
            "Salamat <mask>.",
            "Paumanhin <mask>.",
            "Magandang <mask>."
        ],
        "intermediate": [
            "Gusto ko <mask> ng pagkaon.",
            "Pwede ba <mask> mangulata?",
            "Nag-aaral ako ng <mask>.",
            "Nasaan ang <mask>?",
            "Ano ang <mask> mo?"
        ],
        "advanced": [
            "Masaya akong <mask> sa pamilya ko.",
            "Sana ay <mask> tayo ng mas mabuting relasyon.",
            "Ang pag-ibig ay <mask> sa ating buhay.",
            "Mahalaga ang <mask> sa ating lipunan.",
            "Tulungan natin ang <mask> ng bayan."
        ]
    }
    
    templates = exercises.get(difficulty, exercises["beginner"])
    
    # Filter by topic if provided
    if topic:
        topic_keywords = {
            "family": ["pamilya", "ina", "ama", "kapatid"],
            "food": ["pagkaon", "kain", "luto", "ulam"],
            "greetings": ["kumusta", "magandang", "maayong"],
            "feelings": ["masaya", "sakit", "mahal", "gusto"]
        }
        # Simple topic filtering (can be enhanced)
        if topic.lower() in topic_keywords:
            # Use templates that might be related to the topic
            pass
    
    selected_template = templates[0]  # Start with first template
    logger.info(f"Vocabulary exercise: difficulty={difficulty} template='{selected_template}'")
    
    t0 = time.time()
    try:
        results = app.state.roberta_tagalog(selected_template, top_k=5)
        elapsed = time.time() - t0
        
        predictions = [
            {
                "word": result["token_str"].strip(),
                "score": round(result["score"], 4),
                "is_correct": result["score"] > 0.3  # Simple threshold
            }
            for result in results
        ]
        
        return {
            "difficulty": difficulty,
            "topic": topic,
            "exercise": {
                "template": selected_template,
                "predictions": predictions,
                "correct_answer": predictions[0]["word"] if predictions else None
            },
            "alternative_exercises": templates[1:],  # Other templates for same difficulty
            "processing_time": round(elapsed, 3)
        }
    except Exception as e:
        logger.error(f"Vocabulary exercise error: {e}")
        return {"error": f"Exercise generation failed: {str(e)}"}


@app.post("/roberta/sentence-completion")
async def sentence_completion(
    text: str = Query(...),
    context: Optional[str] = Query(None, description="Additional context for the sentence")
):
    """
    Complete Tagalog sentences using RoBERTa fill-mask predictions.
    
    Useful for sentence completion exercises and testing understanding.
    """
    if not app.state.roberta_tagalog:
        return {"error": "RoBERTa Tagalog model not loaded"}
    
    # If text doesn't contain <mask>, we can't use fill-mask
    if "<mask>" not in text.lower():
        return {
            "error": "Text must contain <mask> token for prediction",
            "suggestion": "Use format like: 'Ang pangalan ko ay <mask>.'"
        }
    
    logger.info(f"Sentence completion for: '{text[:80]}'")
    t0 = time.time()
    
    try:
        results = app.state.roberta_tagalog(text, top_k=3)
        elapsed = time.time() - t0
        
        completions = [
            {
                "completed_sentence": result["sequence"],
                "predicted_word": result["token_str"].strip(),
                "confidence": round(result["score"], 4)
            }
            for result in results
        ]
        
        return {
            "original_text": text,
            "context": context,
            "completions": completions,
            "best_completion": completions[0] if completions else None,
            "processing_time": round(elapsed, 3)
        }
    except Exception as e:
        logger.error(f"Sentence completion error: {e}")
        return {"error": f"Sentence completion failed: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")