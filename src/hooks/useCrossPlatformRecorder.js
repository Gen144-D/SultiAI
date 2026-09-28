import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

/**
 * Cross-platform audio recorder.
 * On native: wraps the expo-audio AudioRecorder
 * On web: uses MediaRecorder + getUserMedia
 *
 * Returns the same shape used by SultiTutorScreen:
 *  { isRecording, startRecording, stopRecording (-> base64), loading }
 */
export function useCrossPlatformRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const webRef = useRef(null);
  const nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => () => {
    if (nativeRecorder.isRecording) nativeRecorder.stop().catch(() => {});
  }, [nativeRecorder]);

  const startRecording = useCallback(async () => {
    if (isRecording) return false;

    if (Platform.OS === 'web') {
      try {
        const { createWebRecorder } = await import('../utils/webAudio');
        const recorder = createWebRecorder();
        await recorder.start();
        webRef.current = recorder;
        setIsRecording(true);
        return true;
      } catch (err) {
        console.error('[Recorder] web start failed:', err.message);
        return false;
      }
    }

    // Native path
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await nativeRecorder.prepareToRecordAsync();
      nativeRecorder.record();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('[Recorder] native start failed:', err.message);
      return false;
    }
  }, [isRecording, nativeRecorder]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return null;
    setLoading(true);
    try {
      if (Platform.OS === 'web' && webRef.current) {
        const base64 = await webRef.current.stop();
        webRef.current = null;
        setIsRecording(false);
        return base64;
      }
      await nativeRecorder.stop();
      const uri = nativeRecorder.uri;
      setIsRecording(false);
      if (!uri) return null;
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      return await readAsStringAsync(uri, { encoding: 'base64' });
    } catch (err) {
      console.error('[Recorder] stop failed:', err.message);
      webRef.current = null;
      setIsRecording(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isRecording, nativeRecorder]);

  return { isRecording, loading, startRecording, stopRecording };
}
