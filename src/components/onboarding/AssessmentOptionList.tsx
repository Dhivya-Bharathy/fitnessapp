import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Pressable, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing } from '../../theme';
import { assessmentUseNativeDriver, ensureAnimatedValues } from './assessmentAnim';

const ACCENT = '#2DDC8C';

type Opt = { value: string; label: string; icon?: string };

type Props = {
  options: Opt[];
  selectedValues: string[];
  onPress: (value: string) => void;
  multi?: boolean;
  animateKey: number;
};

export function AssessmentOptionList({
  options,
  selectedValues,
  onPress,
  multi,
  animateKey,
}: Props) {
  const animsRef = useRef<Animated.Value[]>([]);
  const anims = ensureAnimatedValues(animsRef, options.length, 0);

  useEffect(() => {
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      35,
      anims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 280,
          useNativeDriver: assessmentUseNativeDriver,
        }),
      ),
    ).start();
  }, [animateKey, options.length]);

  return (
    <View style={styles.wrap}>
      {options.map((opt, i) => {
        const selected = selectedValues.includes(opt.value);
        const anim = anims[i];
        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
        return (
          <Animated.View key={opt.value} style={{ opacity: anim, transform: [{ translateX }] }}>
            <Pressable
              onPress={() => onPress(opt.value)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              {opt.icon ? (
                <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                  <Ionicons name={opt.icon as never} size={18} color={ACCENT} />
                </View>
              ) : (
                <View style={[styles.bullet, selected && styles.bulletActive]} />
              )}
              <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={3}>
                {opt.label}
              </Text>
              {selected ? (
                <Ionicons name={multi ? 'checkbox' : 'checkmark-circle'} size={22} color={ACCENT} />
              ) : (
                <Ionicons name={multi ? 'square-outline' : 'ellipse-outline'} size={22} color="rgba(255,255,255,0.25)" />
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 48,
    ...Platform.select({
      web: { boxShadow: '0 0 12px rgba(0,0,0,0.15)' },
      default: {},
    }),
  },
  rowActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(45,220,140,0.12)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconWrapActive: { backgroundColor: 'rgba(45,220,140,0.2)' },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bulletActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  label: {
    flex: 1,
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 18,
  },
  labelActive: { color: ACCENT },
});
