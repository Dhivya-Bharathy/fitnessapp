import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { UserAvatar } from '../../modules/shared/UserAvatar';
import { supabase } from '../../services/supabase';
import { MilestoneCelebration, checkStreakMilestone, Milestone } from '../../components/MilestoneCelebration';
import { localDateIso, previousLocalDateIso } from '../../utils/localDate';
import { getProfile, updateProfileAdaptive } from '../../services/profileService';
import { readLocalStreak, writeLocalStreak } from '../../utils/localStreak';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { premiumGlassShadow } from '../../components/premium/premiumEffects';

const BG = '#050608';
const GLASS = 'rgba(255,255,255,0.06)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.55)';
const ACCENT = '#2DDC8C';
const ORANGE = '#FFB347';
const GOLD = '#FFD133';
const PINK = '#FF6B9D';
const BLUE = '#6699FF';
const GREEN = '#2DDC8C';

const glassShadow = premiumGlassShadow();

function streakAlert(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const MILESTONES = [
  { days: 3, emoji: '🔥', label: '3-Day Spark', color: ORANGE },
  { days: 7, emoji: '⚡', label: '1-Week Warrior', color: GOLD },
  { days: 14, emoji: '💪', label: '2-Week Grinder', color: PINK },
  { days: 30, emoji: '🏅', label: '30-Day Champion', color: BLUE },
  { days: 60, emoji: '🥇', label: '60-Day Legend', color: GREEN },
  { days: 90, emoji: '💎', label: '90-Day Diamond', color: '#60A5FA' },
  { days: 180, emoji: '👑', label: '6-Month Royalty', color: GOLD },
  { days: 365, emoji: '🌟', label: '1-Year Immortal', color: '#B280FF' },
];

interface PartnerInfo {
  partner_id: string;
  full_name: string;
  calfit_id: string;
  avatar_url: string | null;
  streak_count: number;
}

function DayDots({ streak }: { streak: number }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const isToday = i === 6;
    const active = streak > 0 && i >= 7 - Math.min(streak, 7);
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
      active,
      isToday,
    };
  });
  const ringColors = [ORANGE, GOLD, PINK, BLUE, GREEN, '#60A5FA', '#B280FF'];

  return (
    <View style={dd.row}>
      {days.map((d, i) => {
        const ring = ringColors[i];
        return (
          <View key={i} style={dd.dayWrap}>
            {d.active && d.isToday && <Text style={dd.fireAbove}>🔥</Text>}
            <View
              style={[
                dd.dot,
                d.active && { backgroundColor: ring, borderColor: ring },
                d.isToday && !d.active && {
                  borderColor: '#B280FF',
                  borderWidth: 2,
                  backgroundColor: 'rgba(178,128,255,0.25)',
                },
                !d.active && !d.isToday && {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                },
              ]}
            >
              {d.active && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={[dd.label, { color: d.isToday ? '#B280FF' : d.active ? ring : MUTED }]}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const dd = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  dayWrap: { alignItems: 'center', gap: 4 },
  fireAbove: { fontSize: 10, marginBottom: -2 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '700' },
});

function PartnerCard({ partner }: { partner: PartnerInfo }) {
  const pct = Math.min(partner.streak_count / 30, 1);
  return (
    <View style={[pc.card, glassShadow]}>
      <UserAvatar uri={partner.avatar_url} name={partner.full_name} size={44} theme={colorsDark} />
      <View style={{ flex: 1 }}>
        <Text style={pc.name}>{partner.full_name}</Text>
        <Text style={pc.id}>@{partner.calfit_id}</Text>
        <View style={pc.bar}>
          <View style={[pc.fill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
      <View style={pc.badge}>
        <Text style={pc.badgeEmoji}>🔥</Text>
        <Text style={pc.badgeNum}>{partner.streak_count}</Text>
      </View>
    </View>
  );
}

const colorsDark = {
  textPrimary: TEXT,
  textMuted: MUTED,
  border: GLASS_BORDER,
  card: GLASS,
  accent: ACCENT,
} as const;

const pc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
  },
  name: { fontSize: fontSize.sm, fontWeight: '700', color: TEXT },
  id: { fontSize: fontSize.xs, marginTop: 1, color: MUTED },
  bar: { height: 4, borderRadius: 2, marginTop: spacing.xs, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: ORANGE },
  badge: { alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: ORANGE + '22' },
  badgeEmoji: { fontSize: 16 },
  badgeNum: { fontSize: fontSize.base, fontWeight: '900', marginTop: 1, color: ORANGE },
});

const STREAK_TIPS = [
  { icon: 'restaurant-outline' as const, color: ACCENT, text: 'Log at least one meal each day' },
  { icon: 'water-outline' as const, color: '#4A90E2', text: 'Hit your daily water goal' },
  { icon: 'barbell-outline' as const, color: ORANGE, text: 'Complete at least one workout' },
  { icon: 'snow-outline' as const, color: '#B280FF', text: 'Use your weekly streak freeze wisely' },
];

export default function StreaksScreen() {
  const navigation = useNavigation<any>();
  const { user, profile, updateProfile } = useAuthStore();

  const streak = profile?.streak_count ?? 0;
  const today = localDateIso();
  const lastActive = profile?.last_active_date ?? null;
  const alreadyChecked = lastActive === today;
  const hasFreezeThisWeek = profile?.streak_freeze_used_week === true;

  const [partners, setPartners] = useState<PartnerInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      loadPartners();
      (async () => {
        const p = await getProfile(user.id);
        if (p) {
          updateProfile(p);
          return;
        }
        const local = await readLocalStreak(user.id);
        if (local) {
          updateProfile({
            streak_count: local.streak_count,
            last_active_date: local.last_active_date,
            streak_freeze_used_week: local.streak_freeze_used_week,
          });
        }
      })();
    }, [user?.id, updateProfile]),
  );

  const loadPartners = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('partners')
        .select(`
          partner_id,
          partner:profiles!partners_partner_id_fkey (
            full_name,
            calfit_id,
            avatar_url,
            streak_count
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        const { data: rows } = await supabase
          .from('partners')
          .select('partner_id')
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (!rows?.length) return;
        const enriched = await Promise.all(
          rows.map(async (row) => {
            const prof = await getProfile(row.partner_id);
            return {
              partner_id: row.partner_id,
              full_name: prof?.full_name ?? 'Partner',
              calfit_id: prof?.calfit_id ?? '',
              avatar_url: prof?.avatar_url ?? null,
              streak_count: prof?.streak_count ?? 0,
            };
          }),
        );
        setPartners(enriched);
        return;
      }

      if (data) {
        setPartners(
          (data as any[]).map((p) => ({
            partner_id: p.partner_id,
            full_name: p.partner?.full_name ?? 'Partner',
            calfit_id: p.partner?.calfit_id ?? '',
            avatar_url: p.partner?.avatar_url ?? null,
            streak_count: p.partner?.streak_count ?? 0,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  };

  const handleCheckIn = async () => {
    if (alreadyChecked || !user?.id) return;
    setIsCheckingIn(true);
    try {
      const yesterday = previousLocalDateIso();
      let newStreak = 1;
      if (lastActive === yesterday) {
        newStreak = streak + 1;
      } else if (lastActive === today) {
        setIsCheckingIn(false);
        return;
      }

      const saved = await updateProfileAdaptive(user.id, {
        streak_count: newStreak,
        last_active_date: today,
        streak_freeze_used_week: false,
      });

      if (!saved.ok) {
        await writeLocalStreak({
          userId: user.id,
          streak_count: newStreak,
          last_active_date: today,
          streak_freeze_used_week: false,
        });
        streakAlert(
          'Saved on this device',
          saved.message
            ? `Server: ${saved.message}\n\nYour ${newStreak}-day streak is stored locally. Run supabase/migrations/000_full_schema.sql for full sync.`
            : `Your ${newStreak}-day streak is stored on this device.`,
        );
      }

      updateProfile({
        streak_count: newStreak,
        last_active_date: today,
        streak_freeze_used_week: false,
      });

      const hit = checkStreakMilestone(newStreak);
      if (hit) {
        setMilestone(hit);
      } else if (saved.ok) {
        streakAlert('Streak extended! 🔥', `You're on a ${newStreak}-day streak. Keep it up!`);
      }
    } catch (e: any) {
      streakAlert('Error', e?.message || 'Could not check in. Please try again.');
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
        {
          text: 'Freeze',
          onPress: async () => {
            if (!user?.id) return;
            const saved = await updateProfileAdaptive(user.id, {
              streak_freeze_used_week: true,
              last_active_date: today,
            });
            if (!saved.ok) {
              await writeLocalStreak({
                userId: user.id,
                streak_count: streak,
                last_active_date: today,
                streak_freeze_used_week: true,
              });
            }
            updateProfile({ streak_freeze_used_week: true, last_active_date: today });
            streakAlert('Streak frozen! 🧊', 'Your streak is protected for today.');
          },
        },
      ],
    );
  };

  const nextMilestone = MILESTONES.find((m) => m.days > streak);
  const daysToNext = nextMilestone ? nextMilestone.days - streak : 0;
  const refresh = async () => {
    setIsRefreshing(true);
    await loadPartners();
    setIsRefreshing(false);
  };

  const nextShortLabel = nextMilestone
    ? nextMilestone.label.includes(' ')
      ? nextMilestone.label.split(' ').slice(1).join(' ')
      : nextMilestone.label
    : '';

  return (
    <AndroidSafeView backgroundColor={BG} style={styles.safe}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowMid} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
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
      </View>

      <ScreenScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
      >
        <View style={[styles.heroCard, glassShadow]}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroFire}>🔥</Text>
              <View>
                <Text style={styles.heroNum}>{streak}</Text>
                <Text style={styles.heroLabel}>day streak</Text>
              </View>
            </View>
            {nextMilestone && (
              <View
                style={[
                  styles.nextMilestone,
                  { backgroundColor: nextMilestone.color + '18', borderColor: nextMilestone.color + '55' },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{nextMilestone.emoji}</Text>
                <Text style={[styles.nextMilestoneText, { color: nextMilestone.color }]}>
                  {daysToNext}d to{'\n'}
                  {nextShortLabel}
                </Text>
              </View>
            )}
          </View>
          <DayDots streak={streak} />
          {alreadyChecked ? (
            <View style={styles.checkinDone}>
              <Ionicons name="checkmark-circle" size={18} color={MUTED} />
              <Text style={styles.checkinDoneText}>Checked in today ✓</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleCheckIn} disabled={isCheckingIn} activeOpacity={0.9}>
              <LinearGradient
                colors={['#FF8C42', '#FFD133']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.checkinBtn, { opacity: isCheckingIn ? 0.7 : 1 }]}
              >
                <Ionicons name="flame" size={18} color="#fff" />
                <Text style={styles.checkinText}>{isCheckingIn ? 'Checking in…' : 'Check In Now'}</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Milestone Badges</Text>
          <Text style={styles.sectionSub}>Earn by maintaining your streak</Text>
        </View>
        <View style={styles.badgesGrid}>
          {MILESTONES.map((m) => {
            const earned = streak >= m.days;
            return (
              <View
                key={m.days}
                style={[
                  styles.badge,
                  glassShadow,
                  earned
                    ? { backgroundColor: m.color + '18', borderColor: m.color + '55' }
                    : { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.badgeEmoji, !earned && { opacity: 0.45 }]}>{m.emoji}</Text>
                <Text style={[styles.badgeLabel, { color: earned ? m.color : MUTED }]} numberOfLines={2}>
                  {m.label}
                </Text>
                <Text style={[styles.badgeDays, { color: earned ? m.color : MUTED }]}>{m.days}d</Text>
                {earned && (
                  <View style={[styles.badgeEarnedPill, { backgroundColor: m.color }]}>
                    <Text style={styles.badgeEarnedText}>✓</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {partners.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Partner Streaks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accountability' as never)}>
                <Text style={styles.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.partnerList}>
              {partners.map((p) => (
                <PartnerCard key={p.partner_id} partner={p} />
              ))}
            </View>
          </>
        )}

        <View style={[styles.tipsCard, glassShadow]}>
          <Text style={styles.tipsTitle}>Keep Your Streak Alive</Text>
          <View style={styles.tipsBody}>
            <View style={styles.tipsList}>
              {STREAK_TIPS.map((tip) => (
                <TouchableOpacity key={tip.text} style={styles.tipRow} activeOpacity={0.85}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color + '22' }]}>
                    <Ionicons name={tip.icon} size={18} color={tip.color} />
                  </View>
                  <Text style={styles.tipText}>{tip.text}</Text>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.mountainArt}>
              <LinearGradient
                colors={['rgba(45,220,140,0.35)', 'rgba(45,220,140,0.05)']}
                style={styles.mountainGlow}
              />
              <Text style={styles.mountainEmoji}>⛰️</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 88 }} />
      </ScreenScrollView>

      <MilestoneCelebration milestone={milestone} onDismiss={() => setMilestone(null)} />
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  glowTop: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,140,66,0.08)',
  },
  glowMid: {
    position: 'absolute',
    top: 320,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(45,220,140,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: TEXT },
  headerSub: { fontSize: fontSize.xs, color: MUTED, marginTop: 2 },
  freezeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(74,144,226,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.45)',
  },
  freezeBtnText: { color: '#9CC4FF', fontSize: fontSize.xs, fontWeight: '700' },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.xl ?? 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroFire: { fontSize: 44 },
  heroNum: { fontSize: 52, fontWeight: '900', lineHeight: 56, color: TEXT },
  heroLabel: { fontSize: fontSize.base, fontWeight: '700', color: ORANGE },
  nextMilestone: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', maxWidth: 100 },
  nextMilestoneText: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  checkinText: { fontSize: fontSize.base, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  checkinDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  checkinDoneText: { fontSize: fontSize.base, fontWeight: '700', color: MUTED },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: 4,
  },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: TEXT },
  sectionSub: { fontSize: fontSize.xs, color: MUTED },
  seeAll: { fontSize: fontSize.sm, fontWeight: '600', color: ACCENT },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  badge: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
    gap: 3,
    position: 'relative',
  },
  badgeEmoji: { fontSize: 22 },
  badgeLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', lineHeight: 11 },
  badgeDays: { fontSize: 9, fontWeight: '600' },
  badgeEarnedPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEarnedText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  partnerList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  tipsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.35)',
    backgroundColor: GLASS,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  tipsTitle: { fontSize: fontSize.base, fontWeight: '700', color: TEXT, marginBottom: spacing.sm },
  tipsBody: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  tipsList: { flex: 1, gap: spacing.xs },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  mountainArt: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  mountainGlow: {
    position: 'absolute',
    bottom: 0,
    width: 64,
    height: 80,
    borderRadius: 12,
  },
  mountainEmoji: { fontSize: 48, opacity: 0.9 },
});
