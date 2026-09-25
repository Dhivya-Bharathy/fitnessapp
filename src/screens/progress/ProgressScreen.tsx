import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { MoodTrendChart } from '../../components/TrendCharts';
import { exportProgressReport } from '../../utils/pdf-export';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import { PremiumSegmentedControl } from '../../components/premium/PremiumSegmentedControl';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';
import { colors } from '../../theme';

const PINK   = '#FF6B9D';
const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PURPLE = '#B280FF';
const BLUE   = '#6699FF';
const GREEN  = '#2DDC8C';

type Period = 'Week' | 'Month' | '3 Months' | 'Year';

async function loadStats(userId: string, period: Period) {
  const days = period === 'Week' ? 7 : period === 'Month' ? 30 : period === '3 Months' ? 90 : 365;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  // ── BUG FIXES in this query list: ────────────────────────────
  // 1. workout_logs → workout_sessions (correct table name)
  // 2. sleep_logs column is `hours` not `duration_hours`
  // 3. profiles also fetches height_cm for BMI calculation
  const [food, workouts, water, sleep, steps, profile, measurements] = await Promise.all([
    supabase.from('food_logs').select('calories,logged_at').eq('user_id', userId).gte('logged_at', sinceStr),
    supabase.from('workout_sessions')
      .select('calories_burned,completed_at,name,duration_seconds,exercises')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', sinceStr)
      .order('completed_at', { ascending: false }),
    supabase.from('water_logs').select('amount_ml,logged_at').eq('user_id', userId).gte('logged_at', sinceStr),
    supabase.from('sleep_logs').select('hours,date').eq('user_id', userId).gte('date', sinceStr),
    supabase.from('step_logs').select('steps,date').eq('user_id', userId).gte('date', sinceStr),
    supabase.from('profiles')
      .select('streak_count,current_weight_kg,target_weight_kg,daily_calorie_goal,water_goal_ml,height_cm')
      .eq('id', userId).single(),
    supabase.from('body_measurements').select('id,user_id,chest_cm,waist_cm,hips_cm,arms_cm,thighs_cm,neck_cm,measured_at').eq('user_id', userId).order('measured_at', { ascending: false }).limit(2),
  ]);

  const foodData    = (food.data ?? []) as any[];
  const workoutData = (workouts.data ?? []) as any[];
  const waterData   = (water.data ?? []) as any[];
  const sleepData   = (sleep.data ?? []) as any[];
  const stepsData   = (steps.data ?? []) as any[];
  const p           = profile.data as any;
  const measData    = (measurements.data ?? []) as any[];

  const totalCal    = foodData.reduce((s:number,r:any)=>s+(r.calories??0),0);
  const totalBurned = workoutData.reduce((s:number,r:any)=>s+(r.calories_burned??0),0);
  const totalActiveMin = Math.round(
    workoutData.reduce((s: number, r: any) => s + (r.duration_seconds ?? 0), 0) / 60,
  );
  const totalWater  = waterData.reduce((s:number,r:any)=>s+(r.amount_ml??0),0);
  const totalSteps  = stepsData.reduce((s:number,r:any)=>s+(r.steps??0),0);
  // FIX: sleep column is `hours` not `duration_hours`
  const avgSleep    = sleepData.length > 0
    ? sleepData.reduce((s:number,r:any)=>s+(r.hours??0),0)/sleepData.length : 0;

  const calorieByDay: Record<string, number> = {};
  foodData.forEach((r:any) => {
    const d = r.logged_at?.split('T')[0];
    if (d) calorieByDay[d] = (calorieByDay[d] ?? 0) + (r.calories ?? 0);
  });
  const chartDays = Array.from({ length: Math.min(days, 14) }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (Math.min(days,14) - 1 - i));
    const key = d.toISOString().split('T')[0];
    return { date: key, calories: calorieByDay[key] ?? 0, label: d.toLocaleDateString('en',{weekday:'short'}).slice(0,2) };
  });

  // Shape recent workouts from workout_sessions structure
  // workout_sessions stores: name, calories_burned, completed_at, duration_seconds, exercises (JSON array)
  const recentWorkouts = workoutData.slice(0, 5).map((w: any) => ({
    name:             w.name ?? 'Workout',
    calories_burned:  w.calories_burned ?? 0,
    completed_at:     w.completed_at,
    duration_seconds: w.duration_seconds ?? 0,
    exercise_count:   Array.isArray(w.exercises) ? w.exercises.length : 0,
  }));

  return {
    totalCal, totalBurned, totalActiveMin, totalWater, totalSteps, avgSleep,
    daysTracked: new Set(foodData.map((r:any)=>r.logged_at?.split('T')[0])).size,
    workoutsDone: workoutData.length,
    streak: p?.streak_count ?? 0,
    weight: p?.current_weight_kg ?? null,
    targetWeight: p?.target_weight_kg ?? null,
    calorieGoal: p?.daily_calorie_goal ?? 2000,
    waterGoal: p?.water_goal_ml ?? 2500,
    heightCm: p?.height_cm ?? null,
    recentWorkouts,
    chartDays,
    latestMeasurement: measData[0] ?? null,
    prevMeasurement: measData[1] ?? null,
  };
}

const premiumChartTheme = {
  bg: PREMIUM_BG,
  card: PREMIUM_GLASS,
  border: PREMIUM_GLASS_BORDER,
  textPrimary: PREMIUM_TEXT,
  textMuted: PREMIUM_MUTED,
  textSecondary: PREMIUM_MUTED,
  accent: PREMIUM_ACCENT,
} as typeof colors.dark;

function MiniBarChart({ data, goal }: {
  data: { label: string; calories: number }[];
  goal: number;
}) {
  const max = Math.max(...data.map(d => d.calories), goal, 1);
  return (
    <View style={chart.wrap}>
      <View style={chart.bars}>
        {data.map((d, i) => {
          const pct = d.calories / max;
          const atGoal = d.calories >= goal * 0.85 && d.calories <= goal * 1.15;
          const over   = d.calories > goal * 1.15;
          const color  = over ? '#FF5959' : atGoal ? GREEN : BLUE;
          return (
            <View key={i} style={chart.barWrap}>
              <View style={[chart.bar, { height: Math.max(pct * 80, d.calories > 0 ? 4 : 0), backgroundColor: color }]} />
              <Text style={[chart.label, { color: PREMIUM_MUTED }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={[chart.goalLine, { bottom: 18 + (goal/max)*80, borderColor: GOLD + '80' }]} />
    </View>
  );
}
const chart = StyleSheet.create({
  wrap:    { height: 120, position: 'relative', marginTop: spacing.sm },
  bars:    { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 3, paddingBottom: 18 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 100 },
  bar:     { width: '80%', borderRadius: 3, minHeight: 2 },
  label:   { fontSize: 8, marginTop: 3 },
  goalLine:{ position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
});

function SummaryMetric({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string;
}) {
  return (
    <View style={sm.col}>
      <View style={[sm.icon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={sm.value}>{value}</Text>
      <Text style={sm.label}>{label}</Text>
    </View>
  );
}
const sm = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: fontSize.lg, fontWeight: '900', color: PREMIUM_TEXT, letterSpacing: -0.3 },
  label: { fontSize: 9, fontWeight: '600', color: PREMIUM_MUTED, textAlign: 'center' },
});

function GlassSectionTitle({ title, icon, color }: { title: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={gst.row}>
      <View style={[gst.icon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={gst.title}>{title}</Text>
    </View>
  );
}
const gst = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
});

const PERIOD_OPTIONS = [
  { id: 'Week' as Period, label: 'Week' },
  { id: 'Month' as Period, label: 'Month' },
  { id: '3 Months' as Period, label: '3 Mo' },
  { id: 'Year' as Period, label: 'Year' },
];

const PERIOD_RANGE_LABEL: Record<Period, string> = {
  Week: 'This Week',
  Month: 'This Month',
  '3 Months': 'Last 3 Months',
  Year: 'This Year',
};

function periodDayCount(period: Period) {
  if (period === 'Week') return 7;
  if (period === 'Month') return 30;
  if (period === '3 Months') return 90;
  return 365;
}

export default function ProgressScreen() {
  const navigation   = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, liveSteps } = useAuthStore();

  const [period, setPeriod]       = useState<Period>('Week');
  const [data, setData]           = useState<Awaited<ReturnType<typeof loadStats>> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) load(); }, [user?.id, period]));

  const load = async () => {
    if (!user?.id) return;
    try { setData(await loadStats(user.id, period)); } catch {}
  };

  const refresh = async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); };

  const name = profile?.full_name?.split(' ')[0] || 'You';
  const spanDays = periodDayCount(period);
  const avgCalories = data ? Math.round(data.totalCal / spanDays) : 0;
  const avgSteps = data
    ? Math.round((data.totalSteps > 0 ? data.totalSteps : liveSteps) / spanDays)
    : 0;
  const avgActiveMin = data ? Math.round(data.totalActiveMin / spanDays) : 0;

  const handleExportPDF = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportProgressReport(data, period);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not generate PDF');
    }
    setExporting(false);
  }, [data, period]);

  const weightProgress = data?.weight && data?.targetWeight
    ? Math.min(Math.abs(data.weight - data.targetWeight) / Math.abs((profile as any)?.starting_weight_kg - data.targetWeight || 1), 1)
    : 0;

  const glassCard = [
    styles.card,
    premiumGlassShadow(),
    { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER, marginHorizontal: spacing.lg },
  ];

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Progress</Text>
          <Text style={styles.headerSub}>{name}&apos;s fitness journey</Text>
        </View>
        {data && (
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={exporting}
            style={[styles.headerActionBtn, { marginRight: spacing.xs }]}
          >
            <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={16} color={PREMIUM_TEXT} />
            <Text style={styles.headerActionText}>PDF</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Recap')} style={styles.headerActionBtn}>
          <Ionicons name="share-social-outline" size={16} color={PREMIUM_TEXT} />
          <Text style={styles.headerActionText}>Recap</Text>
        </TouchableOpacity>
      </View>

      <PremiumSegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      <ScreenScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={PREMIUM_ACCENT} colors={[PREMIUM_ACCENT]} />}
      >
        {/* ── CALORIE CHART ── */}
        {data?.chartDays && data.chartDays.length > 0 && (
          <View style={[...glassCard, { marginTop: spacing.md }]}>
            <View style={styles.cardTopRow}>
              <GlassSectionTitle title="Calorie Trend" icon="flame-outline" color={ORANGE} />
              <View style={styles.rangePill}>
                <Text style={styles.rangePillText}>{PERIOD_RANGE_LABEL[period]}</Text>
                <Ionicons name="chevron-down" size={14} color={PREMIUM_MUTED} />
              </View>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
                <Text style={styles.legendText}>On target</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
                <Text style={styles.legendText}>Below goal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF5959' }]} />
                <Text style={styles.legendText}>Over goal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GOLD, height: 1, width: 12, borderRadius: 0 }]} />
                <Text style={styles.legendText}>Goal line</Text>
              </View>
            </View>
            <MiniBarChart data={data.chartDays} goal={data.calorieGoal} />
          </View>
        )}

        {/* ── MOOD TRENDS ── */}
        {user?.id && (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            style={styles.moodWrap}
          >
            <MoodTrendChart userId={user.id} theme={premiumChartTheme} />
            <View style={styles.moodChevron}>
              <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── ACTIVITY SUMMARY (mock 3-up) ── */}
        {data && (
          <View style={[...glassCard, { marginTop: spacing.lg }]}>
            <View style={styles.cardTopRow}>
              <GlassSectionTitle title="Activity Summary" icon="stats-chart-outline" color={BLUE} />
              <Text style={styles.rangePillText}>{PERIOD_RANGE_LABEL[period]}</Text>
            </View>
            <View style={styles.summaryRow}>
              <SummaryMetric icon="flame-outline" label="Avg Calories" value={avgCalories.toLocaleString()} color={ORANGE} />
              <View style={styles.summaryDiv} />
              <SummaryMetric icon="footsteps-outline" label="Avg Steps" value={avgSteps.toLocaleString()} color={GREEN} />
              <View style={styles.summaryDiv} />
              <SummaryMetric icon="time-outline" label="Avg Active" value={`${avgActiveMin} min`} color={BLUE} />
            </View>
          </View>
        )}

        {/* ── WEIGHT CARD ── */}
        {data?.weight && (
          <>
            <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg }}>
              <GlassSectionTitle title="Weight" icon="body-outline" color={PINK} />
            </View>
            <View style={glassCard}>
              <View style={styles.weightRow}>
                <View>
                  <Text style={styles.weightVal}>{data.weight} kg</Text>
                  <Text style={styles.weightSub}>Current weight</Text>
                </View>
                {data.targetWeight && (
                  <View style={styles.weightTarget}>
                    <Text style={[styles.weightTargetVal, { color: GREEN }]}>{data.targetWeight} kg</Text>
                    <Text style={styles.weightSub}>Target</Text>
                  </View>
                )}
                <View style={[styles.bmiChip, { backgroundColor: PINK + '18' }]}>
                  <Text style={[styles.bmiText, { color: PINK }]}>
                    BMI {data.weight && data.heightCm
                      ? ((data.weight / ((data.heightCm / 100) ** 2))).toFixed(1)
                      : '—'}
                  </Text>
                </View>
              </View>
              {data.targetWeight && (
                <View style={{ marginTop: spacing.md }}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.round(weightProgress * 100)}%`, backgroundColor: PINK }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {Math.abs(data.weight - data.targetWeight).toFixed(1)} kg to goal
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── RECENT WORKOUTS ── */}
        {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'Activity' })}
              style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg }}
            >
              <GlassSectionTitle title="Recent Workouts" icon="barbell-outline" color={PINK} />
            </TouchableOpacity>
            <View style={[...glassCard, { marginTop: spacing.sm }]}>
              {data.recentWorkouts.map((w: any, i: number) => (
                <View key={i} style={[styles.workoutRow, i < data.recentWorkouts.length - 1 && styles.workoutRowBorder]}>
                  <View style={[styles.workoutIcon, { backgroundColor: PINK + '18' }]}>
                    <Ionicons name="barbell-outline" size={14} color={PINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workoutName}>{w.name}</Text>
                    <Text style={styles.workoutMeta}>
                      {w.completed_at?.split('T')[0]} · {w.exercise_count} exercise{w.exercise_count !== 1 ? 's' : ''} · {Math.round((w.duration_seconds ?? 0) / 60)} min
                    </Text>
                  </View>
                  <Text style={[styles.workoutCal, { color: ORANGE }]}>{w.calories_burned} kcal</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── BODY MEASUREMENTS ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('BodyMeasurements')}
          style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg }}
        >
          <GlassSectionTitle title="Body Measurements" icon="body-outline" color={PURPLE} />
        </TouchableOpacity>
        {data?.latestMeasurement ? (
          <View style={[...glassCard, { marginTop: spacing.sm }]}>
            <Text style={styles.measDate}>
              Last logged: {data.latestMeasurement.measured_at?.split('T')[0]}
            </Text>
            <View style={styles.measGrid}>
              {[
                { label: 'Chest', value: data.latestMeasurement.chest_cm, unit: 'cm', prev: data.prevMeasurement?.chest_cm },
                { label: 'Waist', value: data.latestMeasurement.waist_cm, unit: 'cm', prev: data.prevMeasurement?.waist_cm },
                { label: 'Hips', value: data.latestMeasurement.hips_cm, unit: 'cm', prev: data.prevMeasurement?.hips_cm },
                { label: 'Arms', value: data.latestMeasurement.arms_cm, unit: 'cm', prev: data.prevMeasurement?.arms_cm },
                { label: 'Thighs', value: data.latestMeasurement.thighs_cm, unit: 'cm', prev: data.prevMeasurement?.thighs_cm },
                { label: 'Neck', value: data.latestMeasurement.neck_cm, unit: 'cm', prev: data.prevMeasurement?.neck_cm },
              ].filter(m => m.value != null).map((m) => {
                const diff = m.prev != null ? m.value - m.prev : null;
                return (
                  <View key={m.label} style={styles.measItem}>
                    <Text style={styles.measLabel}>{m.label}</Text>
                    <Text style={styles.measValue}>{m.value}{m.unit}</Text>
                    {diff !== null && diff !== 0 && (
                      <Text style={[styles.measDiff, { color: diff < 0 ? GREEN : '#FF5959' }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}cm
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('BodyMeasurements')}
            style={[...glassCard, styles.emptyCard, { marginTop: spacing.sm }]}
          >
            <Ionicons name="body-outline" size={28} color={PREMIUM_MUTED} />
            <Text style={styles.emptyCardText}>
              Tap to log your first body measurements
            </Text>
          </TouchableOpacity>
        )}
      </ScreenScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: PREMIUM_TEXT, letterSpacing: -0.3 },
  headerSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginTop: 2 },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  headerActionText: { color: PREMIUM_TEXT, fontSize: fontSize.xs, fontWeight: '700' },
  card: { borderRadius: radius.lg + 2, borderWidth: 1, padding: spacing.lg },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rangePillText: { fontSize: fontSize.xs, fontWeight: '600', color: PREMIUM_MUTED },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  summaryDiv: { width: 1, height: 48, backgroundColor: PREMIUM_GLASS_BORDER },
  moodWrap: { marginHorizontal: spacing.lg, marginTop: spacing.lg, position: 'relative' },
  moodChevron: { position: 'absolute', right: spacing.md, top: spacing.lg + 4 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightVal: { fontSize: 28, fontWeight: '900', color: PREMIUM_TEXT },
  weightSub: { fontSize: fontSize.xs, marginTop: 2, color: PREMIUM_MUTED },
  weightTarget: { alignItems: 'center' },
  weightTargetVal: { fontSize: fontSize.lg, fontWeight: '800' },
  bmiChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
  bmiText: { fontSize: fontSize.sm, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,107,157,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: fontSize.xs, marginTop: 4, color: PREMIUM_MUTED },
  chartLegend: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.sm, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: PREMIUM_MUTED },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  workoutRowBorder: { borderBottomWidth: 1, borderBottomColor: PREMIUM_GLASS_BORDER },
  workoutIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_TEXT },
  workoutMeta: { fontSize: fontSize.xs, marginTop: 1, color: PREMIUM_MUTED },
  workoutCal: { fontSize: fontSize.sm, fontWeight: '700' },
  measDate: { fontSize: fontSize.xs, marginBottom: spacing.md, color: PREMIUM_MUTED },
  measGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  measItem: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    minWidth: 80,
  },
  measLabel: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED },
  measValue: { fontSize: fontSize.base, fontWeight: '800', marginTop: 2, color: PREMIUM_TEXT },
  measDiff: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  emptyCard: { alignItems: 'center', gap: spacing.md, borderStyle: 'dashed' },
  emptyCardText: { fontSize: fontSize.sm, textAlign: 'center', color: PREMIUM_MUTED },
});