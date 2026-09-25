import type { ComponentProps } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Dimensions, Image, Platform,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import Svg, { Circle } from 'react-native-svg';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { ExerciseThumbnail } from '../../components/ExerciseThumbnail';
import { getExerciseImageUrl } from '../../utils/exerciseImages';
import AnimatedExerciseDemo from '../../components/AnimatedExerciseDemo';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';
import { EXERCISE_LIBRARY, CATEGORY_MAP, getExercisesByCategory } from '../../data/exerciseLibrary';
import type { ExerciseCategory } from '../../data/exerciseLibrary';
import { useWorkoutVoice } from '../../hooks/useWorkoutVoice';

const { width: SW } = Dimensions.get('window');
const PURPLE = '#B280FF';
const TIMER_RING = 132;
const RATING_OPTIONS = [
  { id: 'easy', label: 'Easy', emoji: '🙂', color: '#FFD166' },
  { id: 'moderate', label: 'Moderate', emoji: '😊', color: PREMIUM_ACCENT },
  { id: 'challenging', label: 'Challenging', emoji: '😤', color: '#FF8C42' },
  { id: 'hard', label: 'Hard', emoji: '😰', color: '#FF5959' },
] as const;

const CATEGORY_COACH_TIPS: Partial<Record<ExerciseCategory, string>> = {
  'Full Body': 'This routine hits every major muscle group — great for strength and conditioning in one session.',
  Cardio: 'Keep your heart rate up and land softly. Short bursts beat long slow sessions for fat burn.',
  Chest: 'Control the eccentric — lower slowly, press with intent. Shoulders stay packed.',
  Legs: 'Drive through your heels and keep your chest tall on squats and lunges.',
  Core: 'Brace like someone is about to poke your stomach — quality reps over speed.',
};

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

function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

function PerfRow({
  icon,
  color,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.perfRow}>
      <View style={[styles.perfIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.perfLabel}>{label}</Text>
      <Text style={[styles.perfValue, { color: PREMIUM_TEXT }]}>{value}</Text>
    </View>
  );
}

export default function QuickStartScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

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
      id: e.id, name: e.name, duration: e.defaultDuration || 30,
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
  const [demoPaused, setDemoPaused] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState<string | null>(null);
  const [overviewExpandedIndex, setOverviewExpandedIndex] = useState<number | null>(null);
  const [previewDemoPaused, setPreviewDemoPaused] = useState(false);

  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceMutedRef = useRef(false);
  const pausedRef = useRef(false);

  const speakWorkout = useCallback((text: string) => {
    if (!voiceMutedRef.current) speak(text);
  }, [speak]);

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
    setIsPaused(false);
    setRestSeconds(0);
    setDifficultyRating(null);
    setOverviewExpandedIndex(null);
    setPreviewDemoPaused(false);
    pausedRef.current = false;
  }, [route.params?.category, route.params?.exercises]);

  useEffect(() => {
    initState();
    return () => {
      stopSpeech();
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
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

  const clearWorkoutTimers = () => {
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
  };

  const navigateBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Activity');
  };

  const handleBack = () => {
    const exit = () => {
      clearWorkoutTimers();
      stopSpeech();
      navigateBack();
    };
    if (workoutStarted && !showComplete) {
      confirmAction('Leave workout?', 'Your progress will not be saved.', 'Leave', exit);
    } else {
      exit();
    }
  };

  /** One control: stop voice + animation (+ pause timer when workout is live). */
  const stopMediaPlayback = (pauseTimer = workoutStarted) => {
    stopSpeech();
    setDemoPaused(true);
    setPreviewDemoPaused(true);
    if (pauseTimer) {
      pausedRef.current = true;
      setIsPaused(true);
    }
  };

  const startExercise = (index: number) => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);

    if (!workoutStarted) {
      setWorkoutStarted(true);
      speakWorkout(`Starting ${catMeta?.label || category} workout. Let's go!`);
      workoutTimerRef.current = setInterval(() => {
        if (!pausedRef.current) setWorkoutSeconds(p => p + 1);
      }, 1000);
    }

    setActiveIndex(index);
    setDemoPaused(false);
    setIsPaused(false);
    pausedRef.current = false;
    setRestSeconds(0);
    const ex = exercises[index];
    setExerciseSecondsLeft(ex.duration || 0);

    if (isAiWorkout && ex.sets && ex.reps) {
      speakWorkout(`Starting ${ex.name}. ${ex.sets} sets of ${ex.reps}.`);
    } else if (ex.duration > 0) {
      speakWorkout(`Starting ${ex.name}. ${ex.duration} seconds. Go!`);
      exerciseTimerRef.current = setInterval(() => {
        if (pausedRef.current) return;
        setExerciseSecondsLeft(prev => {
          if (prev === SPEAK_TRIGGER.TEN_LEFT) speakWorkout('Ten seconds left! Push through!');
          if (prev === SPEAK_TRIGGER.FIVE_FOUR) speakWorkout('5, 4, 3, 2, 1');
          if (prev <= 1) {
            clearInterval(exerciseTimerRef.current!);
            completeExercise(index);
            return 0;
          }
          return prev - 1;
        });
        if (!pausedRef.current) {
          setExercises(prev => prev.map((ex, i) => {
            if (i !== index) return ex;
            const ns = ex.seconds + 1;
            return { ...ex, seconds: ns, calories_burned: Math.round((ex.calories_per_minute / 60) * ns) };
          }));
        }
      }, 1000);
    }
  };

  const beginRestThenNext = (index: number, nextIndex: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestSeconds(3);
    speakWorkout(`${exercises[index].name} complete! Next up: ${exercises[nextIndex].name} in 3 seconds.`);
    restTimerRef.current = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          startExercise(nextIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeExercise = (index: number) => {
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, done: true } : ex));
    setExerciseSecondsLeft(0);

    const nextIndex = index + 1;
    if (nextIndex < exercises.length) {
      beginRestThenNext(index, nextIndex);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      speakWorkout('All exercises complete! Great work!');
      setShowComplete(true);
    }
  };

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setIsPaused(next);
    setDemoPaused(next);
  };

  const previewExerciseVoice = (index: number) => {
    const ex = exercises[index];
    const lib = EXERCISE_LIBRARY.find(e => e.id === ex.id);
    const cue = lib?.instructions?.[0] ?? ex.form_tips ?? `Starting ${ex.name}. ${formatDuration(ex.duration)}. Focus on form.`;
    speakWorkout(cue);
  };

  const startFromOverview = (index: number) => {
    setOverviewExpandedIndex(null);
    startExercise(index);
  };

  const persistWorkout = async () => {
    const totalCal = isAiWorkout
      ? Math.round(workoutSeconds * exercises.reduce((s, e) => s + e.calories_per_minute, 0) / exercises.length / 60)
      : Math.round(exercises.reduce((sum, ex) => sum + ex.calories_burned, 0));

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
    return totalCal;
  };

  const finishWorkout = async (dest?: 'Analysis') => {
    clearWorkoutTimers();
    stopSpeech();
    await persistWorkout();
    if (dest === 'Analysis') navigation.navigate('Analysis');
    else navigation.navigate('Activity');
  };

  const startWorkoutOverview = () => {
    const first = exercises.findIndex(e => !e.done);
    startExercise(first >= 0 ? first : 0);
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
  const catColor = catMeta?.color ?? PREMIUM_ACCENT;

  const estDurationSec = exercises.reduce((s, e) => s + (e.duration || 30), 0);
  const estMinutes = Math.max(1, Math.round(estDurationSec / 60));
  const exerciseKcalEst = (ex: QuickExercise) =>
    Math.max(1, Math.round((ex.calories_per_minute * (ex.duration || 30)) / 60));
  const avgPaceSec = exercises.length ? Math.round(estDurationSec / exercises.length) : 0;
  const coachTip = CATEGORY_COACH_TIPS[category] ?? 'Focus on form, breathe steadily, and stop if anything hurts.';
  const inOverview = !workoutStarted && activeIndex < 0 && !showComplete;
  const inActive = workoutStarted && !showComplete;
  const ringProgress = activeExercise && activeExercise.duration > 0 && exerciseSecondsLeft > 0
    ? 1 - exerciseSecondsLeft / activeExercise.duration
    : 0;
  const ringRadius = (TIMER_RING - 10) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={{ flex: 1 }}>
      <PremiumAtmosphereBackground />
      <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { zIndex: 30 }]}
        >
          <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {catMeta?.label || category} Workout
          </Text>
          <Text style={styles.headerSub}>
            {inOverview
              ? `${exercises.length} exercises · ~${estMinutes} min`
              : `${completedCount} of ${exercises.length} done`}
          </Text>
        </View>
        {inActive ? (
          <TouchableOpacity
            onPress={() => stopMediaPlayback(true)}
            accessibilityRole="button"
            accessibilityLabel="Stop voice and animation"
            style={[styles.headerStopBtn, { borderColor: '#FF595955', backgroundColor: '#FF595918' }]}
          >
            <Ionicons name="stop-circle" size={20} color="#FF5959" />
            <Text style={styles.headerStopText}>Stop</Text>
          </TouchableOpacity>
        ) : null}
        <View style={[styles.workoutBadge, { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
          <Ionicons name="flame" size={14} color={PURPLE} />
          <Text style={[styles.workoutBadgeText, { color: PURPLE }]}>{totalCalories}</Text>
        </View>
      </View>

      {inActive && (
        <View style={[styles.progressBg, { backgroundColor: PREMIUM_GLASS_BORDER }]}>
          <LinearGradient
            colors={[PREMIUM_ACCENT, PREMIUM_ACCENT + 'CC'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as unknown as number }]}
          />
        </View>
      )}

      {showComplete ? (
        <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.completeTrophy}>🏆</Text>
          <Text style={styles.completeTitleMain}>Workout Completed!</Text>
          <Text style={styles.completeSubMain}>Great job! You crushed your workout 💪</Text>

          <View style={[styles.summaryHero, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
            <View style={styles.summaryHeroCol}>
              <Text style={[styles.summaryHeroVal, { color: '#FF6B35' }]}>{totalCalories}</Text>
              <Text style={styles.summaryHeroLbl}>Kcal Burned</Text>
            </View>
            <View style={[styles.summaryHeroDiv, { backgroundColor: PREMIUM_GLASS_BORDER }]} />
            <View style={styles.summaryHeroCol}>
              <Text style={[styles.summaryHeroVal, { color: PREMIUM_ACCENT }]}>{Math.max(1, Math.round(workoutSeconds / 60))}</Text>
              <Text style={styles.summaryHeroLbl}>Minutes</Text>
            </View>
            <View style={[styles.summaryHeroDiv, { backgroundColor: PREMIUM_GLASS_BORDER }]} />
            <View style={styles.summaryHeroCol}>
              <Text style={[styles.summaryHeroVal, { color: '#5BC0EB' }]}>{completedCount}/{exercises.length}</Text>
              <Text style={styles.summaryHeroLbl}>Exercises</Text>
            </View>
          </View>

          <View style={[styles.perfCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
            <PerfRow icon="speedometer-outline" color={PREMIUM_ACCENT} label="Average Pace" value={`${avgPaceSec}s / exercise`} />
            <PerfRow icon="time-outline" color="#5BC0EB" label="Total Time" value={totalWorkoutTime()} />
            <PerfRow icon="flame-outline" color="#FF6B35" label="Total Calories" value={`${totalCalories} kcal`} />
          </View>

          <Text style={styles.ratingTitle}>How was this workout?</Text>
          <View style={styles.ratingRow}>
            {RATING_OPTIONS.map(opt => {
              const selected = difficultyRating === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setDifficultyRating(opt.id)}
                  style={[
                    styles.ratingChip,
                    selected && { borderColor: opt.color, backgroundColor: opt.color + '22' },
                  ]}
                >
                  <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.ratingLbl, selected && { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.aiTipCard, { borderColor: PURPLE + '55', backgroundColor: PURPLE + '18' }]}>
            <View style={[styles.aiTipIcon, { backgroundColor: PURPLE + '33' }]}>
              <Ionicons name="sparkles" size={18} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiTipTitle, { color: PURPLE }]}>AI Insights</Text>
              <Text style={styles.aiTipBody}>
                You burned {totalCalories} kcal in {Math.max(1, Math.round(workoutSeconds / 60))} minutes — keep this momentum for your next {catMeta?.label || category} session.
              </Text>
            </View>
          </View>

          <View style={styles.completeActions}>
            <TouchableOpacity onPress={() => finishWorkout()} style={[styles.completeOutlineBtn, { borderColor: PREMIUM_GLASS_BORDER }]}>
              <Text style={styles.completeOutlineText}>Save Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => finishWorkout('Analysis')} style={styles.completePrimaryBtn}>
              <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} style={styles.completePrimaryGrad}>
                <Ionicons name="stats-chart" size={18} color="#fff" />
                <Text style={styles.completePrimaryText}>View Analysis</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : inActive && activeExercise ? (
        <View style={styles.activeRoot}>
          <View style={styles.activeTopRow}>
            <View style={styles.activeTopStat}>
              <Ionicons name="flame" size={16} color="#FF6B35" />
              <Text style={[styles.activeTopVal, { color: '#FF6B35' }]}>{totalCalories}</Text>
              <Text style={styles.activeTopLbl}>Kcal</Text>
            </View>

            <View style={styles.ringWrap}>
              <Svg width={TIMER_RING} height={TIMER_RING}>
                <Circle
                  cx={TIMER_RING / 2}
                  cy={TIMER_RING / 2}
                  r={ringRadius}
                  stroke={PREMIUM_GLASS_BORDER}
                  strokeWidth={8}
                  fill="transparent"
                />
                <Circle
                  cx={TIMER_RING / 2}
                  cy={TIMER_RING / 2}
                  r={ringRadius}
                  stroke={PREMIUM_ACCENT}
                  strokeWidth={8}
                  fill="transparent"
                  strokeDasharray={`${ringCirc} ${ringCirc}`}
                  strokeDashoffset={ringCirc * (1 - ringProgress)}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${TIMER_RING / 2}, ${TIMER_RING / 2}`}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.ringTime}>
                  {restSeconds > 0 ? `0:0${restSeconds}` : formatTime(exerciseSecondsLeft || activeExercise.duration)}
                </Text>
                <Text style={styles.ringLbl}>{restSeconds > 0 ? 'Get ready' : 'Time Left'}</Text>
              </View>
            </View>

            <View style={styles.activeTopStat}>
              <Ionicons name="barbell-outline" size={16} color="#5BC0EB" />
              <Text style={[styles.activeTopVal, { color: '#5BC0EB' }]}>{activeIndex + 1}/{exercises.length}</Text>
              <Text style={styles.activeTopLbl}>Exercise</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.activeScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.playerCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
              {activeExerciseData && !isAiWorkout ? (
                <AnimatedExerciseDemo
                  exercise={activeExerciseData}
                  isActive={!isPaused && !demoPaused && restSeconds === 0}
                  secondsLeft={exerciseSecondsLeft}
                />
              ) : (
                <Image
                  source={{ uri: getExerciseImageUrl(activeExercise.name, activeExercise.category) }}
                  style={styles.playerImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.playerBody}>
                <Text style={styles.playerTitle}>{activeExercise.name}</Text>
                <Text style={styles.playerMeta}>
                  {formatDuration(activeExercise.duration)} · {exerciseKcalEst(activeExercise)} kcal
                </Text>
                <Text style={styles.playerDesc} numberOfLines={2}>
                  {activeExerciseData?.instructions?.[0] ?? activeExercise.form_tips ?? 'Full-body movement — stay controlled and breathe.'}
                </Text>
                <View style={styles.playerProgressTrack}>
                  <View style={[styles.playerProgressFill, { width: `${ringProgress * 100}%` }]} />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.controlRow}>
            <TouchableOpacity onPress={() => completeExercise(activeIndex)} style={styles.controlSide}>
              <Ionicons name="play-skip-forward" size={22} color={PREMIUM_MUTED} />
              <Text style={styles.controlSideLbl}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePause} style={[styles.controlMain, { backgroundColor: PREMIUM_ACCENT }]}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color="#050608" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => completeExercise(activeIndex)} style={styles.controlSide}>
              <Ionicons name="arrow-forward-circle-outline" size={22} color={PREMIUM_MUTED} />
              <Text style={styles.controlSideLbl}>Next</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => previewExerciseVoice(activeIndex)}
            style={[styles.replayCueBar, { borderColor: PURPLE + '44', backgroundColor: PURPLE + '14' }]}
          >
            <Ionicons name="megaphone-outline" size={18} color={PURPLE} />
            <Text style={[styles.replayCueText, { color: PURPLE }]}>Replay voice cue</Text>
          </TouchableOpacity>

          <View style={[styles.coachBar, { borderColor: PURPLE + '44', backgroundColor: PURPLE + '14' }]}>
            <View style={[styles.coachBarIcon, { backgroundColor: PURPLE + '30' }]}>
              <Ionicons name="hardware-chip-outline" size={18} color={PURPLE} />
            </View>
            <Text style={styles.coachBarText} numberOfLines={2}>
              {activeExercise.form_tips ?? activeExerciseData?.instructions?.[1] ?? 'Keep your core tight and land softly on each rep.'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {exercises.map((ex, i) => {
              const lib = EXERCISE_LIBRARY.find(e => e.id === ex.id);
              const expanded = overviewExpandedIndex === i;
              return (
                <View
                  key={ex.id}
                  style={[
                    styles.overviewCard,
                    premiumGlassShadow(),
                    { borderColor: expanded ? PREMIUM_ACCENT + '66' : PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (expanded) {
                        setOverviewExpandedIndex(null);
                        setPreviewDemoPaused(false);
                      } else {
                        setOverviewExpandedIndex(i);
                        setPreviewDemoPaused(false);
                      }
                    }}
                    style={styles.overviewRow}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                  >
                    <View style={[styles.overviewIndex, { backgroundColor: PREMIUM_ACCENT + '22', borderColor: PREMIUM_ACCENT + '55' }]}>
                      <Text style={[styles.overviewIndexText, { color: PREMIUM_ACCENT }]}>{i + 1}</Text>
                    </View>
                    <ExerciseThumbnail name={ex.name} category={ex.category} size={52} accent={PREMIUM_ACCENT} borderRadius={12} />
                    <View style={styles.exInfo}>
                      <Text style={[styles.exName, { color: PREMIUM_TEXT }]}>{ex.name}</Text>
                      <Text style={styles.exMeta}>
                        {ex.sets && ex.reps
                          ? `${ex.sets} sets × ${ex.reps}`
                          : `${formatDuration(ex.duration)} · ${exerciseKcalEst(ex)} kcal`}
                      </Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={PREMIUM_MUTED} />
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.overviewExpand}>
                      <Image
                        source={{ uri: getExerciseImageUrl(ex.name, ex.category) }}
                        style={styles.overviewPreviewImage}
                        resizeMode="cover"
                      />
                      {lib ? (
                        <View style={styles.overviewDemoWrap}>
                          <AnimatedExerciseDemo
                            exercise={lib}
                            isActive={!previewDemoPaused}
                            secondsLeft={ex.duration}
                          />
                        </View>
                      ) : null}
                      <Text style={styles.overviewTip} numberOfLines={3}>
                        {lib?.instructions?.[0] ?? ex.form_tips ?? 'Tap start when you are ready.'}
                      </Text>
                      <View style={styles.overviewActions}>
                        <TouchableOpacity
                          onPress={() => stopMediaPlayback(false)}
                          style={[styles.overviewSecondaryBtn, { borderColor: '#FF595955' }]}
                        >
                          <Ionicons name="stop-circle" size={18} color="#FF5959" />
                          <Text style={[styles.overviewSecondaryText, { color: '#FF5959' }]}>Stop</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => previewExerciseVoice(i)}
                          style={[styles.overviewSecondaryBtn, { borderColor: PREMIUM_GLASS_BORDER }]}
                        >
                          <Ionicons name="volume-high-outline" size={18} color={PREMIUM_ACCENT} />
                          <Text style={styles.overviewSecondaryText}>Voice cue</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => startFromOverview(i)}
                          style={styles.overviewPrimaryBtn}
                        >
                          <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} style={styles.overviewPrimaryGrad}>
                            <Ionicons name="play" size={16} color="#fff" />
                            <Text style={styles.overviewPrimaryText}>Start here</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={[styles.aiTipCard, { borderColor: PURPLE + '55', backgroundColor: PURPLE + '18', marginTop: spacing.sm }]}>
              <View style={[styles.aiTipIcon, { backgroundColor: PURPLE + '33' }]}>
                <Ionicons name="bulb" size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTipTitle, { color: PURPLE }]}>AI Coach Tip</Text>
                <Text style={styles.aiTipBody}>{coachTip}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              onPress={startWorkoutOverview}
              activeOpacity={0.9}
              accessibilityRole="button"
              style={styles.stickyBtnWrap}
            >
              <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} style={styles.stickyBtn}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.stickyBtnText}>Start Workout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', letterSpacing: -0.3, color: PREMIUM_TEXT },
  headerSub: { fontSize: fontSize.xs, marginTop: 1, color: PREMIUM_MUTED },
  workoutBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1,
  },
  workoutBadgeText: { fontSize: fontSize.xs, fontWeight: '800' },

  progressBg: { height: 3, marginHorizontal: spacing.lg, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: 2 },

  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.sm, borderRadius: 14, borderWidth: 1 },
  mediaControls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mediaBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaBtnText: { fontSize: fontSize.xs, fontWeight: '700' },
  stopWorkoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  stopWorkoutLinkText: { color: '#FF5959', fontSize: fontSize.xs, fontWeight: '700' },
  demoResumeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoResumeChipText: { fontWeight: '800', fontSize: fontSize.sm },
  replayCueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  replayCueText: { fontSize: fontSize.xs, fontWeight: '700' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  statLabel: { fontSize: 9, fontWeight: '600', color: PREMIUM_MUTED },

  activeHero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    height: 160,
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  activeHeroImage: { width: '100%', height: '100%' },
  activeHeroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: spacing.md },
  activeHeroTitle: { fontSize: fontSize.xl, fontWeight: '900', color: PREMIUM_TEXT },
  activeHeroSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4 },
  timerRing: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,6,8,0.75)',
  },
  timerRingText: { fontSize: 22, fontWeight: '900' },

  scrollContent: { paddingBottom: 120, paddingTop: spacing.xs },

  categoryBadgeWrap: { alignItems: 'center', marginBottom: spacing.md },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  categoryBadgeText: { fontSize: fontSize.sm, fontWeight: '700' },

  exCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 16, overflow: 'hidden' },
  exCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  exInfo: { flex: 1 },
  exName: { fontSize: fontSize.base, fontWeight: '800', letterSpacing: -0.2 },
  exMeta: { fontSize: fontSize.xs, marginTop: 4, color: PREMIUM_MUTED },
  exProgressTrack: { height: 4, borderRadius: 2, backgroundColor: PREMIUM_GLASS_BORDER, marginTop: 8, overflow: 'hidden' },
  exProgressFill: { height: '100%', borderRadius: 2 },
  exProgressText: { fontSize: fontSize.xs, fontWeight: '700', marginTop: 4 },
  exExpand: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  exPreviewImage: { width: '100%', height: 120, borderRadius: radius.lg },
  exTip: { fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 18 },
  exStartWide: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
  },
  exStartWideText: { color: '#fff', fontWeight: '800', fontSize: fontSize.sm },
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

  headerStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerStopText: { color: '#FF5959', fontSize: fontSize.xs, fontWeight: '800' },
  overviewCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  overviewExpand: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  overviewPreviewImage: { width: '100%', height: 120, borderRadius: radius.lg },
  overviewDemoWrap: { alignItems: 'center', marginVertical: spacing.xs },
  overviewTip: { fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 18 },
  overviewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  overviewSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  overviewSecondaryText: { color: PREMIUM_TEXT, fontWeight: '700', fontSize: fontSize.xs },
  overviewPrimaryBtn: { flex: 1.2, borderRadius: 12, overflow: 'hidden' },
  overviewPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
  },
  overviewPrimaryText: { color: '#fff', fontWeight: '800', fontSize: fontSize.xs },
  overviewIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewIndexText: { fontSize: 12, fontWeight: '800' },

  aiTipCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  aiTipIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiTipTitle: { fontSize: fontSize.sm, fontWeight: '800', marginBottom: 4 },
  aiTipBody: { fontSize: fontSize.xs, color: PREMIUM_MUTED, lineHeight: 18 },

  stickyFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: PREMIUM_GLASS_BORDER,
    backgroundColor: 'rgba(5,6,8,0.92)',
    zIndex: 20,
    elevation: 20,
  },
  voiceBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  voiceBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  voiceBarBtnAlt: {},
  voiceBarBtnText: { fontSize: fontSize.xs, fontWeight: '700', color: PREMIUM_TEXT },
  stickyBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  stickyBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },

  activeRoot: { flex: 1 },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  activeTopStat: { alignItems: 'center', width: 72, gap: 2 },
  activeTopVal: { fontSize: 18, fontWeight: '900' },
  activeTopLbl: { fontSize: 9, color: PREMIUM_MUTED, fontWeight: '600' },
  ringWrap: { width: TIMER_RING, height: TIMER_RING, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringTime: { fontSize: 26, fontWeight: '900', color: PREMIUM_TEXT, letterSpacing: -0.5 },
  ringLbl: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 2 },
  activeScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  playerCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', backgroundColor: PREMIUM_GLASS },
  playerImage: { width: '100%', height: 200 },
  playerBody: { padding: spacing.md, gap: 4 },
  playerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  playerMeta: { fontSize: fontSize.xs, color: PREMIUM_MUTED },
  playerDesc: { fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 18, marginTop: 4 },
  playerProgressTrack: { height: 4, borderRadius: 2, backgroundColor: PREMIUM_GLASS_BORDER, marginTop: spacing.sm, overflow: 'hidden' },
  playerProgressFill: { height: '100%', backgroundColor: PREMIUM_ACCENT, borderRadius: 2 },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  controlSide: { alignItems: 'center', gap: 4, minWidth: 56 },
  controlSideLbl: { fontSize: 10, color: PREMIUM_MUTED, fontWeight: '600' },
  controlMain: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  coachBarIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  coachBarText: { flex: 1, fontSize: fontSize.xs, color: PREMIUM_MUTED, lineHeight: 16 },

  completeScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge, alignItems: 'center' },
  completeTrophy: { fontSize: 56, marginTop: spacing.lg, marginBottom: spacing.sm },
  completeTitleMain: { fontSize: 26, fontWeight: '900', color: PREMIUM_TEXT, letterSpacing: -0.5 },
  completeSubMain: { fontSize: fontSize.sm, color: PREMIUM_MUTED, textAlign: 'center', marginBottom: spacing.lg },
  summaryHero: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryHeroCol: { flex: 1, alignItems: 'center', gap: 4 },
  summaryHeroVal: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  summaryHeroLbl: { fontSize: 9, color: PREMIUM_MUTED, fontWeight: '600', textAlign: 'center' },
  summaryHeroDiv: { width: 1, marginVertical: 4 },
  perfCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perfIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  perfLabel: { flex: 1, fontSize: fontSize.sm, color: PREMIUM_MUTED },
  perfValue: { fontSize: fontSize.sm, fontWeight: '700' },
  ratingTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT, alignSelf: 'flex-start', marginBottom: spacing.sm },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg, width: '100%' },
  ratingChip: {
    width: (SW - spacing.lg * 2 - spacing.sm) / 2,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  ratingEmoji: { fontSize: 22 },
  ratingLbl: { fontSize: 10, color: PREMIUM_MUTED, fontWeight: '700', marginTop: 4 },
  completeActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  completeOutlineBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeOutlineText: { color: PREMIUM_TEXT, fontWeight: '700', fontSize: fontSize.sm },
  completePrimaryBtn: { flex: 1.2, borderRadius: 14, overflow: 'hidden' },
  completePrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  completePrimaryText: { color: '#fff', fontWeight: '800', fontSize: fontSize.sm },
});
