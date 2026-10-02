/**
 * Decodes an uploaded recording into mono PCM.
 *
 * Uncompressed RIFF/WAVE is parsed natively (no subprocess), which covers the
 * recordings the Deepgram agent and desktop clients send. Everything else —
 * m4a/AAC from the Expo recorder, mp3, webm/opus from browsers — is handed to
 * the `ffmpeg-static` binary, which ships with the server so no system-level
 * install is required.
 */

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export const ANALYSIS_SAMPLE_RATE = 22050;

export interface DecodedAudio {
  /** Mono samples nominally in [-1, 1]. */
  samples: Float32Array;
  sampleRate: number;
}

export class AudioDecodeError extends Error {}

const FFMPEG_TIMEOUT_MS = 20000;
const MAX_OUTPUT_BYTES = 128 * 1024 * 1024;

/** Decodes `buffer` to mono PCM at `targetRate` (no resampling when equal). */
export async function decodeAudio(
  buffer: Buffer,
  targetRate: number = ANALYSIS_SAMPLE_RATE
): Promise<DecodedAudio> {
  if (buffer.length < 100) {
    throw new AudioDecodeError('Audio data is empty or too small');
  }

  const wav = parseWav(buffer);
  if (wav) {
    return {
      samples: resample(wav.samples, wav.sampleRate, targetRate),
      sampleRate: targetRate,
    };
  }

  const raw = await decodeWithFfmpeg(buffer, targetRate);
  if (raw.byteLength === 0) {
    throw new AudioDecodeError('Audio decode produced no samples');
  }

  const samples = new Float32Array(raw.byteLength / 4);
  for (let i = 0; i < samples.length; i++) samples[i] = raw.readFloatLE(i * 4);
  return { samples, sampleRate: targetRate };
}

function decodeWithFfmpeg(buffer: Buffer, sampleRate: number): Promise<Buffer> {
  const binary = typeof ffmpegPath === 'string' ? ffmpegPath : null;
  if (!binary) {
    throw new AudioDecodeError(
      'ffmpeg binary unavailable; only uncompressed WAV recordings can be scored'
    );
  }

  return new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(
      binary,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-i',
        'pipe:0',
        '-vn',
        '-ac',
        '1',
        '-ar',
        String(sampleRate),
        '-f',
        'f32le',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const chunks: Buffer[] = [];
    let total = 0;
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new AudioDecodeError(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);

    proc.stdout.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_OUTPUT_BYTES) {
        proc.kill('SIGKILL');
        return;
      }
      chunks.push(chunk);
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 2000) stderr += chunk.toString('utf8');
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new AudioDecodeError(`Failed to run ffmpeg: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new AudioDecodeError(`ffmpeg exited with code ${code}: ${stderr.trim().slice(0, 300)}`)
        );
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    proc.stdin.on('error', () => {
      // ffmpeg can close stdin early on malformed input; `close` reports the real error.
    });
    proc.stdin.end(buffer);
  });
}

interface WavAudio {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Parses a PCM/float RIFF WAVE file. Returns null for anything it does not
 * understand (compressed codecs, odd chunk layouts) so the caller can fall
 * back to ffmpeg.
 */
export function parseWav(buffer: Buffer): WavAudio | null {
  if (buffer.length < 44) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }

  let offset = 12;
  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let data: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (id === 'fmt ') {
      if (body + 16 > buffer.length) return null;
      format = buffer.readUInt16LE(body);
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === 'data') {
      data = buffer.subarray(body, Math.min(buffer.length, body + size));
    }

    offset = body + size + (size % 2);
  }

  if (!data || channels < 1 || sampleRate < 1) return null;

  const bytesPerSample = bitsPerSample / 8;
  if (!Number.isInteger(bytesPerSample) || bytesPerSample < 1 || bytesPerSample > 8) return null;

  const frameCount = Math.floor(data.length / (bytesPerSample * channels));
  if (frameCount < 1) return null;

  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      acc += readSample(data, (i * channels + c) * bytesPerSample, format, bitsPerSample);
    }
    samples[i] = acc / channels;
  }

  return { samples, sampleRate };
}

function readSample(data: Buffer, index: number, format: number, bitsPerSample: number): number {
  if (format === 3) {
    return bitsPerSample === 64 ? data.readDoubleLE(index) : data.readFloatLE(index);
  }

  switch (bitsPerSample) {
    case 8:
      // 8-bit PCM is unsigned with a 128 bias.
      return (data.readUInt8(index) - 128) / 128;
    case 16:
      return data.readInt16LE(index) / 32768;
    case 24: {
      const raw =
        data.readUInt8(index) |
        (data.readUInt8(index + 1) << 8) |
        (data.readUInt8(index + 2) << 16);
      const value = raw & 0x800000 ? raw - 0x1000000 : raw;
      return value / 8388608;
    }
    case 32:
      return data.readInt32LE(index) / 2147483648;
    default:
      return 0;
  }
}

/** Linear-interpolation resampler; a no-op when the rates already match. */
export function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || fromRate < 1 || samples.length === 0) return samples;

  const ratio = toRate / fromRate;
  const outLength = Math.max(1, Math.round(samples.length * ratio));
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const position = i / ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = position - left;
    out[i] = samples[left] * (1 - frac) + samples[right] * frac;
  }
  return out;
}
