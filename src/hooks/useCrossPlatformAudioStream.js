import { useRef, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Cross-platform audio stream hook.
 * Native: wraps expo-audio useAudioStream
 * Web: wraps MediaRecorder via createWebAudioStream
 *
 * Returns { stream: { start(), stop(), isStreaming }, isStreaming }
 * where stream.start() is async and stream.stop() is sync.
 */
export function useCrossPlatformAudioStream({ sampleRate = 24000, onBuffer }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null);
  const onBufferRef = useRef(onBuffer);
  onBufferRef.current = onBuffer;

  // Native: use expo-audio useAudioStream
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAudioStream } = require('expo-audio');
    const nativeStream = useAudioStream({
      channels: 1,
      encoding: 'int16',
      sampleRate,
      onBuffer,
    });
    return nativeStream;
  }

  // Web fallback
  const getStream = useCallback(() => {
    if (streamRef.current) return streamRef.current;

    let mediaRecorder = null;
    let audioContext = null;
    let source = null;
    let processor = null;
    let micStream = null;
    let chunks = [];

    const stream = {
      isStreaming: false,
      async start() {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Try MediaRecorder first for compatibility
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          // Also set up ScriptProcessor for real-time PCM buffers
          audioContext = new AudioContext({ sampleRate });
          source = audioContext.createMediaStreamSource(micStream);
          processor = audioContext.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            if (onBufferRef.current) {
              onBufferRef.current({ data: int16.buffer, sampleRate: audioContext.sampleRate, channels: 1, timestamp: e.timeStamp });
            }
          };
          source.connect(processor);
          processor.connect(audioContext.destination);
        }

        stream.isStreaming = true;
        setIsStreaming(true);
      },
      stop() {
        stream.isStreaming = false;
        setIsStreaming(false);
        if (processor) { try { processor.disconnect(); } catch {} processor = null; }
        if (source) { try { source.disconnect(); } catch {} source = null; }
        if (audioContext) { try { audioContext.close(); } catch {} audioContext = null; }
        if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
      },
    };
    streamRef.current = stream;
    return stream;
  }, [sampleRate]);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.stop();
    };
  }, []);

  return { stream: getStream(), isStreaming };
}
