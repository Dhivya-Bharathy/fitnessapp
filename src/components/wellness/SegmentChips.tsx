import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../../theme';
import { softCardShadow } from './wellnessTheme';

export type SegmentChipItem<T extends string> = {
  id: T;
  label: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

interface Props<T extends string> {
  tabs: SegmentChipItem<T>[];
  active: T;
  onChange: (id: T) => void;
  theme: typeof colors.light;
  /** Pill tray with glass background (iOS-style segmented row) */
  variant?: 'chips' | 'segmented';
}

export function SegmentChips<T extends string>({
  tabs,
  active,
  onChange,
  theme,
  variant = 'chips',
}: Props<T>) {
  if (variant === 'segmented') {
    return (
      <View style={[styles.segmentedWrap, { backgroundColor: 'rgba(255,255,255,0.55)' }, softCardShadow()]}>
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const accent = tab.color ?? theme.accent;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onChange(tab.id)}
              activeOpacity={0.85}
              style={[styles.segmentedTab, isActive && { backgroundColor: accent }]}
            >
              {tab.icon ? (
                <Ionicons name={tab.icon} size={14} color={isActive ? '#fff' : theme.textMuted} />
              ) : null}
              <Text
                style={[
                  styles.segmentedLabel,
                  { color: isActive ? '#fff' : theme.textMuted, fontWeight: isActive ? '700' : '600' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const accent = tab.color ?? theme.accent;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.85}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? accent : theme.card,
                borderColor: isActive ? accent : theme.border,
              },
              !isActive && softCardShadow(),
            ]}
          >
            <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '700' },
  segmentedWrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentedLabel: { fontSize: fontSize.xs },
});
