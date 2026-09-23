import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { UserAvatar } from '../../modules/shared/UserAvatar';
import { supabase } from '../../services/supabase';
import { MilestoneCelebration, checkStreakMilestone, Milestone } from '../../components/MilestoneCelebration';

const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PINK   = '#FF6B9D';
const BLUE   = '#6699FF';
const GREEN  = '#2DDC8C';

const MILESTONES = [
  { days: 3,   emoji: '🔥', label: '3-Day Spark',      color: ORANGE },
  { days: 7,   emoji: '⚡', label: '1-Week Warrior',    color: GOLD   },
  { days: 14,  emoji: '💪', label: '2-Week Grinder',    color: PINK   },
  { days: 30,  emoji: '🏅', label: '30-Day Champion',   color: BLUE   },
  { days: 60,  emoji: '🥇', label: '60-Day Legend',     color: GREEN  },
  { days: 90,  emoji: '💎', label: '90-Day Diamond',    color: '#60A5FA' },
  { days: 180, emoji: '👑', label: '6-Month Royalty',   color: GOLD   },
  { days: 365, emoji: '🌟', label: '1-Year Immortal',   color: '#B280FF' },
];

interface PartnerInfo {
  partner_id: string; full_name: string; calfit_id: string;
  avatar_url: string | null; streak_count: number;
}

function DayDots({ streak, theme }: { streak: number; theme: typeof colors.dark }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const isToday = i === 6;
    const active  = streak > 0 && i >= 7 - Math.min(streak, 7);
    return { label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2), active, isToday };
  });
  const ringColors = [ORANGE, GOLD, PINK, BLUE, GREEN, '#60A5FA', '#B280FF'];
  return (
    <View style={dd.row}>
      {days.map((d, i) => (
        <View key={i} style={dd.dayWrap}>
          {d.active && d.isToday && <Text style={dd.fireAbove}>🔥</Text>}
          <View style={[dd.dot, {
            backgroundColor: d.active ? ringColors[i] : theme.border,
            borderColor:     d.isToday ? ringColors[i] : 'transparent',
            borderWidth:     d.isToday ? 2 : 0,
          }]}>
            {d.active && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={[dd.label, { color: d.active ? ringColors[i] : theme.textMuted }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}
const dd = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  dayWrap: { alignItems: 'center', gap: 4 },
  fireAbove: { fontSize: 10, marginBottom: -2 },
  dot:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: 10, fontWeight: '700' },
});

function PartnerCard({ partner, theme }: { partner: PartnerInfo; theme: typeof colors.dark }) {
  const pct = Math.min(partner.streak_count / 30, 1);
  return (
    <View style={[pc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <UserAvatar uri={partner.avatar_url} name={partner.full_name} size={44} theme={theme} />
      <View style={{ flex: 1 }}>
        <Text style={[pc.name, { color: theme.textPrimary }]}>{partner.full_name}</Text>
        <Text style={[pc.id, { color: theme.textMuted }]}>@{partner.calfit_id}</Text>
        <View style={[pc.bar, { backgroundColor: theme.border }]}>
          <View style={[pc.fill, { width: `${pct * 100}%`, backgroundColor: ORANGE }]} />
        </View>
      </View>
      <View style={[pc.badge, { backgroundColor: ORANGE + '18' }]}>
        <Text style={pc.badgeEmoji}>🔥</Text>
        <Text style={[pc.badgeNum, { color: ORANGE }]}>{partner.streak_count}</Text>
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  name:  { fontSize: fontSize.sm, fontWeight: '700' },
  id:    { fontSize: fontSize.xs, marginTop: 1 },
  bar:   { height: 4, borderRadius: 2, marginTop: spacing.xs, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
  badge: { alignItems: 'center', padding: spacing.sm, borderRadius: radius.md },
  badgeEmoji: { fontSize: 16 },
  badgeNum:   { fontSize: fontSize.base, fontWeight: '900', marginTop: 1 },
});

export default function StreaksScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile, updateProfile } = useAuthStore();
  const theme = colors[colorScheme];

  const streak         = (profile as any)?.streak_count ?? 0;
  const today          = new Date().toISOString().split('T')[0];
  const alreadyChecked = (profile as any)?.last_active_date === today;
  const hasFreezeThisWeek = (profile as any)?.streak_freeze_used_week === today?.slice(0, 7);

  const [partners, setPartners]         = useState<PartnerInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [milestone, setMilestone]       = useState<Milestone | null>(null);

  useFocusEffect(useCallback(() => {
    if (user?.id) loadPartners();
  }, [user?.id]));

  const loadPartners = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('partners')
        .select('partner_id, partner_profile:partner_id(full_name,calfit_id,avatar_url,streak_count)')
        .eq('user_id', user.id).eq('status', 'active');
      if (data) setPartners((data as any[]).map(p => ({
        partner_id:   p.partner_id,
        full_name:    p.partner_profile?.full_name    ?? 'Partner',
        calfit_id:    p.partner_profile?.calfit_id    ?? '',
        avatar_url:   p.partner_profile?.avatar_url   ?? null,
        streak_count: p.partner_profile?.streak_count ?? 0,
      })));
    } catch {}
  };

  const handleCheckIn = async () => {
    if (alreadyChecked || !user?.id) return;
    setIsCheckingIn(true);
    try {
      const newStreak = streak + 1;
      await supabase.from('profiles').update({
        streak_count: newStreak,
        last_active_date: today,
      }).eq('id', user.id);
      updateProfile({ streak_count: newStreak, last_active_date: today } as any);

      // ── Check for milestone celebration ──
      const hit = checkStreakMilestone(newStreak);
      if (hit) {
        setMilestone(hit);
      } else {
        Alert.alert('Streak extended! 🔥', `You're on a ${newStreak}-day streak. Keep it up!`);
      }
    } catch {
      Alert.alert('Error', 'Could not check in. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleFreezeStreak = () => {
    if (hasFreezeThisWeek) {
      Alert.alert('Already used', 'You can only freeze your streak once per week.');
      return;
    }
    Alert.alert(
      'Freeze Streak?',
      'This protects your streak for today if you miss a check-in. You can use this once per week.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Freeze', onPress: async () => {
          if (!user?.id) return;
          await supabase.from('profiles').update({
            streak_freeze_used_week: today.slice(0, 7),
          }).eq('id', user.id);
          updateProfile({ streak_freeze_used_week: today.slice(0, 7) } as any);
          Alert.alert('Streak frozen! 🧊', 'Your streak is protected for today.');
        }},
      ]
    );
  };

  const nextMilestone = MILESTONES.find(m => m.days > streak);
  const daysToNext    = nextMilestone ? nextMilestone.days - streak : 0;
  const refresh = async () => { setIsRefreshing(true); await loadPartners(); setIsRefreshing(false); };

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <LinearGradient
        colors={[ORANGE + 'EE', '#FF4500CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Streaks</Text>
          <Text style={styles.headerSub}>Stay consistent. Build momentum.</Text>
        </View>
        {!hasFreezeThisWeek && (
          <TouchableOpacity onPress={handleFreezeStreak} style={styles.freezeBtn}>
            <Text style={{ fontSize: 14 }}>🧊</Text>
            <Text style={styles.freezeBtnText}>Freeze</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={ORANGE} colors={[ORANGE]} />}
      >
        {/* ── STREAK HERO CARD ── */}
        <LinearGradient
          colors={[ORANGE + '22', GOLD + '11'] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: ORANGE + '40' }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroFire}>🔥</Text>
              <View>
                <Text style={[styles.heroNum, { color: theme.textPrimary }]}>{streak}</Text>
                <Text style={[styles.heroLabel, { color: ORANGE }]}>day streak</Text>
              </View>
            </View>
            {nextMilestone && (
              <View style={[styles.nextMilestone, { backgroundColor: nextMilestone.color + '18', borderColor: nextMilestone.color + '40' }]}>
                <Text style={{ fontSize: 18 }}>{nextMilestone.emoji}</Text>
                <Text style={[styles.nextMilestoneText, { color: nextMilestone.color }]}>
                  {daysToNext}d to{'\n'}{nextMilestone.label.split(' ').pop()}
                </Text>
              </View>
            )}
          </View>
          <DayDots streak={streak} theme={theme} />
          <TouchableOpacity
            onPress={handleCheckIn}
            disabled={alreadyChecked || isCheckingIn}
            style={[styles.checkinBtn, {
              backgroundColor: alreadyChecked ? theme.border : ORANGE,
              opacity: isCheckingIn ? 0.7 : 1,
            }]}
          >
            <Ionicons
              name={alreadyChecked ? 'checkmark-circle' : 'flame-outline'}
              size={18}
              color={alreadyChecked ? theme.textMuted : '#fff'}
            />
            <Text style={[styles.checkinText, { color: alreadyChecked ? theme.textMuted : '#fff' }]}>
              {alreadyChecked ? 'Checked in today ✓' : isCheckingIn ? 'Checking in…' : 'Check In Now'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── MILESTONE BADGES ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Milestone Badges</Text>
          <Text style={[styles.sectionSub, { color: theme.textMuted }]}>Earn by maintaining your streak</Text>
        </View>
        <View style={styles.badgesGrid}>
          {MILESTONES.map((m) => {
            const earned = streak >= m.days;
            return (
              <View key={m.days} style={[styles.badge, {
                backgroundColor: earned ? m.color + '18' : theme.card,
                borderColor: earned ? m.color + '50' : theme.border,
                opacity: earned ? 1 : 0.5,
              }]}>
                <Text style={styles.badgeEmoji}>{m.emoji}</Text>
                <Text style={[styles.badgeLabel, { color: earned ? m.color : theme.textMuted }]} numberOfLines={1}>{m.label}</Text>
                <Text style={[styles.badgeDays, { color: earned ? m.color : theme.textMuted }]}>{m.days}d</Text>
                {earned && (
                  <View style={[styles.badgeEarnedPill, { backgroundColor: m.color }]}>
                    <Text style={styles.badgeEarnedText}>✓</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── PARTNER STREAKS ── */}
        {partners.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Partner Streaks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accountability' as never)}>
                <Text style={[styles.seeAll, { color: theme.accent }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.partnerList}>
              {partners.map(p => <PartnerCard key={p.partner_id} partner={p} theme={theme} />)}
            </View>
          </>
        )}

        {/* ── STREAK TIPS ── */}
        <View style={[styles.tipsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.tipsTitle, { color: theme.textPrimary }]}>Keep Your Streak Alive</Text>
          {[
            '🍳 Log at least one meal each day',
            '💧 Hit your daily water goal',
            '🏋️ Complete at least one workout',
            '🧊 Use your weekly streak freeze wisely',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── MILESTONE CELEBRATION MODAL ── */}
      <MilestoneCelebration
        milestone={milestone}
        onDismiss={() => setMilestone(null)}
      />
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  scroll:   { paddingBottom: 40 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },
  backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  freezeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },
  freezeBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  heroCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.xl ?? 20, borderWidth: 1, padding: spacing.lg, gap: spacing.lg },
  heroTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroFire: { fontSize: 40 },
  heroNum:  { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  heroLabel:{ fontSize: fontSize.base, fontWeight: '700' },
  nextMilestone:  { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  nextMilestoneText: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  checkinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 13, borderRadius: radius.lg },
  checkinText:{ fontSize: fontSize.base, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700' },
  sectionSub:   { fontSize: fontSize.xs },
  seeAll:       { fontSize: fontSize.sm, fontWeight: '600' },
  badgesGrid:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  badge:        { width: '22%', alignItems: 'center', padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 3, position: 'relative' },
  badgeEmoji:   { fontSize: 22 },
  badgeLabel:   { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  badgeDays:    { fontSize: 9, fontWeight: '600' },
  badgeEarnedPill: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeEarnedText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  partnerList:  { paddingHorizontal: spacing.lg, gap: spacing.sm },
  tipsCard:     { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  tipsTitle:    { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.xs },
  tipRow:       { paddingVertical: spacing.xs },
  tipText:      { fontSize: fontSize.sm, lineHeight: 20 },
});