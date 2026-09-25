import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { spacing, radius, fontSize } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
} from '../../components/premium/premiumEffects';
import { caloriePremiumTheme } from '../../components/calorie/PremiumCalorieUI';
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
  {
    key: 'basics',
    question: 'Create Your Meal Plan',
    subtitle: 'Goals, budget, and food preferences',
    icon: 'sparkles-outline',
  },
  { key: 'cuisine', question: 'What cuisine do you prefer?', subtitle: 'I know local Indian ingredients too!', icon: 'restaurant-outline' },
  { key: 'exclude', question: 'Any foods to avoid?', subtitle: 'Not a fan of anything? Let me know', icon: 'close-circle-outline' },
  { key: 'calories', question: 'Daily calorie target?', subtitle: "I'll auto-calculate based on your goal if you're not sure", icon: 'flame-outline' },
  { key: 'review', question: 'Ready to generate?', subtitle: 'Review your choices — you can go back to edit', icon: 'checkmark-done-outline' },
];

const PRIMARY_GOALS = [
  { key: 'weight_loss', label: 'Weight Loss', icon: 'trending-down-outline' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-outline' },
  { key: 'maintain', label: 'Maintain Weight', icon: 'scale-outline' },
  { key: 'more_energy', label: 'Better Health', icon: 'heart-outline' },
];

const FOOD_PREF_CHIPS = [
  { key: 'vegetarian', label: 'Vegetarian', store: 'vegetarian' },
  { key: 'non_vegetarian', label: 'Non-Vegetarian', store: 'high_protein' },
  { key: 'jain', label: 'Jain', store: 'jain' },
  { key: 'eggetarian', label: 'Eggetarian', store: 'eggetarian' },
  { key: 'dairy_free', label: 'No Dairy', store: 'dairy_free' },
  { key: 'gluten_free', label: 'No Gluten', store: 'gluten_free' },
];

const BUDGET_DAY_MAX = 1500;

const CUISINE_STYLES = [
  { key: 'indian', label: 'Indian 🇮🇳', desc: 'Dal, roti, biryani, dosa & more' },
  { key: 'any', label: 'Any Cuisine', desc: 'Surprise me with variety' },
  { key: 'italian', label: 'Italian', desc: 'Pasta, pizza, Mediterranean flavors' },
  { key: 'asian', label: 'Asian', desc: 'Rice, noodles, stir-fry dishes' },
  { key: 'mediterranean', label: 'Mediterranean', desc: 'Olive oil, grains, lean proteins' },
  { key: 'mexican', label: 'Mexican', desc: 'Tacos, burritos, beans, salsa' },
  { key: 'american', label: 'American', desc: 'Burgers, grilled food, salads' },
];

export default function MealPlanScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = caloriePremiumTheme;
  const { user } = useAuthStore();
  const store = useMealPlanStore();
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [healthGoal, setHealthGoal] = useState('');
  const [dailyBudget, setDailyBudget] = useState(500);
  const [budgetTrackWidth, setBudgetTrackWidth] = useState(1);
  const [foodPrefKeys, setFoodPrefKeys] = useState<string[]>([]);
  const [budgetMode, setBudgetMode] = useState<'fixed' | 'auto' | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'day' | 'week' | 'month'>('day');
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

  const toggleFoodPref = (chipKey: string, storeKey: string) => {
    setFoodPrefKeys(prev => {
      const turningOff = prev.includes(chipKey);
      let nextKeys = turningOff ? prev.filter(k => k !== chipKey) : [...prev, chipKey];
      if (!turningOff && chipKey === 'vegetarian') nextKeys = nextKeys.filter(k => k !== 'non_vegetarian');
      if (!turningOff && chipKey === 'non_vegetarian') nextKeys = nextKeys.filter(k => k !== 'vegetarian');

      setDietaryPrefs(dprefs => {
        let nextPrefs = turningOff ? dprefs.filter(p => p !== storeKey) : [...dprefs, storeKey];
        if (!turningOff && chipKey === 'vegetarian') nextPrefs = nextPrefs.filter(p => p !== 'high_protein');
        if (!turningOff && chipKey === 'non_vegetarian') nextPrefs = nextPrefs.filter(p => p !== 'vegetarian');
        return nextPrefs;
      });
      return nextKeys;
    });
  };

  const setBudgetFromRatio = (ratio: number) => {
    const raw = Math.round(ratio * BUDGET_DAY_MAX / 50) * 50;
    const clamped = Math.max(0, Math.min(BUDGET_DAY_MAX, raw));
    setDailyBudget(clamped);
    if (clamped <= 0) {
      setBudgetMode('auto');
      setBudgetAmount('');
    } else {
      setBudgetMode('fixed');
      setBudgetAmount(String(clamped));
      setBudgetPeriod('day');
    }
  };

  const canProceed = () => {
    switch (step.key) {
      case 'basics': return healthGoal !== '';
      case 'cuisine': return cuisineStyle !== '';
      case 'exclude': return true;
      case 'calories': return true;
      case 'review': return true;
      default: return true;
    }
  };

  const goalLabel = PRIMARY_GOALS.find(g => g.key === healthGoal)?.label ?? healthGoal;

  const handleGenerate = async () => {
    if (!user) return;

    const dayBudget = dailyBudget > 0 ? dailyBudget : budgetPeriod === 'day' ? parseInt(budgetAmount) || 0 : 0;
    const budgetLevel =
      budgetMode === 'auto' || dayBudget <= 0
        ? healthGoal === 'weight_loss'
          ? 'low'
          : 'moderate'
        : dayBudget < 400
          ? 'low'
          : dayBudget < 900
            ? 'moderate'
            : 'high';

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
    setDailyBudget(500);
    setFoodPrefKeys([]);
    setBudgetMode(null);
    setBudgetAmount('');
    setBudgetPeriod('day');
    setCuisineStyle('any');
    setDietaryPrefs([]);
    setMealsPerDay(3);
    setExcludedFoods('');
    setCaloriesTarget('');
    store.clearCurrentPlan();
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {(['generate', 'saved'] as Tab[]).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.88}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
        <Text style={[styles.stepCount, { color: theme.textMuted }]}>{stepIndex + 1} of {STEPS.length}</Text>
        <View style={{ width: 24 }} />
      </View>
    </View>
  );

  const renderBasicsStep = () => {
    const budgetPct = dailyBudget / BUDGET_DAY_MAX;
    const thumbLeft = Math.max(0, Math.min(1, budgetPct));

    return (
      <View style={styles.stepOptions}>
        <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Primary Goal</Text>
        <View style={styles.goalGrid}>
          {PRIMARY_GOALS.map(g => {
            const selected = healthGoal === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                onPress={() => setHealthGoal(g.key)}
                activeOpacity={0.85}
                style={[
                  styles.goalTile,
                  {
                    backgroundColor: selected ? theme.accent + '14' : theme.card,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
              >
                <Ionicons name={g.icon as any} size={20} color={selected ? theme.accent : theme.textMuted} />
                <Text style={[styles.goalTileLabel, { color: selected ? theme.accent : theme.textPrimary }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: spacing.lg }]}>
          Daily Budget <Text style={{ color: theme.textMuted, fontWeight: '500' }}>(Optional)</Text>
        </Text>
        <View style={styles.budgetSliderWrap}>
          <View style={[styles.budgetTooltip, { backgroundColor: theme.accent }]}>
            <Text style={styles.budgetTooltipText}>
              {dailyBudget <= 0 ? 'Flexible budget' : `₹${dailyBudget}/day`}
            </Text>
          </View>
          <View
            style={[styles.budgetTrack, { backgroundColor: theme.border }]}
            onLayout={e => setBudgetTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={e => setBudgetFromRatio(e.nativeEvent.locationX / budgetTrackWidth)}
            onResponderMove={e => setBudgetFromRatio(e.nativeEvent.locationX / budgetTrackWidth)}
          >
            <View style={[styles.budgetFill, { width: `${thumbLeft * 100}%`, backgroundColor: theme.accent }]} />
            <View
              style={[
                styles.budgetThumb,
                { left: `${thumbLeft * 100}%`, borderColor: theme.accent, backgroundColor: PREMIUM_BG },
              ]}
            />
          </View>
          <View style={styles.budgetRangeLabels}>
            <Text style={[styles.budgetRangeText, { color: theme.textMuted }]}>₹0</Text>
            <Text style={[styles.budgetRangeText, { color: theme.textMuted }]}>₹1,500</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: spacing.lg }]}>Food Preferences</Text>
        <View style={styles.chipRow}>
          {FOOD_PREF_CHIPS.map(chip => {
            const selected = foodPrefKeys.includes(chip.key);
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => toggleFoodPref(chip.key, chip.store)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accent + '22' : theme.card,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? theme.accent : theme.textSecondary }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: spacing.lg }]}>Meals per Day</Text>
        <View style={styles.mealsRow}>
          {[2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => setMealsPerDay(n)}
              activeOpacity={0.7}
              style={[
                styles.mealCountCard,
                {
                  backgroundColor: mealsPerDay === n ? theme.accent : theme.card,
                  borderColor: mealsPerDay === n ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={[styles.mealCountNum, { color: mealsPerDay === n ? '#fff' : theme.textPrimary }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={nextStep}
          disabled={!canProceed()}
          activeOpacity={0.9}
          style={[styles.nextBtnWrap, { opacity: canProceed() ? 1 : 0.45 }]}
        >
          <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step.key) {
      case 'basics':
        return renderBasicsStep();

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

      case 'review':
        return (
          <View style={styles.stepOptions}>
            <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {[
                ['Goal', goalLabel],
                ['Budget', dailyBudget > 0 ? `₹${dailyBudget}/day` : 'Flexible (AI picks)'],
                ['Meals', `${mealsPerDay} per day`],
                ['Cuisine', CUISINE_STYLES.find(c => c.key === cuisineStyle)?.label ?? cuisineStyle],
                [
                  'Preferences',
                  foodPrefKeys.length
                    ? FOOD_PREF_CHIPS.filter(c => foodPrefKeys.includes(c.key)).map(c => c.label).join(', ')
                    : 'None selected',
                ],
                ['Calories', caloriesTarget ? `${caloriesTarget} kcal/day` : 'Auto from goal'],
              ].map(([label, value]) => (
                <View key={label} style={[styles.reviewRow, { borderColor: theme.border }]}>
                  <Text style={[styles.reviewLabel, { color: theme.textMuted }]}>{label}</Text>
                  <Text style={[styles.reviewValue, { color: theme.textPrimary }]}>{value}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={store.isLoading}
              activeOpacity={0.9}
              style={[styles.nextBtnWrap, { opacity: store.isLoading ? 0.7 : 1 }]}
            >
              <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                <Ionicons name="sparkles-outline" size={20} color={PREMIUM_BG} />
                <Text style={styles.nextBtnText}>{store.isLoading ? 'Generating…' : 'Generate My Meal Plan'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const renderWelcome = () => (
    <ScrollView contentContainerStyle={styles.welcomeContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.welcomeHero}>
        <Text style={styles.welcomeHeroEmoji}>🤖</Text>
        <Text style={styles.welcomeHeroFood}>🥗</Text>
      </View>
      <Text style={styles.welcomeTitle}>Smart Meal Plan</Text>
      <Text style={styles.welcomeSub}>
        AI creates personalized meal plans based on your budget, preferences, and health goals — with local Indian ingredients in mind.
      </Text>
      <View style={styles.featureGrid}>
        {[
          { icon: 'cash-outline' as const, title: 'Budget', text: 'Works with any budget (e.g. ₹500/day)', color: PREMIUM_ACCENT },
          { icon: 'leaf-outline' as const, title: 'Local', text: 'Knows local Indian ingredients & prices', color: '#4A90E2' },
          { icon: 'heart-outline' as const, title: 'Goals', text: 'Tailored to your health goals', color: '#FF6B6B' },
          { icon: 'sparkles-outline' as const, title: 'AI', text: 'AI-powered smart suggestions', color: '#B280FF' },
        ].map((f) => (
          <View key={f.title} style={styles.featureCell}>
            <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
              <Ionicons name={f.icon} size={18} color={f.color} />
            </View>
            <Text style={styles.featureCellTitle}>{f.title}</Text>
            <Text style={styles.featureCellText}>{f.text}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={() => {
          setStarted(true);
          setBudgetMode('fixed');
          setBudgetAmount('500');
          setBudgetPeriod('day');
        }}
        activeOpacity={0.9}
        style={styles.getStartedWrap}
      >
        <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.getStartedBtn}>
          <Text style={styles.getStartedText}>Get Started →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
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
        {step.key !== 'basics' && (
          <View style={[styles.stepHeaderCard, { backgroundColor: theme.accent + '08', borderColor: theme.accent + '22' }]}>
            <View style={[styles.stepIconWrap, { backgroundColor: theme.accent + '18' }]}>
              <Ionicons name={step.icon as any} size={24} color={theme.accent} />
            </View>
            <Text style={[styles.stepQuestion, { color: theme.textPrimary }]}>{step.question}</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>{step.subtitle}</Text>
          </View>
        )}

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {renderStepContent()}

          {step.key === 'calories' && (
            <TouchableOpacity onPress={nextStep} activeOpacity={0.9} style={styles.nextBtnWrap}>
              <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </LinearGradient>
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
          <Ionicons name="bookmark-outline" size={48} color={PREMIUM_MUTED} />
          <Text style={styles.emptyTitle}>No saved meal plans</Text>
          <Text style={styles.emptyDesc}>
            Generate a meal plan and save it to see it here
          </Text>
          <TouchableOpacity onPress={() => setActiveTab('generate')} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>Generate a plan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={store.savedPlans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.savedList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isActive = index === 0;
          const weeks = Math.max(1, Math.round(item.meals.length / 7)) || 4;
          return (
            <View style={[styles.savedCard, isActive && styles.savedCardActive]}>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE PLAN</Text>
                </View>
              )}
              <View style={styles.savedRow}>
                <View style={styles.savedCardBody}>
                  <Text style={styles.savedTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.savedMeta}>
                    {item.daily_calories} kcal/day · {item.meals.length} meals
                  </Text>
                  <Text style={styles.savedTags}>
                    {item.dietary_preferences?.[0]?.replace(/_/g, ' ') || 'Balanced'} · {weeks} weeks
                  </Text>
                </View>
                <View style={styles.savedThumb}>
                  <Text style={{ fontSize: 28 }}>🍲</Text>
                </View>
              </View>
              <View style={styles.savedBtnRow}>
                <TouchableOpacity
                  style={[styles.viewPlanBtn, isActive && styles.viewPlanBtnFilled]}
                  onPress={() => {
                    useMealPlanStore.setState({ currentPlan: item });
                    setActiveTab('generate');
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.viewPlanText, isActive && { color: PREMIUM_BG }]}>View Plan →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editPlanBtn}
                  onPress={() => { setActiveTab('generate'); setStarted(true); }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="create-outline" size={16} color={PREMIUM_MUTED} />
                  <Text style={styles.editPlanText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={18} color={theme.red} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PremiumAtmosphereBackground />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Meal Plans</Text>
            <Text style={styles.subtitle}>
              {started && !store.currentPlan
                ? 'Create Your Meal Plan'
                : store.currentPlan
                  ? 'Your meal plan is ready'
                  : 'Smart AI meal planning'}
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
  root: { flex: 1, backgroundColor: PREMIUM_BG },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: PREMIUM_TEXT },
  subtitle: { fontSize: fontSize.sm, marginTop: 2, color: PREMIUM_MUTED },

  tabBar: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.full, padding: 4, borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
  },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: radius.full, alignItems: 'center' },
  tabItemActive: { backgroundColor: PREMIUM_ACCENT },
  tabLabel: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_MUTED },
  tabLabelActive: { color: PREMIUM_BG },

  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.huge + 40 },

  welcomeContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.huge, alignItems: 'center' },
  welcomeHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  welcomeHeroEmoji: { fontSize: 56 },
  welcomeHeroFood: { fontSize: 48 },
  welcomeTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: spacing.sm, textAlign: 'center', color: PREMIUM_TEXT },
  welcomeSub: { fontSize: fontSize.base, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, paddingHorizontal: spacing.md, color: PREMIUM_MUTED },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%', marginBottom: spacing.xl },
  featureCell: {
    width: '47%', padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: PREMIUM_GLASS, borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER,
  },
  featureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  featureCellTitle: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT },
  featureCellText: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 4, lineHeight: 14 },
  getStartedWrap: { width: '100%', borderRadius: radius.lg + 4, overflow: 'hidden' },
  getStartedBtn: { padding: spacing.lg, alignItems: 'center' },
  getStartedText: { color: PREMIUM_BG, fontSize: fontSize.lg, fontWeight: '800' },

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
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '800', marginBottom: spacing.sm },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalTile: {
    width: '47%', paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: 6,
  },
  goalTileLabel: { fontSize: fontSize.xs, fontWeight: '700', textAlign: 'center' },
  budgetSliderWrap: { marginTop: spacing.xs },
  budgetTooltip: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm, marginBottom: spacing.sm,
  },
  budgetTooltipText: { color: PREMIUM_BG, fontSize: fontSize.xs, fontWeight: '800' },
  budgetTrack: { height: 8, borderRadius: 4, justifyContent: 'center', overflow: 'visible' },
  budgetFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  budgetThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    marginLeft: -11, top: -7,
  },
  budgetRangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  budgetRangeText: { fontSize: fontSize.xs, fontWeight: '600' },
  nextBtnWrap: { width: '100%', borderRadius: radius.lg + 2, overflow: 'hidden', marginTop: spacing.xl },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg,
  },
  nextBtnText: { color: PREMIUM_BG, fontSize: fontSize.lg, fontWeight: '800' },
  reviewCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  reviewValue: { fontSize: fontSize.sm, fontWeight: '700', flex: 1, textAlign: 'right' },

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
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, borderWidth: 1,
  },
  mealCountNum: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
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

  savedList: { padding: spacing.lg, paddingBottom: spacing.huge },
  savedCard: {
    borderRadius: radius.lg + 2, borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS, padding: spacing.lg, marginBottom: spacing.md,
  },
  savedCardActive: { borderColor: 'rgba(45,220,140,0.35)' },
  activeBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(45,220,140,0.2)',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, marginBottom: spacing.sm,
  },
  activeBadgeText: { fontSize: 9, fontWeight: '800', color: PREMIUM_ACCENT, letterSpacing: 0.5 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savedCardBody: { flex: 1 },
  savedTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  savedMeta: { fontSize: fontSize.sm, marginTop: 4, color: PREMIUM_MUTED },
  savedTags: { fontSize: fontSize.xs, marginTop: 4, color: PREMIUM_MUTED, textTransform: 'capitalize' },
  savedThumb: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  savedBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  viewPlanBtn: {
    flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md,
    borderWidth: 1, borderColor: PREMIUM_ACCENT, alignItems: 'center',
  },
  viewPlanBtnFilled: { backgroundColor: PREMIUM_ACCENT, borderColor: PREMIUM_ACCENT },
  viewPlanText: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_ACCENT },
  editPlanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER,
  },
  editPlanText: { fontSize: fontSize.sm, fontWeight: '600', color: PREMIUM_MUTED },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.md, color: PREMIUM_TEXT },
  emptyDesc: { fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm, color: PREMIUM_MUTED },
  emptyCta: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: PREMIUM_ACCENT },
  emptyCtaText: { color: PREMIUM_BG, fontWeight: '800' },
});
