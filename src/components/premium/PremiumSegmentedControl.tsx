import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing, radius } from '../../theme';
import {
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from './premiumEffects';

export type PremiumSegmentOption<T extends string> = {
  id: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props<T extends string> = {
  options: PremiumSegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
};

export function PremiumSegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View
      style={[
        styles.wrap,
        premiumGlassShadow(),
        { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.88}
            onPress={() => onChange(opt.id)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {opt.icon ? (
              <Ionicons name={opt.icon} size={16} color={active ? PREMIUM_ACCENT : PREMIUM_MUTED} />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: 'rgba(45,220,140,0.14)',
    borderColor: 'rgba(45,220,140,0.45)',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: PREMIUM_MUTED,
  },
  labelActive: {
    color: PREMIUM_TEXT,
    fontWeight: '800',
  },
});
