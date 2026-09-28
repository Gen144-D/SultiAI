"""
Grapheme-to-Phoneme (G2P) conversion for Bisaya, Tagalog, and English.

Philippine languages have very regular orthography, so a lookup + rule
approach works well without external G2P libraries.
"""

from __future__ import annotations

# ── IPA symbol inventory used internally ──────────────────────────────

# Filipino / Bisaya phoneme set (simplified IPA)
_TAGALOG_PHONEMES: dict[str, str] = {
    # vowels
    "a": "a", "e": "ɛ", "i": "i", "o": "o", "u": "u",
    # single consonants
    "b": "b", "d": "d", "g": "ɡ", "h": "h", "k": "k",
    "l": "l", "m": "m", "n": "n", "p": "p", "r": "ɾ",
    "s": "s", "t": "t", "w": "w", "y": "j",
    # digraphs
    "ng": "ŋ", "ts": "tʃ", "dy": "dʒ", "ly": "ʎ",
    "sy": "ʃ",
}

# Common Bisaya/Tagalog affricates and clusters
_BISAYA_DIGRAPHS = {"ng", "ts", "dy", "ly", "sy"}

# Language codes/aliases routed through the Philippine-language G2P rules.
# "bisaya" / "cebuano" are the human-friendly names used by the app's API
# (the request default is language="bisaya"); "ceb" is the ISO 639-2 code.
_PHILIPPINE_LANGUAGE_CODES = {
    "ceb", "bisaya", "cebuano", "fil", "tl", "tagalog", "filipino",
    "hil", "hiligaynon", "war", "waray", "bcl", "bikol",
}

# ── English fallback (rule-based) ─────────────────────────────────────

_ENGLISH_PHONEMES: dict[str, str] = {
    "a": "æ", "b": "b", "c": "k", "d": "d", "e": "ɛ",
    "f": "f", "g": "ɡ", "h": "h", "i": "ɪ", "j": "dʒ",
    "k": "k", "l": "l", "m": "m", "n": "n", "o": "ɒ",
    "p": "p", "q": "k", "r": "ɹ", "s": "s", "t": "t",
    "u": "ʌ", "v": "v", "w": "w", "x": "ks", "y": "j", "z": "z",
}

# ── Public API ────────────────────────────────────────────────────────


def text_to_phonemes(text: str, language: str = "ceb") -> list[str]:
    """Convert a word/phrase to a list of IPA phoneme symbols.

    Parameters
    ----------
    text : str
        The word or short phrase to convert.
    language : str
        ISO 639 code: ``"ceb"`` (Bisaya), ``"fil"`` / ``"tl"`` (Tagalog),
        ``"en"`` (English).

    Returns
    -------
    list[str]
        Ordered list of IPA phoneme symbols.
    """
    text = text.lower().strip()
    lang = language.lower()

    if lang in _PHILIPPINE_LANGUAGE_CODES:
        return _philippine_g2p(text)
    elif lang == "en":
        return _english_g2p(text)
    else:
        # Fallback: treat each character as a phoneme
        return [c for c in text if c.isalpha()]


def _philippine_g2p(text: str) -> list[str]:
    """G2P for Philippine languages (Bisaya, Tagalog, Hiligaynon, etc.)."""
    phonemes: list[str] = []
    i = 0
    while i < len(text):
        # Try digraph first
        if i + 1 < len(text):
            digraph = text[i : i + 2]
            if digraph in _BISAYA_DIGRAPHS:
                phonemes.append(_TAGALOG_PHONEMES[digraph])
                i += 2
                continue

        ch = text[i]
        if ch in _TAGALOG_PHONEMES:
            phonemes.append(_TAGALOG_PHONEMES[ch])
        elif ch.isalpha():
            # Unknown letter — pass through as-is
            phonemes.append(ch)
        # skip non-alpha (spaces, punctuation)
        i += 1

    return phonemes


def _english_g2p(text: str) -> list[str]:
    """Simple rule-based English G2P."""
    phonemes: list[str] = []
    i = 0
    while i < len(text):
        ch = text[i]

        # Common digraphs
        if i + 1 < len(text):
            two = text[i : i + 2]
            if two == "th":
                phonemes.append("θ")
                i += 2
                continue
            elif two == "sh":
                phonemes.append("ʃ")
                i += 2
                continue
            elif two == "ch":
                phonemes.append("tʃ")
                i += 2
                continue
            elif two == "ph":
                phonemes.append("f")
                i += 2
                continue
            elif two == "wh":
                phonemes.append("w")
                i += 2
                continue
            elif two == "gh":
                i += 2  # silent
                continue
            elif two == "ck":
                phonemes.append("k")
                i += 2
                continue

        if ch in _ENGLISH_PHONEMES:
            phonemes.append(_ENGLISH_PHONEMES[ch])
        elif ch.isalpha():
            phonemes.append(ch)
        i += 1

    return phonemes


def get_phoneme_inventory(language: str = "ceb") -> list[str]:
    """Return the full phoneme inventory for a language."""
    lang = language.lower()
    if lang in _PHILIPPINE_LANGUAGE_CODES:
        return sorted(set(_TAGALOG_PHONEMES.values()))
    elif lang == "en":
        return sorted(set(_ENGLISH_PHONEMES.values()))
    return []
