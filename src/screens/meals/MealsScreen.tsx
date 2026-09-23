import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

const { width: SW } = Dimensions.get('window');

function StatCard({ theme, icon, iconColor, label, value, sub, gradient }: {
  theme: typeof colors.light; icon: string; iconColor: string;
  label: string; value: string; sub?: string; gradient?: [string, string];
}) {
  return (
    <View style={[st.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[st.iconCircle, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[st.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[st.label, { color: theme.textSecondary }]}>{label}</Text>
      {sub && <Text style={[st.sub, { color: theme.textMuted }]}>{sub}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: { width: (SW - spacing.lg * 2 - spacing.sm) / 2, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: fontSize.xs, fontWeight: '600' },
  sub: { fontSize: 10, marginTop: 1 },
});

function SleepSection({ theme, userId }: { theme: typeof colors.light; userId: string }) {
  const [sleepData, setSleepData] = useState<{ hours: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('sleep_logs')
          .select('hours, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(7);
        setSleepData(data ?? []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [userId]));

  const totalHours = sleepData.reduce((s, d) => s + (d.hours ?? 0), 0);
  const avgHours = sleepData.length > 0 ? (totalHours / sleepData.length).toFixed(1) : '—';
  const lastNight = sleepData[0]?.hours ?? 0;
  const bars = [...sleepData].reverse();

  return (
    <View style={[sec.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={sec.headerRow}>
        <View style={[sec.iconWrap, { backgroundColor: theme.purple + '20' }]}>
          <Ionicons name="moon" size={18} color={theme.purple} />
        </View>
        <Text style={[sec.title, { color: theme.textPrimary }]}>Sleep</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={[sec.link, { color: theme.accent }]}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={sec.statsRow}>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.purple }]}>{lastNight}h</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Last night</Text>
        </View>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.purple }]}>{avgHours}h</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Avg</Text>
        </View>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.purple }]}>{sleepData.length}</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Days</Text>
        </View>
      </View>
      {bars.length > 0 && (
        <View style={sec.barChart}>
          {bars.map((d, i) => {
            const h = d.hours ?? 0;
            const pct = Math.min(h / 10, 1);
            const isToday = i === bars.length - 1;
            return (
              <View key={i} style={sec.barWrap}>
                <Text style={[sec.barVal, { color: theme.textMuted }]}>{h.toFixed(1)}</Text>
                <View style={sec.barInner}>
                  <LinearGradient
                    colors={[theme.purple, '#7B3FE4'] as [string, string]}
                    style={[sec.bar, { height: `${pct * 100}%` as any, opacity: isToday ? 1 : 0.5 }]}
                  />
                </View>
                <Text style={[sec.barDay, { color: isToday ? theme.purple : theme.textMuted, fontWeight: isToday ? '700' : '400' }]}>
                  {new Date(d.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function WorkoutSection({ theme, userId }: { theme: typeof colors.light; userId: string }) {
  const [sessions, setSessions] = useState<{ name: string; calories_burned: number; completed_at: string; duration_seconds: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('workout_sessions')
          .select('name, calories_burned, completed_at, duration_seconds')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(5);
        setSessions(data ?? []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [userId]));

  const totalCal = sessions.reduce((s, se) => s + (se.calories_burned ?? 0), 0);
  const totalMin = Math.round(sessions.reduce((s, se) => s + (se.duration_seconds ?? 0), 0) / 60);

  return (
    <View style={[sec.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={sec.headerRow}>
        <View style={[sec.iconWrap, { backgroundColor: theme.accent + '20' }]}>
          <Ionicons name="barbell" size={18} color={theme.accent} />
        </View>
        <Text style={[sec.title, { color: theme.textPrimary }]}>Workouts</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={[sec.link, { color: theme.accent }]}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={sec.statsRow}>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.accent }]}>{sessions.length}</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Sessions</Text>
        </View>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.accent }]}>{totalCal}</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Kcal burned</Text>
        </View>
        <View style={sec.statItem}>
          <Text style={[sec.statVal, { color: theme.accent }]}>{totalMin}m</Text>
          <Text style={[sec.statLabel, { color: theme.textMuted }]}>Total time</Text>
        </View>
      </View>
      {sessions.length > 0 && sessions.slice(0, 3).map((s, i) => (
        <View key={i} style={[sec.historyRow, { borderTopColor: theme.border }]}>
          <Ionicons name="fitness-outline" size={14} color={theme.textMuted} />
          <Text style={[sec.historyName, { color: theme.textPrimary }]}>{s.name}</Text>
          <Text style={[sec.historyCal, { color: theme.textMuted }]}>{s.calories_burned} kcal</Text>
        </View>
      ))}
    </View>
  );
}

function BodyStatsSection({ theme, profile, navigation: nav }: { theme: typeof colors.light; profile: any; navigation: any }) {
  const height = profile?.height_cm ?? profile?.height ?? null;
  const weight = profile?.weight_kg ?? profile?.weight ?? null;
  const bmi = height && weight ? (weight / ((height / 100) * (height / 100))).toFixed(1) : null;
  const goalWeight = profile?.goal_weight_kg ?? null;

  return (
    <View style={[sec.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={sec.headerRow}>
        <View style={[sec.iconWrap, { backgroundColor: '#2BBCB0' + '20' }]}>
          <Ionicons name="body-outline" size={18} color="#2BBCB0" />
        </View>
        <Text style={[sec.title, { color: theme.textPrimary }]}>Body Stats</Text>
        <TouchableOpacity onPress={() => nav.navigate('BodyMeasurements' as never)}>
          <Text style={[sec.link, { color: theme.accent }]}>Details</Text>
        </TouchableOpacity>
      </View>
      <View style={sec.statsRow}>
        {height && (
          <View style={sec.statItem}>
            <Text style={[sec.statVal, { color: '#2BBCB0' }]}>{height} cm</Text>
            <Text style={[sec.statLabel, { color: theme.textMuted }]}>Height</Text>
          </View>
        )}
        {weight && (
          <View style={sec.statItem}>
            <Text style={[sec.statVal, { color: '#2BBCB0' }]}>{weight} kg</Text>
            <Text style={[sec.statLabel, { color: theme.textMuted }]}>Weight</Text>
          </View>
        )}
        {bmi && (
          <View style={sec.statItem}>
            <Text style={[sec.statVal, { color: '#2BBCB0' }]}>{bmi}</Text>
            <Text style={[sec.statLabel, { color: theme.textMuted }]}>BMI</Text>
          </View>
        )}
      </View>
      {goalWeight && (
        <Text style={[sec.goalText, { color: theme.textSecondary }]}>
          Goal weight: {goalWeight} kg
        </Text>
      )}
    </View>
  );
}

const sec = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.base, fontWeight: '700', flex: 1 },
  link: { fontSize: fontSize.xs, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 1 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: spacing.xs, marginTop: spacing.sm },
  barWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 2 },
  barVal: { fontSize: 8, fontWeight: '600' },
  barInner: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 2 },
  barDay: { fontSize: 9 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  historyName: { fontSize: fontSize.sm, fontWeight: '600', flex: 1 },
  historyCal: { fontSize: fontSize.xs },
  goalText: { fontSize: fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
});

export default function HealthScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile } = useAuthStore();
  const theme = colors[colorScheme];
  const userId = user?.id ?? '';

  const [sleepAvg, setSleepAvg] = useState<string>('—');
  const [workoutTotal, setWorkoutTotal] = useState<string>('—');

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const { data: sd } = await supabase.from('sleep_logs')
          .select('hours').eq('user_id', userId);
        if (sd?.length) {
          const avg = sd.reduce((s, d) => s + (d.hours ?? 0), 0) / sd.length;
          setSleepAvg(avg.toFixed(1) + 'h');
        }
        const { count } = await supabase.from('workout_sessions')
          .select('id', { head: true, count: 'exact' }).eq('user_id', userId);
        setWorkoutTotal(count != null ? String(count) : '—');
      } catch {}
    };
    load();
  }, [userId]));

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Health</Text>
          <Text style={[styles.pageSub, { color: theme.textMuted }]}>Your body, sleep & activity at a glance</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('IntermittentFasting' as never)}
          style={[styles.ifBtn, { backgroundColor: theme.accentDim as string, borderColor: theme.accent }]}>
          <Ionicons name="time-outline" size={16} color={theme.accent} />
          <Text style={[styles.ifBtnText, { color: theme.accent }]}>Fasting</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.statsGrid}>
          <StatCard theme={theme} icon="moon-outline" iconColor={theme.purple}
            label="Avg Sleep" value={sleepAvg} sub={sleepAvg !== '—' ? 'Last 30 days' : 'No data yet'} />
          <StatCard theme={theme} icon="flame-outline" iconColor="#FF6B35"
            label="Calories" value={profile?.daily_calorie_goal ? String(profile.daily_calorie_goal) : '—'}
            sub={profile?.daily_calorie_goal ? 'Daily goal' : 'No goal set'} />
          <StatCard theme={theme} icon="footsteps-outline" iconColor={theme.accent}
            label="Steps" value={profile?.step_goal ? profile.step_goal.toLocaleString() : '—'}
            sub={profile?.step_goal ? 'Daily goal' : 'No goal set'} />
          <StatCard theme={theme} icon="fitness-outline" iconColor="#2BBCB0"
            label="Workouts" value={workoutTotal} sub={workoutTotal !== '—' ? 'Total sessions' : 'No data yet'} />
        </View>

        <SleepSection theme={theme} userId={userId} />
        <WorkoutSection theme={theme} userId={userId} />
        <BodyStatsSection theme={theme} profile={profile} navigation={navigation} />

        {/* Fasting card */}
        <TouchableOpacity onPress={() => navigation.navigate('IntermittentFasting' as never)}
          style={[styles.fastingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <LinearGradient colors={['#B280FF22', '#6699FF22'] as [string, string]}
            style={styles.fastingGrad}>
            <View style={[styles.fastingIcon, { backgroundColor: '#B280FF22' }]}>
              <Ionicons name="timer-outline" size={22} color="#B280FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fastingTitle, { color: theme.textPrimary }]}>Intermittent Fasting</Text>
              <Text style={[styles.fastingSub, { color: theme.textMuted }]}>Set up and track your fasting schedule</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  pageTitle: { fontSize: fontSize.xxl, fontWeight: '800' },
  pageSub: { fontSize: fontSize.xs, marginTop: 2 },
  ifBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 99, borderWidth: 1 },
  ifBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  scroll: { paddingBottom: 100, paddingTop: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  fastingCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  fastingGrad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  fastingIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fastingTitle: { fontSize: fontSize.base, fontWeight: '700' },
  fastingSub: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
});
