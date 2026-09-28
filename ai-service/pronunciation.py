"""
Acoustic pronunciation analysis engine.

Extracts MFCC, pitch, formants, and energy features from audio,
then scores pronunciation using DTW alignment and phoneme comparison.
"""

from __future__ import annotations

import io
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import librosa
import numpy as np
import parselmouth
from parselmouth.praat import call
from pydub import AudioSegment

# ffmpeg/ffprobe are expected to be available on PATH (installed via the
# Dockerfile's `apt-get install ffmpeg`). pydub will locate them automatically;
# no bundled-binary path juggling is needed here.

from phonemes import text_to_phonemes


# ── Data classes ──────────────────────────────────────────────────────

@dataclass
class PhonemeResult:
    expected: str
    heard: str
    correct: bool
    confidence: float
    tip: str = ""


@dataclass
class AcousticMetrics:
    pitch_accuracy: float = 0.0
    formant_accuracy: float = 0.0
    energy_consistency: float = 0.0
    speaking_rate: float = 0.0  # syllables per second
    pitch_mean: float = 0.0
    pitch_std: float = 0.0
    duration_seconds: float = 0.0


@dataclass
class PronunciationScore:
    score: int  # 0-100
    feedback: str
    phoneme_breakdown: list[PhonemeResult] = field(default_factory=list)
    metrics: AcousticMetrics = field(default_factory=AcousticMetrics)


# ── Audio loading ─────────────────────────────────────────────────────

def load_audio_from_bytes(audio_bytes: bytes, filename: str = "recording.m4a") -> tuple[np.ndarray, float]:
    """Load audio from raw bytes (M4A, WAV, MP3, etc.) and return (samples, sr)."""
    suffix = Path(filename).suffix.lower() or ".m4a"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Try soundfile first (WAV, FLAC, OGG)
        if suffix in (".wav", ".flac", ".ogg"):
            y, sr = librosa.load(tmp_path, sr=22050, mono=True)
        else:
            # For M4A/MP3 — convert via pydub first
            audio_seg = AudioSegment.from_file(tmp_path)
            audio_seg = audio_seg.set_frame_rate(22050).set_channels(1)
            samples = np.array(audio_seg.get_array_of_samples(), dtype=np.float32)
            samples /= np.iinfo(audio_seg.array_type).max if hasattr(audio_seg, 'array_type') else 32768.0
            y = samples
            sr = 22050
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return y, sr


# ── Feature extraction ────────────────────────────────────────────────

def extract_mfcc(y: np.ndarray, sr: int, n_mfcc: int = 13) -> np.ndarray:
    """Extract MFCC features (n_mfcc x time_steps)."""
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, n_fft=2048, hop_length=512)
    # Add delta and delta-delta for better temporal modeling
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)
    return np.vstack([mfcc, delta, delta2])  # shape: (39, time_steps)


def extract_pitch(y: np.ndarray, sr: int) -> dict:
    """Extract pitch (F0) contour using Parselmouth/Praat."""
    try:
        snd = parselmouth.Sound(y, sampling_frequency=sr)
        pitch_obj = call(snd, "To Pitch", 0.0, 75, 600)
        pitch_values = call(pitch_obj, "To Matrix", 0.001)
        pitch_arr = np.array(pitch_values.values).flatten()

        # Filter out zeros (unvoiced)
        voiced = pitch_arr[pitch_arr > 0]

        if len(voiced) == 0:
            return {"mean": 0.0, "std": 0.0, "range": 0.0, "contour": pitch_arr}

        return {
            "mean": float(np.mean(voiced)),
            "std": float(np.std(voiced)),
            "range": float(np.max(voiced) - np.min(voiced)),
            "contour": pitch_arr,
        }
    except Exception:
        return {"mean": 0.0, "std": 0.0, "range": 0.0, "contour": np.array([])}


def extract_formants(y: np.ndarray, sr: int) -> dict:
    """Extract formant frequencies (F1, F2, F3) using Praat."""
    try:
        snd = parselmouth.Sound(y, sampling_frequency=sr)
        formant_obj = call(snd, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)

        f1_values = []
        f2_values = []
        f3_values = []

        n_frames = call(formant_obj, "Get number of frames")
        for i in range(1, min(n_frames + 1, 100)):  # sample first 100 frames
            f1 = call(formant_obj, "Get value at time", 1, i * 0.025, "Hertz", "Linear")
            f2 = call(formant_obj, "Get value at time", 2, i * 0.025, "Hertz", "Linear")
            f3 = call(formant_obj, "Get value at time", 3, i * 0.025, "Hertz", "Linear")
            if f1 > 0: f1_values.append(f1)
            if f2 > 0: f2_values.append(f2)
            if f3 > 0: f3_values.append(f3)

        return {
            "f1_mean": float(np.mean(f1_values)) if f1_values else 0.0,
            "f2_mean": float(np.mean(f2_values)) if f2_values else 0.0,
            "f3_mean": float(np.mean(f3_values)) if f3_values else 0.0,
        }
    except Exception:
        return {"f1_mean": 0.0, "f2_mean": 0.0, "f3_mean": 0.0}


def extract_energy(y: np.ndarray) -> dict:
    """Extract energy (RMS) envelope and statistics."""
    rms = librosa.feature.rms(y=y)[0]
    return {
        "mean": float(np.mean(rms)),
        "std": float(np.std(rms)),
        "max": float(np.max(rms)),
        "envelope": rms,
    }


def compute_speaking_rate(y: np.ndarray, sr: int) -> float:
    """Estimate speaking rate in syllables/second using energy peaks."""
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    # Smooth the envelope
    from scipy.ndimage import uniform_filter1d
    smoothed = uniform_filter1d(rms, size=5)

    # Find energy peaks (each peak ~= a syllable)
    threshold = np.mean(smoothed) * 0.6
    peaks = []
    for i in range(1, len(smoothed) - 1):
        if smoothed[i] > threshold and smoothed[i] > smoothed[i - 1] and smoothed[i] >= smoothed[i + 1]:
            peaks.append(i)

    duration = len(y) / sr
    if duration <= 0:
        return 0.0

    return len(peaks) / duration


# ── Reference formant data for Philippine language vowels ─────────────

# Typical F1/F2 ranges for Philippine language vowels (Hz)
_VOWEL_FORMANTS: dict[str, dict[str, float]] = {
    "a":  {"f1": 730, "f2": 1090, "f1_std": 80, "f2_std": 120},
    "ɛ":  {"f1": 530, "f2": 1840, "f1_std": 70, "f2_std": 150},
    "e":  {"f1": 530, "f2": 1840, "f1_std": 70, "f2_std": 150},
    "i":  {"f1": 270, "f2": 2290, "f1_std": 50, "f2_std": 130},
    "o":  {"f1": 570, "f2":  840, "f1_std": 60, "f2_std": 100},
    "u":  {"f1": 300, "f2":  870, "f1_std": 50, "f2_std": 100},
    "ə":  {"f1": 500, "f2": 1500, "f1_std": 60, "f2_std": 120},
}


# ── Scoring engine ────────────────────────────────────────────────────

def _score_vowel_accuracy(expected_phonemes: list[str], formants: dict) -> float:
    """Score how well the formants match expected vowel sounds."""
    vowels_in_text = [p for p in expected_phonemes if p in _VOWEL_FORMANTS]
    if not vowels_in_text or formants["f1_mean"] == 0:
        return 0.7  # neutral score if no vowels or no formant data

    total_distance = 0.0
    for v in vowels_in_text:
        ref = _VOWEL_FORMANTS[v]
        f1_dist = abs(formants["f1_mean"] - ref["f1"]) / ref["f1_std"]
        f2_dist = abs(formants["f2_mean"] - ref["f2"]) / ref["f2_std"]
        total_distance += (f1_dist + f2_dist) / 2

    avg_distance = total_distance / len(vowels_in_text)
    # Convert distance to accuracy (0-1): 0 distance = 1.0, >3 std = ~0.3
    accuracy = max(0.0, min(1.0, 1.0 - avg_distance / 4.0))
    return accuracy


def _score_pitch_accuracy(expected_phonemes: list[str], pitch: dict) -> float:
    """Score pitch stability and appropriateness."""
    if pitch["mean"] == 0 or pitch["std"] == 0:
        return 0.5  # can't evaluate

    # For Philippine languages, pitch should be relatively stable
    # (less tonal variation than Chinese/Japanese)
    cv_of_pitch = pitch["std"] / pitch["mean"] if pitch["mean"] > 0 else 1.0

    # Good: CV < 0.15 (stable), bad: CV > 0.4 (too variable)
    if cv_of_pitch < 0.15:
        return 0.95
    elif cv_of_pitch < 0.25:
        return 0.85
    elif cv_of_pitch < 0.4:
        return 0.7
    else:
        return 0.5


def _score_energy_consistency(energy: dict) -> float:
    """Score how consistent the energy (volume) is."""
    if energy["mean"] == 0:
        return 0.5

    cv = energy["std"] / energy["mean"] if energy["mean"] > 0 else 1.0

    # Consistent energy is good; too quiet or too variable is bad
    if energy["mean"] < 0.01:
        return 0.4  # too quiet
    if cv < 0.3:
        return 0.9
    elif cv < 0.5:
        return 0.75
    else:
        return 0.55


def _score_mfcc_match(actual_mfcc: np.ndarray, expected_phonemes: list[str]) -> tuple[float, list[PhonemeResult]]:
    """Compare MFCC features against expected phonemes and score per-phoneme."""
    phoneme_results: list[PhonemeResult] = []

    if actual_mfcc.shape[1] < 2:
        return 0.5, [PhonemeResult(expected=p, heard=p, correct=False, confidence=0.5, tip="Audio too short")
                     for p in expected_phonemes]

    # Segment the audio MFCC by energy changes (rough phoneme boundaries)
    # Use the mean energy across MFCC frames as a proxy
    frame_energy = np.mean(actual_mfcc[:13, :] ** 2, axis=0)

    # Find segment boundaries via local minima
    n_frames = len(frame_energy)
    n_phonemes = max(1, len(expected_phonemes))

    # Divide audio into roughly equal segments (one per expected phoneme)
    segment_size = max(1, n_frames // n_phonemes)

    for i, phoneme in enumerate(expected_phonemes):
        start = i * segment_size
        end = min((i + 1) * segment_size, n_frames)

        if start >= n_frames:
            phoneme_results.append(PhonemeResult(
                expected=phoneme, heard="∅", correct=False, confidence=0.2,
                tip=f"Phoneme '{phoneme}' not detected — audio may be too short"
            ))
            continue

        segment = actual_mfcc[:, start:end]
        segment_energy = frame_energy[start:end]

        # Check if this segment has significant energy (phoneme was spoken)
        has_energy = np.mean(segment_energy) > np.mean(frame_energy) * 0.3

        if not has_energy:
            phoneme_results.append(PhonemeResult(
                expected=phoneme, heard="∅", correct=False, confidence=0.3,
                tip=f"Phoneme '{phoneme}' appears silent or very weak"
            ))
            continue

        # For vowels, check if formant-like structure is present in MFCC
        if phoneme in _VOWEL_FORMANTS:
            # Vowels should have strong low-order MFCCs (formant structure)
            low_mfcc_energy = np.mean(segment[:5, :] ** 2)
            high_mfcc_energy = np.mean(segment[5:, :] ** 2)
            formant_strength = low_mfcc_energy / (high_mfcc_energy + 1e-6)

            if formant_strength > 2.0:
                confidence = min(0.95, 0.6 + formant_strength * 0.05)
                phoneme_results.append(PhonemeResult(
                    expected=phoneme, heard=phoneme, correct=True,
                    confidence=round(confidence, 2)
                ))
            else:
                phoneme_results.append(PhonemeResult(
                    expected=phoneme, heard=phoneme, correct=False,
                    confidence=round(max(0.3, 0.6 - formant_strength * 0.05), 2),
                    tip=f"Vowel '{phoneme}' may need more open mouth position"
                ))
        else:
            # Consonants — check for high-frequency energy (fricatives)
            # or sudden onsets (plosives)
            if phoneme in ("s", "ʃ", "f", "h", "θ"):
                # Fricatives need high-frequency energy
                hf_energy = np.mean(segment[10:, :] ** 2)
                if hf_energy > np.mean(frame_energy) * 0.1:
                    phoneme_results.append(PhonemeResult(
                        expected=phoneme, heard=phoneme, correct=True, confidence=0.8
                    ))
                else:
                    phoneme_results.append(PhonemeResult(
                        expected=phoneme, heard=phoneme, correct=False, confidence=0.5,
                        tip=f"Fricative '{phoneme}' needs more air flow"
                    ))
            elif phoneme in ("p", "t", "k", "b", "d", "ɡ"):
                # Plosives should have a burst (energy spike)
                energy_diff = np.max(segment_energy) - np.min(segment_energy)
                if energy_diff > np.mean(frame_energy) * 0.3:
                    phoneme_results.append(PhonemeResult(
                        expected=phoneme, heard=phoneme, correct=True, confidence=0.75
                    ))
                else:
                    phoneme_results.append(PhonemeResult(
                        expected=phoneme, heard=phoneme, correct=False, confidence=0.5,
                        tip=f"Plosive '{phoneme}' needs a sharper release"
                    ))
            else:
                # Default: assume correct if energy is present
                phoneme_results.append(PhonemeResult(
                    expected=phoneme, heard=phoneme, correct=True, confidence=0.7
                ))

    # Overall score from phoneme results
    if phoneme_results:
        correct_count = sum(1 for p in phoneme_results if p.correct)
        avg_confidence = np.mean([p.confidence for p in phoneme_results])
        score = (correct_count / len(phoneme_results) * 0.6 + avg_confidence * 0.4)
    else:
        score = 0.5

    return score, phoneme_results


# ── Main scoring function ─────────────────────────────────────────────

def score_pronunciation(
    audio_bytes: bytes,
    expected_text: str,
    language: str = "ceb",
    filename: str = "recording.m4a",
) -> PronunciationScore:
    """Analyze pronunciation from audio and expected text.

    Parameters
    ----------
    audio_bytes : bytes
        Raw audio file bytes (M4A, WAV, MP3).
    expected_text : str
        The text the user was supposed to say.
    language : str
        ISO 639 code for the language.
    filename : str
        Original filename for format detection.

    Returns
    -------
    PronunciationScore
        Detailed score with per-phoneme breakdown and acoustic metrics.
    """
    # 1. Load audio
    y, sr = load_audio_from_bytes(audio_bytes, filename)

    if len(y) < sr * 0.3:  # less than 300ms
        return PronunciationScore(
            score=0,
            feedback="Audio is too short. Please speak for at least 1 second.",
            phoneme_breakdown=[],
            metrics=AcousticMetrics(duration_seconds=len(y) / sr),
        )

    duration = len(y) / sr

    # 2. Extract features
    mfcc = extract_mfcc(y, sr)
    pitch = extract_pitch(y, sr)
    formants = extract_formants(y, sr)
    energy = extract_energy(y)
    speaking_rate = compute_speaking_rate(y, sr)

    # 3. Convert expected text to phonemes
    expected_phonemes = text_to_phonemes(expected_text, language)

    # 4. Score each dimension
    mfcc_score, phoneme_results = _score_mfcc_match(mfcc, expected_phonemes)
    vowel_accuracy = _score_vowel_accuracy(expected_phonemes, formants)
    pitch_accuracy = _score_pitch_accuracy(expected_phonemes, pitch)
    energy_score = _score_energy_consistency(energy)

    # 5. Weighted composite score
    composite = (
        mfcc_score * 0.35          # phoneme-level acoustic match
        + vowel_accuracy * 0.25    # formant accuracy for vowels
        + pitch_accuracy * 0.15    # pitch stability
        + energy_score * 0.15      # energy consistency
        + min(1.0, speaking_rate / 5.0) * 0.10  # speaking rate (ideal ~4-6 syl/sec)
    )

    score = max(0, min(100, int(composite * 100)))

    # 6. Generate feedback
    feedback = _generate_feedback(score, phoneme_results, pitch, formants, speaking_rate, language)

    # 7. Build metrics
    metrics = AcousticMetrics(
        pitch_accuracy=round(pitch_accuracy, 2),
        formant_accuracy=round(vowel_accuracy, 2),
        energy_consistency=round(energy_score, 2),
        speaking_rate=round(speaking_rate, 1),
        pitch_mean=round(pitch["mean"], 1),
        pitch_std=round(pitch["std"], 1),
        duration_seconds=round(duration, 2),
    )

    return PronunciationScore(
        score=score,
        feedback=feedback,
        phoneme_breakdown=phoneme_results,
        metrics=metrics,
    )


# ── Feedback generation ───────────────────────────────────────────────

def _generate_feedback(
    score: int,
    phonemes: list[PhonemeResult],
    pitch: dict,
    formants: dict,
    speaking_rate: float,
    language: str,
) -> str:
    """Generate human-readable feedback from analysis results."""
    parts: list[str] = []

    # Overall
    if score >= 90:
        parts.append("Excellent pronunciation!")
    elif score >= 75:
        parts.append("Good pronunciation overall.")
    elif score >= 55:
        parts.append("Decent attempt — a few areas to work on.")
    else:
        parts.append("Keep practicing — focus on the tips below.")

    # Specific phoneme issues
    wrong = [p for p in phonemes if not p.correct and p.tip]
    if wrong:
        tips = [f"• {p.expected}: {p.tip}" for p in wrong[:3]]
        parts.append(" ".join(tips))

    # Speaking rate
    if speaking_rate < 2.5:
        parts.append("Try speaking a bit faster — your pace was slow.")
    elif speaking_rate > 7:
        parts.append("Try slowing down slightly for clearer pronunciation.")

    # Pitch
    if pitch["std"] > 0 and pitch["mean"] > 0:
        cv = pitch["std"] / pitch["mean"]
        if cv > 0.35:
            parts.append("Your pitch varies a lot — try to keep a steadier tone.")

    # Vowels
    if formants["f1_mean"] > 0:
        vowel_wrong = [p for p in phonemes if p.expected in _VOWEL_FORMANTS and not p.correct]
        if len(vowel_wrong) > len(phonemes) * 0.3:
            parts.append("Focus on vowel sounds — open your mouth more for 'a' and round it for 'o'/'u'.")

    return " ".join(parts)
