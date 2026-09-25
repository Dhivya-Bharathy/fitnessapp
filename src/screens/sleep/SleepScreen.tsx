import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
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

const SLEEP_GOAL_HRS = 8;
const PURPLE = '#B280FF';
const PURPLE_DARK = '#7B3FE4';

type SleepLog = {
  id: string;
  date: string;
  hours: number;
  quality: number;
  notes: string;
  bedtime?: string | null;
  wake_time?: string | null;
};

const QUALITY_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent',
};
const QUALITY_EMOJI: Record<number, string> = {
  1: '😫', 2: '😕', 3: '😊', 4: '😄', 5: '🌟',
};
const QUALITY_COLOR: Record<number, string> = {
  1: '#FF5959', 2: '#FFB347', 3: '#FFD133', 4: PREMIUM_ACCENT, 5: '#2BBCB0',
};

function formatHoursMinutes(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

function formatTime12(time: string | null | undefined): string {
  if (!time) return '—';
  const [hh, mm] = time.split(':').map(Number);
  if (Number.isNaN(hh)) return time;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm ?? 0).padStart(2, '0')} ${ampm}`;
}

function computeDefaultTimes(hours: number) {
  const wakeH = 6;
  const wakeM = 30;
  let bedTotal = wakeH * 60 + wakeM - Math.round(hours * 60);
  while (bedTotal < 0) bedTotal += 24 * 60;
  const bedH = Math.floor(bedTotal / 60) % 24;
  const bedM = bedTotal % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { bedtime: `${pad(bedH)}:${pad(bedM)}:00`, wake_time: `${pad(wakeH)}:${pad(wakeM)}:00` };
}

function LogSleepModal({
  visible,
  onClose,
  onSave,
  existingLog,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (hours: number, quality: number, notes: string) => Promise<void>;
  existingLog?: SleepLog | null;
}) {
  const [hours, setHours] = useState(existingLog?.hours ?? 7);
  const [quality, setQuality] = useState(existingLog?.quality ?? 3);
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setHours(existingLog?.hours ?? 7);
      setQuality(existingLog?.quality ?? 3);
      setNotes(existingLog?.notes ?? '');
    }
  }, [visible, existingLog]);

  const handlePress = async () => {
    setSaving(true);
    await onSave(hours, quality, notes.slice(0, 200));
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, premiumGlassShadow()]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{existingLog ? 'Edit Sleep Log' : "Log Last Night's Sleep"}</Text>
            <Text style={styles.modalSub}>How much did you sleep?</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={PREMIUM_MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.hoursRow}>
              <TouchableOpacity
                onPress={() => setHours(Math.max(1, Math.round((hours - 0.5) * 2) / 2))}
                style={styles.hoursBtn}
              >
                <Ionicons name="remove" size={22} color={PREMIUM_ACCENT} />
              </TouchableOpacity>
              <View style={styles.hoursCenter}>
                <Text style={styles.hoursVal}>{hours}</Text>
                <Text style={styles.hoursUnit}>hours</Text>
              </View>
              <TouchableOpacity
                onPress={() => setHours(Math.min(12, Math.round((hours + 0.5) * 2) / 2))}
                style={styles.hoursBtn}
              >
                <Ionicons name="add" size={22} color={PREMIUM_ACCENT} />
              </TouchableOpacity>
            </View>

            <View style={styles.hourPillBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hourPillScroll}
                contentContainerStyle={styles.hourPills}
              >
                {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map(h => {
                  const active = hours === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setHours(h)}
                      style={[styles.hourPill, active && styles.hourPillActive]}
                    >
                      <Text style={[styles.hourPillText, active && styles.hourPillTextActive]}>{h}h</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Text style={styles.fieldLabel}>Sleep quality</Text>
            <View style={styles.qualityRow}>
              {[1, 2, 3, 4, 5].map(q => {
                const active = quality === q;
                const c = QUALITY_COLOR[q];
                return (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setQuality(q)}
                    style={[styles.qualityChip, active && { borderColor: PURPLE, backgroundColor: PURPLE + '18' }]}
                  >
                    <Text style={styles.qualityEmoji}>{QUALITY_EMOJI[q]}</Text>
                    <Text style={[styles.qualityLabel, active && { color: PURPLE }]}>{QUALITY_LABELS[q]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <View style={styles.notesBox}>
              <TextInput
                value={notes}
                onChangeText={t => setNotes(t.slice(0, 200))}
                placeholder="How did you feel? Any disturbances?"
                placeholderTextColor={PREMIUM_MUTED}
                style={styles.notesInput}
                multiline
              />
              <Text style={styles.charCount}>{notes.length}/200</Text>
            </View>

            <TouchableOpacity onPress={handlePress} disabled={saving} activeOpacity={0.9} style={{ opacity: saving ? 0.7 : 1 }}>
              <LinearGradient colors={[PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="moon" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Sleep Log</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SleepScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) loadLogs(); }, [user?.id]));

  const loadLogs = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('sleep_logs')
      .select('id, date, hours, quality, notes, bedtime, wake_time')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    setLogs(
      (data ?? []).map(row => ({
        ...row,
        quality: row.quality ?? 3,
        notes: row.notes ?? '',
        hours: Number(row.hours),
      })) as SleepLog[],
    );
    setIsLoading(false);
  };

  const handleSave = async (hours: number, quality: number, notes: string) => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const times = computeDefaultTimes(hours);
    const existing = logs.find(l => l.date === today);
    const payload = { hours, quality, notes, bedtime: times.bedtime, wake_time: times.wake_time };
    if (existing) {
      const { error } = await supabase.from('sleep_logs').update(payload).eq('id', existing.id);
      if (!error) {
        setLogs(prev => prev.map(l => (l.id === existing.id ? { ...l, ...payload } : l)));
      }
    } else {
      const { data, error } = await supabase
        .from('sleep_logs')
        .insert({ user_id: user.id, date: today, ...payload })
        .select()
        .single();
      if (data && !error) setLogs(prev => [data as SleepLog, ...prev]);
    }
    try {
      const { sendNotification } = await import('../../services/notificationService');
      await sendNotification(
        user.id,
        'goal',
        `Sleep logged — ${hours} hours 🌙`,
        hours >= SLEEP_GOAL_HRS ? 'Great job hitting your sleep goal!' : 'Keep working towards your 8-hour goal.',
        'View Progress',
      );
    } catch {}
  };

  const handleDelete = (logId: string) => {
    Alert.alert('Delete log?', 'This will remove this sleep entry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('sleep_logs').delete().eq('id', logId);
          if (!error) setLogs(prev => prev.filter(l => l.id !== logId));
        },
      },
    ]);
  };

  const lastLog = logs[0] ?? null;
  const previousLog = logs[1] ?? null;
  const todayPct = lastLog ? Math.min(lastLog.hours / SLEEP_GOAL_HRS, 1) : 0;
  const deltaPrev =
    lastLog && previousLog ? Math.round((lastLog.hours - previousLog.hours) * 10) / 10 : null;
  const historySlice = showAllHistory ? logs : logs.slice(0, 5);

  const formatLogDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Sleep Tracker</Text>
          <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.9} style={styles.logBtnWrap}>
            <LinearGradient colors={[PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logBtn}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.logBtnText}>Log</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.heroCard, premiumGlassShadow()]}>
            <LinearGradient
              colors={['rgba(178,128,255,0.12)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Last night</Text>
                {lastLog ? (
                  <View style={styles.heroHoursRow}>
                    <Text style={styles.heroHours}>{formatHoursMinutes(lastLog.hours)}</Text>
                    {deltaPrev !== null && deltaPrev !== 0 && (
                      <Text style={[styles.heroDelta, { color: deltaPrev > 0 ? PREMIUM_ACCENT : '#FFB347' }]}>
                        {deltaPrev > 0 ? `+${deltaPrev}h` : `${deltaPrev}h`}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.heroEmpty}>-- h -- m</Text>
                )}
                <Text style={styles.heroGoal}>Sleep goal · {SLEEP_GOAL_HRS}h</Text>
              </View>
              <Text style={styles.moonEmoji}>🌙</Text>
            </View>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[PURPLE, PURPLE_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${todayPct * 100}%` }]}
              />
            </View>
            <Text style={styles.progressPct}>{Math.round(todayPct * 100)}% of goal</Text>

            {lastLog ? (
              <>
                <View style={styles.qualityRowHero}>
                  <View style={[styles.qualityPill, { borderColor: QUALITY_COLOR[lastLog.quality] + '55' }]}>
                    <Text>{QUALITY_EMOJI[lastLog.quality]}</Text>
                    <Text style={[styles.qualityPillText, { color: QUALITY_COLOR[lastLog.quality] }]}>
                      {QUALITY_LABELS[lastLog.quality]} sleep quality
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowModal(true)} style={styles.editChip}>
                    <Text style={styles.editChipText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timeTiles}>
                  <View style={styles.timeTile}>
                    <Ionicons name="bed-outline" size={16} color={PURPLE} />
                    <Text style={styles.timeTileLabel}>Bedtime</Text>
                    <Text style={styles.timeTileVal}>{formatTime12(lastLog.bedtime)}</Text>
                  </View>
                  <View style={styles.timeTile}>
                    <Ionicons name="sunny-outline" size={16} color={PREMIUM_ACCENT} />
                    <Text style={styles.timeTileLabel}>Wake up</Text>
                    <Text style={styles.timeTileVal}>{formatTime12(lastLog.wake_time)}</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.noDataText}>No sleep data yet</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.9} style={styles.logCtaWrap}>
                  <LinearGradient colors={[PURPLE + 'CC', PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logCta}>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.logCtaText}>Log last night&apos;s sleep</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={[styles.tipsCard, premiumGlassShadow()]}>
            <View style={styles.tipsHead}>
              <View style={styles.tipsIcon}>
                <Ionicons name="bulb-outline" size={18} color={PURPLE} />
              </View>
              <Text style={styles.tipsTitle}>Sleep Tips</Text>
            </View>
            {[
              'Aim for 7–9 hours every night for optimal recovery',
              'Keep a consistent bedtime — even on weekends',
              'Avoid screens 30 minutes before bed',
              'Keep your room cool and dark for deeper sleep',
            ].map(tip => (
              <View key={tip} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: PURPLE }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.historyHead}>
            <Text style={styles.historyTitle}>History</Text>
            {logs.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllHistory(v => !v)}>
                <Text style={styles.viewAll}>{showAllHistory ? 'Show less' : 'View All'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator color={PURPLE} style={{ marginTop: spacing.xl }} />
          ) : logs.length === 0 ? (
            <View style={[styles.emptyCard, premiumGlassShadow()]}>
              <Text style={styles.emptyMoon}>🌙</Text>
              <Text style={styles.emptyTitle}>No sleep logs yet</Text>
              <Text style={styles.emptySub}>
                Start tracking your sleep to see your history and insights here.
              </Text>
            </View>
          ) : (
            historySlice.map(log => {
              const metGoal = log.hours >= SLEEP_GOAL_HRS;
              const qColor = QUALITY_COLOR[log.quality] ?? PREMIUM_MUTED;
              return (
                <TouchableOpacity
                  key={log.id}
                  onLongPress={() => handleDelete(log.id)}
                  activeOpacity={0.88}
                  style={[styles.historyCard, premiumGlassShadow()]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: (metGoal ? PURPLE : '#FFB347') + '22' }]}>
                    <Ionicons name="moon" size={18} color={metGoal ? PURPLE : '#FFB347'} />
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={styles.historyHours}>{formatHoursMinutes(log.hours)}</Text>
                    <View style={styles.historyMeta}>
                      <Text style={[styles.historyQuality, { color: qColor }]}>
                        {QUALITY_EMOJI[log.quality]} {QUALITY_LABELS[log.quality]}
                      </Text>
                      <Text style={styles.historyDate}>{formatLogDate(log.date)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <LogSleepModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        existingLog={logs.find(l => l.date === new Date().toISOString().split('T')[0]) ?? lastLog}
      />
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PREMIUM_BG },
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  logBtnWrap: { borderRadius: radius.full, overflow: 'hidden' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSize.sm },

  heroCard: {
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: 'rgba(178,128,255,0.22)',
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginBottom: 4 },
  heroHoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  heroHours: { fontSize: 40, fontWeight: '900', color: PREMIUM_TEXT, letterSpacing: -1 },
  heroDelta: { fontSize: fontSize.sm, fontWeight: '800', marginBottom: 8 },
  heroEmpty: { fontSize: 36, fontWeight: '800', color: PREMIUM_MUTED },
  heroGoal: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4 },
  moonEmoji: { fontSize: 44 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 6, fontWeight: '600' },
  qualityRowHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  qualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
  },
  qualityPillText: { fontSize: fontSize.xs, fontWeight: '700' },
  editChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  editChipText: { color: PREMIUM_MUTED, fontSize: fontSize.xs, fontWeight: '700' },
  timeTiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  timeTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 4,
  },
  timeTileLabel: { fontSize: 10, color: PREMIUM_MUTED, fontWeight: '600' },
  timeTileVal: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT },
  noDataText: { textAlign: 'center', color: PREMIUM_MUTED, marginTop: spacing.md, fontSize: fontSize.sm },
  logCtaWrap: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  logCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logCtaText: { color: '#fff', fontWeight: '800', fontSize: fontSize.base },

  tipsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  tipsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PURPLE + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 20 },

  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyTitle: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT },
  viewAll: { fontSize: fontSize.sm, fontWeight: '700', color: PURPLE },
  emptyCard: {
    padding: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
  },
  emptyMoon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  emptySub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    marginBottom: spacing.sm,
  },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyBody: { flex: 1 },
  historyHours: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  historyQuality: { fontSize: fontSize.xs, fontWeight: '700' },
  historyDate: { fontSize: fontSize.xs, color: PREMIUM_MUTED },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    backgroundColor: '#0c0e14',
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  modalHead: { padding: spacing.lg, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PREMIUM_GLASS_BORDER },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  modalSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginTop: 4 },
  modalClose: { position: 'absolute', right: spacing.lg, top: spacing.lg },
  modalBody: { padding: spacing.lg },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
  hoursBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT + '55',
    backgroundColor: PREMIUM_ACCENT + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursCenter: { alignItems: 'center', minWidth: 100 },
  hoursVal: { fontSize: 56, fontWeight: '900', color: PREMIUM_TEXT, lineHeight: 60 },
  hoursUnit: { fontSize: fontSize.sm, color: PREMIUM_MUTED },
  hourPillBar: { height: 44, marginBottom: spacing.lg },
  hourPillScroll: { height: 44 },
  hourPills: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.lg },
  hourPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  hourPillActive: { borderColor: PURPLE, backgroundColor: PURPLE + '22' },
  hourPillText: { fontSize: fontSize.sm, fontWeight: '600', color: PREMIUM_MUTED },
  hourPillTextActive: { color: PURPLE, fontWeight: '800' },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_MUTED, marginBottom: spacing.sm },
  qualityRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  qualityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  qualityEmoji: { fontSize: 18 },
  qualityLabel: { fontSize: 8, fontWeight: '700', color: PREMIUM_MUTED, marginTop: 2, textAlign: 'center' },
  notesBox: {
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 88,
    marginBottom: spacing.lg,
  },
  notesInput: {
    fontSize: fontSize.sm,
    color: PREMIUM_TEXT,
    minHeight: 56,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}),
  },
  charCount: { textAlign: 'right', fontSize: 10, color: PREMIUM_MUTED, marginTop: 4 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  saveBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
});
