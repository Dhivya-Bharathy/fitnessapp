import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { colors, spacing, radius, fontSize } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - spacing.lg * 2 - 32; // account for card padding

// ── PERIOD SELECTOR ───────────────────────────────────────────
type Period = 'Week' | 'Month' | '3 Months';

function PeriodSelector({ value, onChange, theme }: {
  value: Period; onChange: (p: Period) => void; theme: typeof colors.dark;
}) {
  const options: Period[] = ['Week', 'Month', '3 Months'];
  return (
    <View style={[ps.row, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[ps.pill, { backgroundColor: value === opt ? theme.accent : 'transparent' }]}
        >
          <Text style={[ps.pillText, { color: value === opt ? theme.bg : theme.textMuted }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ps = StyleSheet.create({
  row:      { flexDirection: 'row', borderRadius: 99, borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  pill:     { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 99 },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
});

// ── BAR CHART ─────────────────────────────────────────────────
interface BarData {
  label: string;   // x-axis label (Mon, Tue etc)
  value: number;   // raw value
  color: string;
}

function BarChart({ data, maxValue, goalLine, unit, theme }: {
  data: BarData[];
  maxValue: number;
  goalLine?: number;  // horizontal goal line
  unit: string;
  theme: typeof colors.dark;
}) {
  if (data.length === 0) return (
    <View style={bc.empty}>
      <Text style={[bc.emptyText, { color: theme.textMuted }]}>No data yet</Text>
    </View>
  );

  const barW = Math.floor((CHART_W - (data.length - 1) * 4) / data.length);

  return (
    <View>
      {/* Goal line label */}
      {goalLine && (
        <View style={[bc.goalRow, { borderColor: theme.accent }]}>
          <Text style={[bc.goalLabel, { color: theme.accent }]}>Goal: {goalLine}{unit}</Text>
        </View>
      )}

      {/* Bars */}
      <View style={bc.barsRow}>
        {data.map((d, i) => {
          const pct = maxValue > 0 ? Math.min(d.value / maxValue, 1) : 0;
          const barH = Math.max(pct * 120, d.value > 0 ? 4 : 0);
          return (
            <View key={i} style={[bc.barCol, { width: barW }]}>
              {d.value > 0 && (
                <Text style={[bc.barVal, { color: theme.textSecondary }]} numberOfLines={1}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                </Text>
              )}
              <View style={[bc.barBg, { backgroundColor: theme.border, height: 120 }]}>
                <LinearGradient
                  colors={[d.color, d.color + 'AA']}
                  style={[bc.barFill, { height: barH }]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={[bc.barLabel, { color: theme.textMuted }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  empty:     { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.sm },
  goalRow:   { borderTopWidth: 1, borderStyle: 'dashed', marginBottom: spacing.xs, paddingTop: spacing.xs },
  goalLabel: { fontSize: 10, fontWeight: '700' },
  barsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 160 },
  barCol:    { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barVal:    { fontSize: 9, fontWeight: '600' },
  barBg:     { width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:   { width: '100%', borderRadius: 4 },
  barLabel:  { fontSize: 9, fontWeight: '600', textAlign: 'center' },
});

// ── CALORIE TREND CHART ───────────────────────────────────────
interface CalorieTrendProps {
  userId: string;
  calorieGoal: number;
  theme: typeof colors.dark;
}

export function CalorieTrendChart({ userId, calorieGoal, theme }: CalorieTrendProps) {
  const [period, setPeriod]   = useState<Period>('Week');
  const [data, setData]       = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avgCalories, setAvgCalories] = useState(0);

  useFocusEffect(useCallback(() => { loadData(); }, [period, userId]));

  const loadData = async () => {
    setIsLoading(true);
    try {
      const days = period === 'Week' ? 7 : period === 'Month' ? 30 : 90;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: logs } = await supabase
        .from('food_logs')
        .select('date, calories')
        .eq('user_id', userId)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!logs) { setData([]); return; }

      // Group calories by date
      const byDate: Record<string, number> = {};
      for (const log of logs) {
        byDate[log.date] = (byDate[log.date] ?? 0) + (log.calories ?? 0);
      }

      // Build date range
      const result: BarData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const calories = byDate[dateStr] ?? 0;

        // Label: show day of week for week, date for longer periods
        const label = period === 'Week'
          ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()]
          : period === 'Month'
          ? (i % 5 === 0 ? `${d.getDate()}` : '')
          : (i % 15 === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : '');

        // Color: green if within goal, amber if over, grey if no data
        const color = calories === 0 ? theme.border
          : calories <= calorieGoal ? '#2DDC8C' : '#F59E0B';

        result.push({ label, value: Math.round(calories), color });
      }

      const nonZero = result.filter(d => d.value > 0);
      const avg = nonZero.length > 0
        ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length)
        : 0;

      setData(result);
      setAvgCalories(avg);
    } finally {
      setIsLoading(false);
    }
  };

  const maxVal = Math.max(...data.map(d => d.value), calorieGoal, 1);

  return (
    <View style={[card.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={card.header}>
        <View>
          <Text style={[card.title, { color: theme.textPrimary }]}>Calorie Trend</Text>
          {avgCalories > 0 && (
            <Text style={[card.sub, { color: theme.textMuted }]}>Avg {avgCalories} kcal/day</Text>
          )}
        </View>
        <PeriodSelector value={period} onChange={setPeriod} theme={theme} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
      ) : (
        <BarChart
          data={data}
          maxValue={maxVal}
          goalLine={calorieGoal}
          unit=" kcal"
          theme={theme}
        />
      )}

      {/* Legend */}
      <View style={card.legend}>
        <View style={card.legendItem}>
          <View style={[card.legendDot, { backgroundColor: '#2DDC8C' }]} />
          <Text style={[card.legendText, { color: theme.textMuted }]}>Within goal</Text>
        </View>
        <View style={card.legendItem}>
          <View style={[card.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[card.legendText, { color: theme.textMuted }]}>Over goal</Text>
        </View>
      </View>
    </View>
  );
}

// ── MOOD TREND CHART ──────────────────────────────────────────
const MOOD_LABELS = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great'];
const MOOD_COLORS = ['', '#EF4444', '#F59E0B', '#60A5FA', '#2DDC8C', '#A78BFA'];
const MOOD_EMOJIS = ['', '😞', '😔', '😐', '😊', '🤩'];

interface MoodTrendProps {
  userId: string;
  theme: typeof colors.dark;
}

export function MoodTrendChart({ userId, theme }: MoodTrendProps) {
  const [data, setData]       = useState<Array<{ date: string; mood: number; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avgMood, setAvgMood]   = useState(0);

  useFocusEffect(useCallback(() => { loadMoods(); }, [userId]));

  const loadMoods = async () => {
    setIsLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 14); // last 2 weeks

      const { data: logs } = await supabase
        .from('mood_logs')
        .select('created_at, mood_score, mood_label')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (!logs) { setData([]); return; }

      const result = logs.map((l: any) => {
        const d = new Date(l.created_at);
        return {
          date: l.created_at,
          mood: l.mood_score ?? 3,
          label: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()],
        };
      });

      const avg = result.length > 0
        ? result.reduce((s, d) => s + d.mood, 0) / result.length
        : 0;

      setData(result);
      setAvgMood(Math.round(avg));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <View style={[card.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[card.title, { color: theme.textPrimary, marginBottom: spacing.md }]}>Mood Trends</Text>
      <ActivityIndicator color={theme.accent} />
    </View>
  );

  if (data.length === 0) return (
    <View style={[card.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[card.title, { color: theme.textPrimary }]}>Mood Trends</Text>
      <Text style={[card.sub, { color: theme.textMuted, marginTop: spacing.sm }]}>
        Log your mood daily from the Home dashboard to see trends here.
      </Text>
    </View>
  );

  const barData: BarData[] = data.map(d => ({
    label: d.label,
    value: d.mood,
    color: MOOD_COLORS[d.mood] ?? '#60A5FA',
  }));

  return (
    <View style={[card.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={card.header}>
        <View>
          <Text style={[card.title, { color: theme.textPrimary }]}>Mood Trends</Text>
          {avgMood > 0 && (
            <Text style={[card.sub, { color: theme.textMuted }]}>
              Average: {MOOD_EMOJIS[avgMood]} {MOOD_LABELS[avgMood]}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 28 }}>{MOOD_EMOJIS[avgMood]}</Text>
      </View>

      <BarChart data={barData} maxValue={5} unit="" theme={theme} />

      {/* Mood scale legend */}
      <View style={[card.moodLegend]}>
        {[1, 2, 3, 4, 5].map(m => (
          <View key={m} style={card.moodItem}>
            <Text style={{ fontSize: 12 }}>{MOOD_EMOJIS[m]}</Text>
            <Text style={[card.legendText, { color: MOOD_COLORS[m] }]}>{MOOD_LABELS[m]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── SHARED CARD STYLES ────────────────────────────────────────
const card = StyleSheet.create({
  wrap:       { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  header:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  title:      { fontSize: fontSize.base, fontWeight: '700' },
  sub:        { fontSize: fontSize.xs, marginTop: 2 },
  legend:     { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs },
  moodLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  moodItem:   { alignItems: 'center', gap: 2 },
});