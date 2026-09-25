import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FITNESS_ASSESSMENT_QUESTIONS,
  ASSESSMENT_QUESTION_COUNT,
  MOTIVATIONAL_LINES,
  getQuestionHeroUri,
  getQuestionUiLayout,
  getSectionAccent,
} from '../../data/fitnessAssessmentQuestions';
import { useAssessmentStore } from '../../store/assessmentStore';
import { loadPersistedAssessment, persistAssessmentIndex, clearAssessmentPersistence } from '../../utils/assessmentPersistence';
import { useAuthStore } from '../../store/authStore';
import { mergeDeferredAssessmentPrefs } from '../../utils/onboardingFlags';
import { supabase } from '../../services/supabase';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { PrimaryCTA } from '../../components/onboarding/PrimaryCTA';
import { AssessmentChoiceGrid } from '../../components/onboarding/AssessmentChoiceGrid';
import { AssessmentOptionList } from '../../components/onboarding/AssessmentOptionList';
import { RichAssessmentQuad } from '../../components/onboarding/RichAssessmentQuad';
import { AssessmentMotivationBanner } from '../../components/onboarding/AssessmentMotivationBanner';
import { spacing, fontSize, radius } from '../../theme';
import { assessmentUseNativeDriver } from '../../components/onboarding/assessmentAnim';

const DARK_BG = '#080A0F';
const ACCENT = '#2DDC8C';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.12)';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.52)';

const FOOD_AVOID_CHIPS = ['None', 'Dairy', 'Very spicy', 'Gluten', 'Nuts'];

export default function FitnessAssessmentScreen() {
  const navigation = useNavigation<any>();
  const { answers, setAnswer, toggleMulti, hydrateAnswers } = useAssessmentStore();
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyFade = useRef(new Animated.Value(1)).current;
  const bodySlide = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(1)).current;

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
  const uiLayout = getQuestionUiLayout(q);
  const sectionAccent = getSectionAccent(q.section);
  const heroUri = getQuestionHeroUri(q);
  const motivLine = MOTIVATIONAL_LINES[index] ?? MOTIVATIONAL_LINES[0];
  const targetProgress = (index + 1) / ASSESSMENT_QUESTION_COUNT;

  useEffect(() => {
    bodyFade.setValue(0);
    bodySlide.setValue(18);
    heroScale.setValue(1.04);
    Animated.parallel([
      Animated.timing(bodyFade, { toValue: 1, duration: 340, useNativeDriver: assessmentUseNativeDriver }),
      Animated.spring(bodySlide, { toValue: 0, friction: 9, tension: 70, useNativeDriver: assessmentUseNativeDriver }),
      Animated.spring(heroScale, { toValue: 1, friction: 8, useNativeDriver: assessmentUseNativeDriver }),
      Animated.timing(progressAnim, {
        toValue: targetProgress,
        duration: 420,
        useNativeDriver: false,
      }),
    ]).start();
  }, [index, bodyFade, bodySlide, heroScale, progressAnim, targetProgress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
    }, 360);
  };

  const goBack = () => {
    if (index === 0) navigation.goBack();
    else setIndex((i) => i - 1);
  };

  const continueLabel = index >= ASSESSMENT_QUESTION_COUNT - 1 ? 'Generate my plan →' : 'Next →';

  const skipForNow = () => {
    const go = async () => {
      const { user, profile, updateProfile } = useAuthStore.getState();
      await clearAssessmentPersistence();
      useAssessmentStore.getState().reset();
      if (user?.id) {
        const tracking_preferences = mergeDeferredAssessmentPrefs(profile?.tracking_preferences);
        await supabase.from('profiles').update({ tracking_preferences }).eq('id', user.id);
        updateProfile({ tracking_preferences });
      }
      useAuthStore.getState().setOnboarding(false);
    };
    const title = 'Skip AI intake for now?';
    const message =
      'Your account is ready. Finish the 22 questions anytime from AI Coach for a personalized plan.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`${title}\n\n${message}`)) void go();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Skip for now', onPress: () => void go() },
    ]);
  };

  const selectedMulti = useMemo(() => {
    const val = answers[q.id];
    return Array.isArray(val) ? val : val ? [String(val)] : [];
  }, [answers, q.id]);

  const onOptionPress = (value: string) => {
    if (q.type === 'multi' || q.type === 'weekdays') toggleMulti(q.id, value);
    else selectSingle(q.id, value);
  };

  const renderQuestionTitle = () => {
    if (!q.questionHighlight || !q.question.includes(q.questionHighlight)) {
      return <Text style={styles.question}>{q.question}</Text>;
    }
    const [before, after] = q.question.split(q.questionHighlight);
    return (
      <Text style={styles.question}>
        {before}
        <Text style={[styles.questionAccent, { color: ACCENT }]}>{q.questionHighlight}</Text>
        {after}
      </Text>
    );
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.headerOrb} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fitness Plan</Text>
        <Text style={styles.headerStep}>
          {index + 1}/{ASSESSMENT_QUESTION_COUNT}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFillWrap, { width: progressWidth }]}>
          <LinearGradient
            colors={[sectionAccent, ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    </View>
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
              {
                backgroundColor: selected ? sectionAccent : CARD,
                borderColor: selected ? sectionAccent : BORDER,
                transform: [{ scale: selected ? 1.05 : 1 }],
              },
            ]}
          >
            <Text style={[styles.dayChipText, { color: selected ? DARK_BG : TEXT }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderText = () => {
    const current = (answers[q.id] as string) ?? '';
    return (
      <View>
        <View style={styles.chipRow}>
          {FOOD_AVOID_CHIPS.map((chip) => {
            const active = current.toLowerCase().includes(chip.toLowerCase());
            return (
              <Pressable
                key={chip}
                onPress={() => {
                  if (chip === 'None') setAnswer(q.id, 'None');
                  else if (active) {
                    setAnswer(q.id, current.replace(new RegExp(chip, 'i'), '').replace(/,\s*,/g, ',').trim());
                  } else {
                    setAnswer(q.id, current ? `${current}, ${chip}` : chip);
                  }
                }}
                style={[styles.chip, active && { borderColor: sectionAccent, backgroundColor: `${sectionAccent}22` }]}
              >
                <Text style={[styles.chipText, active && { color: sectionAccent }]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={current}
          onChangeText={(t) => setAnswer(q.id, t)}
          placeholder={q.placeholder ?? 'Type here…'}
          placeholderTextColor={MUTED}
          multiline
          style={[styles.textInput, { borderColor: current ? sectionAccent : BORDER }]}
        />
      </View>
    );
  };

  const renderOptions = () => {
    if (uiLayout === 'weekdays') return renderWeekdays();
    if (uiLayout === 'text') return renderText();
    if (!q.options) return null;

    if (uiLayout === 'rich-quad') {
      return (
        <RichAssessmentQuad
          options={q.options}
          selectedValues={selectedMulti}
          onPress={onOptionPress}
          accent={sectionAccent}
          animateKey={index}
        />
      );
    }

    if (uiLayout === 'quad' || uiLayout === 'grid') {
      return (
        <AssessmentChoiceGrid
          layout={uiLayout}
          options={q.options}
          selectedValues={selectedMulti}
          onPress={onOptionPress}
          accent={sectionAccent}
          animateKey={index}
        />
      );
    }

    return (
      <AssessmentOptionList
        options={q.options}
        selectedValues={selectedMulti}
        onPress={onOptionPress}
        multi={q.type === 'multi'}
        animateKey={index}
      />
    );
  };

  if (!hydrated) {
    return (
      <StickyFooterLayout backgroundColor={DARK_BG} footer={null} padHorizontal={false}>
        <View style={styles.loadingWrap}>
          <Text style={{ color: MUTED }}>Loading your progress…</Text>
        </View>
      </StickyFooterLayout>
    );
  }

  const showContinueButton = q.type === 'multi' || q.type === 'weekdays' || q.type === 'text';

  return (
    <StickyFooterLayout
      backgroundColor={DARK_BG}
      header={header}
      padHorizontal={false}
      scrollPaddingBottom={spacing.md}
      footer={
        <View style={styles.footerInner}>
          {showContinueButton ? (
            <PrimaryCTA
              label={continueLabel}
              onPress={handleContinue}
              disabled={!canContinue && q.type !== 'text'}
            />
          ) : (
            <Text style={styles.tapHint}>
              {canContinue ? 'Next question…' : 'Tap an option to continue'}
            </Text>
          )}
          {index === 0 ? (
            <TouchableOpacity onPress={skipForNow} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip for now — explore the app first</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
    >
      <Animated.View
        style={[
          styles.body,
          { opacity: bodyFade, transform: [{ translateY: bodySlide }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <AssessmentMotivationBanner
            heroUri={heroUri}
            section={q.section}
            accent={sectionAccent}
            lead={q.bannerLead}
            accentPhrase={q.bannerAccent}
            sub={q.bannerSub}
            fallbackLine={motivLine}
          />
        </Animated.View>

        <Text style={[styles.section, { color: sectionAccent }]}>{q.section}</Text>
        {renderQuestionTitle()}
        {q.subtitle ? <Text style={styles.subtitle}>{q.subtitle}</Text> : null}
        <View style={styles.optionsWrap}>{renderOptions()}</View>
        {!canContinue && showContinueButton && q.type !== 'text' ? (
          <Text style={styles.hint}>Choose at least one option.</Text>
        ) : null}
      </Animated.View>
    </StickyFooterLayout>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center', paddingHorizontal: spacing.lg },
  headerBlock: { backgroundColor: DARK_BG, position: 'relative', overflow: 'hidden' },
  headerOrb: {
    position: 'absolute',
    top: -30,
    right: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(45,220,140,0.1)',
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: ACCENT },
  headerStep: { fontSize: fontSize.sm, fontWeight: '600', color: MUTED },
  progressTrack: {
    height: 4, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: 2, overflow: 'hidden', backgroundColor: BORDER,
  },
  progressFillWrap: { height: '100%', overflow: 'hidden', borderRadius: 2 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  section: {
    fontSize: 10, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1.1, marginBottom: 4,
  },
  question: { fontSize: 19, fontWeight: '800', lineHeight: 24, marginBottom: 4, color: TEXT },
  questionAccent: { fontWeight: '800' },
  subtitle: { fontSize: 12, marginBottom: spacing.sm, lineHeight: 17, color: MUTED },
  optionsWrap: { gap: 8, marginTop: spacing.xs },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  dayChip: {
    width: '13%', minWidth: 40, aspectRatio: 1, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontSize: 10, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipText: { color: MUTED, fontSize: 11, fontWeight: '700' },
  textInput: {
    minHeight: 96, borderWidth: 1.5, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, textAlignVertical: 'top',
    color: TEXT, backgroundColor: CARD,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  hint: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.md, color: MUTED },
  footerInner: { width: '100%' },
  tapHint: {
    textAlign: 'center', fontSize: fontSize.sm, fontWeight: '600',
    paddingVertical: spacing.sm, color: MUTED,
  },
  skipBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  skipText: { fontSize: fontSize.sm, fontWeight: '600', color: MUTED, textDecorationLine: 'underline' },
});
