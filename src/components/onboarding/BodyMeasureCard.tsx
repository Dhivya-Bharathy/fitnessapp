import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSize, spacing } from '../../theme';
import { HorizontalValueRuler } from './HorizontalValueRuler';

const ACCENT = '#2DDC8C';
const CARD_BG = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.12)';

export type MeasureUnit = 'metric' | 'imperial';

type Props = {
  kind: 'height' | 'weight';
  valueMetric: number;
  unit: MeasureUnit;
  onUnitChange: (unit: MeasureUnit) => void;
  onChangeMetric: (valueMetric: number) => void;
  icon: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function cmToFeetIn(cm: number) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch: inch === 12 ? 0 : inch, ftAdj: inch === 12 ? ft + 1 : ft };
}

function feetInToCm(ft: number, inch: number) {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function BodyMeasureCard({
  kind,
  valueMetric,
  unit,
  onUnitChange,
  onChangeMetric,
  icon,
}: Props) {
  const isHeight = kind === 'height';
  const title = isHeight ? 'Height' : 'Weight';
  const subtitle = isHeight ? 'Enter your height' : 'Enter your weight';

  const metricMin = isHeight ? 120 : 35;
  const metricMax = isHeight ? 220 : 150;
  const metricStep = 1;

  const displayPrimary = () => {
    if (isHeight) {
      if (unit === 'metric') return `${Math.round(valueMetric)} cm`;
      const { ftAdj, inch } = cmToFeetIn(valueMetric);
      return `${ftAdj}' ${inch}"`;
    }
    if (unit === 'metric') return `${Math.round(valueMetric)} kg`;
    return `${Math.round(valueMetric * 2.20462)} lbs`;
  };

  const rulerMin = () => {
    if (isHeight && unit === 'imperial') return 48;
    if (isHeight) return metricMin;
    if (unit === 'imperial') return Math.round(metricMin * 2.20462);
    return metricMin;
  };

  const rulerMax = () => {
    if (isHeight && unit === 'imperial') return 84;
    if (isHeight) return metricMax;
    if (unit === 'imperial') return Math.round(metricMax * 2.20462);
    return metricMax;
  };

  const rulerValue = () => {
    if (isHeight && unit === 'imperial') {
      const { ftAdj, inch } = cmToFeetIn(valueMetric);
      return ftAdj * 12 + inch;
    }
    if (!isHeight && unit === 'imperial') return Math.round(valueMetric * 2.20462);
    return Math.round(valueMetric);
  };

  const onRulerChange = (v: number) => {
    if (isHeight && unit === 'imperial') {
      const ft = Math.floor(v / 12);
      const inch = v - ft * 12;
      onChangeMetric(clamp(feetInToCm(ft, inch), metricMin, metricMax));
      return;
    }
    if (!isHeight && unit === 'imperial') {
      onChangeMetric(clamp(Math.round(v / 2.20462), metricMin, metricMax));
      return;
    }
    onChangeMetric(clamp(Math.round(v), metricMin, metricMax));
  };

  const stepMetric = (delta: number) => {
    onChangeMetric(clamp(valueMetric + delta, metricMin, metricMax));
  };

  const unitLeft = isHeight ? 'cm' : 'kg';
  const unitRight = isHeight ? 'ft' : 'lbs';

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(45,220,140,0.08)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon as never} size={22} color={ACCENT} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.unitToggle}>
          <Pressable
            onPress={() => onUnitChange('metric')}
            style={[styles.unitBtn, unit === 'metric' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitBtnText, unit === 'metric' && styles.unitBtnTextActive]}>{unitLeft}</Text>
          </Pressable>
          <Pressable
            onPress={() => onUnitChange('imperial')}
            style={[styles.unitBtn, unit === 'imperial' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitBtnText, unit === 'imperial' && styles.unitBtnTextActive]}>{unitRight}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => stepMetric(isHeight ? -1 : -1)}
          style={styles.stepBtn}
          accessibilityLabel={`Decrease ${title}`}
        >
          <Ionicons name="remove" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.valueDisplay}>{displayPrimary()}</Text>
        <Pressable
          onPress={() => stepMetric(1)}
          style={styles.stepBtn}
          accessibilityLabel={`Increase ${title}`}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <HorizontalValueRuler
        min={rulerMin()}
        max={rulerMax()}
        step={1}
        value={rulerValue()}
        onChange={onRulerChange}
        majorEvery={isHeight && unit === 'imperial' ? 12 : 10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    padding: spacing.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...Platform.select({
      web: { boxShadow: '0 0 24px rgba(45,220,140,0.08)' as unknown as number },
      default: {},
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.35)',
    backgroundColor: 'rgba(45,220,140,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.48)', fontSize: 11, marginTop: 2 },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  unitBtnActive: {
    backgroundColor: ACCENT,
  },
  unitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
  },
  unitBtnTextActive: {
    color: '#080A0F',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: spacing.xs,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueDisplay: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
