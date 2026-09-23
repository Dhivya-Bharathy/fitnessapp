import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { MoodTrendChart } from '../../components/TrendCharts';
import { exportProgressReport } from '../../utils/pdf-export';

const { width: SW } = Dimensions.get('window');
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
      .select('streak_count,weight_kg,target_weight_kg,daily_calorie_goal,water_goal_ml,height_cm')
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
    totalCal, totalBurned, totalWater, totalSteps, avgSleep,
    daysTracked: new Set(foodData.map((r:any)=>r.logged_at?.split('T')[0])).size,
    workoutsDone: workoutData.length,
    streak: p?.streak_count ?? 0,
    weight: p?.weight_kg ?? null,
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

function MiniBarChart({ data, goal, theme }: {
  data: { label: string; calories: number }[];
  goal: number; theme: typeof colors.dark;
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
              <Text style={[chart.label, { color: theme.textMuted }]}>{d.label}</Text>
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

function StatCard({ icon, label, value, sub, color, theme }: {
  icon: string; label: string; value: string; sub?: string;
  color: string; theme: typeof colors.dark;
}) {
  return (
    <View style={[sc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[sc.icon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[sc.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[sc.label, { color: theme.textMuted }]}>{label}</Text>
      {sub && <Text style={[sc.sub, { color: color }]}>{sub}</Text>}
    </View>
  );
}
const sc = StyleSheet.create({
  card:  { flex: 1, minWidth: (SW - spacing.lg * 2 - spacing.sm) / 2, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: 3 },
  icon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  value: { fontSize: fontSize.xl, fontWeight: '800' },
  label: { fontSize: fontSize.xs, fontWeight: '600' },
  sub:   { fontSize: fontSize.xs, fontWeight: '700', marginTop: 1 },
});

function SectionHeader({ title, icon, color, theme, onPress, actionLabel }: {
  title: string; icon: string; color: string; theme: typeof colors.dark;
  onPress?: () => void; actionLabel?: string;
}) {
  return (
    <View style={sh.row}>
      <View style={sh.left}>
        <View style={[sh.icon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={15} color={color} />
        </View>
        <Text style={[sh.title, { color: theme.textPrimary }]}>{title}</Text>
      </View>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={[sh.action, { color: color }]}>{actionLabel ?? 'See All'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.lg },
  left:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: fontSize.base, fontWeight: '700' },
  action: { fontSize: fontSize.sm, fontWeight: '600' },
});

export default function ProgressScreen() {
  const navigation   = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile, liveSteps } = useAuthStore();
  const theme = colors[colorScheme];

  // Read streak directly from profile in authStore — always current, no DB round-trip needed
  const streakCount = (profile as any)?.streak_count ?? 0;

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

  const PERIODS: Period[] = ['Week', 'Month', '3 Months', 'Year'];
  const name = profile?.full_name?.split(' ')[0] || 'You';

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

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <LinearGradient
        colors={[PURPLE + 'DD', PINK + 'CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Progress</Text>
          <Text style={styles.headerSub}>{name}'s fitness journey</Text>
        </View>
        {data && (
          <TouchableOpacity onPress={handleExportPDF} disabled={exporting} style={[styles.recapBtn, { marginRight: spacing.sm }]}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={16} color="#fff" />
            <Text style={styles.recapBtnText}>PDF</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Recap' as never)} style={styles.recapBtn}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={styles.recapBtnText}>Recap</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={[styles.periodTabs, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodTab, period === p && { borderBottomColor: PURPLE }]}
          >
            <Text style={[styles.periodTabText, {
              color: period === p ? PURPLE : theme.textMuted,
              fontWeight: period === p ? '700' : '500',
            }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={PURPLE} colors={[PURPLE]} />}
      >
        {/* ── WEIGHT CARD ── */}
        {data?.weight && (
          <>
            <SectionHeader title="Weight" icon="body-outline" color={PINK} theme={theme} />
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg }]}>
              <View style={styles.weightRow}>
                <View>
                  <Text style={[styles.weightVal, { color: theme.textPrimary }]}>{data.weight} kg</Text>
                  <Text style={[styles.weightSub, { color: theme.textMuted }]}>Current weight</Text>
                </View>
                {data.targetWeight && (
                  <View style={styles.weightTarget}>
                    <Text style={[styles.weightTargetVal, { color: GREEN }]}>{data.targetWeight} kg</Text>
                    <Text style={[styles.weightSub, { color: theme.textMuted }]}>Target</Text>
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
                  <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
                    {Math.abs(data.weight - data.targetWeight).toFixed(1)} kg to goal
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── CALORIE CHART ── */}
        {data?.chartDays && data.chartDays.length > 0 && (
          <>
            <SectionHeader title="Calorie Trend" icon="flame-outline" color={ORANGE} theme={theme} />
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg }]}>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
                  <Text style={[styles.legendText, { color: theme.textMuted }]}>On target</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
                  <Text style={[styles.legendText, { color: theme.textMuted }]}>Below goal</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF5959' }]} />
                  <Text style={[styles.legendText, { color: theme.textMuted }]}>Over goal</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: GOLD, height: 1, width: 12, borderRadius: 0 }]} />
                  <Text style={[styles.legendText, { color: theme.textMuted }]}>Goal line</Text>
                </View>
              </View>
              <MiniBarChart data={data.chartDays} goal={data.calorieGoal} theme={theme} />
            </View>
          </>
        )}

        {/* ── MOOD TRENDS ── */}
        {user?.id && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <MoodTrendChart userId={user.id} theme={theme} />
          </View>
        )}

        {/* ── STATS GRID ── */}
        {data && (
          <>
            <SectionHeader title="Activity Summary" icon="stats-chart-outline" color={BLUE} theme={theme} />
            <View style={styles.statsGrid}>
              <StatCard icon="restaurant-outline" label="Calories In"
                value={data.totalCal.toLocaleString()}
                sub={`/ ${data.calorieGoal.toLocaleString()} goal`}
                color={ORANGE} theme={theme} />
              <StatCard icon="flame-outline"      label="Calories Out"
                value={data.totalBurned > 0 ? data.totalBurned.toLocaleString() : '—'}
                sub={data.workoutsDone > 0 ? `${data.workoutsDone} session${data.workoutsDone !== 1 ? 's' : ''}` : 'no sessions yet'}
                color={PINK} theme={theme} />
              <StatCard icon="water-outline"      label="Water Total"
                value={`${(data.totalWater/1000).toFixed(1)}L`}
                sub={`/ ${(data.waterGoal/1000).toFixed(1)}L goal`}
                color={BLUE} theme={theme} />
              <StatCard icon="footsteps-outline"  label="Total Steps"
                value={(() => {
                  // Prefer DB total; fall back to today's live steps if DB is empty
                  const s = data.totalSteps > 0 ? data.totalSteps : liveSteps;
                  return s > 0 ? (s >= 1000 ? (s / 1000).toFixed(1) + 'k' : s.toString()) : '—';
                })()}
                sub="steps tracked"
                color={GREEN} theme={theme} />
              <StatCard icon="moon-outline"       label="Avg Sleep"
                value={data.avgSleep > 0 ? `${data.avgSleep.toFixed(1)}h` : '—'}
                sub="per night"
                color={PURPLE} theme={theme} />
              <StatCard icon="bonfire-outline"    label="Streak"
                value={streakCount > 0 ? `${streakCount}d` : '—'}
                sub="current streak"
                color={GOLD} theme={theme} />
            </View>
          </>
        )}

        {/* ── RECENT WORKOUTS ── */}
        {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
          <>
            <SectionHeader
              title="Recent Workouts" icon="barbell-outline" color={PINK} theme={theme}
              onPress={() => navigation.navigate('Main' as never, { screen: 'Activity' } as never)}
            />
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg }]}>
              {data.recentWorkouts.map((w: any, i: number) => (
                <View key={i} style={[styles.workoutRow, i < data.recentWorkouts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={[styles.workoutIcon, { backgroundColor: PINK + '18' }]}>
                    <Ionicons name="barbell-outline" size={14} color={PINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.workoutName, { color: theme.textPrimary }]}>{w.name}</Text>
                    <Text style={[styles.workoutMeta, { color: theme.textMuted }]}>
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
        <SectionHeader
          title="Body Measurements" icon="body-outline" color={PURPLE} theme={theme}
          onPress={() => navigation.navigate('BodyMeasurements' as never)}
          actionLabel="Log"
        />
        {data?.latestMeasurement ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg }]}>
            <Text style={[styles.measDate, { color: theme.textMuted }]}>
              Last logged: {data.latestMeasurement.measured_at?.split('T')[0]}
            </Text>
            <View style={styles.measGrid}>
              {[
                { label: 'Chest',   value: data.latestMeasurement.chest_cm,   unit: 'cm', prev: data.prevMeasurement?.chest_cm },
                { label: 'Waist',   value: data.latestMeasurement.waist_cm,   unit: 'cm', prev: data.prevMeasurement?.waist_cm },
                { label: 'Hips',    value: data.latestMeasurement.hips_cm,    unit: 'cm', prev: data.prevMeasurement?.hips_cm },
                { label: 'Arms',    value: data.latestMeasurement.arms_cm,    unit: 'cm', prev: data.prevMeasurement?.arms_cm },
                { label: 'Thighs',  value: data.latestMeasurement.thighs_cm,  unit: 'cm', prev: data.prevMeasurement?.thighs_cm },
                { label: 'Neck',    value: data.latestMeasurement.neck_cm,    unit: 'cm', prev: data.prevMeasurement?.neck_cm },
              ].filter(m => m.value != null).map((m) => {
                const diff = m.prev != null ? m.value - m.prev : null;
                return (
                  <View key={m.label} style={[styles.measItem, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.measLabel, { color: theme.textMuted }]}>{m.label}</Text>
                    <Text style={[styles.measValue, { color: theme.textPrimary }]}>{m.value}{m.unit}</Text>
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
            onPress={() => navigation.navigate('BodyMeasurements' as never)}
            style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg }]}
          >
            <Ionicons name="body-outline" size={28} color={theme.textMuted} />
            <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
              Tap to log your first body measurements
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  scroll:   { paddingBottom: 40 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },

  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  recapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },
  recapBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  periodTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  periodTab:  { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -1 },
  periodTabText: { fontSize: fontSize.xs },
  card:       { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: spacing.lg, gap: spacing.sm },
  weightRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightVal:  { fontSize: 28, fontWeight: '900' },
  weightSub:  { fontSize: fontSize.xs, marginTop: 2 },
  weightTarget:{ alignItems: 'center' },
  weightTargetVal: { fontSize: fontSize.lg, fontWeight: '800' },
  bmiChip:    { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
  bmiText:    { fontSize: fontSize.sm, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,107,157,0.15)', overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: fontSize.xs, marginTop: 4 },
  chartLegend: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.sm },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 10 },
  workoutRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  workoutIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontSize: fontSize.sm, fontWeight: '600' },
  workoutMeta: { fontSize: fontSize.xs, marginTop: 1 },
  workoutCal:  { fontSize: fontSize.sm, fontWeight: '700' },
  measDate:    { fontSize: fontSize.xs, marginBottom: spacing.md },
  measGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  measItem:    { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', minWidth: 80 },
  measLabel:   { fontSize: 10, fontWeight: '600' },
  measValue:   { fontSize: fontSize.base, fontWeight: '800', marginTop: 2 },
  measDiff:    { fontSize: 10, fontWeight: '700', marginTop: 1 },
  emptyCard:   { padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.md, borderStyle: 'dashed' },
  emptyCardText: { fontSize: fontSize.sm, textAlign: 'center' },
});