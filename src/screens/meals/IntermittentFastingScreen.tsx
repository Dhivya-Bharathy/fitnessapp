import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';

// ── PROTOCOLS ─────────────────────────────────────────────────
type Protocol = { id: string; label: string; fastHours: number; eatingHours: number; description: string; popular?: boolean };
const PROTOCOLS: Protocol[] = [
  { id: '16:8', label: '16:8', fastHours: 16, eatingHours: 8,  description: 'Fast 16hrs, eat within 8hrs. Most popular.', popular: true },
  { id: '18:6', label: '18:6', fastHours: 18, eatingHours: 6,  description: 'Fast 18hrs, eat within 6hrs. Intermediate.' },
  { id: '20:4', label: '20:4', fastHours: 20, eatingHours: 4,  description: 'Fast 20hrs, eat within 4hrs. Advanced.' },
  { id: '24',   label: '24hr', fastHours: 24, eatingHours: 0,  description: 'Full 24-hour fast. For experienced fasters.' },
  { id: '5:2',  label: '5:2',  fastHours: 36, eatingHours: 12, description: 'Eat normally 5 days, restrict 2 days.' },
];

type FastingLog = { id: string; protocol: string; fast_hours: number; eating_hours: number; started_at: string; ended_at: string | null; target_end_at: string; completed: boolean };

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── GRADIENT PROGRESS RING ────────────────────────────────────
function ProgressRing({ progress, size, strokeWidth, color, bgColor, children }: {
  progress: number; size: number; strokeWidth: number;
  color: string; bgColor: string; children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(progress, 1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function IntermittentFastingScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];

  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(PROTOCOLS[0]);
  const [activeFast, setActiveFast]             = useState<FastingLog | null>(null);
  const [history, setHistory]                   = useState<FastingLog[]>([]);
  const [elapsed, setElapsed]                   = useState(0);
  const [isRefreshing, setIsRefreshing]         = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => { loadData(); }, [user?.id]));

  useEffect(() => {
    if (activeFast && !activeFast.completed) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - new Date(activeFast.started_at).getTime());
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeFast]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const { supabase } = await import('../../services/supabase');
      const { data } = await supabase.from('fasting_logs').select('id,user_id,started_at,ended_at,completed,duration_planned,duration_actual').eq('user_id', user.id)
        .order('started_at', { ascending: false }).limit(20);
      if (data) {
        const active = data.find((f: FastingLog) => !f.completed && !f.ended_at);
        setActiveFast(active ?? null);
        setHistory(data.filter((f: FastingLog) => f.completed || f.ended_at));
        if (active) setElapsed(Date.now() - new Date(active.started_at).getTime());
      }
    } catch (e) { if (__DEV__) console.error('IF loadData:', e); }
    finally { setIsRefreshing(false); }
  };

  const handleStartFast = async () => {
    if (!user?.id) return;
    try {
      const { supabase } = await import('../../services/supabase');
      const startedAt = new Date().toISOString();
      const targetEnd = new Date(Date.now() + selectedProtocol.fastHours * 3600000).toISOString();
      const { data, error } = await supabase.from('fasting_logs').insert({
        user_id: user.id, protocol: selectedProtocol.id,
        fast_hours: selectedProtocol.fastHours, eating_hours: selectedProtocol.eatingHours,
        started_at: startedAt, target_end_at: targetEnd, completed: false,
      }).select().single();
      if (error) throw error;
      setActiveFast(data as FastingLog);
      setElapsed(0);
      try {
        const { sendNotification } = await import('../../services/notificationService');
        await sendNotification(user.id, 'goal', `${selectedProtocol.label} fast started! ⏱️`, `Your ${selectedProtocol.fastHours}-hour fast has begun. Stay strong!`, 'View Fasting');
      } catch {}
    } catch (e) { Alert.alert('Error', 'Could not start fast. Please try again.'); }
  };

  const handleEndFast = async (completed: boolean) => {
    if (!activeFast || !user?.id) return;
    const label = completed ? 'Complete Fast' : 'Break Fast Early';
    Alert.alert(label, completed ? 'Mark this fast as successfully completed?' : 'Are you sure you want to break your fast early?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: completed ? 'Complete ✓' : 'Break Fast',
        style: completed ? 'default' : 'destructive',
        onPress: async () => {
          try {
            const { supabase } = await import('../../services/supabase');
            await supabase.from('fasting_logs').update({ ended_at: new Date().toISOString(), completed }).eq('id', activeFast.id);
            if (timerRef.current) clearInterval(timerRef.current);
            if (completed) {
              const { sendNotification } = await import('../../services/notificationService');
              await sendNotification(user.id, 'goal', `${activeFast.protocol} fast complete! 🎉`, `Amazing discipline — ${activeFast.fast_hours} hours fasted!`, 'View Fasting');
            }
            setActiveFast(null); setElapsed(0); loadData();
          } catch {}
        },
      },
    ]);
  };

  const totalFastMs = selectedProtocol.fastHours * 3600000;
  const progress = activeFast ? Math.min(elapsed / (activeFast.fast_hours * 3600000), 1) : 0;
  const remaining = activeFast ? Math.max(activeFast.fast_hours * 3600000 - elapsed, 0) : 0;
  const isFastComplete = remaining === 0 && !!activeFast;

  const eatingWindowStart = activeFast ? new Date(new Date(activeFast.started_at).getTime() + activeFast.fast_hours * 3600000) : null;
  const eatingWindowEnd   = eatingWindowStart && activeFast?.eating_hours
    ? new Date(eatingWindowStart.getTime() + activeFast.eating_hours * 3600000) : null;

  // Gradient ring color based on progress
  const ringColor = isFastComplete ? '#FFB830'
    : progress > 0.75 ? theme.accent
    : progress > 0.5 ? '#2BBCB0'
    : theme.gradStart;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Intermittent Fasting</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadData(); }} tintColor={theme.accent} colors={[theme.accent]} />}>

        {/* ── ACTIVE FAST ────────────────────────────────────── */}
        {activeFast ? (
          <>
            {/* Timer hero */}
            <LinearGradient colors={[theme.heroCard, '#2A1F6B'] as [string, string]} style={styles.timerHero}>
              <View style={styles.timerTopRow}>
                <View style={[styles.protocolBadge, { backgroundColor: theme.accent + '33', borderColor: theme.accent + '66' }]}>
                  <Ionicons name="timer-outline" size={14} color={theme.accent} />
                  <Text style={[styles.protocolBadgeText, { color: theme.accent }]}>{activeFast.protocol} Protocol</Text>
                </View>
                <Text style={styles.timerStatus}>
                  {isFastComplete ? '🎉 Fast complete!' : '⏳ Fasting in progress...'}
                </Text>
              </View>

              {/* Progress ring */}
              <View style={styles.ringWrap}>
                <ProgressRing progress={progress} size={220} strokeWidth={14} color={ringColor} bgColor="rgba(255,255,255,0.12)">
                  <View style={styles.ringInner}>
                    <Text style={styles.ringLabel}>{isFastComplete ? 'Complete!' : 'Elapsed'}</Text>
                    <Text style={styles.ringTime}>{formatDuration(elapsed)}</Text>
                    <Text style={[styles.ringPercent, { color: ringColor }]}>{Math.round(progress * 100)}%</Text>
                  </View>
                </ProgressRing>
              </View>

              {/* Remaining */}
              {!isFastComplete && (
                <View style={styles.remainingRow}>
                  <View style={styles.remainingItem}>
                    <Text style={styles.remainingLabel}>Remaining</Text>
                    <Text style={styles.remainingValue}>{formatDuration(remaining)}</Text>
                  </View>
                  <View style={[styles.remainingDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                  <View style={styles.remainingItem}>
                    <Text style={styles.remainingLabel}>Target</Text>
                    <Text style={styles.remainingValue}>{activeFast.fast_hours}h fast</Text>
                  </View>
                </View>
              )}

              {/* Eating window */}
              {eatingWindowStart && eatingWindowEnd && (
                <View style={[styles.windowCard, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="restaurant-outline" size={16} color={theme.accent} />
                  <View>
                    <Text style={styles.windowLabel}>Eating window</Text>
                    <Text style={styles.windowTime}>
                      {eatingWindowStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' — '}
                      {eatingWindowEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.startedText}>
                Started {new Date(activeFast.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                {' · '}
                {new Date(activeFast.started_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </LinearGradient>

            {/* Action buttons */}
            <View style={styles.actionBtns}>
              {isFastComplete ? (
                <TouchableOpacity onPress={() => handleEndFast(true)} activeOpacity={0.85} style={styles.actionBtnWrap}>
                  <LinearGradient colors={['#FFB830', '#FF9500'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
                    <Ionicons name="trophy" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Complete Fast 🎉</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={() => handleEndFast(true)} activeOpacity={0.85} style={styles.actionBtnWrap}>
                    <LinearGradient colors={[theme.accent, '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Complete Fast</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEndFast(false)} activeOpacity={0.8}
                    style={[styles.breakBtn, { borderColor: theme.red }]}>
                    <Ionicons name="close-circle-outline" size={18} color={theme.red} />
                    <Text style={[styles.breakBtnText, { color: theme.red }]}>Break Fast</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        ) : (
          <>
            {/* ── PROTOCOL SELECTOR ────────────────────────────── */}
            <LinearGradient colors={[theme.heroCard, '#2A1F6B'] as [string, string]} style={styles.selectorHero}>
              <Text style={styles.selectorTitle}>Choose your protocol</Text>
              <Text style={styles.selectorSub}>Select a fasting window that fits your lifestyle</Text>

              <View style={styles.protocolGrid}>
                {PROTOCOLS.map((p) => {
                  const isSelected = selectedProtocol.id === p.id;
                  return (
                    <TouchableOpacity key={p.id} onPress={() => setSelectedProtocol(p)} activeOpacity={0.8}
                      style={[styles.protocolCard, {
                        backgroundColor: isSelected ? theme.accent + '33' : 'rgba(255,255,255,0.06)',
                        borderColor: isSelected ? theme.accent : 'rgba(255,255,255,0.12)',
                        borderWidth: isSelected ? 2 : 1,
                      }]}>
                      {p.popular && (
                        <View style={[styles.popularBadge, { backgroundColor: '#FFB830' }]}>
                          <Text style={styles.popularText}>Popular</Text>
                        </View>
                      )}
                      <Text style={[styles.protocolLabel, { color: isSelected ? theme.accent : '#fff' }]}>{p.label}</Text>
                      <View style={styles.protocolStats}>
                        <View style={styles.protocolStat}>
                          <Text style={[styles.protocolStatVal, { color: isSelected ? theme.accent : 'rgba(255,255,255,0.85)' }]}>{p.fastHours}h</Text>
                          <Text style={styles.protocolStatLabel}>fast</Text>
                        </View>
                        {p.eatingHours > 0 && (
                          <View style={styles.protocolStat}>
                            <Text style={[styles.protocolStatVal, { color: isSelected ? theme.accent : 'rgba(255,255,255,0.85)' }]}>{p.eatingHours}h</Text>
                            <Text style={styles.protocolStatLabel}>eat</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.protocolDesc} numberOfLines={2}>{p.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>

            {/* Start fast button */}
            <TouchableOpacity onPress={handleStartFast} activeOpacity={0.85} style={styles.startBtnWrap}>
              <LinearGradient colors={[theme.accent, '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtn}>
                <Ionicons name="timer" size={22} color="#fff" />
                <Text style={styles.startBtnText}>Start {selectedProtocol.label} Fast</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Benefits card */}
            <View style={[styles.benefitsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.benefitsTitle, { color: theme.textPrimary }]}>Benefits of {selectedProtocol.label}</Text>
              {[
                '🔥 Promotes fat burning and ketosis',
                '🧠 Improves mental clarity and focus',
                '⚡ Boosts energy levels',
                '💪 Preserves muscle mass',
                '❤️ Supports metabolic health',
              ].map((b, i) => (
                <Text key={i} style={[styles.benefitText, { color: theme.textSecondary }]}>{b}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── HISTORY ──────────────────────────────────────────── */}
        {history.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Fasting History</Text>
            {history.slice(0, 5).map((log) => {
              const startDate = new Date(log.started_at);
              const endDate   = log.ended_at ? new Date(log.ended_at) : null;
              const actualMs  = endDate ? endDate.getTime() - startDate.getTime() : 0;
              const actualH   = (actualMs / 3600000).toFixed(1);
              const prot      = PROTOCOLS.find((p) => p.id === log.protocol);
              return (
                <View key={log.id} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <LinearGradient
                    colors={log.completed ? [theme.accent + 'CC', theme.accent + '88'] : ['#6B7280CC', '#6B728088'] as [string, string]}
                    style={styles.historyCardLeft}
                  >
                    <Ionicons name={log.completed ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
                    <Text style={styles.historyCardProtocol}>{log.protocol}</Text>
                  </LinearGradient>
                  <View style={styles.historyCardBody}>
                    <Text style={[styles.historyCardDate, { color: theme.textPrimary }]}>
                      {startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={[styles.historyCardMeta, { color: theme.textMuted }]}>
                      {log.completed ? `✓ Completed · ${actualH}h fasted` : `✗ Ended early · ${actualH}h fasted`}
                    </Text>
                  </View>
                  <View style={[styles.historyCalBadge, { backgroundColor: log.completed ? theme.accentDim as string : theme.border + '44' }]}>
                    <Text style={[styles.historyCalVal, { color: log.completed ? theme.accent : theme.textMuted }]}>{actualH}h</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800' },
  scrollContent: { paddingBottom: 80 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },

  // Timer hero
  timerHero: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 20, alignItems: 'center', gap: spacing.md },
  timerTopRow: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  protocolBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  protocolBadgeText: { fontSize: fontSize.sm, fontWeight: '700' },
  timerStatus: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.70)', fontWeight: '500' },
  ringWrap: { marginVertical: spacing.sm },
  ringInner: { alignItems: 'center', gap: 4 },
  ringLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)' },
  ringTime: { fontSize: 36, fontWeight: '800', color: '#fff' },
  ringPercent: { fontSize: fontSize.lg, fontWeight: '700' },
  remainingRow: { flexDirection: 'row', width: '100%', alignItems: 'center' },
  remainingItem: { flex: 1, alignItems: 'center' },
  remainingLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  remainingValue: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  remainingDivider: { width: 1, height: 40, marginHorizontal: spacing.lg },
  windowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%', padding: spacing.md, borderRadius: 12 },
  windowLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)' },
  windowTime: { fontSize: fontSize.base, fontWeight: '700', color: '#fff' },
  startedText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.40)' },

  // Action buttons
  actionBtns: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  actionBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  actionBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },
  breakBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1 },
  breakBtnText: { fontSize: fontSize.base, fontWeight: '600' },

  // Selector hero
  selectorHero: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 20 },
  selectorTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  selectorSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginBottom: spacing.lg },
  protocolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  protocolCard: { width: '47%', padding: spacing.md, borderRadius: 14, position: 'relative', gap: 6 },
  popularBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  popularText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  protocolLabel: { fontSize: 22, fontWeight: '900' },
  protocolStats: { flexDirection: 'row', gap: spacing.md },
  protocolStat: {},
  protocolStatVal: { fontSize: fontSize.base, fontWeight: '800' },
  protocolStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.50)' },
  protocolDesc: { fontSize: 11, color: 'rgba(255,255,255,0.50)', lineHeight: 15, marginTop: 2 },

  // Start button
  startBtnWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, overflow: 'hidden' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  startBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },

  // Benefits
  benefitsCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 16, borderWidth: 1, gap: spacing.sm },
  benefitsTitle: { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.xs },
  benefitText: { fontSize: fontSize.sm, lineHeight: 20 },

  // History
  historyCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  historyCardLeft: { padding: spacing.md, alignItems: 'center', gap: 4, width: 70 },
  historyCardProtocol: { fontSize: 11, fontWeight: '700', color: '#fff' },
  historyCardBody: { flex: 1, padding: spacing.md },
  historyCardDate: { fontSize: fontSize.sm, fontWeight: '700' },
  historyCardMeta: { fontSize: fontSize.xs, marginTop: 2 },
  historyCalBadge: { padding: spacing.md, alignItems: 'center' },
  historyCalVal: { fontSize: fontSize.base, fontWeight: '800' },
});