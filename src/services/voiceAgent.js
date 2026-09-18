import { api } from './api';

export const REALTIME_INPUT_RATE = 24000;

export async function fetchVoiceAgentConfig() {
  try {
    const status = await api.voiceStatus();
    if (status.mode === 'not_configured') {
      throw new Error('Voice pipeline not configured');
    }
    return { pipeline: true, groq: status.groq, openrouter_tts: status.openrouter_tts };
  } catch (err) {
    throw err;
  }
}

export async function checkVoiceMode() {
  try {
    const status = await api.voiceStatus();
    return {
      pipeline: status.mode === 'full_pipeline',
      groq: status.groq,
      openrouter_tts: status.openrouter_tts,
    };
  } catch {
    return { pipeline: false, groq: false, openrouter_tts: false };
  }
}

export function encodePcm16ToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const CHUNK = 0x4000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function encodeWavBase64(int16Array, sampleRate) {
  const buffer = new ArrayBuffer(44 + int16Array.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + int16Array.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, int16Array.length * 2, true);

  let offset = 44;
  for (let i = 0; i < int16Array.length; i++) {
    view.setInt16(offset, int16Array[i], true);
    offset += 2;
  }

  const bytes = new Uint8Array(view.buffer);
  let binary = '';
  const CHUNK = 0x4000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function resampleInt16(arrayBuffer, fromRate, toRate) {
  if (!fromRate || fromRate === toRate) return arrayBuffer;
  const src = new Int16Array(arrayBuffer);
  if (!src.length) return arrayBuffer;
  const outLen = Math.max(1, Math.round(src.length * (toRate / fromRate)));
  const out = new Int16Array(outLen);
  const ratio = src.length / outLen;
  for (let i = 0; i < outLen; i++) {
    out[i] = src[Math.min(src.length - 1, Math.round(i * ratio))];
  }
  return out.buffer;
}
