/**
 * Sniffs the container format of a base64-encoded audio recording from its
 * leading bytes, so callers can pick a sensible filename/MIME type without
 * duplicating the same base64-prefix checks everywhere.
 *
 * - "Ukl" is the base64 encoding of the RIFF magic bytes ("RIFF...") → WAV
 * - "SUk" is the base64 encoding of the ID3/RIFF-alt marker used by some
 *   recorders for WAV → WAV
 *
 * Anything else falls back to the caller-supplied default (recordings from
 * the mobile app / browser MediaRecorder are typically webm or m4a).
 */
export interface AudioFormat {
  filename: string;
  mimeType: string;
}

const DEFAULT_FORMAT: AudioFormat = { filename: 'recording.webm', mimeType: 'audio/webm' };

export function detectAudioFormat(base64: string, fallback: AudioFormat = DEFAULT_FORMAT): AudioFormat {
  if (base64.startsWith('Ukl') || base64.startsWith('SUk')) {
    return { filename: 'recording.wav', mimeType: 'audio/wav' };
  }
  return fallback;
}
