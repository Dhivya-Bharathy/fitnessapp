import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import type { FitnessLevel, FitnessGoal, Equipment } from '../types/ai-coach.types';

const FITNESS_LEVELS: { key: FitnessLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const GOALS: { key: FitnessGoal; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', icon: 'barbell-outline' },
  { key: 'endurance', label: 'Endurance', icon: 'heart-outline' },
  { key: 'flexibility', label: 'Flexibility', icon: 'body-outline' },
  { key: 'weight_loss', label: 'Weight Loss', icon: 'flame-outline' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-outline' },
  { key: 'general_fitness', label: 'General', icon: 'walk-outline' },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
  { key: 'body-weight', label: 'Body Weight' },
  { key: 'dumbbells', label: 'Dumbbells' },
  { key: 'barbell', label: 'Barbell' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'bands', label: 'Bands' },
  { key: 'machine', label: 'Machine' },
];

const DURATIONS = [15, 30, 45, 60];

interface Props {
  fitnessLevel: FitnessLevel;
  goals: FitnessGoal[];
  duration: number;
  equipment: Equipment[];
  onChangeLevel: (v: FitnessLevel) => void;
  onToggleGoal: (v: FitnessGoal) => void;
  onChangeDuration: (v: number) => void;
  onToggleEquipment: (v: Equipment) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function WorkoutForm({
  fitnessLevel,
  goals,
  duration,
  equipment,
  onChangeLevel,
  onToggleGoal,
  onChangeDuration,
  onToggleEquipment,
  onGenerate,
  isLoading,
}: Props) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];

  const canGenerate =
    fitnessLevel && goals.length > 0 && duration > 0 && equipment.length > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Fitness Level
      </Text>
      <View style={styles.chipRow}>
        {FITNESS_LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl.key}
            onPress={() => onChangeLevel(lvl.key)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor:
                  fitnessLevel === lvl.key ? theme.accent : theme.card,
                borderColor:
                  fitnessLevel === lvl.key ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    fitnessLevel === lvl.key
                      ? '#fff'
                      : theme.textSecondary,
                },
              ]}
            >
              {lvl.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Goals
      </Text>
      <View style={styles.chipRow}>
        {GOALS.map((g) => {
          const selected = goals.includes(g.key);
          return (
            <TouchableOpacity
              key={g.key}
              onPress={() => onToggleGoal(g.key)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.accent : theme.card,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Ionicons
                name={g.icon as any}
                size={16}
                color={selected ? '#fff' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? '#fff' : theme.textSecondary },
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Duration
      </Text>
      <View style={styles.chipRow}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => onChangeDuration(d)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: duration === d ? theme.accent : theme.card,
                borderColor: duration === d ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: duration === d ? '#fff' : theme.textSecondary },
              ]}
            >
              {d} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Equipment
      </Text>
      <View style={styles.chipRow}>
        {EQUIPMENT_OPTIONS.map((eq) => {
          const selected = equipment.includes(eq.key);
          return (
            <TouchableOpacity
              key={eq.key}
              onPress={() => onToggleEquipment(eq.key)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.accent : theme.card,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? '#fff' : theme.textSecondary },
                ]}
              >
                {eq.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={onGenerate}
        disabled={!canGenerate || isLoading}
        activeOpacity={0.8}
        style={[
          styles.generateBtn,
          {
            backgroundColor: canGenerate ? theme.accent : theme.border,
            opacity: isLoading ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="sparkles-outline" size={20} color="#fff" />
        <Text style={styles.generateBtnText}>
          {isLoading ? 'Generating...' : 'Generate Workout'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.huge,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
});
