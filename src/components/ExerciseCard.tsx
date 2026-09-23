import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import type { Exercise } from '../types/ai-coach.types';

interface Props {
  exercise: Exercise;
  index: number;
}

export function ExerciseCard({ exercise, index }: Props) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const [showTips, setShowTips] = useState(false);
  const [showProgression, setShowProgression] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.indexBadge, { backgroundColor: theme.accentDim }]}>
          <Text style={[styles.indexText, { color: theme.accent }]}>{index + 1}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>{exercise.name}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {exercise.sets} × {exercise.reps}  ·  Rest: {exercise.rest}s
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleRow, { borderTopColor: theme.border }]}
        onPress={() => setShowTips(!showTips)}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
        <Text style={[styles.toggleLabel, { color: theme.accent }]}>Form Tips</Text>
        <Ionicons
          name={showTips ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textMuted}
        />
      </TouchableOpacity>

      {showTips && (
        <Text style={[styles.tipContent, { color: theme.textSecondary }]}>
          {exercise.form_tips}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.toggleRow, { borderTopColor: theme.border }]}
        onPress={() => setShowProgression(!showProgression)}
        activeOpacity={0.7}
      >
        <Ionicons name="trending-up-outline" size={18} color={theme.purple} />
        <Text style={[styles.toggleLabel, { color: theme.purple }]}>Progression</Text>
        <Ionicons
          name={showProgression ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textMuted}
        />
      </TouchableOpacity>

      {showProgression && (
        <Text style={[styles.tipContent, { color: theme.textSecondary }]}>
          {exercise.progression}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  meta: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
  },
  toggleLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  tipContent: {
    fontSize: fontSize.base,
    lineHeight: 20,
    paddingTop: spacing.sm,
    paddingLeft: spacing.xl,
  },
});
