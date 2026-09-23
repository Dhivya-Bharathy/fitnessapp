import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useMealPlanStore } from '../../store/mealPlanStore';
import type { GeneratedMealPlan } from '../../types/ai-coach.types';

type Tab = 'generate' | 'saved';

interface QStep {
  key: string;
  question: string;
  subtitle: string;
  icon: string;
}

const STEPS: QStep[] = [
  { key: 'goal', question: "What's your health goal?", subtitle: 'This helps me tailor your meal plan', icon: 'flag-outline' },
  { key: 'budget', question: 'What budget do you have?', subtitle: "Tell me how much you're planning to spend", icon: 'wallet-outline' },
  { key: 'cuisine', question: 'What cuisine do you prefer?', subtitle: 'I know local Indian ingredients too!', icon: 'restaurant-outline' },
  { key: 'dietary', question: 'Any dietary preferences?', subtitle: 'Choose all that apply', icon: 'leaf-outline' },
  { key: 'meals', question: 'How many meals per day?', subtitle: '2-5 meals including snacks', icon: 'time-outline' },
  { key: 'exclude', question: 'Any foods to avoid?', subtitle: 'Not a fan of anything? Let me know', icon: 'close-circle-outline' },
  { key: 'calories', question: 'Daily calorie target?', subtitle: "I'll auto-calculate based on your goal if you're not sure", icon: 'flame-outline' },
];

const HEALTH_GOALS = [
  { key: 'weight_loss', label: 'Lose Weight', icon: 'trending-down', color: '#FF6B35' },
  { key: 'muscle_gain', label: 'Build Muscle', icon: 'fitness', color: '#2DDC8C' },
  { key: 'maintain', label: 'Stay Fit', icon: 'happy', color: '#4A90E2' },
  { key: 'heart_health', label: 'Heart Health', icon: 'pulse', color: '#FF5959' },
  { key: 'more_energy', label: 'More Energy', icon: 'flash', color: '#FFB830' },
];

const BUDGET_OPTIONS = [
  { key: 'fixed', label: 'I have a budget', icon: 'card-outline', desc: 'Enter how much you plan to spend' },
  { key: 'auto', label: 'Calculate for me', icon: 'sparkles-outline', desc: "I'll suggest affordable options based on local prices" },
];

const BUDGET_PERIODS = [
  { key: 'day', label: 'Per Day', icon: 'sunny-outline' },
  { key: 'week', label: 'Per Week', icon: 'calendar-outline' },
  { key: 'month', label: 'Per Month', icon: 'calendar-number-outline' },
];

const CUISINE_STYLES = [
  { key: 'indian', label: 'Indian 🇮🇳', desc: 'Dal, roti, biryani, dosa & more' },
  { key: 'any', label: 'Any Cuisine', desc: 'Surprise me with variety' },
  { key: 'italian', label: 'Italian', desc: 'Pasta, pizza, Mediterranean flavors' },
  { key: 'asian', label: 'Asian', desc: 'Rice, noodles, stir-fry dishes' },
  { key: 'mediterranean', label: 'Mediterranean', desc: 'Olive oil, grains, lean proteins' },
  { key: 'mexican', label: 'Mexican', desc: 'Tacos, burritos, beans, salsa' },
  { key: 'american', label: 'American', desc: 'Burgers, grilled food, salads' },
];

const DIETARY_PRESETS = [
  'balanced', 'high_protein', 'low_carb', 'vegetarian',
  'vegan', 'mediterranean', 'keto', 'gluten_free',
  'dairy_free', 'halal',
];

export default function MealPlanScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const { user } = useAuthStore();
  const store = useMealPlanStore();
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [healthGoal, setHealthGoal] = useState('');
  const [budgetMode, setBudgetMode] = useState<'fixed' | 'auto' | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [cuisineStyle, setCuisineStyle] = useState('any');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [excludedFoods, setExcludedFoods] = useState('');
  const [caloriesTarget, setCaloriesTarget] = useState('');
  const [started, setStarted] = useState(false);

  const step = STEPS[stepIndex];

  const fadeTo = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) fadeTo(() => setStepIndex(i => i + 1));
  };

  const prevStep = () => {
    if (stepIndex > 0) fadeTo(() => setStepIndex(i => i - 1));
  };

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  useFocusEffect(
    useCallback(() => {
      if (user) store.loadSavedPlans(user.id);
    }, [user])
  );

  const toggleDietary = (pref: string) => {
    setDietaryPrefs(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const canProceed = () => {
    switch (step.key) {
      case 'goal': return healthGoal !== '';
      case 'budget': return budgetMode !== null;
      case 'cuisine': return cuisineStyle !== '';
      case 'dietary': return true;
      case 'meals': return true;
      case 'exclude': return true;
      case 'calories': return true;
      default: return true;
    }
  };

  const handleGenerate = async () => {
    if (!user) return;

    const budgetLevel = budgetMode === 'auto'
      ? (healthGoal === 'weight_loss' ? 'low' : 'moderate')
      : budgetAmount
        ? (parseInt(budgetAmount) < 5000 ? 'low' : parseInt(budgetAmount) < 15000 ? 'moderate' : 'high')
        : 'moderate';

    const calTarget = caloriesTarget
      ? parseInt(caloriesTarget)
      : healthGoal === 'weight_loss' ? 1800 : healthGoal === 'muscle_gain' ? 2500 : 2000;

    if (calTarget < 500) {
      Alert.alert('Invalid', 'Please set a valid calorie target');
      return;
    }

    await store.generatePlan(user.id, {
      dietary_preferences: dietaryPrefs,
      budget_level: budgetLevel,
      budget_amount: budgetMode === 'fixed' ? (parseInt(budgetAmount) || undefined) : undefined,
      budget_period: budgetMode === 'fixed' ? budgetPeriod : undefined,
      budget_mode: budgetMode || undefined,
      calories_target: calTarget,
      meals_per_day: mealsPerDay,
      excluded_foods: excludedFoods.split(',').map(f => f.trim()).filter(Boolean),
      cuisine_style: cuisineStyle,
      health_goal: healthGoal,
    });
  };

  const handleSave = async () => {
    if (!user || !store.currentPlan) return;
    await store.savePlan(user.id, store.currentPlan);
    Alert.alert('Saved!', 'Meal plan saved to your collection');
  };

  const handleDelete = (plan: GeneratedMealPlan) => {
    Alert.alert('Delete Meal Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { if (user) store.deleteSavedPlan(user.id, plan.id); },
      },
    ]);
  };

  const handleStartOver = () => {
    setStepIndex(0);
    setStarted(false);
    setHealthGoal('');
    setBudgetMode(null);
    setBudgetAmount('');
    setBudgetPeriod('week');
    setCuisineStyle('any');
    setDietaryPrefs([]);
    setMealsPerDay(3);
    setExcludedFoods('');
    setCaloriesTarget('');
    store.clearCurrentPlan();
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {(['generate', 'saved'] as Tab[]).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
            style={[styles.tabItem, isActive && { backgroundColor: theme.accent }]}
          >
            <Ionicons
              name={tab === 'generate' ? 'sparkles' : 'bookmark'}
              size={16}
              color={isActive ? '#fff' : theme.textMuted}
            />
            <Text style={[styles.tabLabel, {
              color: isActive ? '#fff' : theme.textMuted,
              fontWeight: isActive ? '700' : '500',
            }]}>
              {tab === 'generate' ? 'Generate' : 'Saved'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepBarBg, { backgroundColor: theme.border }]}>
        <LinearGradient
          colors={[theme.accent, theme.gradStart] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.stepBarFill, { width: `${progress}%` as any }]}
        />
      </View>
      <View style={styles.stepInfoRow}>
        <TouchableOpacity onPress={prevStep} hitSlop={8} style={styles.stepBackBtn}>
          <Ionicons name="chevron-back" size={18} color={stepIndex > 0 ? theme.textPrimary : 'transparent'} />
        </TouchableOpacity>
        <Text style={[styles.stepCount, { color: theme.textMuted }]}>Step {stepIndex + 1} of {STEPS.length}</Text>
        <View style={{ width: 24 }} />
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step.key) {
      case 'goal':
        return (
          <View style={styles.stepOptions}>
            {HEALTH_GOALS.map(g => {
              const selected = healthGoal === g.key;
              return (
                <TouchableOpacity key={g.key} onPress={() => { setHealthGoal(g.key); nextStep(); }}
                  activeOpacity={0.8}
                  style={[styles.goalCard, {
                    backgroundColor: selected ? g.color + '20' : theme.card,
                    borderColor: selected ? g.color : theme.border,
                    borderWidth: selected ? 2 : 1,
                  }]}>
                  <View style={[styles.goalIconWrap, { backgroundColor: selected ? g.color : g.color + '15' }]}>
                    <Ionicons name={g.icon as any} size={22} color={selected ? '#fff' : g.color} />
                  </View>
                  <Text style={[styles.goalLabel, { color: selected ? g.color : theme.textPrimary }]}>{g.label}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={g.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'budget':
        return (
          <View style={styles.stepOptions}>
            {BUDGET_OPTIONS.map(b => {
              const selected = budgetMode === b.key;
              return (
                <TouchableOpacity key={b.key} onPress={() => setBudgetMode(b.key as any)}
                  activeOpacity={0.8}
                  style={[styles.budgetModeCard, {
                    backgroundColor: selected ? theme.accent + '18' : theme.card,
                    borderColor: selected ? theme.accent : theme.border,
                    borderWidth: selected ? 2 : 1,
                  }]}>
                  <View style={[styles.budgetModeIcon, { backgroundColor: selected ? theme.accent + '30' : theme.border }]}>
                    <Ionicons name={b.icon as any} size={24} color={selected ? theme.accent : theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.budgetModeLabel, { color: selected ? theme.accent : theme.textPrimary }]}>{b.label}</Text>
                    <Text style={[styles.budgetModeDesc, { color: theme.textMuted }]}>{b.desc}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}

            {budgetMode === 'fixed' && (
              <Animated.View style={{ opacity: fadeAnim, marginTop: spacing.md }}>
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>How much can you spend?</Text>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                  <Text style={[styles.currencySign, { color: theme.textPrimary }]}>₦</Text>
                  <TextInput
                    value={budgetAmount}
                    onChangeText={setBudgetAmount}
                    keyboardType="number-pad"
                    placeholder="e.g. 5000"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.amountInput, { color: theme.textPrimary }]}
                  />
                </View>
                <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginTop: spacing.md }]}>Per</Text>
                <View style={styles.periodRow}>
                  {BUDGET_PERIODS.map(p => {
                    const sel = budgetPeriod === p.key;
                    return (
                      <TouchableOpacity key={p.key} onPress={() => setBudgetPeriod(p.key as any)}
                        activeOpacity={0.7}
                        style={[styles.periodChip, {
                          backgroundColor: sel ? theme.accent : theme.card,
                          borderColor: sel ? theme.accent : theme.border,
                        }]}>
                        <Ionicons name={p.icon as any} size={14} color={sel ? '#fff' : theme.textMuted} />
                        <Text style={[styles.periodChipText, { color: sel ? '#fff' : theme.textSecondary }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {budgetMode === 'auto' && (
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={[styles.autoBudgetCard, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '44' }]}>
                  <Ionicons name="sparkles" size={20} color={theme.accent} />
                  <Text style={[styles.autoBudgetText, { color: theme.textSecondary }]}>
                    I'll calculate based on current local food prices and suggest affordable meals that fit your goals. For a tight budget, I focus on staple foods like rice, beans, yam, eggs, and seasonal veggies.
                  </Text>
                </View>
              </Animated.View>
            )}

            {budgetMode && (
              <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={[styles.continueBtn, { backgroundColor: theme.accent, marginTop: spacing.lg }]}>
                <Text style={styles.continueBtnText}>Continue →</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'cuisine':
        return (
          <View style={styles.stepOptions}>
            <View style={styles.cuisineGrid}>
              {CUISINE_STYLES.map(c => {
                const selected = cuisineStyle === c.key;
                return (
                  <TouchableOpacity key={c.key} onPress={() => { setCuisineStyle(c.key); }}
                    activeOpacity={0.8}
                    style={[styles.cuisineCard, {
                      backgroundColor: selected ? theme.accent + '18' : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                      borderWidth: selected ? 2 : 1,
                    }]}>
                    <Text style={[styles.cuisineLabel, { color: selected ? theme.accent : theme.textPrimary }]}>{c.label}</Text>
                    <Text style={[styles.cuisineDesc, { color: theme.textMuted }]}>{c.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={[styles.continueBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'dietary':
        return (
          <View style={styles.stepOptions}>
            <View style={styles.chipRow}>
              {DIETARY_PRESETS.map(pref => {
                const selected = dietaryPrefs.includes(pref);
                return (
                  <TouchableOpacity key={pref} onPress={() => toggleDietary(pref)}
                    activeOpacity={0.7}
                    style={[styles.chip, {
                      backgroundColor: selected ? theme.accent : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                    }]}>
                    <Text style={[styles.chipText, { color: selected ? '#fff' : theme.textSecondary }]}>
                      {pref.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={[styles.continueBtn, { backgroundColor: theme.accent, marginTop: spacing.lg }]}>
              <Text style={styles.continueBtnText}>{dietaryPrefs.length === 0 ? 'Skip →' : 'Continue →'}</Text>
            </TouchableOpacity>
          </View>
        );

      case 'meals':
        return (
          <View style={styles.stepOptions}>
            <View style={styles.mealsRow}>
              {[2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setMealsPerDay(n)}
                  activeOpacity={0.7}
                  style={[styles.mealCountCard, {
                    backgroundColor: mealsPerDay === n ? theme.accent : theme.card,
                    borderColor: mealsPerDay === n ? theme.accent : theme.border,
                    borderWidth: mealsPerDay === n ? 2 : 1,
                  }]}>
                  <Text style={[styles.mealCountNum, { color: mealsPerDay === n ? '#fff' : theme.textPrimary }]}>{n}</Text>
                  <Text style={[styles.mealCountLabel, { color: mealsPerDay === n ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>
                    {n === 2 ? 'meals' : 'meals'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={[styles.continueBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'exclude':
        return (
          <View style={styles.stepOptions}>
            <View style={[styles.excludeInputRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              <Ionicons name="close-circle-outline" size={20} color={theme.red} />
              <TextInput
                value={excludedFoods}
                onChangeText={setExcludedFoods}
                placeholder="e.g. mushrooms, peanuts, shrimp"
                placeholderTextColor={theme.textMuted}
                style={[styles.excludeInput, { color: theme.textPrimary }]}
              />
            </View>
            <Text style={[styles.fieldHint, { color: theme.textMuted }]}>
              Separate foods with commas. Leave blank if none.
            </Text>
            <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={[styles.continueBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'calories':
        return (
          <View style={styles.stepOptions}>
            <View style={[styles.autoBudgetCard, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '44' }]}>
              <Ionicons name="bulb-outline" size={20} color={theme.accent} />
              <Text style={[styles.autoBudgetText, { color: theme.textSecondary }]}>
                {healthGoal === 'weight_loss'
                  ? 'For weight loss, I recommend around 1800 kcal/day. You can adjust below.'
                  : healthGoal === 'muscle_gain'
                    ? 'For muscle gain, I recommend around 2500 kcal/day. Adjust as needed.'
                    : 'For general fitness, around 2000 kcal/day is a great starting point.'}
              </Text>
            </View>
            <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              <Ionicons name="flame-outline" size={20} color={theme.accent} />
              <TextInput
                value={caloriesTarget}
                onChangeText={setCaloriesTarget}
                keyboardType="number-pad"
                placeholder={healthGoal === 'weight_loss' ? '1800' : healthGoal === 'muscle_gain' ? '2500' : '2000'}
                placeholderTextColor={theme.textMuted}
                style={[styles.amountInput, { color: theme.textPrimary }]}
              />
              <Text style={[styles.amountSuffix, { color: theme.textMuted }]}>kcal/day</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} style={styles.welcomeIconWrap}>
        <Ionicons name="restaurant-outline" size={40} color="#fff" />
      </LinearGradient>
      <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>Smart Meal Plan</Text>
      <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>
        Answer a few questions and I'll create a personalized meal plan based on your budget, preferences, and goals — with local Indian ingredients in mind.
      </Text>
      <View style={styles.welcomeFeatures}>
        {[
          { icon: 'wallet-outline', text: 'Works with any budget — even ₹500/day' },
          { icon: 'restaurant-outline', text: 'Knows local Indian ingredients & prices' },
          { icon: 'trending-down', text: 'Tailored to your health goals' },
          { icon: 'sparkles-outline', text: 'AI-powered smart suggestions' },
        ].map((f, i) => (
          <View key={i} style={styles.welcomeFeatureRow}>
            <Ionicons name={f.icon as any} size={16} color={theme.accent} />
            <Text style={[styles.welcomeFeatureText, { color: theme.textSecondary }]}>{f.text}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={() => setStarted(true)} activeOpacity={0.85} style={styles.getStartedWrap}>
        <LinearGradient colors={[theme.accent, '#0A9A5E'] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.getStartedBtn}>
          <Text style={styles.getStartedText}>Get Started →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderQuestionnaire = () => (
    <View style={{ flex: 1 }}>
      {renderStepIndicator()}
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.stepHeaderCard, { backgroundColor: theme.accent + '08', borderColor: theme.accent + '22' }]}>
          <View style={[styles.stepIconWrap, { backgroundColor: theme.accent + '18' }]}>
            <Ionicons name={step.icon as any} size={24} color={theme.accent} />
          </View>
          <Text style={[styles.stepQuestion, { color: theme.textPrimary }]}>{step.question}</Text>
          <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>{step.subtitle}</Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {renderStepContent()}

          {step.key === 'goal' && (
            <Text style={[styles.tapHint, { color: theme.textMuted }]}>Tap an option to continue</Text>
          )}

          {step.key === 'calories' && (
            <TouchableOpacity onPress={handleGenerate} disabled={store.isLoading} activeOpacity={0.8}
              style={[styles.generateBtn, { backgroundColor: theme.accent, opacity: store.isLoading ? 0.7 : 1 }]}>
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>
                {store.isLoading ? 'Generating...' : '✨ Generate My Meal Plan'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingOverlay}>
      <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <LinearGradient
          colors={['#2DDC8C', '#0A9A5E'] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.loadingIconWrap}
        >
          <Ionicons name="restaurant-outline" size={40} color="#fff" />
        </LinearGradient>
        <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>
          Cooking Up Your Meal Plan
        </Text>
        <Text style={[styles.loadingSub, { color: theme.textMuted }]}>
          AI is analyzing your preferences, budget, and local ingredient prices...
        </Text>

        <View style={[styles.loadingProgressWrap, { backgroundColor: theme.border }]}>
          <Animated.View style={[styles.loadingProgressBar, { backgroundColor: theme.accent }]} />
        </View>

        <TouchableOpacity disabled style={[styles.loadingCancelBtn, { borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.loadingCancelText, { color: theme.textMuted }]}>Generating...</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMealPlanResult = () => {
    if (!store.currentPlan) return null;
    const plan = store.currentPlan;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[theme.heroCard, '#1a1a2e'] as [string, string]}
          style={styles.resultHero}>
          <Ionicons name="restaurant-outline" size={32} color="#fff" />
          <Text style={styles.resultHeroTitle}>{plan.title}</Text>
          <Text style={styles.resultHeroDesc}>{plan.description}</Text>
          <View style={styles.resultMetaRow}>
            <View style={[styles.resultMetaChip, { backgroundColor: theme.accent + '30' }]}>
              <Ionicons name="flame-outline" size={12} color="#fff" />
              <Text style={styles.resultMetaText}>{plan.daily_calories} kcal</Text>
            </View>
            <View style={[styles.resultMetaChip, { backgroundColor: theme.purple + '30' }]}>
              <Ionicons name="wallet-outline" size={12} color="#fff" />
              <Text style={styles.resultMetaText}>{plan.budget_level}</Text>
            </View>
            <View style={[styles.resultMetaChip, { backgroundColor: '#FFB830' + '30' }]}>
              <Ionicons name="restaurant-outline" size={12} color="#fff" />
              <Text style={styles.resultMetaText}>{plan.meals.length} meals</Text>
            </View>
          </View>
        </LinearGradient>

        {plan.ai_notes ? (
          <View style={[styles.notesBox, { backgroundColor: theme.accent + '10', borderLeftColor: theme.accent }]}>
            <Ionicons name="bulb-outline" size={16} color={theme.accent} />
            <Text style={[styles.notesText, { color: theme.textSecondary }]}>{plan.ai_notes}</Text>
          </View>
        ) : null}

        {plan.meals.map((meal, i) => (
          <View key={i} style={[styles.mealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.mealHeader}>
              <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]}
                style={styles.mealIconWrap}>
                <Ionicons
                  name={i === 0 ? 'sunny-outline' : i === plan.meals.length - 1 ? 'moon-outline' : 'restaurant-outline'}
                  size={16} color="#fff"
                />
              </LinearGradient>
              <Text style={[styles.mealName, { color: theme.textPrimary }]}>{meal.name}</Text>
              <Text style={[styles.mealCal, { color: theme.accent }]}>{meal.calories} kcal</Text>
            </View>
            {meal.foods.map((food, j) => (
              <View key={j} style={[styles.foodRow, { borderColor: theme.border }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                <Text style={[styles.foodName, { color: theme.textSecondary }]}>{food}</Text>
              </View>
            ))}
            {(meal.protein_g != null || meal.carbs_g != null || meal.fats_g != null) && (
              <View style={styles.macroRow}>
                {meal.protein_g != null && (
                  <View style={[styles.macroPill, { backgroundColor: '#FF6B35' + '18' }]}>
                    <Text style={[styles.macroText, { color: '#FF6B35' }]}>P {meal.protein_g}g</Text>
                  </View>
                )}
                {meal.carbs_g != null && (
                  <View style={[styles.macroPill, { backgroundColor: '#FFB830' + '18' }]}>
                    <Text style={[styles.macroText, { color: '#FFB830' }]}>C {meal.carbs_g}g</Text>
                  </View>
                )}
                {meal.fats_g != null && (
                  <View style={[styles.macroPill, { backgroundColor: '#4A90E2' + '18' }]}>
                    <Text style={[styles.macroText, { color: '#4A90E2' }]}>F {meal.fats_g}g</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8}
            style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="bookmark-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save Meal Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStartOver} activeOpacity={0.8}
            style={[styles.newBtn, { borderColor: theme.border }]}>
            <Ionicons name="refresh-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.newBtnText, { color: theme.textMuted }]}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderGenerateContent = () => {
    if (store.isLoading) return renderLoading();
    if (store.currentPlan) return renderMealPlanResult();
    return !started ? renderWelcome() : renderQuestionnaire();
  };

  const renderSavedPlans = () => {
    if (store.savedPlans.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No saved meal plans</Text>
          <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
            Generate a meal plan and save it to see it here
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={store.savedPlans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.savedList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveTab('generate')}
            activeOpacity={0.85}
            style={[styles.savedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.savedCardBody}>
              <Text style={[styles.savedTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.savedMeta, { color: theme.textSecondary }]}>
                {item.daily_calories} kcal  ·  {item.meals.length} meals  ·  {item.budget_level}
              </Text>
              <Text style={[styles.savedDate, { color: theme.textMuted }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.savedActions}>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={12} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={theme.red} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Meal Plans</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {store.currentPlan ? 'Your meal plan is ready' : 'Smart AI meal planning'}
            </Text>
          </View>
        </View>
      </View>

      {renderTabBar()}

      <View style={styles.content}>
        {activeTab === 'generate' && renderGenerateContent()}
        {activeTab === 'saved' && renderSavedPlans()}
      </View>

      {store.error && (
        <View style={[styles.errorBar, { backgroundColor: theme.red }]}>
          <Text style={styles.errorText}>{store.error}</Text>
          <TouchableOpacity onPress={store.clearError} hitSlop={12}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: fontSize.sm, marginTop: 2 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: 12, padding: 3, borderWidth: 1,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  tabLabel: { fontSize: fontSize.sm },

  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.huge + 40 },

  // Welcome
  welcomeContainer: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' },
  welcomeIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  welcomeTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: spacing.sm, textAlign: 'center' },
  welcomeSub: { fontSize: fontSize.base, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  welcomeFeatures: { width: '100%', gap: spacing.md, marginBottom: spacing.xl },
  welcomeFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  welcomeFeatureText: { fontSize: fontSize.sm, flex: 1, lineHeight: 18 },
  getStartedWrap: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#2DDC8C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 6 }, web: { boxShadow: '0 4px 10px rgba(45,220,140,0.3)' } }) },
  getStartedBtn: { padding: spacing.lg, alignItems: 'center' },
  getStartedText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '800', letterSpacing: 0.5 },

  // Step indicator
  stepIndicator: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  stepBarBg: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.sm },
  stepBarFill: { height: '100%', borderRadius: 2 },
  stepInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBackBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontSize: fontSize.xs, fontWeight: '600' },
  stepScroll: { flex: 1 },
  stepScrollContent: { padding: spacing.lg, paddingBottom: spacing.huge + 40 },

  // Step header
  stepHeaderCard: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  stepIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepQuestion: { fontSize: fontSize.xl, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  stepSubtitle: { fontSize: fontSize.sm, textAlign: 'center' },

  // Step options
  stepOptions: { flex: 1 },
  tapHint: { textAlign: 'center', fontSize: fontSize.xs, marginTop: spacing.lg, letterSpacing: 0.3 },

  // Goal cards
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }, android: { elevation: 3 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } }),
  },
  goalIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { flex: 1, fontSize: fontSize.base, fontWeight: '700' },

  // Budget
  budgetModeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }, android: { elevation: 3 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } }),
  },
  budgetModeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  budgetModeLabel: { fontSize: fontSize.base, fontWeight: '700' },
  budgetModeDesc: { fontSize: fontSize.xs, marginTop: 2 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing.sm },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1,
  },
  currencySign: { fontSize: fontSize.xl, fontWeight: '700' },
  amountInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSize.lg, fontWeight: '700' },
  amountSuffix: { fontSize: fontSize.sm, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  periodChipText: { fontSize: fontSize.sm, fontWeight: '600' },
  autoBudgetCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md },
  autoBudgetText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },

  // Cuisine
  cuisineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cuisineCard: {
    width: '47%', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
    gap: spacing.xs,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 4px rgba(0,0,0,0.06)' } }),
  },
  cuisineLabel: { fontSize: fontSize.base, fontWeight: '700' },
  cuisineDesc: { fontSize: fontSize.xs, lineHeight: 14 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1,
  },
  chipText: { fontSize: fontSize.sm, fontWeight: '600' },

  // Meals per day
  mealsRow: { flexDirection: 'row', gap: spacing.md },
  mealCountCard: {
    flex: 1, alignItems: 'center', padding: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, gap: spacing.xs,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }, android: { elevation: 3 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } }),
  },
  mealCountNum: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  mealCountLabel: { fontSize: fontSize.xs, fontWeight: '600' },

  // Exclude
  excludeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1,
  },
  excludeInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSize.base },
  fieldHint: { fontSize: fontSize.xs, marginTop: spacing.xs, marginBottom: spacing.md },

  // Continue / Generate
  continueBtn: { padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  continueBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.lg,
    marginTop: spacing.lg, marginBottom: spacing.huge,
    ...Platform.select({ ios: { shadowColor: '#2DDC8C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 6 }, web: { boxShadow: '0 4px 10px rgba(45,220,140,0.3)' } }),
  },
  generateBtnText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '800' },

  // Loading
  loadingOverlay: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  loadingCard: { borderRadius: radius.xl, padding: spacing.xxl, borderWidth: 1, alignItems: 'center' },
  loadingIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  loadingTitle: { fontSize: fontSize.xl, fontWeight: '900', marginBottom: spacing.xs, letterSpacing: -0.3 },
  loadingSub: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl, paddingHorizontal: spacing.md },
  loadingProgressWrap: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.lg },
  loadingProgressBar: { width: '60%', height: '100%', borderRadius: 2 },
  loadingCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, opacity: 0.7 },
  loadingCancelText: { fontSize: fontSize.xs, fontWeight: '600' },

  // Result
  resultHero: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  resultHeroTitle: { fontSize: fontSize.xl, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  resultHeroDesc: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  resultMetaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  resultMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  resultMetaText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },

  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderLeftWidth: 3, marginBottom: spacing.md },
  notesText: { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },

  mealCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  mealIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealName: { flex: 1, fontSize: fontSize.base, fontWeight: '700' },
  mealCal: { fontSize: fontSize.sm, fontWeight: '700' },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, borderBottomWidth: 0.5 },
  foodName: { fontSize: fontSize.sm, flex: 1 },
  macroRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  macroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  macroText: { fontSize: 10, fontWeight: '700' },

  actionRow: { marginTop: spacing.lg, gap: spacing.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  saveBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  newBtnText: { fontSize: fontSize.base, fontWeight: '600' },

  errorBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, position: 'absolute', bottom: 0, left: 0, right: 0 },
  errorText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600', flex: 1 },

  // Saved plans
  savedList: { padding: spacing.lg, paddingBottom: spacing.huge },
  savedCard: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  savedCardBody: { flex: 1 },
  savedTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  savedMeta: { fontSize: fontSize.md, marginTop: 4 },
  savedDate: { fontSize: fontSize.sm, marginTop: 4 },
  savedActions: { justifyContent: 'center', paddingLeft: spacing.md },
  deleteBtn: { padding: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.md },
  emptyDesc: { fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm },
});
