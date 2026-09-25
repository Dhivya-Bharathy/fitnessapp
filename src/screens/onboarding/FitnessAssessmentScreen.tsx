import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, TextInput, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { colors, spacing, fontSize, radius } from '../../theme';
import {
  FITNESS_ASSESSMENT_QUESTIONS,
  ASSESSMENT_QUESTION_COUNT,
  ASSESSMENT_SECTION_IMAGES,
} from '../../data/fitnessAssessmentQuestions';
import { useAssessmentStore } from '../../store/assessmentStore';
import { useIsCompactPhone } from '../../hooks/useLayoutWidth';
import { loadPersistedAssessment, persistAssessmentIndex, clearAssessmentPersistence } from '../../utils/assessmentPersistence';
import { useAuthStore } from '../../store/authStore';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { PrimaryCTA } from '../../components/onboarding/PrimaryCTA';

export default function FitnessAssessmentScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const compact = useIsCompactPhone();
  const { answers, setAnswer, toggleMulti, hydrateAnswers } = useAssessmentStore();
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (useAuthStore.getState().forceAssessmentRetake) {
        await clearAssessmentPersistence();
        useAssessmentStore.getState().reset();
        if (active) {
          setIndex(0);
          setHydrated(true);
        }
        return;
      }
      const saved = await loadPersistedAssessment();
      if (!active || !saved) {
        setHydrated(true);
        return;
      }
      if (Object.keys(saved.answers).length > 0) hydrateAnswers(saved.answers);
      if (saved.index > 0 && saved.index < ASSESSMENT_QUESTION_COUNT) {
        setIndex(saved.index);
      }
      setHydrated(true);
    })();
    return () => { active = false; };
  }, [hydrateAnswers]);

  useEffect(() => {
    if (!hydrated) return;
    persistAssessmentIndex(index);
  }, [index, hydrated]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, [index]);

  const q = FITNESS_ASSESSMENT_QUESTIONS[index];
  const progress = (index + 1) / ASSESSMENT_QUESTION_COUNT;
  const heroUri = ASSESSMENT_SECTION_IMAGES[q.section] ?? ASSESSMENT_SECTION_IMAGES.Training;

  const canContinue = useMemo(() => {
    const val = answers[q.id];
    if (q.type === 'text') return true;
    if (q.type === 'multi' || q.type === 'weekdays') {
      return Array.isArray(val) && val.length > 0;
    }
    return typeof val === 'string' && val.length > 0;
  }, [answers, q]);

  const goNext = useCallback(() => {
    if (index >= ASSESSMENT_QUESTION_COUNT - 1) {
      navigation.navigate('AssessmentResults');
      return;
    }
    setIndex((i) => i + 1);
  }, [index, navigation]);

  const handleContinue = useCallback(() => {
    if (!canContinue && q.type !== 'text') return;
    goNext();
  }, [canContinue, q.type, goNext]);

  const selectSingle = (id: string, value: string) => {
    setAnswer(id, value);
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      const latest = useAssessmentStore.getState().answers[id];
      if (latest === value && FITNESS_ASSESSMENT_QUESTIONS[index]?.id === id) {
        goNext();
      }
    }, 320);
  };

  const goBack = () => {
    if (index === 0) navigation.goBack();
    else setIndex((i) => i - 1);
  };

  const continueLabel = index >= ASSESSMENT_QUESTION_COUNT - 1 ? 'Generate my plan' : 'Continue';

  const header = (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accent }]}>Fitness App</Text>
        <Text style={[styles.headerStep, { color: theme.textMuted }]}>
          {index + 1}/{ASSESSMENT_QUESTION_COUNT}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <LinearGradient
          colors={[theme.accent, '#0DAE6C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
    </>
  );

  const renderWeekdays = () => (
    <View style={styles.weekRow}>
      {q.options?.map((opt) => {
        const selected = (answers[q.id] as string[] | undefined)?.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            onPress={() => toggleMulti(q.id, opt.value)}
            style={[
              styles.dayChip,
              compact && styles.dayChipCompact,
              {
                backgroundColor: selected ? theme.accent : theme.card,
                borderColor: selected ? theme.accent : theme.border,
              },
            ]}
          >
            <Text style={[styles.dayChipText, { color: selected ? theme.bg : theme.textPrimary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderOptions = () => {
    if (q.type === 'weekdays') return renderWeekdays();

    if (q.type === 'text') {
      return (
        <TextInput
          value={(answers[q.id] as string) ?? ''}
          onChangeText={(t) => setAnswer(q.id, t)}
          placeholder={q.placeholder ?? 'Type here…'}
          placeholderTextColor={theme.textMuted}
          multiline
          style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.card }]}
        />
      );
    }

    return q.options?.map((opt) => {
      const selected =
        q.type === 'multi'
          ? (answers[q.id] as string[] | undefined)?.includes(opt.value)
          : answers[q.id] === opt.value;

      return (
        <Pressable
          key={opt.value}
          onPress={() => {
            if (q.type === 'multi') toggleMulti(q.id, opt.value);
            else selectSingle(q.id, opt.value);
          }}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: selected ? theme.accentDim as string : theme.card,
              borderColor: selected ? theme.accent : theme.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          {opt.icon ? (
            <View style={[styles.optionIconWrap, { backgroundColor: selected ? theme.accent + '22' : theme.bg }]}>
              <Ionicons name={opt.icon as any} size={20} color={theme.accent} />
            </View>
          ) : null}
          <Text style={[styles.optionLabel, { color: selected ? theme.accent : theme.textPrimary }]}>
            {opt.label}
          </Text>
          {selected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
        </Pressable>
      );
    });
  };

  if (!hydrated) {
    return (
      <StickyFooterLayout backgroundColor={theme.bg} footer={null}>
        <View style={styles.loadingWrap}>
          <Text style={{ color: theme.textMuted }}>Loading your progress…</Text>
        </View>
      </StickyFooterLayout>
    );
  }

  const showContinueButton = q.type !== 'single';

  return (
    <StickyFooterLayout
      backgroundColor={theme.bg}
      header={header}
      footer={
        showContinueButton ? (
          <PrimaryCTA
            label={continueLabel}
            onPress={handleContinue}
            disabled={!canContinue && q.type !== 'text'}
          />
        ) : (
          <Text style={[styles.tapHint, { color: theme.textMuted }]}>
            {canContinue ? 'Next question…' : 'Tap an option to continue'}
          </Text>
        )
      }
    >
      {!compact && (
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', theme.bg]} style={styles.heroFade} />
        </View>
      )}

      <Text style={[styles.section, { color: theme.accent }]}>{q.section}</Text>
      <Text style={[styles.question, compact && styles.questionCompact, { color: theme.textPrimary }]}>
        {q.question}
      </Text>
      {q.subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{q.subtitle}</Text>
      ) : null}
      <View style={styles.optionsWrap}>{renderOptions()}</View>
      {!canContinue && q.type !== 'text' && q.type !== 'single' ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>Choose at least one option.</Text>
      ) : null}
    </StickyFooterLayout>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  headerStep: { fontSize: fontSize.sm, fontWeight: '600' },
  progressTrack: { height: 4, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  heroWrap: {
    height: 112, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, marginTop: spacing.xs,
  },
  heroImage: { width: '100%', height: '100%' },
  heroFade: { ...StyleSheet.absoluteFillObject },
  section: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm },
  question: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: spacing.sm },
  questionCompact: { fontSize: 19, lineHeight: 25 },
  subtitle: { fontSize: fontSize.sm, marginBottom: spacing.md, lineHeight: 20 },
  optionsWrap: { gap: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, minHeight: 52, gap: spacing.sm,
  },
  optionIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: fontSize.base, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  dayChip: {
    width: '13%', minWidth: 42, aspectRatio: 1, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipCompact: { minWidth: 38 },
  dayChipText: { fontSize: 11, fontWeight: '800' },
  textInput: {
    minHeight: 96, borderWidth: 1.5, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, textAlignVertical: 'top',
  },
  hint: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.lg },
  tapHint: { textAlign: 'center', fontSize: fontSize.sm, fontWeight: '600', paddingVertical: spacing.sm },
});
