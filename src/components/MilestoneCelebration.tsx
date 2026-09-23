import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Dimensions, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, radius } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── MILESTONE CONFIG ──────────────────────────────────────────
export interface Milestone {
  days: number;
  emoji: string;
  title: string;
  message: string;
  colors: [string, string];
  badge: string;
}

export const STREAK_MILESTONES: Milestone[] = [
  { days: 3,   emoji: '🌱', title: '3-Day Streak!',   message: 'You\'re building the habit. Keep going!',          colors: ['#2DDC8C', '#0DAE6C'], badge: 'Seedling' },
  { days: 7,   emoji: '🔥', title: 'One Week Strong!', message: 'A full week of consistency. You\'re unstoppable!',  colors: ['#FF6B35', '#FF8C42'], badge: 'Weekly Warrior' },
  { days: 14,  emoji: '⚡', title: '2-Week Champion!', message: 'Two weeks in. Your discipline is showing.',        colors: ['#7B61FF', '#9B80FF'], badge: 'Fortnight Force' },
  { days: 21,  emoji: '🏆', title: '21-Day Habit!',    message: 'Science says 21 days makes a habit. You did it!', colors: ['#FFB830', '#FF8C42'], badge: 'Habit Former' },
  { days: 30,  emoji: '💎', title: '30-Day Legend!',   message: 'A whole month of showing up. Legendary.',         colors: ['#00C9FF', '#0079FF'], badge: 'Monthly Legend' },
  { days: 50,  emoji: '🚀', title: '50 Days!',         message: 'Halfway to 100. You are in elite territory.',      colors: ['#FF6B9D', '#FF4081'], badge: 'Momentum Machine' },
  { days: 100, emoji: '👑', title: '100-Day KING!',    message: 'One hundred days. You are the standard.',         colors: ['#FFD700', '#FFA500'], badge: 'Centurion Crown' },
];

// Check if a streak count hits a milestone
export const checkStreakMilestone = (streakCount: number): Milestone | null => {
  return STREAK_MILESTONES.find(m => m.days === streakCount) ?? null;
};

// ── CONFETTI PARTICLE ─────────────────────────────────────────
const CONFETTI_COLORS = ['#2DDC8C', '#FF6B9D', '#FFB830', '#7B61FF', '#00C9FF', '#FF6B35'];
const PARTICLE_COUNT = 24;

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;

  const startX = Math.random() * SCREEN_W;
  const endX   = startX + (Math.random() - 0.5) * 200;
  const duration = 1500 + Math.random() * 1000;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H * 0.7, duration, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: endX - startX, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(duration - 400),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 4, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View style={[
      styles.particle,
      {
        left: startX,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: rotateStr }],
      },
    ]} />
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
interface Props {
  milestone: Milestone | null;
  onDismiss: () => void;
}

export function MilestoneCelebration({ milestone, onDismiss }: Props) {
  const scale   = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!milestone) return;
    // Pop-in animation
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [milestone]);

  const handleShare = async () => {
    if (!milestone) return;
    try {
      await Share.share({
        message: `${milestone.emoji} I just hit a ${milestone.days}-day streak on Fitness App!\n\n"${milestone.message}"\n\nJoin me 👉 https://fitness-app.demo`,
        title: `${milestone.days}-Day Streak Achievement`,
      });
    } catch {}
  };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onDismiss);
  };

  if (!milestone) return null;

  return (
    <Modal visible={!!milestone} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Confetti particles */}
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <ConfettiParticle
            key={i}
            delay={i * 60}
            color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
          />
        ))}

        {/* Card */}
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient colors={milestone.colors} style={styles.cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {/* Emoji */}
            <Text style={styles.bigEmoji}>{milestone.emoji}</Text>

            {/* Days badge */}
            <View style={styles.daysBadge}>
              <Text style={styles.daysNum}>{milestone.days}</Text>
              <Text style={styles.daysLabel}>DAYS</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{milestone.title}</Text>
            <Text style={styles.message}>{milestone.message}</Text>

            {/* Badge earned */}
            <View style={styles.badgeRow}>
              <Ionicons name="ribbon-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.badgeText}>Badge earned: {milestone.badge}</Text>
            </View>
          </LinearGradient>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.75}>
              <Text style={styles.dismissText}>Keep Going 💪</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  particle:    { position: 'absolute', top: 0, width: 10, height: 10, borderRadius: 2 },
  card:        { width: SCREEN_W - 48, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  cardGrad:    { padding: 32, alignItems: 'center', gap: spacing.sm },
  bigEmoji:    { fontSize: 72, marginBottom: spacing.sm },
  daysBadge:   { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 99, flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: spacing.sm },
  daysNum:     { fontSize: 40, fontWeight: '900', color: '#fff' },
  daysLabel:   { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
  title:       { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  message:     { fontSize: fontSize.base, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, marginTop: spacing.sm },
  badgeText:   { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  actions:     { backgroundColor: '#161820', padding: spacing.lg, gap: spacing.sm },
  shareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 12, borderRadius: radius.md },
  shareBtnText:{ color: '#fff', fontWeight: '700', fontSize: fontSize.base },
  dismissBtn:  { backgroundColor: '#2DDC8C', paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  dismissText: { color: '#fff', fontWeight: '800', fontSize: fontSize.base },
});