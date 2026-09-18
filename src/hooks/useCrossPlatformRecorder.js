import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Cross-platform audio recorder.
 * On native: wraps expo-audio Recording
 * On web: uses MediaRecorder + getUserMedia
 *
 * Returns the same shape used by SultiTutorScreen:
 *  { isRecording, startRecording, stopRecording (-> base64), loading }
 */
export function useCrossPlatformRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const webRef = useRef(null);
  const nativeRef = useRef(null);

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
      const { Audio } = await import('expo-audio');
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return false;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      nativeRef.current = rec;
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('[Recorder] native start failed:', err.message);
      return false;
    }
  }, [isRecording]);

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
      if (nativeRef.current) {
        const rec = nativeRef.current;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        nativeRef.current = null;
        setIsRecording(false);
        if (uri) {
          const { readAsStringAsync } = await import('expo-file-system/legacy');
          return await readAsStringAsync(uri, { encoding: 'base64' });
        }
        return null;
      }
      setIsRecording(false);
      return null;
    } catch (err) {
      console.error('[Recorder] stop failed:', err.message);
      webRef.current = null;
      nativeRef.current = null;
      setIsRecording(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isRecording]);

  return { isRecording, loading, startRecording, stopRecording };
}
