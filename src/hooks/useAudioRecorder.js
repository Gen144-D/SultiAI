import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';

export function useAudioRecorder() {
  const [recording, setRecording] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const webRecorderRef = useRef(null);
  const nativeRecorderRef = useRef(null);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const { createWebRecorder } = await import('../utils/webAudio');
        const recorder = createWebRecorder();
        await recorder.start();
        webRecorderRef.current = recorder;
        setRecordingStatus('recording');
        return true;
      } catch (err) {
        Alert.alert('Error', `Could not start recording: ${err.message}`);
        return false;
      }
    }

    try {
      const { Audio } = await import('expo-audio');
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Microphone access is required for pronunciation practice.');
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const rec = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      nativeRecorderRef.current = { recorder: rec, readAsStringAsync };
      setRecording(rec);
      setRecordingStatus('recording');
      return true;
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web' && webRecorderRef.current) {
        const base64 = await webRecorderRef.current.stop();
        webRecorderRef.current = null;
        setRecordingStatus('idle');
        return base64;
      }

      if (nativeRecorderRef.current) {
        const { recorder, readAsStringAsync } = nativeRecorderRef.current;
        await recorder.stopAndUnloadAsync();
        const uri = recorder.getURI();
        nativeRecorderRef.current = null;
        setRecording(null);
        setRecordingStatus('idle');
        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
        return base64;
      }
      return null;
    } catch (err) {
      webRecorderRef.current = null;
      nativeRecorderRef.current = null;
      setRecording(null);
      setRecordingStatus('idle');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording || webRecorderRef.current) return stopRecording();
    return startRecording();
  }, [recording, startRecording, stopRecording]);

  return {
    recording, recordingStatus, loading,
    startRecording, stopRecording, toggleRecording,
    isRecording: recordingStatus === 'recording',
  };
}
