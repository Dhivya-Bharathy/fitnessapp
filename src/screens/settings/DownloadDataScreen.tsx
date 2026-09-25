import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { saveExportFile } from '../../utils/exportDownload';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

// ── SAFE COLORS ───────────────────────────────────────────────
const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PURPLE = '#B280FF';
const BLUE   = '#6699FF';
const GREEN  = '#2DDC8C';
const PINK   = '#FF6B9D';

// ── DATA SECTIONS ─────────────────────────────────────────────
const EXPORT_SECTIONS = [
  { id: 'profile',    label: 'Profile & Goals',     icon: 'person-outline',     color: BLUE   },
  { id: 'food',       label: 'Food & Nutrition Logs',icon: 'restaurant-outline', color: ORANGE },
  { id: 'water',      label: 'Water Logs',           icon: 'water-outline',      color: BLUE   },
  { id: 'workouts',   label: 'Workout History',      icon: 'barbell-outline',    color: PINK   },
  { id: 'steps',      label: 'Step Logs',            icon: 'footsteps-outline',  color: GREEN  },
  { id: 'sleep',      label: 'Sleep Logs',           icon: 'moon-outline',       color: PURPLE },
  { id: 'fasting',    label: 'Fasting Sessions',     icon: 'timer-outline',      color: GOLD   },
  { id: 'streaks',    label: 'Streak History',       icon: 'flame-outline',      color: ORANGE },

];

// ── FETCH ALL USER DATA ───────────────────────────────────────
async function fetchTable<T>(
  table: string,
  userId: string,
  orderCol: string,
  warnings: string[],
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order(orderCol, { ascending: false });
  if (error) {
    warnings.push(`${table}: ${error.message}`);
    if (__DEV__) console.warn(`[export] ${table}:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

async function fetchAllData(userId: string) {
  const warnings: string[] = [];
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) {
    warnings.push(`profiles: ${profileError.message}`);
    if (__DEV__) console.warn('[export] profiles:', profileError.message);
  }

  const [food, water, workouts, steps, sleep, fasting] = await Promise.all([
    fetchTable<any>('food_logs', userId, 'logged_at', warnings),
    fetchTable<any>('water_logs', userId, 'logged_at', warnings),
    fetchTable<any>('workout_sessions', userId, 'completed_at', warnings),
    fetchTable<any>('step_logs', userId, 'date', warnings),
    fetchTable<any>('sleep_logs', userId, 'date', warnings),
    fetchTable<any>('fasting_logs', userId, 'started_at', warnings),
  ]);

  return { profile, food, water, workouts, steps, sleep, fasting, warnings };
}

// ── GENERATE CSV ──────────────────────────────────────────────
function rowsToCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
}

function buildCSV(data: Awaited<ReturnType<typeof fetchAllData>>, userName: string): string {
  const sections: string[] = [`Fitness App Data Export — ${userName} — ${new Date().toLocaleDateString()}\n`];

  // Profile summary
  const p = data.profile as any;
  if (p) {
    sections.push('=== PROFILE ===');
    sections.push(rowsToCSV(
      ['Field', 'Value'],
      [
        ['Name',          p.full_name ?? ''],
        ['Fitness ID',     p.calfit_id ?? ''],
        ['Email',         p.email ?? ''],
        ['Goal',          p.goal ?? ''],
        ['Calorie Goal',  String(p.daily_calorie_goal ?? 2000)],
        ['Water Goal (ml)',String(p.water_goal_ml ?? 2500)],
        ['Streak Count',  String(p.streak_count ?? 0)],
        ['Member Since',  p.created_at?.split('T')[0] ?? ''],
      ]
    ));
    sections.push('');
  }

  // Food logs
  if ((data.food as any[]).length > 0) {
    sections.push('=== FOOD LOGS ===');
    sections.push(rowsToCSV(
      ['Date', 'Meal', 'Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)'],
      (data.food as any[]).map((r) => [
        r.logged_at?.split('T')[0] ?? '',
        r.meal_type ?? '',
        r.food_name ?? '',
        String(r.calories ?? 0),
        String(r.protein_g ?? ''),
        String(r.carbs_g ?? ''),
        String(r.fats_g ?? ''),
      ])
    ));
    sections.push('');
  }

  const waterGoalMl = String(p?.water_goal_ml ?? 2500);

  // Water logs
  if ((data.water as any[]).length > 0) {
    sections.push('=== WATER LOGS ===');
    sections.push(rowsToCSV(
      ['Date', 'Amount (ml)', 'Daily goal (ml)'],
      (data.water as any[]).map((r) => [
        r.logged_at?.split('T')[0] ?? '',
        String(r.amount_ml ?? 0),
        waterGoalMl,
      ])
    ));
    sections.push('');
  }

  // Workouts
  if ((data.workouts as any[]).length > 0) {
    sections.push('=== WORKOUT HISTORY ===');
    sections.push(rowsToCSV(
      ['Date', 'Workout', 'Duration (min)', 'Calories burned', 'Status'],
      (data.workouts as any[]).map((r) => [
        r.completed_at?.split('T')[0] ?? r.created_at?.split('T')[0] ?? '',
        r.name ?? r.exercise_name ?? '',
        r.duration_seconds != null ? String(Math.round(Number(r.duration_seconds) / 60)) : String(r.duration_minutes ?? ''),
        String(r.calories_burned ?? 0),
        r.status ?? 'completed',
      ])
    ));
    sections.push('');
  }

  // Steps
  if ((data.steps as any[]).length > 0) {
    sections.push('=== STEP LOGS ===');
    sections.push(rowsToCSV(
      ['Date', 'Steps', 'Goal'],
      (data.steps as any[]).map((r) => [
        r.date ?? '',
        String(r.steps ?? 0),
        String(r.goal_steps ?? 10000),
      ])
    ));
    sections.push('');
  }

  // Sleep
  if ((data.sleep as any[]).length > 0) {
    sections.push('=== SLEEP LOGS ===');
    sections.push(rowsToCSV(
      ['Date', 'Duration (h)', 'Quality', 'Bedtime', 'Wake Time'],
      (data.sleep as any[]).map((r) => [
        r.date ?? '',
        String(r.hours ?? r.duration_hours ?? ''),
        r.quality != null ? String(r.quality) : '',
        r.bedtime ?? '',
        r.wake_time ?? '',
      ])
    ));
    sections.push('');
  }

  // Fasting
  if ((data.fasting as any[]).length > 0) {
    sections.push('=== FASTING SESSIONS ===');
    sections.push(rowsToCSV(
      ['Started', 'Ended', 'Protocol', 'Status'],
      (data.fasting as any[]).map((r) => [
        r.started_at?.split('T')[0] ?? '',
        r.ended_at?.split('T')[0] ?? r.completed_at?.split('T')[0] ?? '',
        r.protocol ?? '',
        r.completed === true ? 'completed' : r.status ?? 'active',
      ])
    ));
    sections.push('');
  }

  return sections.join('\n');
}

// ── GENERATE PLAIN TEXT REPORT (readable PDF alternative) ─────
function buildTextReport(data: Awaited<ReturnType<typeof fetchAllData>>, userName: string): string {
  const p = data.profile as any;
  const food = data.food as any[];
  const workouts = data.workouts as any[];
  const steps = data.steps as any[];
  const sleep = data.sleep as any[];

  const totalCal   = food.reduce((s: number, r: any) => s + (r.calories ?? 0), 0);
  const totalWO    = workouts.length;
  const totalSteps = steps.reduce((s: number, r: any) => s + (r.steps ?? 0), 0);
  const avgSleep   = sleep.length > 0
    ? (sleep.reduce((s: number, r: any) => s + Number(r.hours ?? r.duration_hours ?? 0), 0) / sleep.length).toFixed(1)
    : '—';

  return `
╔══════════════════════════════════════╗
║     FITNESS APP DATA EXPORT REPORT   ║
╚══════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}
User: ${userName}
Export ID: ${Date.now()}

──────────────────────────────────────
PROFILE SUMMARY
──────────────────────────────────────
Name:          ${p?.full_name ?? '—'}
Fitness ID:     @${p?.calfit_id ?? '—'}
Goal:          ${p?.goal ?? '—'}
Calorie Goal:  ${p?.daily_calorie_goal ?? 2000} kcal/day
Water Goal:    ${((p?.water_goal_ml ?? 2500) / 1000).toFixed(1)}L/day
Streak:        ${p?.streak_count ?? 0} days
Member Since:  ${p?.created_at?.split('T')[0] ?? '—'}

──────────────────────────────────────
ALL-TIME ACTIVITY SUMMARY
──────────────────────────────────────
Total Food Logs:      ${food.length} entries
Total Calories Logged:${totalCal.toLocaleString()} kcal
Total Workouts:       ${totalWO} sessions
Total Steps Logged:   ${totalSteps.toLocaleString()}
Average Sleep:        ${avgSleep} hours/night
Fasting Sessions:     ${(data.fasting as any[]).length}

──────────────────────────────────────
RECENT WORKOUTS (last 10)
──────────────────────────────────────
${workouts.slice(0, 10).map((w: any) =>
  `${w.completed_at?.split('T')[0] ?? '—'}  ${w.name ?? w.exercise_name ?? '—'}  ${w.calories_burned ?? 0} kcal`
).join('\n') || 'No workouts logged yet.'}

──────────────────────────────────────
RECENT FOOD LOGS (last 10)
──────────────────────────────────────
${food.slice(0, 10).map((f: any) =>
  `${f.logged_at?.split('T')[0] ?? '—'}  ${f.meal_type ?? '—'}  ${f.food_name ?? '—'}  ${f.calories ?? 0} kcal`
).join('\n') || 'No food logged yet.'}

──────────────────────────────────────
This report was generated by Fitness App.
──────────────────────────────────────
`.trim();
}

// ── STAT CARD ─────────────────────────────────────────────────
function StatCard({ label, value, icon, color, theme }: {
  label: string; value: string; icon: string;
  color: string; theme: typeof colors.dark;
}) {
  return (
    <View style={[sc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[sc.icon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[sc.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[sc.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card:  { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 4 },
  icon:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: fontSize.base, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function DownloadDataScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile } = useAuthStore();
  const theme = colors[colorScheme];

  const [isLoading, setIsLoading]     = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'txt'>('csv');
  const [summary, setSummary]         = useState<null | { food: number; workouts: number; steps: number; sleep: number }>(null);

  const userName = (profile as any)?.calfit_id
    || profile?.full_name?.toLowerCase().replace(/\s+/g, '') || 'calfit_user';

  const safeFileLabel = userName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'user';

  const handleExport = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchAllData(user.id);

      if (data.warnings.length > 0) {
        const warnText = `Some data could not be loaded:\n\n${data.warnings.slice(0, 5).join('\n')}`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`${warnText}\n\nExport will continue with available data.`);
        } else {
          await new Promise<void>((resolve) => {
            Alert.alert('Partial data', `${warnText}\n\nExport will continue with available data.`, [
              { text: 'Continue', onPress: () => resolve() },
            ]);
          });
        }
      }

      // Update summary stats
      setSummary({
        food:     (data.food as any[]).length,
        workouts: (data.workouts as any[]).length,
        steps:    (data.steps as any[]).reduce((s: number, r: any) => s + (r.steps ?? 0), 0),
        sleep:    (data.sleep as any[]).length,
      });

      // Generate the export content
      let exportContent = exportFormat === 'csv'
        ? buildCSV(data, userName)
        : buildTextReport(data, userName);
      if (exportFormat === 'csv') {
        exportContent = `\uFEFF${exportContent}`;
      }

      const dateStamp = new Date().toISOString().split('T')[0];
      const ext = exportFormat === 'csv' ? 'csv' : 'txt';
      const filename = `fitness_export_${safeFileLabel}_${dateStamp}.${ext}`;
      const mime = exportFormat === 'csv' ? 'text/csv' : 'text/plain';

      await saveExportFile(exportContent, filename, mime);

      const successMsg = `${filename} should appear in your Downloads folder.`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Download started\n\n${successMsg}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate export. Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Export failed\n\n${msg}`);
      } else {
        Alert.alert('Export Failed', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={[BLUE + 'DD', GREEN + 'CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download My Data</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── INFO BANNER ── */}
        <View style={[styles.infoBanner, { backgroundColor: theme.accentDim as string, borderColor: theme.accent }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>Your data belongs to you</Text>
            <Text style={[styles.infoSub, { color: theme.textMuted }]}>
              Export all your Fitness App activity — food logs, workouts, sleep, steps, streaks and more.
            </Text>
          </View>
        </View>

        {/* ── WHAT'S INCLUDED ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>What's included</Text>
        </View>
        <View style={[styles.includesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {EXPORT_SECTIONS.map((s, i) => (
            <View
              key={s.id}
              style={[styles.includeRow, i < EXPORT_SECTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
            >
              <View style={[styles.includeIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={15} color={s.color} />
              </View>
              <Text style={[styles.includeLabel, { color: theme.textPrimary }]}>{s.label}</Text>
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
            </View>
          ))}
        </View>

        {/* ── SUMMARY STATS (shown after first export) ── */}
        {summary && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Your stats</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard label="Food Entries"   value={String(summary.food)}     icon="restaurant-outline" color={ORANGE} theme={theme} />
              <StatCard label="Workouts"        value={String(summary.workouts)} icon="barbell-outline"    color={PINK}   theme={theme} />
              <StatCard label="Total Steps"     value={summary.steps > 0 ? (summary.steps / 1000).toFixed(1) + 'k' : '—'} icon="footsteps-outline" color={GREEN} theme={theme} />
              <StatCard label="Sleep Entries"   value={String(summary.sleep)}   icon="moon-outline"       color={PURPLE} theme={theme} />
            </View>
          </>
        )}

        {/* ── FORMAT PICKER ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Export format</Text>
        </View>
        <View style={styles.formatRow}>
          {([
            { id: 'csv', label: 'CSV Spreadsheet', icon: 'grid-outline',    desc: 'Open in Excel, Google Sheets, or Numbers' },
            { id: 'txt', label: 'Text Report',     icon: 'document-outline', desc: 'Full readable report with all stats' },
          ] as const).map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setExportFormat(f.id)}
              style={[styles.formatCard, {
                backgroundColor: theme.card,
                borderColor: exportFormat === f.id ? theme.accent : theme.border,
                borderWidth: exportFormat === f.id ? 2 : 1,
              }]}
            >
              <Ionicons
                name={f.icon as any}
                size={22}
                color={exportFormat === f.id ? theme.accent : theme.textMuted}
              />
              <Text style={[styles.formatLabel, {
                color: exportFormat === f.id ? theme.accent : theme.textPrimary,
              }]}>{f.label}</Text>
              <Text style={[styles.formatDesc, { color: theme.textMuted }]}>{f.desc}</Text>
              {exportFormat === f.id && (
                <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.formatCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── EXPORT BUTTON ── */}
        <TouchableOpacity
          onPress={handleExport}
          disabled={isLoading}
          style={[styles.exportBtn, { opacity: isLoading ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={[BLUE, GREEN] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.exportGrad}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="download-outline" size={20} color="#fff" />}
            <Text style={styles.exportBtnText}>
              {isLoading ? 'Generating export…' : `Export as ${exportFormat.toUpperCase()}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.legalNote, { color: theme.textMuted }]}>
          Your export is generated securely on your device. Fitness App never shares your personal data with third parties.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  backBtn:{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  infoTitle:  { fontSize: fontSize.sm, fontWeight: '700' },
  infoSub:    { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },

  sectionHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle:  { fontSize: fontSize.base, fontWeight: '700' },

  includesCard: { marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  includeRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  includeIcon:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  includeLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '500' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: spacing.lg, gap: spacing.sm },

  formatRow:   { flexDirection: 'row', marginHorizontal: spacing.lg, gap: spacing.md },
  formatCard:  { flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: 4, position: 'relative' },
  formatLabel: { fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.xs },
  formatDesc:  { fontSize: fontSize.xs, lineHeight: 14 },
  formatCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  exportBtn:     { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  exportGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 4 },
  exportBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },

  legalNote: { marginHorizontal: spacing.lg, marginTop: spacing.lg, fontSize: fontSize.xs, textAlign: 'center', lineHeight: 18 },
});