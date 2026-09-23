import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Dimensions, Platform,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import Svg from 'react-native-svg';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { getExerciseIllustration } from '../../components/ExerciseIllustrations';
import AnimatedExerciseDemo from '../../components/AnimatedExerciseDemo';
import { EXERCISE_LIBRARY, CATEGORY_MAP, getExercisesByCategory } from '../../data/exerciseLibrary';
import type { ExerciseCategory } from '../../data/exerciseLibrary';
import { useWorkoutVoice } from '../../hooks/useWorkoutVoice';

const { width: SW } = Dimensions.get('window');

interface QuickExercise {
  id: string;
  name: string;
  duration: number;
  calories_per_minute: number;
  seconds: number;
  calories_burned: number;
  done: boolean;
  category: ExerciseCategory;
  instructions: string[];
  equipment: string;
  difficulty: string;
  sets?: number;
  reps?: string;
  rest?: number;
  form_tips?: string;
}

const DEFAULT_CATEGORY: ExerciseCategory = 'Full Body';

const SPEAK_TRIGGER = {
  TEN_LEFT: 11,
  FIVE_FOUR: 6,
};

export default function QuickStartScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];

  const { speak, stop: stopSpeech, voiceName } = useWorkoutVoice();

  const category: ExerciseCategory = route.params?.category ?? DEFAULT_CATEGORY;
  const catMeta = CATEGORY_MAP[category];

  // Support custom exercises passed from AI Coach
  const customExercises: { name: string; sets: number; reps: string; rest: number; form_tips: string }[] = route.params?.exercises ?? [];

  const isAiWorkout = customExercises.length > 0;

  const categoryExercises = getExercisesByCategory(category);
  const defaultExercises = isAiWorkout
    ? customExercises.map((e, i) => ({
        id: `ai-ex-${i}`, name: e.name, category: category as ExerciseCategory,
        defaultDuration: 0, caloriesPerMinute: 7,
        difficulty: 'beginner' as const, muscleGroups: [],
        equipment: 'None', instructions: [e.form_tips, `Sets: ${e.sets} | Reps: ${e.reps} | Rest: ${e.rest}s`],
        sets: e.sets, reps: e.reps, rest: e.rest, form_tips: e.form_tips,
      }))
    : (categoryExercises.length > 0 ? categoryExercises : EXERCISE_LIBRARY.filter(e => e.category === DEFAULT_CATEGORY));

  const [exercises, setExercises] = useState<QuickExercise[]>(
    defaultExercises.map((e: any) => ({
      id: e.id, name: e.name, duration: e.defaultDuration,
      calories_per_minute: e.caloriesPerMinute, seconds: 0,
      calories_burned: 0, done: false, category: e.category,
      instructions: e.instructions, equipment: e.equipment, difficulty: e.difficulty,
      sets: e.sets, reps: e.reps, rest: e.rest, form_tips: e.form_tips,
    }))
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [exerciseSecondsLeft, setExerciseSecondsLeft] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initState = useCallback(() => {
    const cat: ExerciseCategory = route.params?.category ?? DEFAULT_CATEGORY;
    const customEx: { name: string; sets: number; reps: string; rest: number; form_tips: string }[] = route.params?.exercises ?? [];
    const isAi = customEx.length > 0;
    const catEx = getExercisesByCategory(cat);
    const defEx = isAi
      ? customEx.map((e, i) => ({
          id: `ai-ex-${i}`, name: e.name, category: cat,
          defaultDuration: 0, caloriesPerMinute: 7,
          difficulty: 'beginner' as const, muscleGroups: [],
          equipment: 'None', instructions: [e.form_tips, `Sets: ${e.sets} | Reps: ${e.reps} | Rest: ${e.rest}s`],
          sets: e.sets, reps: e.reps, rest: e.rest, form_tips: e.form_tips,
        }))
      : (catEx.length > 0 ? catEx : EXERCISE_LIBRARY.filter(e => e.category === DEFAULT_CATEGORY));
    setExercises(defEx.map((e: any) => ({
      id: e.id, name: e.name, duration: e.defaultDuration || 0,
      calories_per_minute: e.caloriesPerMinute || 7, seconds: 0,
      calories_burned: 0, done: false, category: e.category,
      instructions: e.instructions, equipment: e.equipment, difficulty: e.difficulty,
      sets: e.sets, reps: e.reps, rest: e.rest, form_tips: e.form_tips,
    })));
    setActiveIndex(-1);
    setWorkoutSeconds(0);
    setWorkoutStarted(false);
    setExerciseSecondsLeft(0);
    setShowComplete(false);
  }, [route.params?.category, route.params?.exercises]);

  useEffect(() => {
    initState();
    return () => {
      stopSpeech();
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [initState]);

  useFocusEffect(useCallback(() => {
    setShowComplete(false);
    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, []));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
  };

  const totalWorkoutTime = () => {
    const hrs = Math.floor(workoutSeconds / 3600);
    const mins = Math.floor((workoutSeconds % 3600) / 60);
    const secs = workoutSeconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min ${secs}s`;
    return `${secs}s`;
  };

  const handleBack = () => {
    if (workoutStarted) {
      Alert.alert('Leave workout?', 'Your progress will not be saved.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { stopSpeech(); navigation.goBack(); } },
      ]);
    } else {
      stopSpeech();
      navigation.goBack();
    }
  };

  const startExercise = (index: number) => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);

    if (!workoutStarted) {
      setWorkoutStarted(true);
      speak(`Starting ${catMeta?.label || category} workout. Let's go!`);
      workoutTimerRef.current = setInterval(() => setWorkoutSeconds(p => p + 1), 1000);
    }

    setActiveIndex(index);
    const ex = exercises[index];
    setExerciseSecondsLeft(ex.duration || 0);

    if (isAiWorkout && ex.sets && ex.reps) {
      speak(`Starting ${ex.name}. ${ex.sets} sets of ${ex.reps}.`);
    } else if (ex.duration > 0) {
      speak(`Starting ${ex.name}. ${ex.duration} seconds. Go!`);
      exerciseTimerRef.current = setInterval(() => {
        setExerciseSecondsLeft(prev => {
          if (prev === SPEAK_TRIGGER.TEN_LEFT) speak('Ten seconds left! Push through!');
          if (prev === SPEAK_TRIGGER.FIVE_FOUR) speak('5, 4, 3, 2, 1');
          if (prev <= 1) {
            clearInterval(exerciseTimerRef.current!);
            completeExercise(index);
            return 0;
          }
          return prev - 1;
        });
        setExercises(prev => prev.map((ex, i) => {
          if (i !== index) return ex;
          const ns = ex.seconds + 1;
          return { ...ex, seconds: ns, calories_burned: Math.round((ex.calories_per_minute / 60) * ns) };
        }));
      }, 1000);
    }
  };

  const completeExercise = (index: number) => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, done: true } : ex));
    setActiveIndex(-1);
    setExerciseSecondsLeft(0);

    const nextIndex = index + 1;
    if (nextIndex < exercises.length) {
      speak(`${exercises[index].name} complete! Next up: ${exercises[nextIndex].name} in 3 seconds.`);
      setTimeout(() => startExercise(nextIndex), 3000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      speak('All exercises complete! Great work!');
      setShowComplete(true);
    }
  };

  const finishWorkout = async () => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    stopSpeech();

    const totalCal = exercises.reduce((sum, ex) => sum + ex.calories_burned, 0);

    if (user?.id) {
      try {
        const { supabase } = await import('../../services/supabase');
        await supabase.from('workout_sessions').insert({
          user_id: user.id, name: `${catMeta?.label || category} Workout`, status: 'completed',
          duration_seconds: workoutSeconds, calories_burned: totalCal,
          completed_at: new Date().toISOString(),
          exercises: exercises.map(ex => ({ name: ex.name, seconds: ex.seconds, calories: ex.calories_burned })),
        });
        const { notifyWorkoutComplete } = await import('../../services/notificationService');
        await notifyWorkoutComplete(user.id, `${catMeta?.label || category} Workout`, totalCal, workoutSeconds);
      } catch {}
    }

    navigation.navigate('Activity');
  };

  const totalCalories = isAiWorkout
    ? Math.round(workoutSeconds * exercises.reduce((s, e) => s + e.calories_per_minute, 0) / exercises.length / 60)
    : Math.round(exercises.reduce((sum, ex) => sum + ex.calories_burned, 0));
  const completedCount = exercises.filter(e => e.done).length;
  const progress = exercises.length > 0 ? completedCount / exercises.length : 0;

  const activeExercise = activeIndex >= 0 ? exercises[activeIndex] : null;
  const activeExerciseData = activeExercise
    ? EXERCISE_LIBRARY.find(e => e.id === activeExercise.id) ?? null
    : null;
  const catColor = catMeta?.color ?? theme.accent;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {catMeta?.label || category} Workout
          </Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {completedCount} of {exercises.length} done
          </Text>
        </View>
        <View style={[styles.workoutBadge, { backgroundColor: workoutStarted ? catColor + '22' : theme.border }]}>
          <Ionicons name="flame" size={14} color={workoutStarted ? catColor : theme.textMuted} />
          <Text style={[styles.workoutBadgeText, { color: workoutStarted ? catColor : theme.textMuted }]}>{totalCalories}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
        <LinearGradient
          colors={[catColor, catColor + 'CC'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as unknown as number }]}
        />
      </View>

      {/* Timer stats */}
      <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{formatTime(workoutSeconds)}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>elapsed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="flame-outline" size={16} color="#FF6B35" />
          <Text style={[styles.statValue, { color: '#FF6B35' }]}>{totalCalories}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>kcal</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle-outline" size={16} color={catColor} />
          <Text style={[styles.statValue, { color: catColor }]}>{completedCount}/{exercises.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>done</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active exercise banner */}
        {activeExercise && activeExerciseData && !isAiWorkout && (
          <AnimatedExerciseDemo
            exercise={activeExerciseData}
            isActive={activeIndex >= 0}
            secondsLeft={exerciseSecondsLeft}
          />
        )}
        {activeExercise && isAiWorkout && (
          <View style={[styles.exCard, {
            backgroundColor: catColor + '15',
            borderColor: catColor,
            borderWidth: 1.5,
            marginBottom: 16,
            paddingLeft: 20,
          }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8}}>
              <View style={[styles.exIllusWrap, {backgroundColor: catColor + '20'}]}>
                <Svg width={40} height={40} viewBox="0 0 100 100">
                  {(() => {
                    const IllusComp = getExerciseIllustration(activeExercise.name || category);
                    return <IllusComp color={catColor} />;
                  })()}
                </Svg>
              </View>
              <View style={{flex: 1}}>
                <Text style={[styles.exName, {color: theme.textPrimary, fontSize: 18, fontWeight: '700'}]}>
                  {activeExercise.name}
                </Text>
                <Text style={[styles.exMeta, {color: catColor, fontSize: 14}]}>
                  {activeExercise.sets && activeExercise.reps
                    ? `${activeExercise.sets} sets × ${activeExercise.reps}`
                    : ''}
                  {activeExercise.rest ? `  ·  Rest ${activeExercise.rest}s` : ''}
                </Text>
                {activeExercise.form_tips && (
                  <Text style={[styles.exMeta, {color: theme.textMuted, fontSize: 12, marginTop: 4}]}>
                    💡 {activeExercise.form_tips}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => completeExercise(activeIndex)}
              style={[{
                backgroundColor: catColor,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 8,
                marginBottom: 8,
              }]}>
              <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>
                Done with this exercise
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!activeExercise && !showComplete && (
          <View style={[styles.categoryBadgeWrap]}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '15' }]}>
              <Svg width={20} height={20} viewBox="0 0 100 100">
                {(() => {
                  const IllusComp = getExerciseIllustration(category);
                  return <IllusComp color={catColor} />;
                })()}
              </Svg>
              <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                {catMeta?.label || category} · {exercises.length} exercises
              </Text>
            </View>
          </View>
        )}

        {/* Exercise list */}
        {exercises.map((ex, i) => {
          const isActive = i === activeIndex;
          const isDone = ex.done;

          return (
            <TouchableOpacity key={ex.id}
              onPress={() => { if (!isDone && !isActive && !workoutStarted) startExercise(i); }}
              activeOpacity={0.8}
              style={[styles.exCard, {
                backgroundColor: isDone ? catColor + '08' : isActive ? catColor + '10' : theme.card,
                borderColor: isDone ? catColor : isActive ? catColor : theme.border,
                borderWidth: isActive ? 1.5 : 1,
              }]}>
              <View style={[styles.exIllusWrap, { backgroundColor: catColor + '12' }]}>
                <Svg width={36} height={36} viewBox="0 0 100 100">
                  {(() => {
                    const IllusComp = getExerciseIllustration(ex.category);
                    return <IllusComp color={catColor} />;
                  })()}
                </Svg>
              </View>
              <View style={styles.exInfo}>
                <Text style={[styles.exName, { color: isDone ? catColor : theme.textPrimary }]}>{ex.name}</Text>
                <Text style={[styles.exMeta, { color: theme.textMuted }]}>
                  {ex.sets && ex.reps ? `${ex.sets} sets × ${ex.reps}${ex.rest ? ` · Rest ${ex.rest}s` : ''}` : `${formatDuration(ex.duration)} · ${ex.calories_per_minute} kcal/min`}
                </Text>
                {ex.seconds > 0 && (
                  <Text style={[styles.exProgressText, { color: catColor }]}>
                    {formatTime(ex.seconds)} · {ex.calories_burned} kcal
                  </Text>
                )}
              </View>
              <View style={styles.exActions}>
                {isDone ? (
                  <View style={[styles.exDoneBadge, { backgroundColor: catColor }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : isActive ? (
                  <TouchableOpacity onPress={() => completeExercise(i)}
                    style={[styles.exDoneBtn, { backgroundColor: catColor }]}>
                    <Text style={styles.exDoneBtnText}>Skip</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => startExercise(i)}
                    style={[styles.exStartBtn, { borderColor: catColor }]}>
                    <Ionicons name="play" size={12} color={catColor} />
                    <Text style={[styles.exStartBtnText, { color: catColor }]}>Start</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Complete button */}
        {completedCount > 0 && !showComplete && (
          <TouchableOpacity onPress={finishWorkout} activeOpacity={0.85}
            style={[styles.completeWrap, Platform.select({ ios: { shadowColor: catColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 6 }, web: { boxShadow: `0 4px 10px ${catColor}4D` } })]}>
            <LinearGradient
              colors={[catColor, catColor + 'CC'] as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.completeBtn}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.completeBtnText}>Complete Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Complete modal — outside ScrollView so absolute positioning works */}
      {showComplete && (
        <View style={styles.completeOverlay}>
          <LinearGradient colors={[theme.heroCard, '#1a1a2e'] as [string, string]}
            style={styles.completeCard}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeTitle}>Workout Complete!</Text>
            <Text style={styles.completeSub}>You crushed your {catMeta?.label || category} workout!</Text>
            <View style={styles.completeStats}>
              <View style={styles.completeStat}>
                <Ionicons name="time-outline" size={20} color="#fff" />
                <Text style={styles.completeStatValue}>{totalWorkoutTime()}</Text>
                <Text style={styles.completeStatLabel}>Duration</Text>
              </View>
              <View style={styles.completeStat}>
                <Ionicons name="flame" size={20} color="#FF6B35" />
                <Text style={[styles.completeStatValue, { color: '#FF6B35' }]}>{totalCalories}</Text>
                <Text style={styles.completeStatLabel}>Calories</Text>
              </View>
              <View style={styles.completeStat}>
                <Ionicons name="barbell-outline" size={20} color={catColor} />
                <Text style={[styles.completeStatValue, { color: catColor }]}>{exercises.length}</Text>
                <Text style={styles.completeStatLabel}>Exercises</Text>
              </View>
            </View>
            <TouchableOpacity onPress={finishWorkout} activeOpacity={0.85}
              style={[styles.completeDoneBtn, { backgroundColor: catColor }]}>
              <Text style={styles.completeDoneBtnText}>Back to Activity</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: fontSize.xs, marginTop: 1 },
  workoutBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 99 },
  workoutBadgeText: { fontSize: fontSize.xs, fontWeight: '800' },

  progressBg: { height: 3, marginHorizontal: spacing.lg, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: 2 },

  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.sm, borderRadius: 14, borderWidth: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  statLabel: { fontSize: 9, fontWeight: '600' },

  scrollContent: { paddingBottom: 120, paddingTop: spacing.xs },

  categoryBadgeWrap: { alignItems: 'center', marginBottom: spacing.md },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  categoryBadgeText: { fontSize: fontSize.sm, fontWeight: '700' },

  exCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: 14, overflow: 'hidden' },
  exIllusWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exInfo: { flex: 1 },
  exName: { fontSize: fontSize.base, fontWeight: '700', letterSpacing: -0.2 },
  exMeta: { fontSize: fontSize.xs, marginTop: 2 },
  exProgressText: { fontSize: fontSize.xs, fontWeight: '700', marginTop: 4 },
  exActions: { flexShrink: 0 },
  exDoneBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  exDoneBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  exDoneBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '800' },
  exStartBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5 },
  exStartBtnText: { fontSize: fontSize.xs, fontWeight: '700' },

  completeWrap: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: 16, overflow: 'hidden' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  completeBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800', letterSpacing: 0.3 },

  completeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', padding: spacing.lg },
  completeCard: { borderRadius: 24, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  completeEmoji: { fontSize: 48 },
  completeTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  completeSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  completeStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
  completeStat: { alignItems: 'center', gap: 4 },
  completeStatValue: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  completeStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  completeDoneBtn: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 14, marginTop: spacing.sm },
  completeDoneBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },
});
