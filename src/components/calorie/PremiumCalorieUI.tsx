import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { spacing, radius, fontSize, colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { suggestRecipes } from '../../services/nvidia-client';
import {
  PREMIUM_BG,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  premiumGlassShadow,
} from '../premium/premiumEffects';

export const caloriePremiumTheme: typeof colors.dark = {
  ...colors.dark,
  bg: PREMIUM_BG,
  card: PREMIUM_GLASS,
  border: PREMIUM_GLASS_BORDER,
  surface: PREMIUM_GLASS,
};

const glassShadow = premiumGlassShadow();

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface FoodEntryLite {
  id: string;
  food_name: string;
  calories: number;
  meal_type: MealType;
}

function CalorieRing({ size, pct, consumed }: { size: number; pct: number; consumed: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));

  return (
    <View style={styles.ringGlow}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(45,220,140,0.15)" strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={PREMIUM_ACCENT}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Ionicons name="flame" size={18} color={PREMIUM_ACCENT} />
        <Text style={styles.ringKcal}>{consumed.toLocaleString()}</Text>
        <Text style={styles.ringSub}>kcal consumed</Text>
      </View>
    </View>
  );
}

export function PremiumCalorieToggle({
  active,
  onChange,
}: {
  active: 'tracker' | 'mealplan';
  onChange: (v: 'tracker' | 'mealplan') => void;
}) {
  return (
    <View style={[styles.toggleWrap, glassShadow]}>
      {(['tracker', 'mealplan'] as const).map((id) => {
        const isActive = active === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onChange(id)}
            style={[styles.toggleTab, isActive && styles.toggleTabActive]}
            activeOpacity={0.88}
          >
            <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
              {id === 'tracker' ? 'Tracker' : 'Meal Plan'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function PremiumCalorieHero({
  consumed,
  goal,
  onOpenCalorie,
}: {
  consumed: number;
  goal: number;
  onOpenCalorie?: () => void;
}) {
  const pct = goal > 0 ? consumed / goal : 0;
  const remaining = Math.max(goal - consumed, 0);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onOpenCalorie}>
      <LinearGradient
        colors={['rgba(45,220,140,0.2)', 'rgba(178,128,255,0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBorder}
      >
        <View style={[styles.heroCard, glassShadow]}>
          <LinearGradient
            colors={['rgba(45,220,140,0.08)', 'rgba(45,220,140,0)']}
            style={styles.heroWave}
            pointerEvents="none"
          />
          <View style={styles.heroBody}>
            <CalorieRing size={112} pct={pct} consumed={consumed} />
            <View style={styles.heroStats}>
              <Text style={styles.heroRemaining}>{remaining.toLocaleString()} kcal left</Text>
              <Text style={styles.heroPct}>{Math.round(Math.min(pct, 1) * 100)}% of daily goal</Text>
              <View style={styles.heroBarBg}>
                <LinearGradient
                  colors={['#34F5A4', PREMIUM_ACCENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroBarFill, { width: `${Math.max(pct * 100, 3)}%` as `${number}%` }]}
                />
              </View>
              <Text style={styles.heroGoalLine}>Goal {goal.toLocaleString()} kcal</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function PremiumSuggestRecipes({ remaining }: { remaining: number }) {
  const [suggesting, setSuggesting] = useState(false);
  const [recipeSuggestions, setRecipeSuggestions] = useState<any[] | null>(null);

  const handleSuggest = async () => {
    const { user } = useAuthStore.getState();
    if (!user?.id || remaining <= 0) return;
    setSuggesting(true);
    const remProtein = Math.round(remaining * 0.3 / 4);
    const remCarbs = Math.round(remaining * 0.45 / 4);
    const remFats = Math.round(remaining * 0.25 / 9);
    const result = await suggestRecipes(user.id, remProtein, remCarbs, remFats);
    setSuggesting(false);
    if (result.length > 0) setRecipeSuggestions(result);
    else Alert.alert('No suggestions', 'Could not generate recipe ideas. Try again later.');
  };

  if (remaining <= 0) return null;

  return (
    <>
      <TouchableOpacity onPress={handleSuggest} disabled={suggesting} activeOpacity={0.88}>
        <LinearGradient
          colors={['rgba(178,128,255,0.22)', 'rgba(123,92,255,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.suggestBanner}
        >
          <Ionicons name={suggesting ? 'hourglass-outline' : 'bulb'} size={20} color="#E8D4FF" />
          <Text style={styles.suggestText}>{suggesting ? 'Thinking…' : 'Suggest Recipes'}</Text>
          <Ionicons name="chevron-forward" size={18} color="#E8D4FF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={recipeSuggestions !== null} transparent animationType="slide" onRequestClose={() => setRecipeSuggestions(null)}>
        <View style={styles.recipeOverlay}>
          <View style={[styles.recipeSheet, { backgroundColor: '#0A0C12', borderColor: PREMIUM_GLASS_BORDER }]}>
            <View style={styles.recipeHeader}>
              <Text style={styles.recipeTitle}>Meal Ideas</Text>
              <TouchableOpacity onPress={() => setRecipeSuggestions(null)}>
                <Ionicons name="close" size={24} color={PREMIUM_TEXT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md }}>
              {recipeSuggestions?.map((meal, i) => (
                <View key={i} style={styles.recipeCard}>
                  <Text style={styles.recipeMealName}>{meal.name}</Text>
                  <Text style={styles.recipeCal}>{meal.calories} kcal</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function PremiumMacroRow({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const items = [
    { label: 'Protein', val: protein, color: '#FF6B6B', icon: 'barbell-outline' as const },
    { label: 'Carbs', val: carbs, color: '#FFB347', icon: 'leaf-outline' as const },
    { label: 'Fat', val: fat, color: '#4A90E2', icon: 'water-outline' as const },
  ];
  return (
    <View style={styles.macroRow}>
      {items.map((m) => (
        <View key={m.label} style={styles.macroCard}>
          <View style={[styles.macroIcon, { backgroundColor: m.color + '22' }]}>
            <Ionicons name={m.icon} size={16} color={m.color} />
          </View>
          <Text style={[styles.macroVal, { color: m.color }]}>{Math.round(m.val)}g</Text>
          <Text style={styles.macroLabel}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function PremiumWaterCard({
  waterMl,
  waterGoalMl,
  onLog,
}: {
  waterMl: number;
  waterGoalMl: number;
  onLog: (ml: number) => void;
}) {
  const pct = waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0;
  return (
    <View style={[styles.waterCard, glassShadow]}>
      <LinearGradient colors={['rgba(74,144,226,0.12)', 'rgba(74,144,226,0)']} style={styles.waterWave} pointerEvents="none" />
      <View style={styles.waterTop}>
        <Ionicons name="water" size={22} color="#4A90E2" />
        <View style={{ flex: 1 }}>
          <Text style={styles.waterTitle}>Water Intake</Text>
          <Text style={styles.waterSub}>
            {(waterMl / 1000).toFixed(1)}L of {(waterGoalMl / 1000).toFixed(1)}L
          </Text>
        </View>
      </View>
      <View style={styles.waterBarBg}>
        <LinearGradient
          colors={['#4A90E2', '#2BBCB0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.waterBarFill, { width: `${pct * 100}%` as `${number}%` }]}
        />
      </View>
      <View style={styles.waterBtns}>
        {[250, 500, 1000].map((ml) => (
          <TouchableOpacity key={ml} onPress={() => onLog(ml)} style={styles.waterBtn} activeOpacity={0.85}>
            <Text style={styles.waterBtnText}>+{ml < 1000 ? `${ml}ml` : '1L'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function PremiumScanFoodCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.scanCard}>
      <View style={styles.scanLeft}>
        <View style={styles.scanIcon}>
          <Ionicons name="camera" size={22} color="#4A90E2" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanTitle}>Scan Food</Text>
          <Text style={styles.scanSub}>Snap a photo to log nutrition instantly</Text>
        </View>
      </View>
      <View style={styles.scanThumb}>
        <Text style={{ fontSize: 28 }}>🥗</Text>
      </View>
    </TouchableOpacity>
  );
}

export function PremiumMealSection({
  title,
  mealType,
  items,
  onAddFood,
}: {
  title: string;
  mealType: MealType;
  items: FoodEntryLite[];
  onAddFood: (meal: MealType) => void;
}) {
  const MEAL_COLORS: Record<MealType, string> = {
    breakfast: '#FFB347',
    lunch: PREMIUM_ACCENT,
    dinner: '#4A90E2',
    snacks: '#B280FF',
  };
  const color = MEAL_COLORS[mealType];
  const totalCal = items.reduce((s, i) => s + i.calories, 0);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHead}>
        <Text style={styles.mealTitle}>{title}</Text>
        {totalCal > 0 && <Text style={[styles.mealCal, { color }]}>{totalCal} kcal</Text>}
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.foodRow}>
          <Text style={styles.foodName} numberOfLines={1}>{item.food_name}</Text>
          <Text style={[styles.foodCal, { color }]}>{item.calories}</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => onAddFood(mealType)} style={[styles.addFood, { borderColor: color + '55' }]}>
        <Ionicons name="add" size={16} color={color} />
        <Text style={[styles.addFoodText, { color }]}>Add food</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PremiumMealPlanPanel() {
  const navigation = useNavigation<any>();
  const prefs = ['Weight Loss', 'High Protein', 'Budget Friendly', 'Vegetarian', 'No Dairy'];

  const sampleMeals = [
    { name: 'Oats with berries', cal: 320, p: 12, c: 48, f: 8 },
    { name: 'Grilled chicken salad', cal: 450, p: 35, c: 20, f: 18 },
    { name: 'Salmon with quinoa', cal: 520, p: 38, c: 42, f: 16 },
  ];

  return (
    <ScrollView contentContainerStyle={styles.mealPlanScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.aiCard, glassShadow]}>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={22} color="#FFD133" />
        </View>
        <Text style={styles.aiTitle}>AI Meal Planner</Text>
        <Text style={styles.aiSub}>Personalized plans for your goals, budget, and preferences</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MealPlan')} activeOpacity={0.9}>
          <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>Generate Meal Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Preferences</Text>
      <View style={styles.prefRow}>
        {prefs.map((p) => (
          <View key={p} style={[styles.prefChip, p === 'No Dairy' && styles.prefChipOff]}>
            {p === 'No Dairy' && <Ionicons name="close-circle" size={12} color="#FF6B6B" style={{ marginRight: 4 }} />}
            <Text style={styles.prefText}>{p}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Today&apos;s Meal Plan</Text>
      {sampleMeals.map((m) => (
        <View key={m.name} style={styles.planMeal}>
          <View style={styles.planThumb}><Text style={{ fontSize: 24 }}>🍽️</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{m.name}</Text>
            <Text style={styles.planCal}>{m.cal} kcal</Text>
            <View style={styles.planMacros}>
              <Text style={[styles.planMacro, { color: '#FF6B6B' }]}>P {m.p}g</Text>
              <Text style={[styles.planMacro, { color: '#FFB347' }]}>C {m.c}g</Text>
              <Text style={[styles.planMacro, { color: '#4A90E2' }]}>F {m.f}g</Text>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.customizeCard, glassShadow]} onPress={() => navigation.navigate('MealPlan')}>
        <Text style={styles.customizeTitle}>Customize Plan</Text>
        <Text style={styles.customizeSub}>Adjust preferences and regenerate</Text>
        <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} style={{ position: 'absolute', right: spacing.md, top: spacing.lg }} />
      </TouchableOpacity>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggleWrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    padding: 4,
  },
  toggleTab: { flex: 1, paddingVertical: 10, borderRadius: radius.full, alignItems: 'center' },
  toggleTabActive: { backgroundColor: PREMIUM_ACCENT },
  toggleText: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_MUTED },
  toggleTextActive: { color: PREMIUM_BG },
  heroBorder: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg + 4, padding: 1 },
  heroCard: {
    borderRadius: radius.lg + 3,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, zIndex: 1 },
  ringGlow: { borderRadius: 64, padding: 4 },
  ringKcal: { fontSize: 22, fontWeight: '900', color: PREMIUM_TEXT, marginTop: 2 },
  ringSub: { fontSize: 9, color: PREMIUM_MUTED, fontWeight: '600' },
  heroStats: { flex: 1, gap: 6 },
  heroRemaining: { fontSize: fontSize.lg + 2, fontWeight: '800', color: PREMIUM_TEXT },
  heroPct: { fontSize: fontSize.xs, color: PREMIUM_MUTED },
  heroBarBg: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: 5 },
  heroGoalLine: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4 },
  suggestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(178,128,255,0.4)',
  },
  suggestText: { flex: 1, color: '#F0E6FF', fontWeight: '700', fontSize: fontSize.base },
  recipeOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  recipeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '70%', borderWidth: 1 },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  recipeTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  recipeCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: PREMIUM_GLASS, borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER },
  recipeMealName: { color: PREMIUM_TEXT, fontWeight: '700' },
  recipeCal: { color: PREMIUM_ACCENT, marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  macroCard: {
    flex: 1,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  macroIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  macroVal: { fontSize: fontSize.lg, fontWeight: '900' },
  macroLabel: { fontSize: 10, color: PREMIUM_MUTED, fontWeight: '700' },
  waterCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 2,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.2)',
    overflow: 'hidden',
  },
  waterWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  waterTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, zIndex: 1 },
  waterTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  waterSub: { fontSize: fontSize.xs, color: '#9CC4FF', marginTop: 2 },
  waterBarBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: spacing.md, overflow: 'hidden', zIndex: 1 },
  waterBarFill: { height: '100%', borderRadius: 4 },
  waterBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, zIndex: 1 },
  waterBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(74,144,226,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.45)',
    alignItems: 'center',
  },
  waterBtnText: { color: '#9CC4FF', fontWeight: '800', fontSize: fontSize.sm },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  scanLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  scanIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(74,144,226,0.2)', alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  scanSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 2 },
  scanThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  mealCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  mealTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  mealCal: { fontSize: fontSize.sm, fontWeight: '700' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: PREMIUM_GLASS_BORDER },
  foodName: { flex: 1, color: PREMIUM_TEXT, fontSize: fontSize.sm },
  foodCal: { fontWeight: '700', fontSize: fontSize.sm },
  addFood: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.sm, marginTop: spacing.xs },
  addFoodText: { fontSize: fontSize.sm, fontWeight: '700' },
  mealPlanScroll: { padding: spacing.lg, paddingBottom: 120 },
  aiCard: {
    padding: spacing.lg,
    borderRadius: radius.lg + 4,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  aiIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,209,51,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  aiTitle: { fontSize: fontSize.xl, fontWeight: '800', color: PREMIUM_TEXT },
  aiSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },
  aiBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  aiBtnText: { color: PREMIUM_BG, fontWeight: '800', fontSize: fontSize.base },
  sectionLabel: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.sm },
  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  prefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  prefChipOff: { borderColor: 'rgba(255,107,107,0.45)', opacity: 0.85 },
  prefText: { fontSize: fontSize.xs, color: PREMIUM_TEXT, fontWeight: '600' },
  planMeal: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    marginBottom: spacing.sm,
  },
  planThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: fontSize.base, fontWeight: '700', color: PREMIUM_TEXT },
  planCal: { fontSize: fontSize.sm, color: PREMIUM_ACCENT, marginTop: 2, fontWeight: '600' },
  planMacros: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  planMacro: { fontSize: 10, fontWeight: '700' },
  customizeCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  customizeTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  customizeSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4 },
});
