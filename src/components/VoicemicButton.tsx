// src/components/VoiceMicButton.tsx
// Reusable animated mic button — Coach, Chat, MealPlanner

import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Animated,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import {
  startRecording, stopRecording, cancelRecording,
  transcribeAudio, formatDuration,
} from '../services/VoiceRecorderService';

const RED = '#FF5959';

interface Props {
  theme: typeof colors.dark;
  onTranscribed: (text: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  size?: number;
}

export function VoiceMicButton({
  theme, onTranscribed, onRecordingChange, size = 40,
}: Props) {
  const [isRecording, setIsRecording]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration]         = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const anim  = useRef<Animated.CompositeAnimation | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 500, useNativeDriver: true }),
        ])
      );
      anim.current.start();

      let ms = 0;
      timer.current = setInterval(() => {
        ms += 100;
        setDuration(ms);
        if (ms >= 60000) handleStop();
      }, 100);
    } else {
      anim.current?.stop();
      pulse.setValue(1);
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      setDuration(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isRecording]);

  const handlePress = () => {
    if (isProcessing) return;
    isRecording ? handleStop() : handleStart();
  };

  const handleStart = async () => {
    const started = await startRecording();
    if (!started) {
      Alert.alert(
        'Microphone Access Needed',
        'Fitness App needs microphone access to record voice notes. Go to your device Settings → Privacy → Microphone and enable Fitness App.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsRecording(true);
    onRecordingChange?.(true);
  };

  const handleStop = async () => {
    setIsRecording(false);
    onRecordingChange?.(false);
    setIsProcessing(true);

    const uri = await stopRecording();
    if (!uri) { setIsProcessing(false); return; }

    const text = await transcribeAudio(uri);
    setIsProcessing(false);

    if (text) {
      onTranscribed(text);
    } else {
      Alert.alert(
        'Could not transcribe',
        'Could not understand the audio. Please speak clearly and try again, or type your message.',
        [{ text: 'OK' }]
      );
    }
  };

  const color = isRecording ? RED : isProcessing ? theme.textMuted : theme.accent;

  return (
    <View style={styles.wrap}>
      {isRecording && (
        <View style={[styles.badge, { backgroundColor: RED + '20', borderColor: RED + '40' }]}>
          <Text style={[styles.badgeText, { color: RED }]}>{formatDuration(duration)}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handlePress}
        onLongPress={async () => {
          if (!isRecording) return;
          setIsRecording(false);
          onRecordingChange?.(false);
          await cancelRecording();
          setIsProcessing(false);
        }}
        delayLongPress={600}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.btn, {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color + '20',
          borderColor: color + '55',
          transform: [{ scale: pulse }],
        }]}>
          <Ionicons
            name={
              isProcessing ? 'hourglass-outline' :
              isRecording  ? 'stop-circle' :
              'mic-outline'
            }
            size={size * 0.48}
            color={color}
          />
        </Animated.View>
      </TouchableOpacity>

      {isRecording && (
        <Text style={[styles.hint, { color: theme.textMuted }]}>tap to stop</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { alignItems: 'center', gap: 2 },
  btn:       { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  hint:      { fontSize: 9, fontWeight: '600' },
});