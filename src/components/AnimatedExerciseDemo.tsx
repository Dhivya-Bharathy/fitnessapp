import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { CATEGORY_MAP } from '../data/exerciseLibrary';
import type { ExerciseData } from '../data/exerciseLibrary';

const { width: SW } = Dimensions.get('window');
const SVG_SIZE = Math.min(SW - spacing.lg * 4, 280);

interface Props {
  exercise: ExerciseData;
  isActive: boolean;
  secondsLeft: number;
}

function GradientBg({ color }: { color: string }) {
  return (
    <G>
      <Defs>
        <SvgGradient id="demo_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </SvgGradient>
      </Defs>
      <Rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} rx={24} ry={24} fill="url(#demo_grad)" />
    </G>
  );
}

function FigureHead({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={14} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={cx - 4} cy={cy - 2} r={1.5} fill="#fff" opacity={0.8} />
      <Circle cx={cx + 4} cy={cy - 2} r={1.5} fill="#fff" opacity={0.8} />
      <Path d={`M${cx - 5} ${cy + 5} Q${cx} ${cy + 8} ${cx + 5} ${cy + 5}`} stroke="#fff" strokeWidth={1.2} fill="none" opacity={0.6} />
    </G>
  );
}

function FigureTorso({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={4} strokeLinecap="round" />;
}

function FigureArm({ from, mid, to }: { from: { x: number; y: number }; mid: { x: number; y: number }; to: { x: number; y: number } }) {
  return (
    <G>
      <Line x1={from.x} y1={from.y} x2={mid.x} y2={mid.y} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <Line x1={mid.x} y1={mid.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />
    </G>
  );
}

function FigureLeg({ from, knee, foot }: { from: { x: number; y: number }; knee: { x: number; y: number }; foot: { x: number; y: number } }) {
  return (
    <G>
      <Line x1={from.x} y1={from.y} x2={knee.x} y2={knee.y} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={knee.x} y1={knee.y} x2={foot.x} y2={foot.y} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

function MotionArc({ from, to, color }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 12;
  return <Path d={`M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}`} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.4} strokeDasharray="4,4" />;
}

function GlowParticle({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={5} fill={color} opacity={0.3} />
      <Circle cx={cx} cy={cy} r={2.5} fill={color} opacity={0.6} />
    </G>
  );
}

export default function AnimatedExerciseDemo({ exercise, isActive, secondsLeft }: Props) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const catColor = CATEGORY_MAP[exercise.category]?.color ?? '#2DDC8C';

  const armAnim = useRef(new Animated.Value(0)).current;
  const legAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;

    const armLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(armAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(armAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );

    const legLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(legAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(legAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );

    armLoop.start();
    legLoop.start();
    pulseLoop.start();
    glowLoop.start();

    return () => {
      armLoop.stop();
      legLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [isActive]);

  const armOffset = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const legSwing = legAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.3, 0.7],
  });

  const progress = exercise.defaultDuration > 0
    ? (exercise.defaultDuration - secondsLeft) / exercise.defaultDuration
    : 0;

  const center = SVG_SIZE / 2;
  const s = SVG_SIZE;

  const renderFigure = () => {
    const cat = exercise.category;
    switch (cat) {
      case 'Chest':
        return (
          <G>
            <FigureHead cx={center} cy={s * 0.15} />
            <FigureTorso x1={center} y1={s * 0.22} x2={center} y2={s * 0.48} />
            <FigureArm
              from={{ x: center, y: s * 0.28 }}
              mid={{ x: center - s * 0.1, y: s * 0.18 }}
              to={{ x: center - s * 0.15, y: s * 0.12 + armOffset * s * 0.06 }}
            />
            <FigureArm
              from={{ x: center, y: s * 0.28 }}
              mid={{ x: center + s * 0.1, y: s * 0.18 }}
              to={{ x: center + s * 0.15, y: s * 0.12 + armOffset * s * 0.06 }}
            />
            <FigureLeg from={{ x: center, y: s * 0.48 }} knee={{ x: center - s * 0.06, y: s * 0.66 }} foot={{ x: center - s * 0.04, y: s * 0.78 }} />
            <FigureLeg from={{ x: center, y: s * 0.48 }} knee={{ x: center + s * 0.06, y: s * 0.66 }} foot={{ x: center + s * 0.04, y: s * 0.78 }} />
            <MotionArc from={{ x: center - s * 0.1, y: s * 0.18 }} to={{ x: center - s * 0.12, y: s * 0.08 }} color={catColor} />
            <MotionArc from={{ x: center + s * 0.1, y: s * 0.18 }} to={{ x: center + s * 0.12, y: s * 0.08 }} color={catColor} />
            <GlowParticle cx={center - s * 0.2} cy={s * 0.1} color={catColor} />
            <GlowParticle cx={center + s * 0.2} cy={s * 0.1} color={catColor} />
          </G>
        );

      case 'Back':
        return (
          <G>
            <FigureHead cx={center + s * 0.12} cy={s * 0.12} />
            <Line x1={center + s * 0.08} y1={s * 0.2} x2={center} y2={s * 0.48} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
            <FigureArm from={{ x: center + s * 0.04, y: s * 0.26 }}
              mid={{ x: center - s * 0.1, y: s * 0.18 }}
              to={{ x: center - s * 0.2, y: s * 0.12 + armOffset * s * 0.04 }}
            />
            <FigureArm from={{ x: center, y: s * 0.3 }}
              mid={{ x: center - s * 0.12, y: s * 0.22 }}
              to={{ x: center - s * 0.22, y: s * 0.16 + armOffset * s * 0.04 }}
            />
            <FigureLeg from={{ x: center, y: s * 0.48 }} knee={{ x: center - s * 0.08, y: s * 0.66 }} foot={{ x: center - s * 0.12, y: s * 0.78 }} />
            <FigureLeg from={{ x: center, y: s * 0.48 }} knee={{ x: center + s * 0.04, y: s * 0.64 }} foot={{ x: center, y: s * 0.78 }} />
            <MotionArc from={{ x: center - s * 0.1, y: s * 0.18 }} to={{ x: center - s * 0.2, y: s * 0.12 }} color={catColor} />
            <GlowParticle cx={center - s * 0.28} cy={s * 0.1} color={catColor} />
          </G>
        );

      case 'Legs':
        return (
          <G>
            <FigureHead cx={center} cy={s * 0.1} />
            <FigureTorso x1={center} y1={s * 0.18} x2={center} y2={s * 0.4} />
            <FigureArm from={{ x: center, y: s * 0.24 }} mid={{ x: center - s * 0.15, y: s * 0.32 }} to={{ x: center - s * 0.22, y: s * 0.36 }} />
            <FigureArm from={{ x: center, y: s * 0.24 }} mid={{ x: center + s * 0.15, y: s * 0.32 }} to={{ x: center + s * 0.22, y: s * 0.36 }} />
            <FigureLeg from={{ x: center, y: s * 0.4 }}
              knee={{ x: center - s * 0.08, y: s * 0.56 + legSwing * s * 0.06 }}
              foot={{ x: center - s * 0.12, y: s * 0.72 + legSwing * s * 0.04 }}
            />
            <FigureLeg from={{ x: center, y: s * 0.4 }}
              knee={{ x: center + s * 0.08, y: s * 0.56 + legSwing * s * 0.06 }}
              foot={{ x: center + s * 0.12, y: s * 0.72 + legSwing * s * 0.04 }}
            />
            <MotionArc from={{ x: center, y: s * 0.4 }} to={{ x: center - s * 0.08, y: s * 0.56 }} color={catColor} />
            <MotionArc from={{ x: center, y: s * 0.4 }} to={{ x: center + s * 0.08, y: s * 0.56 }} color={catColor} />
            <GlowParticle cx={center - s * 0.16} cy={s * 0.7} color={catColor} />
            <GlowParticle cx={center + s * 0.16} cy={s * 0.7} color={catColor} />
          </G>
        );

      case 'Shoulders':
        return (
          <G>
            <FigureHead cx={center} cy={s * 0.12} />
            <FigureTorso x1={center} y1={s * 0.2} x2={center} y2={s * 0.46} />
            <FigureArm from={{ x: center, y: s * 0.26 }}
              mid={{ x: center - s * 0.08, y: s * 0.12 - armOffset * s * 0.06 }}
              to={{ x: center - s * 0.14, y: s * 0.02 - armOffset * s * 0.06 }}
            />
            <FigureArm from={{ x: center, y: s * 0.26 }}
              mid={{ x: center + s * 0.08, y: s * 0.12 - armOffset * s * 0.06 }}
              to={{ x: center + s * 0.14, y: s * 0.02 - armOffset * s * 0.06 }}
            />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center - s * 0.06, y: s * 0.64 }} foot={{ x: center - s * 0.1, y: s * 0.74 }} />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center + s * 0.06, y: s * 0.64 }} foot={{ x: center + s * 0.1, y: s * 0.74 }} />
            <MotionArc from={{ x: center - s * 0.08, y: s * 0.12 }} to={{ x: center - s * 0.14, y: s * 0.02 }} color={catColor} />
            <MotionArc from={{ x: center + s * 0.08, y: s * 0.12 }} to={{ x: center + s * 0.14, y: s * 0.02 }} color={catColor} />
            <GlowParticle cx={center} cy={s * 0.02} color={catColor} />
          </G>
        );

      case 'Arms':
        return (
          <G>
            <FigureHead cx={center} cy={s * 0.1} />
            <FigureTorso x1={center} y1={s * 0.18} x2={center} y2={s * 0.46} />
            <FigureArm from={{ x: center - s * 0.04, y: s * 0.26 }}
              mid={{ x: center - s * 0.18, y: s * 0.32 }}
              to={{ x: center - s * 0.14, y: s * 0.2 + armOffset * s * 0.04 }}
            />
            <FigureArm from={{ x: center + s * 0.04, y: s * 0.26 }}
              mid={{ x: center + s * 0.18, y: s * 0.32 }}
              to={{ x: center + s * 0.14, y: s * 0.2 + armOffset * s * 0.04 }}
            />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center - s * 0.06, y: s * 0.64 }} foot={{ x: center - s * 0.1, y: s * 0.74 }} />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center + s * 0.06, y: s * 0.64 }} foot={{ x: center + s * 0.1, y: s * 0.74 }} />
            <MotionArc from={{ x: center - s * 0.18, y: s * 0.32 }} to={{ x: center - s * 0.14, y: s * 0.2 }} color={catColor} />
            <MotionArc from={{ x: center + s * 0.18, y: s * 0.32 }} to={{ x: center + s * 0.14, y: s * 0.2 }} color={catColor} />
            <GlowParticle cx={center - s * 0.22} cy={s * 0.44} color={catColor} />
            <GlowParticle cx={center + s * 0.22} cy={s * 0.44} color={catColor} />
          </G>
        );

      case 'Core':
        return (
          <G>
            <FigureHead cx={center - s * 0.08} cy={s * 0.3} />
            <Line x1={center - s * 0.02} y1={s * 0.38} x2={center + s * 0.08} y2={s * 0.52} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
            <FigureArm from={{ x: center, y: s * 0.4 }} mid={{ x: center - s * 0.04, y: s * 0.28 }} to={{ x: center - s * 0.1, y: s * 0.22 }} />
            <FigureArm from={{ x: center + s * 0.04, y: s * 0.42 }} mid={{ x: center, y: s * 0.3 }} to={{ x: center - s * 0.06, y: s * 0.24 }} />
            <FigureLeg from={{ x: center + s * 0.08, y: s * 0.52 }} knee={{ x: center + s * 0.04, y: s * 0.66 }} foot={{ x: center, y: s * 0.74 }} />
            <FigureLeg from={{ x: center + s * 0.08, y: s * 0.52 }} knee={{ x: center + s * 0.12, y: s * 0.64 }} foot={{ x: center + s * 0.14, y: s * 0.74 }} />
            <MotionArc from={{ x: center - s * 0.02, y: s * 0.38 }} to={{ x: center - s * 0.08, y: s * 0.3 }} color={catColor} />
            <GlowParticle cx={center - s * 0.16} cy={s * 0.2} color={catColor} />
          </G>
        );

      case 'Cardio':
        return (
          <G>
            <FigureHead cx={center + s * 0.04} cy={s * 0.1} />
            <Line x1={center + s * 0.02} y1={s * 0.18} x2={center - s * 0.04} y2={s * 0.42} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
            <FigureArm from={{ x: center, y: s * 0.22 }}
              mid={{ x: center + s * 0.12, y: s * 0.16 }}
              to={{ x: center + s * 0.2, y: s * 0.22 + armOffset * s * 0.06 }}
            />
            <FigureArm from={{ x: center - s * 0.02, y: s * 0.26 }}
              mid={{ x: center - s * 0.12, y: s * 0.28 }}
              to={{ x: center - s * 0.2, y: s * 0.34 - armOffset * s * 0.06 }}
            />
            <FigureLeg from={{ x: center - s * 0.04, y: s * 0.42 }}
              knee={{ x: center + s * 0.06, y: s * 0.56 + legSwing * s * 0.04 }}
              foot={{ x: center + s * 0.14, y: s * 0.68 + legSwing * s * 0.04 }}
            />
            <FigureLeg from={{ x: center - s * 0.04, y: s * 0.42 }}
              knee={{ x: center - s * 0.12, y: s * 0.54 - legSwing * s * 0.04 }}
              foot={{ x: center - s * 0.2, y: s * 0.66 - legSwing * s * 0.04 }}
            />
            <GlowParticle cx={center + s * 0.24} cy={s * 0.14} color={catColor} />
            <GlowParticle cx={center - s * 0.24} cy={s * 0.44} color={catColor} />
            <Line x1={center + s * 0.04} y1={-s * 0.02} x2={center + s * 0.04} y2={s * 0.04} stroke={catColor} strokeWidth={1.5} opacity={0.4} />
            <Line x1={center - s * 0.02} y1={-s * 0.04} x2={center - s * 0.02} y2={s * 0.02} stroke={catColor} strokeWidth={1} opacity={0.3} />
            <Line x1={center + s * 0.1} y1={-s * 0.03} x2={center + s * 0.1} y2={s * 0.03} stroke={catColor} strokeWidth={1} opacity={0.3} />
          </G>
        );

      default:
        return (
          <G>
            <FigureHead cx={center} cy={s * 0.1} />
            <FigureTorso x1={center} y1={s * 0.18} x2={center} y2={s * 0.46} />
            <FigureArm from={{ x: center, y: s * 0.24 }} mid={{ x: center - s * 0.14, y: s * 0.12 }} to={{ x: center - s * 0.18, y: s * 0.06 + armOffset * s * 0.04 }} />
            <FigureArm from={{ x: center, y: s * 0.24 }} mid={{ x: center + s * 0.14, y: s * 0.12 }} to={{ x: center + s * 0.18, y: s * 0.06 + armOffset * s * 0.04 }} />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center - s * 0.08, y: s * 0.64 }} foot={{ x: center - s * 0.12, y: s * 0.74 }} />
            <FigureLeg from={{ x: center, y: s * 0.46 }} knee={{ x: center + s * 0.08, y: s * 0.64 }} foot={{ x: center + s * 0.12, y: s * 0.74 }} />
            <GlowParticle cx={center - s * 0.2} cy={s * 0.04} color={catColor} />
            <GlowParticle cx={center + s * 0.2} cy={s * 0.04} color={catColor} />
            <GlowParticle cx={center} cy={s * 0.02} color={catColor} />
          </G>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Animated.View style={[styles.svgWrap, { transform: [{ scale: pulseScale }] }]}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          <GradientBg color={catColor} />
          {renderFigure()}
        </Svg>
      </Animated.View>

      <View style={styles.info}>
        <Text style={[styles.exName, { color: theme.textPrimary }]}>{exercise.name}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: catColor + '18' }]}>
          <Text style={[styles.difficultyText, { color: catColor }]}>{exercise.difficulty}</Text>
        </View>
      </View>

      <View style={styles.instructions}>
        {exercise.instructions.slice(0, 3).map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: catColor }]} />
            <Text style={[styles.stepText, { color: theme.textSecondary }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
        <View style={styles.metaItem}>
          <Ionicons name="barbell-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{exercise.equipment}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="flame-outline" size={14} color="#FF6B35" />
          <Text style={[styles.metaLabel, { color: '#FF6B35' }]}>{exercise.caloriesPerMinute} kcal/min</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{exercise.defaultDuration}s</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 5 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.12)' },
    }),
  },
  svgWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exName: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  instructions: {
    alignSelf: 'stretch',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
});
