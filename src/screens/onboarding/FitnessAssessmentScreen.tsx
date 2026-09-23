import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
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
} from '../../data/fitnessAssessmentQuestions';
import { useAssessmentStore } from '../../store/assessmentStore';

export default function FitnessAssessmentScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const { answers, setAnswer, toggleMulti } = useAssessmentStore();
  const [index, setIndex] = useState(0);

  const q = FITNESS_ASSESSMENT_QUESTIONS[index];
  const progress = (index + 1) / ASSESSMENT_QUESTION_COUNT;

  const canContinue = useMemo(() => {
    const val = answers[q.id];
    if (q.type === 'text') return true;
    if (q.type === 'multi') return Array.isArray(val) && val.length > 0;
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

  const renderOptions = () => {
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
          <Text style={[styles.optionLabel, { color: selected ? theme.accent : theme.textPrimary }]}>
            {opt.label}
          </Text>
          {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
        </TouchableOpacity>
      );
    });
  };

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
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: theme.textMuted }]}>{q.section}</Text>
        <Text style={[styles.question, { color: theme.textPrimary }]}>{q.question}</Text>
        {q.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{q.subtitle}</Text>
        ) : null}
        <View style={styles.optionsWrap}>{renderOptions()}</View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.bg }]}>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  headerStep: { fontSize: fontSize.sm, fontWeight: '600' },
  progressTrack: { height: 4, marginHorizontal: spacing.lg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  section: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  question: { fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.base, marginBottom: spacing.lg, lineHeight: 22 },
  optionsWrap: { gap: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5,
  },
  optionLabel: { fontSize: fontSize.base, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  textInput: {
    minHeight: 100, borderWidth: 1.5, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, textAlignVertical: 'top',
  },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 36 },
  ctaWrap: { borderRadius: 20, overflow: 'hidden' },
  cta: { padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
});
