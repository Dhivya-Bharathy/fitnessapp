import {
  View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
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
import { confirmDialog } from '../../utils/confirmDialog';

const PINK = '#FF6B9D';
const PURPLE = '#5B4BB7';
const PURPLE_DEEP = '#2A1F6B';

type Protocol = {
  id: string;
  label: string;
  fastHours: number;
  eatingHours: number;
  description: string;
  popular?: boolean;
};

const PROTOCOLS: Protocol[] = [
  { id: '16:8', label: '16:8', fastHours: 16, eatingHours: 8, description: 'Fast 16hrs, eat within 8hrs. Most popular.', popular: true },
  { id: '18:6', label: '18:6', fastHours: 18, eatingHours: 6, description: 'Fast 18hrs, eat within 6hrs. Intermediate.' },
  { id: '20:4', label: '20:4', fastHours: 20, eatingHours: 4, description: 'Fast 20hrs, eat within 4hrs. Advanced.' },
  { id: '24', label: '24hr', fastHours: 24, eatingHours: 0, description: 'Full 24-hour fast. For experienced fasters.' },
  { id: '5:2', label: '5:2', fastHours: 36, eatingHours: 12, description: 'Eat normally 5 days, restrict 2 days.' },
];

type FastingLog = {
  id: string;
  protocol: string | null;
  fast_hours: number | null;
  eating_hours: number | null;
  started_at: string;
  ended_at: string | null;
  target_end_at: string | null;
  completed: boolean;
  duration_planned: number | null;
  duration_actual: number | null;
};

function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms >= 0 ? ms : 0;
  const s = Math.floor(safe / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function plannedFastHours(log: FastingLog): number {
  if (log.fast_hours != null && Number.isFinite(Number(log.fast_hours))) {
    return Number(log.fast_hours);
  }
  if (log.duration_planned != null && log.duration_planned > 0) {
    return log.duration_planned <= 48 ? log.duration_planned : log.duration_planned / 60;
  }
  const prot = PROTOCOLS.find((p) => p.id === log.protocol);
  if (prot) return prot.fastHours;
  if (log.target_end_at && log.started_at) {
    const ms = new Date(log.target_end_at).getTime() - new Date(log.started_at).getTime();
    if (ms > 0) return ms / 3_600_000;
  }
  return 16;
}

function eatingHoursFor(log: FastingLog): number {
  if (log.eating_hours != null && Number.isFinite(Number(log.eating_hours))) {
    return Number(log.eating_hours);
  }
  const prot = PROTOCOLS.find((p) => p.id === log.protocol);
  return prot?.eatingHours ?? 0;
}

function showError(message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message);
  } else {
    Alert.alert('Error', message);
  }
}

function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  bgColor,
  children,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
  children?: React.ReactNode;
}) {
  const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - safeProgress);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export default function IntermittentFastingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(PROTOCOLS[0]);
  const [activeFast, setActiveFast] = useState<FastingLog | null>(null);
  const [history, setHistory] = useState<FastingLog[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigateBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main', { screen: 'Meals' });
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('fasting_logs')
        .select(
          'id, protocol, fast_hours, eating_hours, started_at, ended_at, target_end_at, completed, duration_planned, duration_actual',
        )
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const rows = data as FastingLog[];
        const active = rows.find((f) => !f.completed && !f.ended_at) ?? null;
        setActiveFast(active);
        setHistory(rows.filter((f) => f.completed || f.ended_at));
        if (active) {
          setElapsed(Date.now() - new Date(active.started_at).getTime());
        } else {
          setElapsed(0);
        }
      }
    } catch (e) {
      if (__DEV__) console.error('IF loadData:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!activeFast || activeFast.completed || activeFast.ended_at) return;

    const tick = () => setElapsed(Date.now() - new Date(activeFast.started_at).getTime());
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeFast]);

  const handleStartFast = async () => {
    if (!user?.id) return;
    try {
      const startedAt = new Date().toISOString();
      const targetEnd = new Date(Date.now() + selectedProtocol.fastHours * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('fasting_logs')
        .insert({
          user_id: user.id,
          protocol: selectedProtocol.id,
          fast_hours: selectedProtocol.fastHours,
          eating_hours: selectedProtocol.eatingHours,
          started_at: startedAt,
          target_end_at: targetEnd,
          duration_planned: selectedProtocol.fastHours,
          completed: false,
        })
        .select(
          'id, protocol, fast_hours, eating_hours, started_at, ended_at, target_end_at, completed, duration_planned, duration_actual',
        )
        .single();

      if (error) throw error;
      setActiveFast(data as FastingLog);
      setElapsed(0);
      try {
        const { sendNotification } = await import('../../services/notificationService');
        await sendNotification(
          user.id,
          'goal',
          `${selectedProtocol.label} fast started!`,
          `Your ${selectedProtocol.fastHours}-hour fast has begun. Stay strong!`,
          'View Fasting',
        );
      } catch { /* optional */ }
    } catch {
      showError('Could not start fast. Please try again.');
    }
  };

  const handleEndFast = async (completed: boolean) => {
    if (!activeFast || !user?.id) return;

    const title = completed ? 'Complete Fast' : 'Break Fast Early';
    const message = completed
      ? 'Mark this fast as successfully completed?'
      : 'Are you sure you want to break your fast early?';
    const confirmed = await confirmDialog(title, message, completed ? 'Complete' : 'Break Fast');
    if (!confirmed) return;

    const endedAt = new Date().toISOString();
    const actualHours = Math.round(
      (new Date(endedAt).getTime() - new Date(activeFast.started_at).getTime()) / 3_600_000,
    );

    try {
      const { error } = await supabase
        .from('fasting_logs')
        .update({
          ended_at: endedAt,
          completed,
          duration_actual: actualHours,
        })
        .eq('id', activeFast.id);

      if (error) throw error;

      if (timerRef.current) clearInterval(timerRef.current);
      if (completed) {
        try {
          const { sendNotification } = await import('../../services/notificationService');
          const hrs = plannedFastHours(activeFast);
          await sendNotification(
            user.id,
            'goal',
            `${activeFast.protocol ?? 'Fasting'} fast complete!`,
            `Amazing discipline — ${hrs} hours fasted!`,
            'View Fasting',
          );
        } catch { /* optional */ }
      }

      setActiveFast(null);
      setElapsed(0);
      await loadData();
    } catch (e) {
      if (__DEV__) console.error('IF end fast:', e);
      showError('Could not update your fast. Please try again.');
    }
  };

  const fastHours = activeFast ? plannedFastHours(activeFast) : selectedProtocol.fastHours;
  const totalFastMs = fastHours * 3_600_000;
  const progress = activeFast && totalFastMs > 0 ? Math.min(elapsed / totalFastMs, 1) : 0;
  const remaining = activeFast ? Math.max(totalFastMs - elapsed, 0) : 0;
  const isFastComplete = !!activeFast && remaining <= 0;
  const progressPct = Math.round(progress * 100);

  const eatingH = activeFast ? eatingHoursFor(activeFast) : 0;
  const eatingWindowStart = activeFast
    ? new Date(new Date(activeFast.started_at).getTime() + fastHours * 3_600_000)
    : null;
  const eatingWindowEnd =
    eatingWindowStart && eatingH > 0
      ? new Date(eatingWindowStart.getTime() + eatingH * 3_600_000)
      : null;

  const ringColor = isFastComplete ? '#FFB830' : PINK;

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={navigateBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
        <Text style={styles.title}>Intermittent Fasting</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScreenScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadData(); }}
            tintColor={PREMIUM_ACCENT}
            colors={[PREMIUM_ACCENT]}
          />
        }
      >
        {activeFast ? (
          <>
            <LinearGradient colors={[PURPLE, PURPLE_DEEP]} style={[styles.timerHero, premiumGlassShadow()]}>
              <View style={styles.timerTopRow}>
                <View style={styles.protocolBadge}>
                  <Ionicons name="timer-outline" size={14} color={PREMIUM_ACCENT} />
                  <Text style={styles.protocolBadgeText}>{activeFast.protocol ?? '16:8'} Protocol</Text>
                </View>
                <Text style={styles.timerStatus}>
                  {isFastComplete ? 'Fast complete!' : 'Fasting in progress…'}
                </Text>
              </View>

              <View style={styles.ringWrap}>
                <ProgressRing progress={progress} size={220} strokeWidth={14} color={ringColor} bgColor="rgba(255,255,255,0.12)">
                  <View style={styles.ringInner}>
                    <Text style={styles.ringLabel}>{isFastComplete ? 'Complete!' : 'Elapsed'}</Text>
                    <Text style={styles.ringTime}>{formatDuration(elapsed)}</Text>
                    <Text style={[styles.ringPercent, { color: ringColor }]}>{progressPct}%</Text>
                  </View>
                </ProgressRing>
              </View>

              <View style={styles.remainingRow}>
                <View style={styles.remainingItem}>
                  <Text style={styles.remainingLabel}>Remaining</Text>
                  <Text style={styles.remainingValue}>
                    {isFastComplete ? '00:00:00' : formatDuration(remaining)}
                  </Text>
                </View>
                <View style={styles.remainingDivider} />
                <View style={styles.remainingItem}>
                  <Text style={styles.remainingLabel}>Target</Text>
                  <Text style={styles.remainingValue}>{fastHours}h fast</Text>
                </View>
              </View>

              {eatingWindowStart && eatingWindowEnd && (
                <View style={styles.windowCard}>
                  <Ionicons name="restaurant-outline" size={16} color={PREMIUM_ACCENT} />
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
                Started{' '}
                {new Date(activeFast.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                {' · '}
                {new Date(activeFast.started_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </LinearGradient>

            <View style={styles.actionBtns}>
              <TouchableOpacity
                onPress={() => handleEndFast(true)}
                activeOpacity={0.88}
                style={styles.completeBtn}
              >
                <Ionicons name="checkmark-circle" size={22} color={PREMIUM_BG} />
                <Text style={styles.completeBtnText}>
                  {isFastComplete ? 'Complete Fast' : 'Complete Fast'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleEndFast(false)}
                activeOpacity={0.88}
                style={styles.breakBtn}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FF5959" />
                <Text style={styles.breakBtnText}>Break Fast</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <LinearGradient colors={[PURPLE, PURPLE_DEEP]} style={[styles.selectorHero, premiumGlassShadow()]}>
              <Text style={styles.selectorTitle}>Choose your protocol</Text>
              <Text style={styles.selectorSub}>Select a fasting window that fits your lifestyle</Text>

              <View style={styles.protocolGrid}>
                {PROTOCOLS.map((p) => {
                  const isSelected = selectedProtocol.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedProtocol(p)}
                      activeOpacity={0.85}
                      style={[
                        styles.protocolCard,
                        {
                          backgroundColor: isSelected ? PREMIUM_ACCENT + '22' : 'rgba(255,255,255,0.06)',
                          borderColor: isSelected ? PREMIUM_ACCENT : 'rgba(255,255,255,0.12)',
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      {p.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Popular</Text>
                        </View>
                      )}
                      <Text style={[styles.protocolLabel, { color: isSelected ? PREMIUM_ACCENT : '#fff' }]}>{p.label}</Text>
                      <View style={styles.protocolStats}>
                        <View style={styles.protocolStat}>
                          <Text style={[styles.protocolStatVal, { color: isSelected ? PREMIUM_ACCENT : 'rgba(255,255,255,0.85)' }]}>
                            {p.fastHours}h
                          </Text>
                          <Text style={styles.protocolStatLabel}>fast</Text>
                        </View>
                        {p.eatingHours > 0 && (
                          <View style={styles.protocolStat}>
                            <Text style={[styles.protocolStatVal, { color: isSelected ? PREMIUM_ACCENT : 'rgba(255,255,255,0.85)' }]}>
                              {p.eatingHours}h
                            </Text>
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

            <TouchableOpacity onPress={handleStartFast} activeOpacity={0.88} style={styles.startBtn}>
              <Ionicons name="timer" size={22} color={PREMIUM_BG} />
              <Text style={styles.startBtnText}>Start {selectedProtocol.label} Fast</Text>
            </TouchableOpacity>

            <View style={[styles.benefitsCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
              <Text style={styles.benefitsTitle}>Benefits of {selectedProtocol.label}</Text>
              {[
                'Promotes fat burning and ketosis',
                'Improves mental clarity and focus',
                'Boosts energy levels',
                'Preserves muscle mass',
                'Supports metabolic health',
              ].map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={PREMIUM_ACCENT} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {history.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Fasting history</Text>
            {history.slice(0, 5).map((log) => {
              const startDate = new Date(log.started_at);
              const endDate = log.ended_at ? new Date(log.ended_at) : null;
              const actualMs = endDate ? endDate.getTime() - startDate.getTime() : 0;
              const actualH = (actualMs / 3_600_000).toFixed(1);
              return (
                <View key={log.id} style={[styles.historyCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
                  <LinearGradient
                    colors={log.completed ? [PREMIUM_ACCENT, '#0DAE6C'] : ['#6B7280', '#4B5563']}
                    style={styles.historyCardLeft}
                  >
                    <Ionicons name={log.completed ? 'checkmark-circle' : 'close-circle'} size={20} color="#fff" />
                    <Text style={styles.historyCardProtocol}>{log.protocol ?? '—'}</Text>
                  </LinearGradient>
                  <View style={styles.historyCardBody}>
                    <Text style={styles.historyCardDate}>
                      {startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.historyCardMeta}>
                      {log.completed ? `Completed · ${actualH}h fasted` : `Ended early · ${actualH}h fasted`}
                    </Text>
                  </View>
                  <View style={[styles.historyCalBadge, { backgroundColor: log.completed ? PREMIUM_ACCENT + '18' : PREMIUM_GLASS }]}>
                    <Text style={[styles.historyCalVal, { color: log.completed ? PREMIUM_ACCENT : PREMIUM_MUTED }]}>{actualH}h</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScreenScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  scrollContent: { paddingTop: spacing.sm },

  timerHero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timerTopRow: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  protocolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT + '55',
    backgroundColor: PREMIUM_ACCENT + '18',
  },
  protocolBadgeText: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_ACCENT },
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
  remainingDivider: { width: 1, height: 40, marginHorizontal: spacing.lg, backgroundColor: 'rgba(255,255,255,0.15)' },
  windowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  windowLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)' },
  windowTime: { fontSize: fontSize.base, fontWeight: '700', color: '#fff' },
  startedText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.40)' },

  actionBtns: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_ACCENT,
  },
  completeBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_BG },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FF5959',
    backgroundColor: PREMIUM_GLASS,
  },
  breakBtnText: { fontSize: fontSize.base, fontWeight: '700', color: '#FF5959' },

  selectorHero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectorTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  selectorSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginBottom: spacing.lg },
  protocolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  protocolCard: { width: '47%', padding: spacing.md, borderRadius: 14, position: 'relative', gap: 6 },
  popularBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: '#FFB830' },
  popularText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  protocolLabel: { fontSize: 22, fontWeight: '900' },
  protocolStats: { flexDirection: 'row', gap: spacing.md },
  protocolStat: {},
  protocolStatVal: { fontSize: fontSize.base, fontWeight: '800' },
  protocolStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.50)' },
  protocolDesc: { fontSize: 11, color: 'rgba(255,255,255,0.50)', lineHeight: 15, marginTop: 2 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_ACCENT,
  },
  startBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_BG },

  benefitsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    gap: spacing.sm,
  },
  benefitsTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.xs },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { fontSize: fontSize.sm, lineHeight: 20, color: PREMIUM_MUTED, flex: 1 },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: PREMIUM_MUTED,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: PREMIUM_GLASS,
  },
  historyCardLeft: { padding: spacing.md, alignItems: 'center', gap: 4, width: 70 },
  historyCardProtocol: { fontSize: 11, fontWeight: '700', color: '#fff' },
  historyCardBody: { flex: 1, padding: spacing.md },
  historyCardDate: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_TEXT },
  historyCardMeta: { fontSize: fontSize.xs, marginTop: 2, color: PREMIUM_MUTED },
  historyCalBadge: { padding: spacing.md, alignItems: 'center' },
  historyCalVal: { fontSize: fontSize.base, fontWeight: '800' },
});
