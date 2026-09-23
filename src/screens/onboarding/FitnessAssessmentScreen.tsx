import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
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
import { useFooterInset } from '../../hooks/useFooterInset';
import { useIsCompactPhone } from '../../hooks/useLayoutWidth';
import { loadPersistedAssessment, persistAssessmentIndex } from '../../utils/assessmentPersistence';

export default function FitnessAssessmentScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const footerInset = useFooterInset();
  const compact = useIsCompactPhone();
  const footerSpace = footerInset + 88;
  const { answers, setAnswer, toggleMulti, hydrateAnswers } = useAssessmentStore();
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
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

  const goNext = () => {
    if (!canContinue && q.type !== 'text') return;
    if (index >= ASSESSMENT_QUESTION_COUNT - 1) {
      navigation.navigate('AssessmentResults');
      return;
    }
    setIndex((i) => i + 1);
  };

  const goBack = () => {
    if (index === 0) navigation.goBack();
    else setIndex((i) => i - 1);
  };

  const renderWeekdays = () => (
    <View style={styles.weekRow}>
      {q.options?.map((opt) => {
        const selected = (answers[q.id] as string[] | undefined)?.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.85}
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
          </TouchableOpacity>
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
        <TouchableOpacity
          key={opt.value}
          activeOpacity={0.85}
          onPress={() =>
            q.type === 'multi' ? toggleMulti(q.id, opt.value) : setAnswer(q.id, opt.value)
          }
          style={[
            styles.option,
            {
              backgroundColor: selected ? theme.accentDim as string : theme.card,
              borderColor: selected ? theme.accent : theme.border,
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
        </TouchableOpacity>
      );
    });
  };

  if (!hydrated) {
    return (
      <AndroidSafeView backgroundColor={theme.bg} style={[styles.safe, styles.center]}>
        <Text style={{ color: theme.textMuted }}>Loading your progress…</Text>
      </AndroidSafeView>
    );
  }

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
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

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: footerSpace }]} keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', theme.bg]} style={styles.heroFade} />
          <View style={styles.heroBadge}>
            <Ionicons name="barbell-outline" size={14} color={theme.accent} />
            <Text style={[styles.heroBadgeText, { color: theme.textPrimary }]}>AI training + Indian diet</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.accent }]}>{q.section}</Text>
        <Text style={[styles.question, compact && styles.questionCompact, { color: theme.textPrimary }]}>{q.question}</Text>
        {q.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{q.subtitle}</Text>
        ) : null}
        <View style={styles.optionsWrap}>{renderOptions()}</View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.bg, paddingBottom: footerInset, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={goNext}
          disabled={!canContinue && q.type !== 'text'}
          activeOpacity={0.85}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={[theme.accent, '#0DAE6C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.cta, { opacity: !canContinue && q.type !== 'text' ? 0.45 : 1 }]}
          >
            <Text style={styles.ctaText}>
              {index >= ASSESSMENT_QUESTION_COUNT - 1 ? 'Generate my plan →' : 'Continue →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  headerStep: { fontSize: fontSize.sm, fontWeight: '600' },
  progressTrack: { height: 5, marginHorizontal: spacing.lg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  heroWrap: {
    height: 140, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  heroImage: { width: '100%', height: '100%' },
  heroFade: { ...StyleSheet.absoluteFillObject },
  heroBadge: {
    position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  heroBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  section: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm },
  question: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: spacing.sm },
  questionCompact: { fontSize: 20, lineHeight: 26 },
  subtitle: { fontSize: fontSize.base, marginBottom: spacing.lg, lineHeight: 22 },
  optionsWrap: { gap: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, minHeight: 56, gap: spacing.sm,
  },
  optionIconWrap: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: fontSize.base, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  dayChip: {
    width: '13%', minWidth: 44, aspectRatio: 1, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipCompact: { minWidth: 40, borderRadius: 12 },
  dayChipText: { fontSize: 11, fontWeight: '800' },
  textInput: {
    minHeight: 100, borderWidth: 1.5, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaWrap: { borderRadius: 20, overflow: 'hidden' },
  cta: { padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
});
