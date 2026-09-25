import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { assessmentUseNativeDriver } from './assessmentAnim';
import { spacing, fontSize } from '../../theme';

const DARK_BG = '#080A0F';
const ACCENT = '#2DDC8C';
const MUTED = 'rgba(255,255,255,0.52)';

const CAROUSEL_ICONS = [
  { icon: 'barbell-outline', label: 'Strength' },
  { icon: 'walk-outline', label: 'Cardio' },
  { icon: 'stats-chart-outline', label: 'Data' },
  { icon: 'nutrition-outline', label: 'Diet' },
  { icon: 'heart-outline', label: 'Health' },
] as const;

const STEPS = [
  'Analyzing your answers',
  'Finding the best workout plan',
  'Personalizing your nutrition goals',
  'Creating your custom plan…',
] as const;

type Props = {
  answerCount: number;
};

export function PlanGenerationLoader({ answerCount }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: assessmentUseNativeDriver,
    }).start();

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: assessmentUseNativeDriver,
      }),
    );
    spinLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: assessmentUseNativeDriver }),
        Animated.timing(pulse, { toValue: 0.55, duration: 900, useNativeDriver: assessmentUseNativeDriver }),
      ]),
    );
    pulseLoop.start();

    const stepTimer = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1400);

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      clearInterval(stepTimer);
    };
  }, [fadeIn, spin, pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <AndroidSafeView backgroundColor={DARK_BG} style={styles.safe}>
      <View style={styles.orbLeft} />
      <View style={styles.orbRight} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <View style={styles.carousel}>
          {CAROUSEL_ICONS.map((item, i) => {
            const center = i === 2;
            return (
              <View
                key={item.icon}
                style={[
                  styles.carouselCard,
                  center && styles.carouselCardCenter,
                  !center && styles.carouselCardSide,
                ]}
              >
                <LinearGradient
                  colors={center ? ['rgba(45,220,140,0.22)', 'rgba(255,255,255,0.06)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons
                  name={item.icon as never}
                  size={center ? 28 : 18}
                  color={center ? ACCENT : 'rgba(255,255,255,0.55)'}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.ringWrap}>
          <Animated.View style={[styles.ringOuter, { transform: [{ rotate }] }]}>
            <View style={styles.ringArc} />
          </Animated.View>
          <Animated.View style={[styles.ringInner, { opacity: pulse }]}>
            <Ionicons name="sparkles" size={22} color={ACCENT} />
          </Animated.View>
        </View>

        <Text style={styles.title}>
          Building <Text style={styles.titleAccent}>your</Text> plan…
        </Text>
        <Text style={styles.sub}>
          Reading your {answerCount} answers → OpenAI
        </Text>

        <View style={styles.checklist}>
          <LinearGradient
            colors={['rgba(45,220,140,0.1)', 'rgba(255,255,255,0.03)']}
            style={StyleSheet.absoluteFillObject}
          />
          {STEPS.map((label, i) => {
            const done = i < activeStep;
            const current = i === activeStep;
            return (
              <View key={label} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  {i > 0 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      current && styles.stepDotCurrent,
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#080A0F" />
                    ) : current ? (
                      <View style={styles.stepDotPulse} />
                    ) : null}
                  </View>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    done && styles.stepLabelDone,
                    current && styles.stepLabelCurrent,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Ionicons name="barbell-outline" size={16} color="rgba(255,255,255,0.35)" />
          <Text style={styles.footerText}>This may take a few seconds</Text>
        </View>
      </Animated.View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK_BG },
  orbLeft: {
    position: 'absolute',
    bottom: 80,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(45,220,140,0.12)',
    pointerEvents: 'none' as const,
  },
  orbRight: {
    position: 'absolute',
    top: 40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(45,220,140,0.1)',
    pointerEvents: 'none' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
    height: 72,
  },
  carouselCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(45,220,140,0.12)' },
      default: {},
    }),
  },
  carouselCardSide: {
    width: 48,
    height: 52,
    opacity: 0.75,
  },
  carouselCardCenter: {
    width: 64,
    height: 68,
    borderColor: 'rgba(45,220,140,0.45)',
  },
  ringWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ringOuter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringArc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: ACCENT,
    borderRightColor: ACCENT,
  },
  ringInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(45,220,140,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  titleAccent: { color: ACCENT },
  sub: {
    color: MUTED,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  checklist: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.28)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...Platform.select({
      web: { boxShadow: '0 0 24px rgba(45,220,140,0.08)' },
      default: {},
    }),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
  },
  stepRail: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: -14,
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepLineDone: { backgroundColor: ACCENT },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepDotDone: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  stepDotCurrent: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(45,220,140,0.15)',
  },
  stepDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  stepLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.38)',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  stepLabelDone: { color: 'rgba(255,255,255,0.72)' },
  stepLabelCurrent: { color: '#fff', fontWeight: '700' },
  footer: {
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto' as const,
  },
  footerText: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
  },
});
