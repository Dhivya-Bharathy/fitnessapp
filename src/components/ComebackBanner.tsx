import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../services/supabase';
import { colors, spacing, radius, fontSize } from '../theme';

const DISMISS_KEY = 'calfit_comeback_dismissed_at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const COMEBACK_MESSAGES = [
  { emoji: '👋', title: 'Welcome back!', sub: 'Your goals are still here — let\'s pick up where you left off.' },
  { emoji: '🔥', title: 'The streak starts now', sub: 'Every champion has a comeback story. Today is yours.' },
  { emoji: '💪', title: 'Good to see you again', sub: 'Your body is ready. Let\'s get back in the rhythm.' },
  { emoji: '🌟', title: 'You\'re back — let\'s go!', sub: 'Progress doesn\'t disappear. Jump back in and keep moving.' },
];

interface Props {
  userId: string;
  theme: typeof colors.dark;
  onDismiss?: () => void;
}

export function ComebackBanner({ userId, theme, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(COMEBACK_MESSAGES[0]);
  const [daysAway, setDaysAway] = useState(0);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (userId) checkInactivity();
  }, [userId]);

  const checkInactivity = async () => {
    try {
      // Check if recently dismissed
      const dismissedAt = await SecureStore.getItemAsync(DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt);
        if (elapsed < DISMISS_COOLDOWN_MS) return; // still in cooldown
      }

      // Get last activity from profiles
      const { data } = await supabase
        .from('profiles')
        .select('last_active_at, updated_at')
        .eq('id', userId)
        .single();

      if (!data) return;

      // Use last_active_at if available, else fall back to updated_at
      const lastActive = data.last_active_at ?? data.updated_at;
      if (!lastActive) return;

      const daysSince = Math.floor(
        (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince >= 2) {
        setDaysAway(daysSince);
        // Pick message based on days away
        const msgIndex = Math.min(daysSince - 2, COMEBACK_MESSAGES.length - 1);
        setMessage(COMEBACK_MESSAGES[msgIndex]);
        setVisible(true);

        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (e) {
      // Silent fail — banner is non-critical
    }
  };

  const handleDismiss = async () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));

    await SecureStore.setItemAsync(DISMISS_KEY, Date.now().toString());
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <LinearGradient
        colors={['#1A3A2A', '#0D2A1F']}
        style={[styles.banner, { borderColor: 'rgba(45,220,140,0.3)' }]}
      >
        <View style={styles.left}>
          <Text style={styles.emoji}>{message.emoji}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: '#fff' }]}>{message.title}</Text>
            {daysAway > 2 && (
              <View style={styles.daysBadge}>
                <Text style={styles.daysText}>{daysAway}d away</Text>
              </View>
            )}
          </View>
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
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title:     { fontSize: fontSize.base, fontWeight: '700' },
  daysBadge: { backgroundColor: 'rgba(45,220,140,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  daysText:  { fontSize: 10, color: '#2DDC8C', fontWeight: '700' },
  sub:       { fontSize: fontSize.xs, lineHeight: 16 },
  closeBtn:  { padding: 4 },
});