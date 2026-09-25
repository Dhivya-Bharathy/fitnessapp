import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { spacing, radius, fontSize, dayRingColors } from '../../theme';
import Avatar from '../Avatar';
import {
  PREMIUM_BG as BG,
  PREMIUM_GLASS as GLASS,
  PREMIUM_GLASS_BORDER as GLASS_BORDER,
  PREMIUM_TEXT as TEXT,
  PREMIUM_MUTED as MUTED,
  PREMIUM_ACCENT as ACCENT,
  premiumGlassShadow,
} from '../premium/premiumEffects';

const glassShadow = premiumGlassShadow();

function GlassCard({
  children,
  style,
  onPress,
  gradientBorder,
}: {
  children: ReactNode;
  style?: object;
  onPress?: () => void;
  gradientBorder?: boolean;
}) {
  const inner = (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );

  const wrapped = gradientBorder ? (
    <LinearGradient
      colors={['rgba(45,220,140,0.22)', 'rgba(178,128,255,0.18)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradBorder}
    >
      {inner}
    </LinearGradient>
  ) : inner;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        {wrapped}
      </TouchableOpacity>
    );
  }
  return wrapped;
}

function CardWave({ colors: waveColors }: { colors: [string, string] }) {
  return (
    <LinearGradient
      colors={waveColors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.cardWave}
      pointerEvents="none"
    />
  );
}

function CalorieRing({ size, pct, consumed }: { size: number; pct: number; consumed: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));

  return (
    <View style={styles.ringWrap}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(45,220,140,0.12)"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ACCENT}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Ionicons name="flame" size={20} color={ACCENT} style={{ marginBottom: 2 }} />
        <Text style={styles.ringKcal}>{consumed.toLocaleString()}</Text>
        <Text style={styles.ringSub}>kcal consumed</Text>
      </View>
    </View>
  );
}

function PartnerAvatarStack() {
  const rings: [string, string][] = [
    ['#4A90E2', '#6699FF'],
    ['#B280FF', '#7B5CFF'],
    ['#2DDC8C', '#34F5A4'],
  ];
  return (
    <View style={styles.avatarStack}>
      {rings.map((c, i) => (
        <LinearGradient
          key={i}
          colors={c}
          style={[styles.stackRing, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}
        >
          <View style={styles.stackInner}>
            <Ionicons name="person" size={12} color="rgba(255,255,255,0.85)" />
          </View>
        </LinearGradient>
      ))}
      <Text style={styles.stackPlus}>+3</Text>
    </View>
  );
}

export interface PremiumHomeProps {
  greeting: string;
  displayName: string;
  unreadCount: number;
  streakCount: number;
  caloriesConsumed: number;
  calorieGoal: number;
  waterMl: number;
  waterGoalMl: number;
  liveSteps: number;
  stepGoal: number;
  sleepHrs: number;
  onWaterLog: () => void;
  onSleepLog: () => void;
}

export function PremiumHomeDashboard(props: PremiumHomeProps) {
  const navigation = useNavigation<any>();
  const {
    greeting,
    displayName,
    unreadCount,
    streakCount,
    caloriesConsumed,
    calorieGoal,
    waterMl,
    waterGoalMl,
    liveSteps,
    stepGoal,
    sleepHrs,
    onWaterLog,
    onSleepLog,
  } = props;

  const calPct = calorieGoal > 0 ? caloriesConsumed / calorieGoal : 0;
  const calRemaining = Math.max(calorieGoal - caloriesConsumed, 0);
  const waterDisplay = waterMl > 0 ? `${(waterMl / 1000).toFixed(1)} L` : '—';
  const waterGoalL = (waterGoalMl / 1000).toFixed(1);
  const stepsDisplay = liveSteps > 0 ? liveSteps.toLocaleString() : '—';
  const sleepDisplay = sleepHrs > 0 ? `${sleepHrs}h` : '—';

  const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = new Date();
  const todayDow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - todayDow);
  const monIndex = todayDow === 0 ? 6 : todayDow - 1;

  const quickActions = [
    { label: '+ Food', icon: 'restaurant-outline' as const, color: ACCENT, onPress: () => navigation.navigate('Main', { screen: 'Calorie' }) },
    { label: '+ Water', icon: 'water-outline' as const, color: '#4A90E2', onPress: onWaterLog },
    { label: '+ Sleep', icon: 'moon-outline' as const, color: '#B280FF', onPress: onSleepLog },
    { label: 'Workout', icon: 'barbell-outline' as const, color: '#FFB347', onPress: () => navigation.navigate('Main', { screen: 'Activity' }) },
  ];

  const metrics = [
    {
      label: 'Water',
      value: waterDisplay,
      sub: `of ${waterGoalL} L`,
      color: '#4A90E2',
      wave: ['rgba(74,144,226,0.14)', 'rgba(74,144,226,0)'] as [string, string],
      icon: 'water-outline' as const,
      onPress: () => navigation.navigate('Main', { screen: 'Calorie' }),
      onAdd: onWaterLog,
    },
    {
      label: 'Steps',
      value: stepsDisplay,
      sub: `of ${stepGoal.toLocaleString()}`,
      color: ACCENT,
      wave: ['rgba(45,220,140,0.14)', 'rgba(45,220,140,0)'] as [string, string],
      icon: 'footsteps-outline' as const,
      onPress: () => navigation.navigate('Main', { screen: 'Activity' }),
      onAdd: () => navigation.navigate('Main', { screen: 'Activity' }),
    },
    {
      label: 'Sleep',
      value: sleepDisplay,
      sub: 'of 8h',
      color: '#B280FF',
      wave: ['rgba(178,128,255,0.14)', 'rgba(178,128,255,0)'] as [string, string],
      icon: 'moon-outline' as const,
      onPress: () => navigation.navigate('Sleep'),
      onAdd: onSleepLog,
    },
  ];

  const barHeights = [10, 14, 8, 16, 22, 12, 10];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar size={52} borderWidth={2} />
          <View style={styles.headerTextCol}>
            <Text style={styles.greetingLine}>{greeting} 👋</Text>
            <Text style={styles.nameLine} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.subLine}>Keep going! You're doing great today.</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={TEXT} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Avatar size={40} />
          </TouchableOpacity>
        </View>
      </View>

      <GlassCard style={styles.sectionMargin}>
        <View style={styles.weekTop}>
          <Text style={styles.cardTitle}>This Week</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Streaks')}>
            <Text style={styles.link}>View All ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {dayLabels.map((label, dow) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + dow);
            const isToday = dow === todayDow;
            const isFuture = dow > todayDow;
            const ringColor = dayRingColors[dow];
            return (
              <View key={label} style={styles.weekCol}>
                <Text style={[styles.weekDay, isToday && { color: ACCENT }]}>{label}</Text>
                <View
                  style={[
                    styles.weekBubble,
                    isToday && { backgroundColor: ACCENT, borderColor: ACCENT },
                    !isToday && { borderColor: isFuture ? 'rgba(255,255,255,0.15)' : ringColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDate,
                      isToday && { color: BG, fontWeight: '800' },
                      !isToday && { color: isFuture ? MUTED : ringColor },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}
      >
        <GlassCard style={[styles.sectionMargin, styles.calorieCardOuter]} gradientBorder>
          <CardWave colors={['rgba(45,220,140,0.08)', 'rgba(45,220,140,0)']} />
          <View style={styles.calTop}>
            <View style={styles.calTitleRow}>
              <Ionicons name="flame" size={18} color={ACCENT} />
              <Text style={styles.cardTitle}>Calories Today</Text>
            </View>
            <View style={styles.calTopRight}>
              <Text style={styles.calGoal}>Goal {calorieGoal.toLocaleString()} kcal</Text>
              <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}>
                <Ionicons name="ellipsis-horizontal" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.calBody}>
            <CalorieRing size={120} pct={calPct} consumed={caloriesConsumed} />
            <View style={styles.calStats}>
              <Text style={styles.calRemaining}>{calRemaining.toLocaleString()} kcal left</Text>
              <Text style={styles.calPct}>{Math.round(Math.min(calPct, 1) * 100)}% of daily goal</Text>
              <View style={styles.calBarBg}>
                <LinearGradient
                  colors={['#34F5A4', ACCENT, '#0A9A5E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.calBarFill, { width: `${Math.max(calPct * 100, 3)}%` as `${number}%` }]}
                />
              </View>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>

      <View style={[styles.metricsRow, styles.sectionMargin]}>
        {metrics.map((m) => (
          <TouchableOpacity key={m.label} style={styles.metricCard} onPress={m.onPress} activeOpacity={0.88}>
            <CardWave colors={m.wave} />
            <TouchableOpacity
              style={[styles.metricAdd, { backgroundColor: m.color }]}
              onPress={() => m.onAdd?.()}
            >
              <Ionicons name="add" size={14} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.metricIconWrap, { backgroundColor: m.color + '28' }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
            </View>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricSub}>{m.sub}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.sectionMargin, styles.quickHead]}>
        <Text style={styles.cardTitle}>Quick Log</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}>
          <Text style={styles.link}>See All ›</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.quickRow, styles.sectionMargin]}>
        {quickActions.map((a) => (
          <TouchableOpacity key={a.label} style={styles.quickTile} onPress={a.onPress} activeOpacity={0.88}>
            <View style={[styles.quickIcon, { backgroundColor: a.color + '22', borderColor: a.color + '44' }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.dualRow, styles.sectionMargin]}>
        <GlassCard style={styles.dualCard} onPress={() => navigation.navigate('Accountability')}>
          <Text style={styles.dualTitle}>Accountability Partners</Text>
          <Text style={styles.dualSub}>Stay motivated together</Text>
          <PartnerAvatarStack />
        </GlassCard>

        <GlassCard style={styles.dualCard} onPress={() => navigation.navigate('Streaks')}>
          <View style={styles.streakHead}>
            <Ionicons name="flame" size={16} color="#FFB347" />
            <Text style={styles.dualTitle}>Streaks</Text>
          </View>
          <Text style={styles.streakFire}>
            {streakCount > 0 ? "You're on fire! 🔥" : 'Start your streak'}
          </Text>
          <Text style={styles.streakBig}>{streakCount} days</Text>
          <View style={styles.miniBars}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <View key={`${d}-${i}`} style={styles.miniBarCol}>
                <View
                  style={[
                    styles.miniBar,
                    {
                      height: barHeights[i],
                      backgroundColor: i === monIndex ? ACCENT : 'rgba(255,255,255,0.12)',
                    },
                  ]}
                />
                <Text style={[styles.miniBarLabel, i === monIndex && { color: ACCENT }]}>{d}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  gradBorder: { borderRadius: radius.lg + 5, padding: 1 },
  sectionMargin: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  glassCard: {
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: radius.lg + 4,
    padding: spacing.md,
    overflow: 'hidden',
    ...glassShadow,
  },
  calorieCardOuter: { paddingBottom: spacing.lg },
  cardWave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerTextCol: { flex: 1, minWidth: 0 },
  greetingLine: { fontSize: fontSize.sm, color: MUTED, fontWeight: '500' },
  nameLine: { fontSize: fontSize.xl + 4, fontWeight: '800', color: TEXT, marginTop: 2 },
  subLine: { fontSize: fontSize.xs, color: MUTED, marginTop: 4, lineHeight: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5959',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: TEXT },
  link: { fontSize: fontSize.sm, color: ACCENT, fontWeight: '600' },
  weekTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', gap: 6 },
  weekDay: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  weekBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDate: { fontSize: 12, fontWeight: '700' },
  calTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, zIndex: 1 },
  calTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calGoal: { fontSize: fontSize.xs, color: MUTED, fontWeight: '600' },
  calBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, zIndex: 1 },
  ringWrap: { borderRadius: 70, padding: 4 },
  ringKcal: { fontSize: 24, fontWeight: '900', color: TEXT },
  ringSub: { fontSize: 10, color: MUTED, fontWeight: '600' },
  calStats: { flex: 1, gap: 8 },
  calRemaining: { fontSize: fontSize.lg + 2, fontWeight: '800', color: TEXT },
  calPct: { fontSize: fontSize.xs, color: MUTED },
  calBarBg: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 },
  calBarFill: { height: '100%', borderRadius: 5 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metricCard: {
    flex: 1,
    backgroundColor: GLASS,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    minHeight: 128,
    overflow: 'hidden',
  },
  metricIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 1 },
  metricValue: { fontSize: fontSize.base + 1, fontWeight: '800', zIndex: 1 },
  metricSub: { fontSize: 9, color: MUTED, marginTop: 2, zIndex: 1 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: MUTED, marginTop: 6, zIndex: 1 },
  metricAdd: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  quickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickTile: {
    flex: 1,
    backgroundColor: GLASS,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickLabel: { fontSize: 10, fontWeight: '700', color: TEXT },
  dualRow: { flexDirection: 'row', gap: spacing.sm },
  dualCard: { flex: 1, minHeight: 152 },
  dualTitle: { fontSize: fontSize.sm, fontWeight: '800', color: TEXT },
  dualSub: { fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 14 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  stackRing: { width: 28, height: 28, borderRadius: 14, padding: 2 },
  stackInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackPlus: { fontSize: 11, color: MUTED, marginLeft: 8, fontWeight: '700' },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakFire: { fontSize: 10, color: '#FFB347', marginTop: 6, fontWeight: '600' },
  streakBig: { fontSize: fontSize.xl, fontWeight: '900', color: TEXT, marginTop: 2 },
  miniBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.sm, height: 32, width: '100%' },
  miniBarCol: { alignItems: 'center', gap: 4, flex: 1 },
  miniBar: { width: 7, borderRadius: 4, minHeight: 6 },
  miniBarLabel: { fontSize: 8, color: MUTED, fontWeight: '600' },
});
