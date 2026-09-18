import { Platform } from 'react-native';

/**
 * Web-compatible audio recorder.
 * On native: uses expo-audio Recording + expo-file-system
 * On web: uses MediaRecorder + getUserMedia
 */

export function createWebRecorder() {
  let mediaRecorder = null;
  let audioChunks = [];
  let stream = null;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start();
    },
    async stop() {
      return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          reject(new Error('No active recording'));
          return;
        }
        mediaRecorder.onstop = async () => {
          try {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const base64 = await blobToBase64(blob);
            if (stream) {
              stream.getTracks().forEach((t) => t.stop());
              stream = null;
            }
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        mediaRecorder.stop();
      });
    },
    get isRecording() {
      return mediaRecorder && mediaRecorder.state === 'recording';
    },
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Web-compatible PCM stream capture.
 * On web: uses AudioContext + ScriptProcessorNode to get raw PCM int16 buffers
 * Returns { start(), stop(), onBuffer }
 */
export function createWebAudioStream({ sampleRate = 24000, onBuffer }) {
  let audioContext = null;
  let source = null;
  let processor = null;
  let micStream = null;

  return {
    async start() {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext({ sampleRate });
      source = audioContext.createMediaStreamSource(micStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        if (onBuffer) {
          onBuffer({ data: int16.buffer, sampleRate: audioContext.sampleRate, channels: 1, timestamp: e.timeStamp });
        }
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
    },
    stop() {
      if (processor) { processor.disconnect(); processor = null; }
      if (source) { source.disconnect(); source = null; }
      if (audioContext) { audioContext.close(); audioContext = null; }
      if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    },
  };
}

function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}
