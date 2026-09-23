import { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useAssessmentStore } from '../../store/assessmentStore';
import { useAiCoachStore } from '../../store/aiCoachStore';
import { colors, spacing, fontSize, radius } from '../../theme';
import { generateDemicAssessmentPlan } from '../../services/openai-client';
import { supabase } from '../../services/supabase';

export default function AssessmentResultsScreen() {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const user = useAuthStore((s) => s.user);
  const { answers, result, isGenerating, setGenerating, setResult, setError, error } = useAssessmentStore();
  const setCurrentWorkout = useAiCoachStore((s) => s.clearCurrentWorkout);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGenerating(true);
      setError(null);
      const plan = await generateDemicAssessmentPlan(answers);
      if (cancelled) return;
      setResult(plan);
      setGenerating(false);

      if (user?.id) {
        await supabase.from('profiles').update({
          bio: plan.coach_summary?.slice(0, 500),
          equipment_preferences: plan.workout.demic_story_moves ?? [],
        }).eq('id', user.id);

        try {
          await supabase.from('ai_generated_workouts').insert({
            user_id: user.id,
            title: plan.workout.title,
            description: plan.workout.description,
            duration: plan.workout.duration,
            difficulty: plan.workout.difficulty,
            exercises: plan.workout.exercises,
            warmup: plan.workout.warmup,
            cooldown: plan.workout.cooldown,
            ai_notes: plan.workout.ai_notes,
            is_saved: true,
          });
        } catch {
          /* table may be missing until migration */
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const finish = () => {
    if (result?.workout) {
      useAiCoachStore.setState({ currentWorkout: result.workout, error: null });
    } else {
      setCurrentWorkout();
    }
    useAuthStore.getState().setOnboarding(false);
  };

  if (isGenerating || !result) {
    return (
      <AndroidSafeView backgroundColor={theme.bg} style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>
          Building your plan…
        </Text>
        <Text style={[styles.loadingSub, { color: theme.textSecondary }]}>
          Demic Story–style training + Indian diet via AI
        </Text>
        {error ? <Text style={{ color: '#FF5959', marginTop: spacing.md }}>{error}</Text> : null}
      </AndroidSafeView>
    );
  }

  const { workout, indian_diet_plan, coach_summary, weekly_outline } = result;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[theme.accent + '33', theme.bg]} style={styles.hero}>
          <Ionicons name="sparkles" size={32} color={theme.accent} />
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Your AI plan is ready</Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>{coach_summary}</Text>
        </LinearGradient>

        <Text style={[styles.blockTitle, { color: theme.textPrimary }]}>
          🏋️ Demic Story–style workout
        </Text>
        <Text style={[styles.blockSub, { color: theme.textMuted }]}>
          Inspired by @demicstory calisthenics · {workout.duration} min
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.accent }]}>{workout.title}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{workout.description}</Text>
          {workout.exercises.map((ex, i) => (
            <View key={i} style={styles.exRow}>
              <Text style={[styles.exName, { color: theme.textPrimary }]}>{ex.name}</Text>
              <Text style={[styles.exMeta, { color: theme.textMuted }]}>
                {ex.sets}×{ex.reps} · rest {ex.rest}s
              </Text>
            </View>
          ))}
          {workout.demic_story_moves?.length ? (
            <Text style={[styles.tags, { color: theme.textMuted }]}>
              Focus moves: {workout.demic_story_moves.join(' · ')}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.blockTitle, { color: theme.textPrimary }]}>🇮🇳 Indian diet day</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.accent }]}>{indian_diet_plan.title}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{indian_diet_plan.description}</Text>
          {indian_diet_plan.meals.map((m, i) => (
            <View key={i} style={styles.mealRow}>
              <Text style={[styles.exName, { color: theme.textPrimary }]}>{m.name}</Text>
              <Text style={[styles.exMeta, { color: theme.textMuted }]}>{m.foods.join(', ')}</Text>
              <Text style={[styles.exMeta, { color: theme.textMuted }]}>{m.calories} kcal</Text>
            </View>
          ))}
          {indian_diet_plan.budget_note ? (
            <Text style={[styles.tags, { color: theme.textMuted }]}>{indian_diet_plan.budget_note}</Text>
          ) : null}
        </View>

        {weekly_outline?.length ? (
          <>
            <Text style={[styles.blockTitle, { color: theme.textPrimary }]}>Weekly outline</Text>
            {weekly_outline.map((line, i) => (
              <Text key={i} style={[styles.outline, { color: theme.textSecondary }]}>• {line}</Text>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={finish} activeOpacity={0.85} style={styles.ctaWrap}>
          <LinearGradient colors={[theme.accent, '#0DAE6C']} style={styles.cta}>
            <Text style={styles.ctaText}>Start Fitness App →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingTitle: { fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.lg },
  loadingSub: { fontSize: fontSize.base, marginTop: spacing.sm, textAlign: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  hero: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', marginTop: spacing.sm, textAlign: 'center' },
  heroSub: { fontSize: fontSize.base, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
  blockTitle: { fontSize: fontSize.lg, fontWeight: '800', marginBottom: 4 },
  blockSub: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  workoutName: { fontSize: fontSize.lg, fontWeight: '800', marginBottom: spacing.xs },
  body: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.sm },
  exRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  exName: { fontSize: fontSize.base, fontWeight: '700' },
  exMeta: { fontSize: fontSize.sm, marginTop: 2 },
  mealRow: { marginTop: spacing.sm },
  tags: { fontSize: fontSize.xs, marginTop: spacing.md, fontStyle: 'italic' },
  outline: { fontSize: fontSize.sm, marginBottom: 4, paddingLeft: spacing.sm },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 36 },
  ctaWrap: { borderRadius: 20, overflow: 'hidden' },
  cta: { padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
});
