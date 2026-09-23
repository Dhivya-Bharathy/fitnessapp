import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors, spacing, radius, fontSize } from '../theme';

const BURNOUT_MESSAGES = [
  { emoji: '🧘', title: 'Time to rest', sub: 'You\'ve been pushing hard lately. Your body needs a recovery day.' },
  { emoji: '🌿', title: 'Take a breather', sub: 'Low sleep + high activity — scale back today to avoid burnout.' },
  { emoji: '😴', title: 'Rest is part of progress', sub: 'Your sleep has been low. A rest day helps you come back stronger.' },
  { emoji: '🛀', title: 'You deserve a break', sub: 'Great consistency! But your body is asking for a recovery day.' },
];

interface Props {
  userId: string;
  theme: typeof colors.dark;
  onDismiss?: () => void;
}

export function BurnoutBanner({ userId, theme, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(BURNOUT_MESSAGES[0]);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (userId) checkBurnout();
  }, [userId]);

  const checkBurnout = async () => {
    try {
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(now.getDate() - 5);

      const [sleepRes, workoutRes] = await Promise.all([
        supabase.from('sleep_logs')
          .select('hours, date')
          .eq('user_id', userId)
          .gte('date', threeDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase.from('workout_sessions')
          .select('completed_at')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('completed_at', fiveDaysAgo.toISOString())
      ]);

      const sleepData = sleepRes.data ?? [];
      const workouts = workoutRes.data ?? [];

      if (sleepData.length === 0) return;

      const avgSleep = sleepData.reduce((s, d) => s + (d.hours ?? 0), 0) / sleepData.length;
      const workoutCount = workouts.length;

      if (avgSleep < 6 && workoutCount >= 2) {
        const idx = Math.min(workoutCount - 2, BURNOUT_MESSAGES.length - 1);
        setMessage(BURNOUT_MESSAGES[idx]);
        setVisible(true);
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    } catch {}
  };

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0, duration: 250, useNativeDriver: true,
    }).start(() => setVisible(false));
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <LinearGradient
        colors={['#3A1A3A', '#2A0D2A']}
        style={[styles.banner, { borderColor: 'rgba(255,107,53,0.3)' }]}
      >
        <View style={styles.left}>
          <Text style={styles.emoji}>{message.emoji}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={[styles.sub, { color: 'rgba(255,255,255,0.65)' }]}>{message.sub}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  banner:    { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  left:      { width: 36, alignItems: 'center' },
  emoji:     { fontSize: 24 },
  body:      { flex: 1, gap: 3 },
  title:     { fontSize: fontSize.base, fontWeight: '700', color: '#fff' },
  sub:       { fontSize: fontSize.xs, lineHeight: 16 },
  closeBtn:  { padding: 4 },
});
