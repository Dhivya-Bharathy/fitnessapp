import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { assessmentUseNativeDriver, ensureAnimatedValues } from './assessmentAnim';

export type ChoiceOption = {
  value: string;
  label: string;
  icon?: string;
  color?: string;
};

type Props = {
  options: ChoiceOption[];
  selectedValues: string[];
  onPress: (value: string) => void;
  layout: 'quad' | 'grid';
  accent?: string;
  animateKey: number;
};

const DEFAULT_ACCENT = '#2DDC8C';

function tileGlow(active: boolean, color: string) {
  if (!active) return undefined;
  return Platform.select({
    web: { boxShadow: `0 0 14px ${color}55` },
    ios: { shadowColor: color, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: 3 },
    default: {},
  });
}

function Tile({
  opt,
  active,
  color,
  layout,
  onPress,
  anim,
}: {
  opt: ChoiceOption;
  active: boolean;
  color: string;
  layout: 'quad' | 'grid';
  onPress: () => void;
  anim: Animated.Value;
}) {
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const opacity = anim;

  return (
    <Animated.View
      style={[
        layout === 'quad' ? styles.quadCell : styles.gridCell,
        { opacity, transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          layout === 'quad' ? styles.quadTile : styles.gridTile,
          {
            borderColor: active ? color : `${color}55`,
            backgroundColor: active ? `${color}22` : 'rgba(255,255,255,0.04)',
            opacity: pressed ? 0.9 : 1,
          },
          tileGlow(active, color),
        ]}
      >
        <LinearGradient
          colors={[`${color}16`, 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {layout === 'quad' ? (
          <View style={[styles.quadDot, active && { backgroundColor: color, borderColor: color }]}>
            {active ? <View style={styles.quadDotInner} /> : null}
          </View>
        ) : opt.icon ? (
          <View style={[styles.iconWrap, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
            <Ionicons name={opt.icon as never} size={18} color={color} />
          </View>
        ) : (
          <View style={[styles.iconWrap, { borderColor: `${color}44`, backgroundColor: `${color}10` }]}>
            <View style={[styles.dot, { backgroundColor: active ? color : `${color}99` }]} />
          </View>
        )}
        <Text style={styles.label} numberOfLines={layout === 'quad' ? 2 : 3}>
          {opt.label}
        </Text>
        {active && layout === 'grid' ? (
          <View style={[styles.check, { backgroundColor: color }]}>
            <Ionicons name="checkmark" size={12} color="#080A0F" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Animated 2×2 (quad) or 2-column grid for assessment answers. */
export function AssessmentChoiceGrid({
  options,
  selectedValues,
  onPress,
  layout,
  accent = DEFAULT_ACCENT,
  animateKey,
}: Props) {
  const animsRef = useRef<Animated.Value[]>([]);
  const anims = ensureAnimatedValues(animsRef, options.length, 0);

  useEffect(() => {
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      45,
      anims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: assessmentUseNativeDriver,
        }),
      ),
    ).start();
  }, [animateKey, options.length]);

  return (
    <View style={styles.wrap}>
      {options.map((opt, i) => {
        const active = selectedValues.includes(opt.value);
        const color = opt.color ?? accent;
        return (
          <Tile
            key={opt.value}
            opt={opt}
            active={active}
            color={color}
            layout={layout}
            onPress={() => onPress(opt.value)}
            anim={anims[i]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  quadCell: { width: '48%' },
  gridCell: { width: '48%' },
  quadTile: {
    height: 102,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 0 16px rgba(45,220,140,0.08)' },
      default: {},
    }),
  },
  gridTile: {
    height: 88,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  quadDot: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(45,220,140,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quadDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#080A0F',
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
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
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
