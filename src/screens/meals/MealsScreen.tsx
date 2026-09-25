import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { getTodayCalories } from '../../services/profileService';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';

const PURPLE = '#B280FF';
const ORANGE = '#FFB347';
const TEAL = '#2BBCB0';
const BLUE = '#6699FF';
const WEEKLY_WORKOUT_GOAL = 3;

function pct(current: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.min(Math.max(current / goal, 0), 1);
}

function MetricCard({
  icon,
  iconColor,
  title,
  value,
  sub,
  progress,
  progressColors,
  rightTop,
  rightBottom,
  watermark,
  onPress,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  value: string;
  sub?: string;
  progress: number;
  progressColors: [string, string];
  rightTop: string;
  rightBottom: string;
  watermark?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const inner = (
    <View style={[card.wrap, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}>
      {watermark && (
        <Ionicons name={watermark} size={72} color={iconColor} style={card.watermark} />
      )}
      <View style={card.topRow}>
        <View style={card.left}>
          <View style={[card.iconCircle, { backgroundColor: iconColor + '22' }]}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
          <View style={card.titles}>
            <Text style={card.title}>{title}</Text>
            <Text style={[card.value, { color: PREMIUM_TEXT }]}>{value}</Text>
            {sub ? <Text style={card.sub}>{sub}</Text> : null}
          </View>
        </View>
        <View style={card.right}>
          <Text style={[card.rightTop, { color: iconColor }]}>{rightTop}</Text>
          <Text style={card.rightBottom}>{rightBottom}</Text>
          {onPress && <Ionicons name="chevron-forward" size={16} color={PREMIUM_MUTED} style={{ marginTop: 4, alignSelf: 'flex-end' }} />}
        </View>
      </View>
      <View style={card.track}>
        <LinearGradient
          colors={progressColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[card.fill, { width: `${Math.round(progress * 100)}%` }]}
        />
      </View>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const card = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -8, bottom: spacing.md, opacity: 0.08 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  left: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flex: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_MUTED },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },
  sub: { fontSize: 11, color: PREMIUM_MUTED, marginTop: 2 },
  right: { alignItems: 'flex-end', minWidth: 88 },
  rightTop: { fontSize: fontSize.sm, fontWeight: '800' },
  rightBottom: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, minWidth: 2 },
});

function SleepCard({ userId, sleepGoalHrs }: { userId: string; sleepGoalHrs: number }) {
  const navigation = useNavigation<any>();
  const [sleepData, setSleepData] = useState<{ hours: number; date: string }[]>([]);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from('sleep_logs')
        .select('hours, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(7);
      setSleepData(data ?? []);
    };
    load();
  }, [userId]));

  const avgHours = sleepData.length
    ? sleepData.reduce((s, d) => s + (d.hours ?? 0), 0) / sleepData.length
    : 0;
  const displayAvg = sleepData.length ? `${avgHours.toFixed(1)}h` : '—';
  const bars = [...sleepData].reverse();
  const progress = pct(avgHours, sleepGoalHrs);

  return (
    <View style={[card.wrap, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}>
      <View style={card.topRow}>
        <View style={card.left}>
          <View style={[card.iconCircle, { backgroundColor: PURPLE + '22' }]}>
            <Ionicons name="moon" size={22} color={PURPLE} />
          </View>
          <View style={card.titles}>
            <Text style={card.title}>Sleep</Text>
            <Text style={[card.value, { color: PREMIUM_TEXT }]}>{displayAvg}</Text>
            <Text style={card.sub}>Avg sleep</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
          <Text style={{ color: PREMIUM_ACCENT, fontSize: fontSize.xs, fontWeight: '700' }}>See all ›</Text>
        </TouchableOpacity>
      </View>

      {bars.length > 0 && (
        <View style={sleepStyles.barChart}>
          {bars.map((d, i) => {
            const h = d.hours ?? 0;
            const barPct = Math.min(h / Math.max(sleepGoalHrs, 8), 1);
            const isLast = i === bars.length - 1;
            return (
              <View key={d.date} style={sleepStyles.barWrap}>
                <View style={sleepStyles.barInner}>
                  <LinearGradient
                    colors={[PURPLE, '#7B3FE4']}
                    style={[sleepStyles.bar, { height: `${Math.max(barPct * 100, 8)}%` as `${number}%`, opacity: isLast ? 1 : 0.55 }]}
                  />
                </View>
                <Text style={[sleepStyles.barDay, isLast && { color: PURPLE, fontWeight: '700' }]}>
                  {new Date(d.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={card.track}>
        <LinearGradient colors={[PURPLE, '#7B3FE4']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[card.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={[card.rightBottom, { marginTop: 6 }]}>
        {sleepData.length ? `${Math.round(progress * 100)}% of ${sleepGoalHrs}h goal` : 'Log sleep from Home'}
      </Text>
    </View>
  );
}

const sleepStyles = StyleSheet.create({
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 4, marginTop: spacing.md, marginBottom: spacing.xs },
  barWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barInner: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 9, color: PREMIUM_MUTED, marginTop: 4 },
});

export default function HealthScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, liveSteps } = useAuthStore();
  const userId = user?.id ?? '';

  const calorieGoal = profile?.daily_calorie_goal ?? 2000;
  const stepGoal = profile?.step_goal ?? 10000;
  const sleepGoalHrs = profile?.sleep_goal_hrs ?? 8;
  const height = profile?.height_cm ?? null;
  const weight = profile?.current_weight_kg ?? null;

  const [caloriesToday, setCaloriesToday] = useState(0);
  const [stepsToday, setStepsToday] = useState(0);
  const [workoutsWeek, setWorkoutsWeek] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const cal = await getTodayCalories(userId);
      setCaloriesToday(cal);

      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString();

      const [stepsRes, workoutsRes] = await Promise.all([
        supabase.from('step_logs').select('steps, date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed').gte('completed_at', sinceStr),
      ]);

      const loggedSteps = stepsRes.data?.steps ?? 0;
      setStepsToday(loggedSteps > 0 ? loggedSteps : liveSteps);
      setWorkoutsWeek(workoutsRes.count ?? 0);
    } catch (e) {
      if (__DEV__) console.error('HealthScreen load:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, liveSteps]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const calPct = pct(caloriesToday, calorieGoal);
  const stepPct = pct(stepsToday, stepGoal);
  const workoutPct = pct(workoutsWeek, WEEKLY_WORKOUT_GOAL);

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Health</Text>
          <Text style={styles.pageSub}>Your body, sleep & activity at a glance</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('IntermittentFasting' as never)}
          style={styles.fastingPill}
        >
          <Ionicons name="time-outline" size={16} color={PREMIUM_ACCENT} />
          <Text style={styles.fastingPillText}>Fasting</Text>
          <Ionicons name="chevron-forward" size={14} color={PREMIUM_ACCENT} />
        </TouchableOpacity>
      </View>

      <ScreenScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(); }} tintColor={PREMIUM_ACCENT} colors={[PREMIUM_ACCENT]} />
        }
      >
        {userId ? <SleepCard userId={userId} sleepGoalHrs={sleepGoalHrs} /> : null}

        <MetricCard
          icon="flame-outline"
          iconColor={ORANGE}
          title="Calories"
          value={`${caloriesToday.toLocaleString()} kcal`}
          progress={calPct}
          progressColors={['#FF6B35', ORANGE]}
          rightTop={`${caloriesToday.toLocaleString()} / ${calorieGoal.toLocaleString()}`}
          rightBottom={`${Math.round(calPct * 100)}% of goal`}
          onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}
        />

        <MetricCard
          icon="footsteps-outline"
          iconColor={TEAL}
          title="Steps"
          value={`${stepsToday.toLocaleString()} steps`}
          progress={stepPct}
          progressColors={[TEAL, PREMIUM_ACCENT]}
          rightTop={`${stepsToday.toLocaleString()} / ${stepGoal.toLocaleString()}`}
          rightBottom={`${Math.round(stepPct * 100)}% of goal`}
          watermark="footsteps-outline"
          onPress={() => navigation.navigate('Main', { screen: 'Activity' })}
        />

        <MetricCard
          icon="barbell-outline"
          iconColor={BLUE}
          title="Workouts"
          value={`${workoutsWeek} sessions`}
          sub="This week"
          progress={workoutPct}
          progressColors={[BLUE, '#4A90E2']}
          rightTop={`${workoutsWeek} / ${WEEKLY_WORKOUT_GOAL}`}
          rightBottom={`${Math.round(workoutPct * 100)}% of goal`}
          watermark="barbell-outline"
          onPress={() => navigation.navigate('Main', { screen: 'Activity' })}
        />

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('BodyMeasurements' as never)}
          style={[card.wrap, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}
        >
          <View style={card.topRow}>
            <View style={card.left}>
              <View style={[card.iconCircle, { backgroundColor: TEAL + '22' }]}>
                <Ionicons name="body-outline" size={22} color={TEAL} />
              </View>
              <View style={card.titles}>
                <Text style={card.title}>Body Stats</Text>
                <Text style={[card.value, { color: PREMIUM_TEXT }]}>
                  {height ? `${height} cm` : weight ? `${weight} kg` : '—'}
                </Text>
                <Text style={card.sub}>{height ? 'Height' : weight ? 'Weight' : 'Add in Edit Profile'}</Text>
              </View>
            </View>
            <View style={styles.detailsPill}>
              <Text style={styles.detailsPillText}>Details ›</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('IntermittentFasting' as never)}
          style={[styles.ifCard, premiumGlassShadow()]}
        >
          <Ionicons name="timer-outline" size={88} color={PURPLE} style={styles.ifWatermark} />
          <View style={[card.iconCircle, { backgroundColor: PURPLE + '22' }]}>
            <Ionicons name="timer-outline" size={22} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ifTitle}>Intermittent Fasting</Text>
            <Text style={styles.ifSub}>Set up and track your fasting schedule</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={PREMIUM_MUTED} />
        </TouchableOpacity>
      </ScreenScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    zIndex: 10,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: PREMIUM_TEXT, letterSpacing: -0.3 },
  pageSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginTop: 4, lineHeight: 18 },
  fastingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT + '66',
    backgroundColor: PREMIUM_ACCENT + '12',
    marginTop: 4,
  },
  fastingPillText: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_ACCENT },
  scroll: { paddingTop: spacing.xs },
  detailsPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: TEAL + '55',
  },
  detailsPillText: { fontSize: fontSize.xs, fontWeight: '700', color: TEAL },
  ifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    overflow: 'hidden',
  },
  ifWatermark: { position: 'absolute', right: 40, opacity: 0.07 },
  ifTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  ifSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4, lineHeight: 16 },
});
