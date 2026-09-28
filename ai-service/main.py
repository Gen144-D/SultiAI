"""
SultiAI Pronunciation Scoring Service — FastAPI entry point.

Endpoints:
  POST /score      — Analyze pronunciation from audio + expected text
  GET  /health     — Health check
"""

from __future__ import annotations

import base64
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pronunciation import score_pronunciation, PronunciationScore
from phonemes import text_to_phonemes, get_phoneme_inventory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sultiai.pronunciation")


# ── Lifespan ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SultiAI Pronunciation Service starting...")
    yield
    logger.info("SultiAI Pronunciation Service shutting down.")


# ── App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="SultiAI Pronunciation Service",
    version="1.0.0",
    description="Acoustic pronunciation analysis for Bisaya, Tagalog, and English.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────

class ScoreRequest(BaseModel):
    audio_base64: str
    expected_text: str
    language: str = "bisaya"
    filename: str = "recording.m4a"


class ScoreResponse(BaseModel):
    score: int
    feedback: str
    phoneme_breakdown: list[dict]
    metrics: dict


class PhonemeRequest(BaseModel):
    text: str
    language: str = "bisaya"


# ── Routes ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pronunciation", "version": "1.0.0"}


@app.post("/score", response_model=ScoreResponse)
async def score(
    audio: UploadFile | None = File(None),
    audio_base64: str | None = Form(None),
    expected_text: str = Form(...),
    language: str = Form("bisaya"),
    filename: str = Form("recording.m4a"),
):
    """Score pronunciation from audio + expected text.

    Accepts either:
    - Multipart file upload (field: ``audio``)
    - Base64-encoded audio string (field: ``audio_base64``)
    """
    t0 = time.time()

    # Get audio bytes
    audio_bytes: bytes | None = None

    if audio is not None:
        audio_bytes = await audio.read()
        filename = audio.filename or filename
    elif audio_base64:
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 audio data")
    else:
        raise HTTPException(status_code=400, detail="Provide either 'audio' file or 'audio_base64' string")

    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio data is empty or too small")

    if not expected_text.strip():
        raise HTTPException(status_code=400, detail="expected_text is required")

    try:
        result: PronunciationScore = score_pronunciation(
            audio_bytes=audio_bytes,
            expected_text=expected_text,
            language=language,
            filename=filename,
        )
    except Exception as e:
        logger.error("Scoring failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

    elapsed = time.time() - t0
    logger.info(
        "Scored '%s' in %.2fs — score=%d, phonemes=%d",
        expected_text[:30], elapsed, result.score, len(result.phoneme_breakdown),
    )

    return ScoreResponse(
        score=result.score,
        feedback=result.feedback,
        phoneme_breakdown=[
            {
                "expected": p.expected,
                "heard": p.heard,
                "correct": p.correct,
                "confidence": p.confidence,
                "tip": p.tip,
            }
            for p in result.phoneme_breakdown
        ],
        metrics={
            "pitch_accuracy": result.metrics.pitch_accuracy,
            "formant_accuracy": result.metrics.formant_accuracy,
            "energy_consistency": result.metrics.energy_consistency,
            "speaking_rate": result.metrics.speaking_rate,
            "pitch_mean": result.metrics.pitch_mean,
            "pitch_std": result.metrics.pitch_std,
            "duration_seconds": result.metrics.duration_seconds,
        },
    )


@app.post("/phonemes")
async def get_phonemes(req: PhonemeRequest):
    """Convert text to phoneme sequence (for debugging / UI display)."""
    phonemes = text_to_phonemes(req.text, req.language)
    inventory = get_phoneme_inventory(req.language)
    return {
        "text": req.text,
        "language": req.language,
        "phonemes": phonemes,
        "inventory": inventory,
    }


# ── Run ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
