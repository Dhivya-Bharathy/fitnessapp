import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

let recording: Audio.Recording | null = null;

/** Requests microphone permission from the user. @returns Whether permission was granted. */
export const requestMicPermission = async (): Promise<boolean> => {
  try {
    const { status: existing } = await Audio.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
};

/** Starts an audio recording. @returns Whether recording started successfully. */
export const startRecording = async (): Promise<boolean> => {
  try {
    const granted = await requestMicPermission();
    if (!granted) return false;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;
    return true;
  } catch (e) { if (__DEV__) console.error('startRecording error:', e); return false; }
};

/** Stops the current audio recording and returns the file URI. @returns The recording file URI, or null if no recording was in progress. */
export const stopRecording = async (): Promise<string | null> => {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    return uri ?? null;
  } catch (e) { recording = null; return null; }
};

/** Cancels the current audio recording without saving. */
export const cancelRecording = async (): Promise<void> => {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
    recording = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch { recording = null; }
};

/** Transcribes an audio file using Deepgram speech-to-text via Supabase Edge Function proxy. @param uri - The file URI of the audio recording. @returns The transcribed text, or null on failure. */
export const transcribeAudio = async (uri: string): Promise<string | null> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    const { data, error } = await supabase.functions.invoke('deepgram-proxy', {
      body: { audioBase64: base64, mimeType: 'audio/m4a' },
    });

    if (error) {
      if (__DEV__) console.error('Deepgram proxy error:', error);
      return null;
    }

    const transcript = data?.transcript?.trim();
    return transcript || null;

  } catch (e) {
    if (__DEV__) console.error('transcribeAudio error:', e);
    return null;
  }
};

/** Formats a duration in milliseconds to mm:ss format. @param ms - Duration in milliseconds. @returns Formatted string in mm:ss. */
export const formatDuration = (ms: number): string => {
  const secs = Math.floor(ms / 60);
  const mins = Math.floor(secs / 60);
  return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
};
