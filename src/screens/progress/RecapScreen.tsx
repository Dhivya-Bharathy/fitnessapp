import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - spacing.lg * 2;

// ── SAFE COLORS ───────────────────────────────────────────────
const PINK   = '#FF6B9D';
const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PURPLE = '#B280FF';
const BLUE   = '#6699FF';
const GREEN  = '#2DDC8C';

// ── DESIGN TEMPLATES ─────────────────────────────────────────
// Each template has a distinct Canva-style personality
const TEMPLATES = [
  {
    id: 'bold',
    label: 'Bold',
    // Deep black with neon green accent — gym/performance feel
    bg1: '#060A0F', bg2: '#0D1A12',
    accent: GREEN, text: '#FFFFFF', sub: 'rgba(255,255,255,0.55)',
    statBg: 'rgba(45,220,140,0.12)', statBorder: 'rgba(45,220,140,0.25)',
    badge: GREEN,
  },
  {
    id: 'gradient',
    label: 'Gradient',
    // Pink → Orange → deep purple — energetic/vibrant
    bg1: PINK, bg2: '#7C3AED',
    accent: GOLD, text: '#FFFFFF', sub: 'rgba(255,255,255,0.70)',
    statBg: 'rgba(255,255,255,0.15)', statBorder: 'rgba(255,255,255,0.25)',
    badge: GOLD,
  },
  {
    id: 'dark',
    label: 'Dark',
    // Rich indigo/navy — premium/sleek feel
    bg1: '#0D0A2E', bg2: '#1A1060',
    accent: BLUE, text: '#FFFFFF', sub: 'rgba(255,255,255,0.55)',
    statBg: 'rgba(102,153,255,0.12)', statBorder: 'rgba(102,153,255,0.25)',
    badge: BLUE,
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    // Warm gold/orange — morning motivation feel
    bg1: '#FF8C00', bg2: '#FF4500',
    accent: '#FFFFFF', text: '#FFFFFF', sub: 'rgba(255,255,255,0.75)',
    statBg: 'rgba(255,255,255,0.18)', statBorder: 'rgba(255,255,255,0.30)',
    badge: '#FFF176',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    // Clean white/light — professional share card
    bg1: '#F8FAFC', bg2: '#EEF2FF',
    accent: '#0DAE6C', text: '#0F172A', sub: '#64748B',
    statBg: 'rgba(13,174,108,0.08)', statBorder: 'rgba(13,174,108,0.20)',
    badge: '#0DAE6C',
  },
];

type RecapType = 'daily' | 'weekly' | 'monthly';

interface RecapData {
  caloriesConsumed: number; calorieGoal: number;
  waterMl: number; waterGoalMl: number;
  workoutsDone: number; caloriesBurned: number;
  streakCount: number; daysTracked: number;
  topWorkout: string | null; periodLabel: string;
  stepsTotal: number; sleepAvg: number;
}

// ── LOAD RECAP DATA ───────────────────────────────────────────

async function loadRecapData(userId: string, type: RecapType): Promise<RecapData> {
  const now = new Date();
  let startDate: string;
  let periodLabel: string;

  if (type === 'daily') {
    startDate = now.toISOString().split('T')[0];
    periodLabel = 'Today';
  } else if (type === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    startDate = d.toISOString().split('T')[0];
    periodLabel = 'This Week';
  } else {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split('T')[0];
    periodLabel = 'This Month';
  }

  const [foodRes, waterRes, workoutRes, profileRes, stepsRes, sleepRes] = await Promise.all([
    supabase.from('food_logs').select('calories').eq('user_id', userId).gte('logged_at', startDate),
    supabase.from('water_logs').select('amount_ml').eq('user_id', userId).gte('logged_at', startDate),
    // FIX 1: correct table is workout_sessions, not workout_logs
    supabase.from('workout_sessions')
      .select('calories_burned, name, exercises')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', startDate),
    supabase.from('profiles').select('daily_calorie_goal, water_goal_ml, streak_count').eq('id', userId).single(),
    supabase.from('step_logs').select('steps').eq('user_id', userId).gte('date', startDate),
    // FIX 2: correct column is `hours`, not `duration_hours`
    supabase.from('sleep_logs').select('hours').eq('user_id', userId).gte('date', startDate),
  ]);

  const foods    = (foodRes.data    ?? []) as any[];
  const waters   = (waterRes.data   ?? []) as any[];
  const workouts = (workoutRes.data ?? []) as any[];
  const profile  = profileRes.data as any;
  const steps    = (stepsRes.data   ?? []) as any[];
  const sleeps   = (sleepRes.data   ?? []) as any[];

  const caloriesConsumed = foods.reduce((s: number, r: any) => s + (r.calories ?? 0), 0);
  const waterMl          = waters.reduce((s: number, r: any) => s + (r.amount_ml ?? 0), 0);
  const caloriesBurned   = workouts.reduce((s: number, r: any) => s + (r.calories_burned ?? 0), 0);
  const stepsTotal       = steps.reduce((s: number, r: any) => s + (r.steps ?? 0), 0);
  // FIX 2 continued: use `hours` not `duration_hours`
  const sleepAvg = sleeps.length > 0
    ? sleeps.reduce((s: number, r: any) => s + (r.hours ?? 0), 0) / sleeps.length
    : 0;

  // FIX 3: workout_sessions uses `name` field, not `exercise_name`
  // Also count sessions by name to find the most-done workout type
  const wCounts: Record<string, number> = {};
  workouts.forEach((w: any) => {
    if (w.name) wCounts[w.name] = (wCounts[w.name] ?? 0) + 1;
  });
  const topWorkout = Object.keys(wCounts).sort((a, b) => wCounts[b] - wCounts[a])[0] ?? null;

  return {
    caloriesConsumed,
    calorieGoal:  profile?.daily_calorie_goal ?? 2000,
    waterMl,
    waterGoalMl:  profile?.water_goal_ml ?? 2500,
    workoutsDone: workouts.length,
    caloriesBurned,
    streakCount:  profile?.streak_count ?? 0,
    daysTracked:  type === 'daily' ? 1 : type === 'weekly' ? 7 : 30,
    topWorkout,
    periodLabel,
    stepsTotal,
    sleepAvg: Math.round(sleepAvg * 10) / 10,
  };
}

// ── MOTIVATIONAL MESSAGE ──────────────────────────────────────
function getMessage(data: RecapData, type: RecapType): string {
  const pct = data.calorieGoal > 0 ? (data.caloriesConsumed / data.calorieGoal) * 100 : 0;
  if (type === 'daily') {
    if (pct >= 90 && data.workoutsDone > 0) return 'Absolutely crushed it today 💪';
    if (data.workoutsDone > 0) return 'Workout done. Keep the streak alive 🔥';
    if (pct >= 80) return 'Solid nutrition day 🥗';
    return 'Every day is progress. Keep going! 🎯';
  }
  if (type === 'weekly') {
    if (data.workoutsDone >= 5) return 'Elite week. You showed up every day 🏆';
    if (data.workoutsDone >= 3) return 'Consistency is your superpower 🔥';
    return 'Build the habit. Small steps, big results 🎯';
  }
  if (data.workoutsDone >= 12) return 'Monster month. Absolutely unstoppable 🏆';
  if (data.streakCount >= 20) return `${data.streakCount}-day streak. Legendary 🔥`;
  return 'Progress over perfection. Every rep counts 💪';
}

// ── STAT TILE ─────────────────────────────────────────────────
function StatTile({
  icon, value, label, t, small,
}: {
  icon: string; value: string; label: string;
  t: typeof TEMPLATES[0]; small?: boolean;
}) {
  return (
    <View style={[st.tile, {
      backgroundColor: t.statBg,
      borderColor: t.statBorder,
      flex: small ? undefined : 1,
      minWidth: small ? 90 : undefined,
    }]}>
      <Text style={[st.icon, { color: t.accent }]}>{icon}</Text>
      <Text style={[st.value, { color: t.text, fontSize: small ? 18 : 22 }]}>{value}</Text>
      <Text style={[st.label, { color: t.sub }]}>{label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  tile:  { alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 2 },
  icon:  { fontSize: 20, marginBottom: 2 },
  value: { fontWeight: '800', lineHeight: 24 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

// ── CAPTURE WRAPPER (Expo Go safe) ────────────────────────────
// On Android (APK builds) wraps in ViewShot for image capture.
// On iOS (Expo Go) uses a plain View since the native module isn't available.
function CaptureWrapper({ children, cardRef }: { children: React.ReactNode; cardRef: any }) {
  if (Platform.OS === 'android') {
    try {
      const VS = require('react-native-view-shot').default;
      return <VS ref={cardRef} options={{ format: 'jpg', quality: 0.95 }}>{children}</VS>;
    } catch {}
  }
  return <View ref={cardRef} collapsable={false}>{children}</View>;
}

// ── RECAP CARD ────────────────────────────────────────────────
function RecapCard({
  data, template, recapType, userName, cardRef,
}: {
  data: RecapData; template: typeof TEMPLATES[0];
  recapType: RecapType; userName: string; cardRef?: any;
}) {
  const t = template;
  const message = getMessage(data, recapType);
  const waterL   = (data.waterMl / 1000).toFixed(1);
  const goalWaterL = (data.waterGoalMl / 1000).toFixed(1);
  const caloriePct = data.calorieGoal > 0
    ? Math.min(Math.round((data.caloriesConsumed / data.calorieGoal) * 100), 100)
    : 0;

  return (
    <CaptureWrapper cardRef={cardRef}>
      <LinearGradient
        colors={[t.bg1, t.bg2] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[rc.card, { width: CARD_W }]}
      >
        {/* ── TOP BAR ── */}
        <View style={rc.topBar}>
          <View style={[rc.brandPill, { backgroundColor: t.statBg, borderColor: t.statBorder }]}>
            <Text style={[rc.brandText, { color: t.accent }]}>🏋️ Fitness App</Text>
          </View>
          <View style={[rc.periodPill, { backgroundColor: t.statBg, borderColor: t.statBorder }]}>
            <Text style={[rc.periodText, { color: t.sub }]}>{data.periodLabel}</Text>
          </View>
        </View>

        {/* ── MOTIVATIONAL MESSAGE ── */}
        <Text style={[rc.message, { color: t.text }]}>{message}</Text>
        <Text style={[rc.userName, { color: t.sub }]}>@{userName}</Text>

        {/* ── CALORIE RING BAR ── */}
        <View style={[rc.calorieBlock, { backgroundColor: t.statBg, borderColor: t.statBorder }]}>
          <View style={rc.calorieRow}>
            <Text style={rc.calorieIcon}>🔥</Text>
            <View style={{ flex: 1 }}>
              <View style={rc.calorieTopRow}>
                <Text style={[rc.calorieVal, { color: t.text }]}>
                  {data.caloriesConsumed.toLocaleString()}
                </Text>
                <Text style={[rc.calorieGoal, { color: t.sub }]}>
                  / {data.calorieGoal.toLocaleString()} kcal
                </Text>
              </View>
              {/* Progress bar */}
              <View style={[rc.bar, { backgroundColor: t.statBorder }]}>
                <View style={[rc.barFill, {
                  width: `${caloriePct}%`,
                  backgroundColor: t.accent,
                }]} />
              </View>
              <Text style={[rc.barLabel, { color: t.sub }]}>{caloriePct}% of goal</Text>
            </View>
          </View>
        </View>

        {/* ── STAT GRID ── */}
        <View style={rc.grid}>
          <StatTile icon="💧" value={`${waterL}L`}       label="Water"    t={t} />
          <StatTile icon="🏋️" value={`${data.workoutsDone}`} label="Workouts" t={t} />
          <StatTile icon="⚡" value={`${data.caloriesBurned}`} label="Burned"  t={t} />
        </View>
        <View style={[rc.grid, { marginTop: spacing.sm }]}>
          <StatTile icon="👟" value={data.stepsTotal > 0 ? data.stepsTotal.toLocaleString() : '—'} label="Steps"  t={t} />
          <StatTile icon="😴" value={data.sleepAvg > 0 ? `${data.sleepAvg}h` : '—'}               label="Sleep"  t={t} />
          <StatTile icon="🔥" value={`${data.streakCount}d`} label="Streak"  t={t} />
        </View>

        {/* ── TOP WORKOUT ── */}
        {data.topWorkout && (
          <View style={[rc.topWorkoutRow, { backgroundColor: t.statBg, borderColor: t.statBorder }]}>
            <Text style={[rc.topWorkoutLabel, { color: t.sub }]}>Top workout</Text>
            <Text style={[rc.topWorkoutName, { color: t.text }]}>{data.topWorkout}</Text>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={[rc.footer, { borderTopColor: t.statBorder }]}>
          <Text style={[rc.footerText, { color: t.sub }]}>Fitness App · Track. Grow. Win.</Text>
          <View style={[rc.streak, { backgroundColor: t.badge + '22' }]}>
            <Text style={[rc.streakText, { color: t.badge }]}>🔥 {data.streakCount} day streak</Text>
          </View>
        </View>
      </LinearGradient>
    </CaptureWrapper>
  );
}

const rc = StyleSheet.create({
  card:         { borderRadius: 24, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  brandText:    { fontSize: 12, fontWeight: '800' },
  periodPill:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  periodText:   { fontSize: 11, fontWeight: '600' },
  message:      { fontSize: 22, fontWeight: '900', lineHeight: 28, letterSpacing: -0.5 },
  userName:     { fontSize: 13, fontWeight: '600', marginTop: -spacing.sm },
  calorieBlock: { borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  calorieRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  calorieIcon:  { fontSize: 28 },
  calorieTopRow:{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  calorieVal:   { fontSize: 28, fontWeight: '900' },
  calorieGoal:  { fontSize: 13, fontWeight: '600' },
  bar:          { height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
  barLabel:     { fontSize: 10, fontWeight: '600', marginTop: 3 },
  grid:         { flexDirection: 'row', gap: spacing.sm },
  topWorkoutRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  topWorkoutLabel:{ fontSize: 11, fontWeight: '600' },
  topWorkoutName: { fontSize: 13, fontWeight: '800' },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, marginTop: spacing.xs },
  footerText:   { fontSize: 10, fontWeight: '600' },
  streak:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  streakText:   { fontSize: 10, fontWeight: '800' },
});

// ── TEMPLATE PICKER ───────────────────────────────────────────
function TemplatePicker({
  active, onChange, theme,
}: {
  active: number; onChange: (i: number) => void; theme: typeof colors.dark;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tp.row}>
      {TEMPLATES.map((t, i) => (
        <TouchableOpacity
          key={t.id}
          onPress={() => onChange(i)}
          style={[tp.swatch, { borderColor: i === active ? theme.accent : theme.border, borderWidth: i === active ? 2 : 1 }]}
        >
          <LinearGradient
            colors={[t.bg1, t.bg2] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={tp.swatchGrad}
          />
          <Text style={[tp.label, { color: i === active ? theme.accent : theme.textMuted }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const tp = StyleSheet.create({
  row:       { paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.sm },
  swatch:    { alignItems: 'center', gap: 4, borderRadius: radius.md, overflow: 'hidden', paddingBottom: 4 },
  swatchGrad:{ width: 64, height: 40, borderRadius: radius.sm },
  label:     { fontSize: fontSize.xs, fontWeight: '600' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function RecapScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile } = useAuthStore();
  const theme = colors[colorScheme];

  const [recapType, setRecapType]     = useState<RecapType>('daily');
  const [activeTemplate, setTemplate] = useState(0);
  const [data, setData]               = useState<RecapData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSharing, setIsSharing]     = useState(false);
  const cardRef = useRef<any>(null);

  const userName = profile?.calfit_id
    || profile?.full_name?.toLowerCase().replace(/\s+/g, '') || 'calfit_user';

  useFocusEffect(useCallback(() => { load(); }, [recapType]));

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try { setData(await loadRecapData(user.id, recapType)); }
    catch {}
    finally { setIsLoading(false); }
  };

  const handleShare = async () => {
    if (!data) return;
    setIsSharing(true);
    try {
      // Try to capture the card as an image first
      if (cardRef.current?.capture) {
        const uri = await cardRef.current.capture();
        await Share.share({ url: uri, message: `My ${data.periodLabel} Fitness App recap 🏋️\n\nTrack yours at fitness-app.demo` });
      } else {
        // Fallback to text share
        await Share.share({
          message: `My ${data.periodLabel} Fitness App Recap 🏋️\n\n` +
            `🔥 ${data.caloriesConsumed} kcal consumed\n` +
            `💧 ${(data.waterMl / 1000).toFixed(1)}L water\n` +
            `🏋️ ${data.workoutsDone} workouts\n` +
            `🔥 ${data.streakCount} day streak\n\n` +
            `Track yours with Fitness App`,
        });
      }
    } catch {}
    finally { setIsSharing(false); }
  };

  const TYPE_TABS: RecapType[] = ['daily', 'weekly', 'monthly'];
  const TYPE_COLORS = [BLUE, ORANGE, PINK];

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={[PURPLE + 'CC', PINK + 'CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Recap</Text>
        <TouchableOpacity
          onPress={handleShare}
          disabled={isSharing || isLoading || !data}
          style={styles.shareBtn}
        >
          {isSharing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="share-social-outline" size={20} color="#fff" />}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── PERIOD TABS ── */}
        <View style={[styles.typeTabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {TYPE_TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => setRecapType(t)}
              style={[styles.typeTab, recapType === t && { backgroundColor: TYPE_COLORS[i] }]}
            >
              <Text style={[styles.typeTabText, {
                color: recapType === t ? '#fff' : theme.textMuted,
                fontWeight: recapType === t ? '700' : '500',
              }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TEMPLATE PICKER ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Choose Style</Text>
        </View>
        <TemplatePicker active={activeTemplate} onChange={setTemplate} theme={theme} />

        {/* ── RECAP CARD ── */}
        <View style={styles.cardWrap}>
          {isLoading || !data ? (
            <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.accent} size="large" />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Building your recap…</Text>
            </View>
          ) : (
            <RecapCard
              data={data}
              template={TEMPLATES[activeTemplate]}
              recapType={recapType}
              userName={userName}
              cardRef={cardRef}
            />
          )}
        </View>

        {/* ── SHARE BUTTON ── */}
        <TouchableOpacity
          onPress={handleShare}
          disabled={isSharing || isLoading || !data}
          style={[styles.shareFullBtn, { opacity: isLoading ? 0.5 : 1 }]}
        >
          <LinearGradient
            colors={[PINK, PURPLE] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.shareGrad}
          >
            {isSharing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="share-social-outline" size={20} color="#fff" />}
            <Text style={styles.shareBtnText}>
              {isSharing ? 'Preparing…' : 'Share Recap'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── BREAKDOWN LIST ── */}
        {data && (
          <View style={[styles.breakdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.breakdownTitle, { color: theme.textPrimary }]}>
              Full Breakdown
            </Text>
            {[
              { icon: 'flame-outline',    label: 'Calories consumed', value: `${data.caloriesConsumed.toLocaleString()} / ${data.calorieGoal.toLocaleString()} kcal`, color: ORANGE },
              { icon: 'water-outline',    label: 'Water',             value: `${(data.waterMl/1000).toFixed(1)} / ${(data.waterGoalMl/1000).toFixed(1)} L`, color: BLUE },
              { icon: 'barbell-outline',  label: 'Workouts',          value: `${data.workoutsDone} sessions`, color: PINK },
              { icon: 'flash-outline',    label: 'Calories burned',   value: `${data.caloriesBurned} kcal`, color: '#FF5959' },
              { icon: 'footsteps-outline',label: 'Steps',             value: data.stepsTotal > 0 ? data.stepsTotal.toLocaleString() : '—', color: GREEN },
              { icon: 'moon-outline',     label: 'Avg sleep',         value: data.sleepAvg > 0 ? `${data.sleepAvg}h` : '—', color: PURPLE },
              { icon: 'bonfire-outline',  label: 'Streak',            value: `${data.streakCount} days 🔥`, color: GOLD },
            ].map((row) => (
              <View key={row.label} style={[styles.breakdownRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.breakdownIconWrap, { backgroundColor: row.color + '18' }]}>
                  <Ionicons name={row.icon as any} size={16} color={row.color} />
                </View>
                <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.breakdownValue, { color: theme.textPrimary }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  shareBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

  typeTabs: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, padding: 4, borderWidth: 1 },
  typeTab:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md },
  typeTabText: { fontSize: fontSize.sm },

  section:      { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '700' },

  cardWrap:    { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  loadingCard: { height: 360, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderWidth: 1 },
  loadingText: { fontSize: fontSize.sm },

  shareFullBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  shareGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2 },
  shareBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },

  breakdown:      { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  breakdownTitle: { fontSize: fontSize.base, fontWeight: '800', padding: spacing.md, paddingBottom: spacing.sm },
  breakdownRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1 },
  breakdownIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  breakdownLabel: { flex: 1, fontSize: fontSize.sm },
  breakdownValue: { fontSize: fontSize.sm, fontWeight: '700' },
});