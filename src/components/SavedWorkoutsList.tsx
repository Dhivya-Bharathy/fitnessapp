import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useAiCoachStore } from '../store/aiCoachStore';
import { useAuthStore } from '../store/authStore';
import type { GeneratedWorkout } from '../types/ai-coach.types';

interface Props {
  onSelectWorkout: (workout: GeneratedWorkout) => void;
  variant?: 'default' | 'premium';
}

export function SavedWorkoutsList({ onSelectWorkout, variant = 'default' }: Props) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const premium = variant === 'premium';
  const { savedWorkouts, deleteSavedWorkout } = useAiCoachStore();
  const { user } = useAuthStore();

  const handleDelete = (workout: GeneratedWorkout) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (user) deleteSavedWorkout(user.id, workout.id);
        },
      },
    ]);
  };

  if (savedWorkouts.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="fitness-outline" size={48} color={premium ? 'rgba(255,255,255,0.45)' : theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: premium ? '#fff' : theme.textSecondary }]}>
          No saved workouts yet
        </Text>
        <Text style={[styles.emptyDesc, { color: premium ? 'rgba(255,255,255,0.55)' : theme.textMuted }]}>
          Generate a workout and save it to see it here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={savedWorkouts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelectWorkout(item)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={premium ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)'] : [theme.card, theme.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { borderColor: premium ? 'rgba(255,255,255,0.09)' : theme.border }]}
          >
            <View style={styles.cardBody}>
              <Text style={[styles.title, { color: premium ? '#fff' : theme.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {item.duration} min  ·  {item.exercises.length} exercises  ·  Difficulty {item.difficulty}/10
              </Text>
              <Text style={[styles.date, { color: theme.textMuted }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                hitSlop={12}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={20} color={theme.red} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  meta: {
    fontSize: fontSize.md,
    marginTop: 4,
  },
  date: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  actions: {
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
