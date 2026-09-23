import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator,
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

const SLEEP_GOAL_HRS = 8;

type SleepLog = { id: string; date: string; hours: number; quality: number; notes: string };

const QUALITY_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
const QUALITY_COLORS = (theme: any): Record<number, string> => ({
  1: theme.red, 2: theme.amber, 3: '#FFB830', 4: theme.accent, 5: '#2BBCB0',
});
const QUALITY_EMOJI: Record<number, string> = { 1: '😫', 2: '😕', 3: '😊', 4: '😄', 5: '🌟' };

// ── LOG MODAL ─────────────────────────────────────────────────
function LogSleepModal({ visible, theme, onClose, onSave, existingLog }: {
  visible: boolean; theme: typeof colors.light;
  onClose: () => void; onSave: (hours: number, quality: number, notes: string) => Promise<void>;
  existingLog?: SleepLog | null;
}) {
  const [hours, setHours]     = useState(existingLog?.hours ?? 7);
  const [quality, setQuality] = useState(existingLog?.quality ?? 3);
  const [notes, setNotes]     = useState(existingLog?.notes ?? '');
  const [saving, setSaving]   = useState(false);
  const qualColors = QUALITY_COLORS(theme);

  const handlePress = async () => {
    setSaving(true);
    await onSave(hours, quality, notes);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
          {/* Modal header with gradient */}
          <LinearGradient colors={[theme.heroCard, '#2A1F6B'] as [string, string]} style={styles.modalHero}>
            <Text style={styles.modalHeroEmoji}>🌙</Text>
            <Text style={styles.modalHeroTitle}>{existingLog ? 'Edit Sleep Log' : 'Log Last Night\'s Sleep'}</Text>
            <Text style={styles.modalHeroSub}>How much did you sleep?</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.70)" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Hours big display */}
            <View style={styles.hoursDisplay}>
              <TouchableOpacity onPress={() => setHours(Math.max(1, hours - 0.5))}
                style={[styles.hoursArrow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="remove" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={styles.hoursBig}>
                <Text style={[styles.hoursBigVal, { color: theme.textPrimary }]}>{hours}</Text>
                <Text style={[styles.hoursBigUnit, { color: theme.textMuted }]}>hours</Text>
              </View>
              <TouchableOpacity onPress={() => setHours(Math.min(12, hours + 0.5))}
                style={[styles.hoursArrow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="add" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick hour pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourPills}>
              {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map((h) => (
                <TouchableOpacity key={h} onPress={() => setHours(h)} activeOpacity={0.8}
                  style={[styles.hourPill, { backgroundColor: hours === h ? theme.purple : theme.bg, borderColor: hours === h ? theme.purple : theme.border }]}>
                  <Text style={[styles.hourPillText, { color: hours === h ? '#fff' : theme.textSecondary }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quality selector */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Sleep quality</Text>
            <View style={styles.qualityRow}>
              {[1, 2, 3, 4, 5].map((q) => (
                <TouchableOpacity key={q} onPress={() => setQuality(q)} activeOpacity={0.8}
                  style={[styles.qualityBtn, { backgroundColor: quality === q ? qualColors[q] + '22' : theme.bg, borderColor: quality === q ? qualColors[q] : theme.border }]}>
                  <Text style={styles.qualityEmoji}>{QUALITY_EMOJI[q]}</Text>
                  <Text style={[styles.qualityBtnLabel, { color: quality === q ? qualColors[q] : theme.textMuted }]}>
                    {QUALITY_LABELS[q]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <View style={[styles.notesInput, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <TextInput value={notes} onChangeText={setNotes}
                placeholder="How did you feel? Any disturbances?" placeholderTextColor={theme.textMuted}
                style={[styles.notesText, { color: theme.textPrimary }]} multiline numberOfLines={3} />
            </View>

            <TouchableOpacity onPress={handlePress} disabled={saving} activeOpacity={0.85} style={styles.saveBtnWrap}>
              <LinearGradient colors={[theme.purple, '#7B3FE4'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="moon" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Sleep Log</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── CONSISTENCY SCORE ─────────────────────────────────────────
function ConsistencyScore({ theme, logs }: { theme: typeof colors.light; logs: SleepLog[] }) {
  const last7    = logs.slice(0, 7);
  const avgHours = last7.length > 0 ? last7.reduce((s, l) => s + l.hours, 0) / last7.length : 0;
  const goalDays = last7.filter((l) => l.hours >= SLEEP_GOAL_HRS).length;
  const score    = Math.round((goalDays / 7) * 100);

  return (
    <LinearGradient colors={[theme.sleepCard, theme.sleepCard] as [string, string]} style={styles.scoreCard}>
      <Text style={[styles.scoreTitle, { color: theme.purple }]}>7-Day Consistency</Text>
      <View style={styles.scoreRow}>
        <View style={styles.scoreMain}>
          <Text style={[styles.scoreVal, { color: theme.purple }]}>{score}%</Text>
          <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>consistency</Text>
        </View>
        <View style={[styles.scoreDivider, { backgroundColor: theme.border }]} />
        <View style={styles.scoreStats}>
          {[
            { label: 'avg/night', val: avgHours > 0 ? `${avgHours.toFixed(1)}h` : '—' },
            { label: 'goal met',  val: `${goalDays}/7` },
          ].map((s) => (
            <View key={s.label} style={styles.scoreStat}>
              <Text style={[styles.scoreStatVal, { color: theme.textPrimary }]}>{s.val}</Text>
              <Text style={[styles.scoreStatLabel, { color: theme.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 7-day mini bars */}
      <View style={styles.miniBarRow}>
        {Array.from({ length: 7 }).map((_, i) => {
          const log = last7[6 - i];
          const pct = log ? Math.min(log.hours / SLEEP_GOAL_HRS, 1) : 0;
          const met = log && log.hours >= SLEEP_GOAL_HRS;
          return (
            <View key={i} style={styles.miniBarWrap}>
              <View style={[styles.miniBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.miniBarFill, { height: `${pct * 100}%` as any, backgroundColor: met ? theme.purple : theme.amber }]} />
              </View>
              <Text style={[styles.miniBarLabel, { color: theme.textMuted }]}>{log ? `${log.hours}h` : '—'}</Text>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function SleepScreen() {
  const navigation  = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user }    = useAuthStore();
  const theme       = colors[colorScheme];

  const [logs, setLogs]             = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showModal, setShowModal]   = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) loadLogs(); }, [user?.id]));

  const loadLogs = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('sleep_logs').select('id,user_id,hours,date,created_at,bedtime,wake_time').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(30);
    if (data) setLogs(data as SleepLog[]);
    setIsLoading(false);
  };

  const handleSave = async (hours: number, quality: number, notes: string) => {
    if (!user?.id) return;
    const today    = new Date().toISOString().split('T')[0];
    const existing = logs.find((l) => l.date === today);
    if (existing) {
      const { error } = await supabase.from('sleep_logs').update({ hours, quality, notes }).eq('id', existing.id);
      if (!error) setLogs((prev) => prev.map((l) => l.id === existing.id ? { ...l, hours, quality, notes } : l));
    } else {
      const { data, error } = await supabase.from('sleep_logs').insert({ user_id: user.id, date: today, hours, quality, notes }).select().single();
      if (data) setLogs((prev) => [data as SleepLog, ...prev]);
    }
    try {
      const { sendNotification } = await import('../../services/notificationService');
      await sendNotification(user.id, 'goal', `Sleep logged — ${hours} hours 🌙`, hours >= SLEEP_GOAL_HRS ? 'Great job hitting your sleep goal!' : 'Keep working towards your 8-hour goal.', 'View Progress');
    } catch {}
  };

  const handleDelete = (logId: string) => {
    Alert.alert('Delete log?', 'This will remove this sleep entry.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('sleep_logs').delete().eq('id', logId);
        if (!error) setLogs((prev) => prev.filter((l) => l.id !== logId));
      }},
    ]);
  };

  const todayLog = logs.find((l) => l.date === new Date().toISOString().split('T')[0]);
  const qualColors = QUALITY_COLORS(theme);
  const todayPct = todayLog ? Math.min(todayLog.hours / SLEEP_GOAL_HRS, 1) : 0;
  const todayColor = todayLog && todayLog.hours >= SLEEP_GOAL_HRS ? theme.purple : theme.amber;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Sleep Tracker</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85} style={styles.logBtnWrap}>
          <LinearGradient colors={[theme.purple, '#7B3FE4'] as [string, string]} style={styles.logBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.logBtnText}>Log</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── TODAY HERO ─────────────────────────────────────── */}
        <LinearGradient colors={[theme.heroCard, '#2A1F6B'] as [string, string]} style={styles.todayHero}>
          <View style={styles.todayTopRow}>
            <View>
              <Text style={styles.todayHeroLabel}>Last night</Text>
              <Text style={[styles.todayHeroHours, { color: todayLog ? todayColor : 'rgba(255,255,255,0.40)' }]}>
                {todayLog ? `${todayLog.hours}h` : '—'}
              </Text>
              <Text style={styles.todayHeroGoal}>Goal: {SLEEP_GOAL_HRS}h</Text>
            </View>
            <Text style={styles.moonLarge}>🌙</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.todayPBBg}>
            {todayLog ? (
              <LinearGradient colors={[theme.purple, '#7B3FE4'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.todayPBFill, { width: `${todayPct * 100}%` as any }]} />
            ) : null}
          </View>

          {todayLog ? (
            <View style={styles.todayQualityRow}>
              <View style={[styles.qualityBadge, { backgroundColor: qualColors[todayLog.quality] + '33', borderColor: qualColors[todayLog.quality] + '66' }]}>
                <Text style={styles.qualityEmoji}>{QUALITY_EMOJI[todayLog.quality]}</Text>
                <Text style={[styles.qualityBadgeText, { color: qualColors[todayLog.quality] }]}>{QUALITY_LABELS[todayLog.quality]} sleep</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(true)}
                style={[styles.editBtn, { borderColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85}
              style={[styles.logNowBtn, { backgroundColor: theme.purple + '33', borderColor: theme.purple + '66' }]}>
              <Ionicons name="add-circle-outline" size={18} color={theme.purple} />
              <Text style={[styles.logNowText, { color: theme.purple }]}>Log last night's sleep</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Consistency score */}
        {logs.length > 0 && <ConsistencyScore theme={theme} logs={logs} />}

        {/* Sleep tips */}
        <View style={[styles.tipsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.tipsTitle, { color: theme.textPrimary }]}>💡 Sleep Tips</Text>
          {[
            'Aim for 7–9 hours every night for optimal recovery',
            'Keep a consistent bedtime — even on weekends',
            'Avoid screens 30 minutes before bed',
            'Keep your room cool and dark for deeper sleep',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: theme.purple }]} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* History */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>History</Text>
        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={{ padding: spacing.xl }} />
        ) : logs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No sleep logs yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Start tracking your sleep to see patterns and consistency scores</Text>
          </View>
        ) : (
          logs.map((log) => {
            const [year, month, day] = log.date.split('-').map(Number);
            const d         = new Date(year, month - 1, day);
            const today     = new Date();
            const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
            const dateLabel = d.toDateString() === today.toDateString() ? 'Today'
              : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
              : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const isGoal    = log.hours >= SLEEP_GOAL_HRS;
            const qualColor = qualColors[log.quality] ?? theme.textMuted;

            return (
              <View key={log.id} style={[styles.logItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Left colored bar */}
                <View style={[styles.logColorBar, { backgroundColor: isGoal ? theme.purple : theme.amber }]} />
                <View style={[styles.logIconWrap, { backgroundColor: (isGoal ? theme.purple : theme.amber) + '22' }]}>
                  <Ionicons name="moon" size={18} color={isGoal ? theme.purple : theme.amber} />
                </View>
                <View style={styles.logInfo}>
                  <View style={styles.logTopRow}>
                    <Text style={[styles.logDate, { color: theme.textPrimary }]}>{dateLabel}</Text>
                    <Text style={[styles.logHours, { color: isGoal ? theme.purple : theme.amber }]}>{log.hours}h</Text>
                  </View>
                  <View style={styles.logBottomRow}>
                    <View style={[styles.qualityBadge, { backgroundColor: qualColor + '22', borderColor: qualColor + '44' }]}>
                      <Text style={{ fontSize: 10 }}>{QUALITY_EMOJI[log.quality]}</Text>
                      <Text style={[styles.qualityBadgeText, { color: qualColor }]}>{QUALITY_LABELS[log.quality]}</Text>
                    </View>
                    {log.notes ? <Text style={[styles.logNotes, { color: theme.textMuted }]} numberOfLines={1}>{log.notes}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(log.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <LogSleepModal visible={showModal} theme={theme} onClose={() => setShowModal(false)} onSave={handleSave} existingLog={todayLog} />
    </AndroidSafeView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pageTitle: { fontSize: fontSize.xl, fontWeight: '800' },
  logBtnWrap: { borderRadius: 20, overflow: 'hidden' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  logBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: '#fff' },
  scrollContent: { paddingBottom: 80 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },

  // Today hero
  todayHero: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 20, gap: spacing.md },
  todayTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  todayHeroLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  todayHeroHours: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  todayHeroGoal: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.40)', marginTop: 4 },
  moonLarge: { fontSize: 48 },
  todayPBBg: { height: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' },
  todayPBFill: { height: '100%', borderRadius: 4 },
  todayQualityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qualityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  qualityEmoji: { fontSize: 14 },
  qualityBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  editBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  editBtnText: { fontSize: fontSize.xs, fontWeight: '600', color: 'rgba(255,255,255,0.70)' },
  logNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  logNowText: { fontSize: fontSize.sm, fontWeight: '600' },

  // Consistency
  scoreCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 16 },
  scoreTitle: { fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  scoreMain: { alignItems: 'center', width: 80 },
  scoreVal: { fontSize: 36, fontWeight: '900' },
  scoreLabel: { fontSize: fontSize.xs },
  scoreDivider: { width: 1, height: 50, marginHorizontal: spacing.lg },
  scoreStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  scoreStat: { alignItems: 'center' },
  scoreStatVal: { fontSize: fontSize.xl, fontWeight: '800' },
  scoreStatLabel: { fontSize: fontSize.xs },
  miniBarRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', height: 60 },
  miniBarWrap: { flex: 1, alignItems: 'center', gap: 4 },
  miniBarBg: { flex: 1, width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  miniBarFill: { width: '100%', borderRadius: 4 },
  miniBarLabel: { fontSize: 9 },

  // Tips
  tipsCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 16, borderWidth: 1, gap: spacing.sm },
  tipsTitle: { fontSize: fontSize.base, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  tipText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },

  // History
  emptyCard: { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  emptySub: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 14, borderWidth: 1, overflow: 'hidden', paddingRight: spacing.md, paddingVertical: spacing.sm },
  logColorBar: { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  logIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logInfo: { flex: 1 },
  logTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: fontSize.sm, fontWeight: '700' },
  logHours: { fontSize: fontSize.base, fontWeight: '800' },
  logBottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  logNotes: { fontSize: fontSize.xs, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
  modalHero: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm, position: 'relative' },
  modalHeroEmoji: { fontSize: 40 },
  modalHeroTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  modalHeroSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.60)' },
  modalCloseBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  modalContent: { padding: spacing.lg, gap: spacing.md },
  hoursDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  hoursArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hoursBig: { alignItems: 'center' },
  hoursBigVal: { fontSize: 64, fontWeight: '900', lineHeight: 70 },
  hoursBigUnit: { fontSize: fontSize.sm },
  hourPills: { gap: spacing.sm, paddingRight: spacing.lg },
  hourPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 99, borderWidth: 1 },
  hourPillText: { fontSize: fontSize.sm, fontWeight: '600' },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  qualityRow: { flexDirection: 'row', gap: spacing.xs },
  qualityBtn: { flex: 1, padding: spacing.sm, borderRadius: 10, borderWidth: 1, alignItems: 'center', gap: 2 },
  qualityBtnLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: spacing.md, minHeight: 80 },
  notesText: { fontSize: fontSize.base, textAlignVertical: 'top', minHeight: 60 },
  saveBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  saveBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },
});