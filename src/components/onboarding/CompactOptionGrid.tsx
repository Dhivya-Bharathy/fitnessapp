import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSize, spacing } from '../../theme';

export type CompactGridOption = {
  value: string;
  label: string;
  icon?: string;
  color?: string;
};

const TILE_H = 86;
const DEFAULT_ACCENT = '#2DDC8C';

type Props = {
  options: CompactGridOption[];
  selectedValues: string[];
  onPress: (value: string) => void;
  accent?: string;
};

/** Two-column compact tiles — fits 6 choices on one phone screen. */
export function CompactOptionGrid({
  options,
  selectedValues,
  onPress,
  accent = DEFAULT_ACCENT,
}: Props) {
  return (
    <View style={styles.grid}>
      {options.map((opt) => {
        const active = selectedValues.includes(opt.value);
        const color = opt.color ?? accent;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onPress(opt.value)}
            style={({ pressed }) => [
              styles.tile,
              {
                borderColor: active ? color : `${color}55`,
                backgroundColor: active ? `${color}20` : 'rgba(255,255,255,0.04)',
                opacity: pressed ? 0.92 : 1,
                shadowColor: active ? color : 'transparent',
              },
            ]}
          >
            <LinearGradient
              colors={[`${color}18`, 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {opt.icon ? (
              <View style={[styles.iconWrap, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
                <Ionicons name={opt.icon as never} size={18} color={color} />
              </View>
            ) : (
              <View style={[styles.iconWrap, { borderColor: `${color}44`, backgroundColor: `${color}10` }]}>
                <View style={[styles.dot, { backgroundColor: color }]} />
              </View>
            )}
            <Text style={styles.label} numberOfLines={2}>
              {opt.label}
            </Text>
            {active ? (
              <View style={[styles.check, { backgroundColor: color }]}>
                <Ionicons name="checkmark" size={12} color="#080A0F" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    width: '100%',
    maxWidth: '100%',
  },
  tile: {
    width: '48%',
    height: TILE_H,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'flex-end',
    position: 'relative',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 0 12px rgba(0,0,0,0.2)' as unknown as number },
    }),
  },
  iconWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    paddingRight: 4,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function assessmentOptionsFitCompactGrid(
  options: { label: string }[] | undefined,
  type: string,
): boolean {
  if (!options || type === 'text' || type === 'weekdays') return false;
  if (options.length > 6) return false;
  return options.every((o) => o.label.length <= 22);
}
