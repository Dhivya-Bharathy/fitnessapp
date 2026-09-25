import { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { PrimaryCTA } from '../../components/onboarding/PrimaryCTA';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useAssessmentStore } from '../../store/assessmentStore';
import { useAiCoachStore } from '../../store/aiCoachStore';
import { colors, spacing, fontSize, radius } from '../../theme';
import { generateDemicAssessmentPlan, countAnsweredQuestions } from '../../services/openai-client';
import { supabase } from '../../services/supabase';
import { mergeAssessmentDonePrefs, setLocalAssessmentComplete } from '../../utils/onboardingFlags';
import { MOTIVATIONAL_LINES } from '../../data/fitnessAssessmentQuestions';
import { clearAssessmentPersistence } from '../../utils/assessmentPersistence';
import { Image } from 'react-native';

export default function AssessmentResultsScreen() {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { result, isGenerating, setGenerating, setResult, setError, error, planFromAi } = useAssessmentStore();
  const setCurrentWorkout = useAiCoachStore((s) => s.clearCurrentWorkout);

  const runGeneration = useCallback(async () => {
    const snapshot = useAssessmentStore.getState().answers;
    setGenerating(true);
    setError(null);
    setResult(null, false);

    try {
      const plan = await generateDemicAssessmentPlan(snapshot);
      setResult(plan, true);
      setGenerating(false);

      if (user?.id) {
        await setLocalAssessmentComplete(user.id);
        useAuthStore.getState().setOnboarding(false);
        await supabase.from('profiles').update({
          bio: plan.coach_summary?.slice(0, 500),
          equipment_preferences: plan.workout.focus_moves ?? plan.workout.demic_story_moves ?? [],
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
    } catch (e) {
      setGenerating(false);
      setError(e instanceof Error ? e.message : 'Could not generate plan');
    }
  }, [setError, setGenerating, setResult, user?.id]);

  useEffect(() => {
    runGeneration();
  }, [runGeneration]);

  const finish = async () => {
    if (result?.workout) {
      useAiCoachStore.setState({ currentWorkout: result.workout, error: null });
    } else {
      setCurrentWorkout();
    }
    if (user?.id) {
      await setLocalAssessmentComplete(user.id);
      const tracking_preferences = mergeAssessmentDonePrefs(profile?.tracking_preferences);
      await supabase.from('profiles').update({ tracking_preferences }).eq('id', user.id);
      updateProfile({ tracking_preferences });
    }
    await clearAssessmentPersistence();
    useAssessmentStore.getState().reset();
    const { persistForceAssessmentRetake } = await import('../../utils/onboardingFlags');
    await persistForceAssessmentRetake(false);
    useAuthStore.getState().setForceAssessmentRetake(false);
    useAuthStore.getState().setOnboarding(false);
  };

  if (error && !result && !isGenerating) {
    const answered = countAnsweredQuestions(useAssessmentStore.getState().answers);
    return (
      <StickyFooterLayout
        backgroundColor={theme.bg}
        footer={<PrimaryCTA label="Try again" onPress={runGeneration} />}
      >
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.accent} />
          <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>AI plan not generated</Text>
          <Text style={[styles.errorText, { color: '#FF5959' }]}>{error}</Text>
          <Text style={[styles.loadingSub, { color: theme.textSecondary }]}>
            {answered} answers saved on this device — tap Try again after fixing the issue above.
            {'\n\n'}
            On Netlify: add OPENAI_API_KEY under Site configuration → Environment variables, redeploy, then Try again.
            {'\n\n'}
            Local Expo: npm run proxy:ai on your PC, same Wi‑Fi as your phone.
          </Text>
        </View>
      </StickyFooterLayout>
    );
  }

  if (isGenerating || !result) {
    return (
      <AndroidSafeView backgroundColor={theme.bg} style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>
          Building your plan…
        </Text>
        <Text style={[styles.loadingSub, { color: theme.textSecondary }]}>
          Reading your {countAnsweredQuestions(useAssessmentStore.getState().answers)} answers → OpenAI
        </Text>
      </AndroidSafeView>
    );
  }

  const { workout, indian_diet_plan, coach_summary, weekly_outline } = result;
  const focusMoves = workout.focus_moves ?? workout.demic_story_moves;
  const tagline = MOTIVATIONAL_LINES[Math.abs(coach_summary.length) % MOTIVATIONAL_LINES.length];

  return (
    <StickyFooterLayout
      backgroundColor={theme.bg}
      footer={<PrimaryCTA label="Start Fitness App" onPress={finish} />}
    >
      <View style={styles.scrollInner}>
        <View style={styles.heroImageWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient colors={['transparent', theme.bg]} style={styles.heroImageFade} />
        </View>
        <LinearGradient colors={[theme.accent + '33', theme.bg]} style={styles.hero}>
          <Ionicons name="sparkles" size={32} color={theme.accent} />
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Your AI plan is ready</Text>
          {planFromAi ? (
            <Text style={[styles.aiBadge, { color: theme.accent, borderColor: theme.accent }]}>
              Personalized from your 22 answers
            </Text>
          ) : null}
          <Text style={[styles.heroTag, { color: theme.accent }]}>{tagline}</Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>{coach_summary}</Text>
        </LinearGradient>

        <Text style={[styles.blockTitle, { color: theme.textPrimary }]}>
          🏋️ AI training session
        </Text>
        <Text style={[styles.blockSub, { color: theme.textMuted }]}>
          {workout.duration} min · built from your answers
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
          {focusMoves?.length ? (
            <Text style={[styles.tags, { color: theme.textMuted }]}>
              Key focus: {focusMoves.join(' · ')}
            </Text>
          ) : null}
          {workout.ai_notes ? (
            <Text style={[styles.motivate, { color: theme.textSecondary }]}>{workout.ai_notes}</Text>
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
      </View>
    </StickyFooterLayout>
  );
}

const styles = StyleSheet.create({
  scrollInner: { paddingTop: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingTitle: { fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.lg },
  loadingSub: { fontSize: fontSize.base, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md },
  errorWrap: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md },
  aiBadge: {
    marginTop: spacing.sm, fontSize: fontSize.xs, fontWeight: '700',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  heroImageWrap: { height: 160, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md },
  heroImage: { width: '100%', height: '100%' },
  heroImageFade: { ...StyleSheet.absoluteFillObject },
  hero: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', marginTop: spacing.sm, textAlign: 'center' },
  heroTag: { fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  heroSub: { fontSize: fontSize.base, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
  motivate: { fontSize: fontSize.sm, marginTop: spacing.md, lineHeight: 20, fontStyle: 'italic' },
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
});
