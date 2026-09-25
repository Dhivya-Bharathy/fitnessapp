import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useEffect, useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { getTodayCalories, getTodayWater, logFood, logWater } from '../../services/profileService';
import { supabase } from '../../services/supabase';
import { searchFoods } from '../../services/foodSearchService';
import { lookupFoodNutrition, suggestRecipes } from '../../services/nvidia-client';
import { CalorieTrendChart } from '../../components/TrendCharts';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import { PREMIUM_BG, PREMIUM_TEXT, PREMIUM_MUTED, PREMIUM_ACCENT, PREMIUM_GLASS_BORDER } from '../../components/premium/premiumEffects';
import {
  caloriePremiumTheme,
  PremiumCalorieToggle,
  PremiumCalorieHero,
  PremiumSuggestRecipes,
  PremiumMacroRow,
  PremiumWaterCard,
  PremiumScanFoodCard,
  PremiumMealSection,
  PremiumMealPlanPanel,
} from '../../components/calorie/PremiumCalorieUI';


type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

interface FoodEntry {
  id: string;
  food_name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  meal_type: MealType;
}

interface FoodResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving: string;
}

// ── CALORIE HERO CARD ─────────────────────────────────────────
function CalorieHero({ theme, consumed, goal, waterMl, waterGoalMl }: {
  theme: typeof colors.light;
  consumed: number; goal: number;
  waterMl: number; waterGoalMl: number;
}) {
  const remaining = Math.max(goal - consumed, 0);
  const pct = Math.min(consumed / goal, 1);
  const waterPct = Math.min(waterMl / waterGoalMl, 1);
  const [recipeSuggestions, setRecipeSuggestions] = useState<any[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const handleSuggestRecipes = async () => {
    const { user } = useAuthStore.getState();
    if (!user?.id) return;
    setSuggesting(true);
    const remProtein = Math.round(remaining * 0.3 / 4);
    const remCarbs = Math.round(remaining * 0.45 / 4);
    const remFats = Math.round(remaining * 0.25 / 9);
    const result = await suggestRecipes(user.id, remProtein, remCarbs, remFats);
    setSuggesting(false);
    if (result.length > 0) {
      setRecipeSuggestions(result);
    } else {
      Alert.alert('No suggestions', 'Could not generate recipe ideas. Try again later.');
    }
  };

  return (
    <LinearGradient colors={[theme.heroCard, '#2A1F6B'] as [string, string]} style={styles.heroCard}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroBig}>{consumed.toLocaleString()}</Text>
          <Text style={styles.heroSubLabel}>kcal consumed</Text>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.heroGoal}>{goal.toLocaleString()}</Text>
          <Text style={styles.heroGoalLabel}>daily goal</Text>
        </View>
      </View>
      <View style={styles.heroPB}>
        <LinearGradient
          colors={[theme.gradStart, theme.gradMid] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.heroPBFill, { width: `${Math.max(pct * 100, 2)}%` as any }]}
        />
      </View>
      <Text style={[styles.heroRemaining, { color: theme.gradStart }]}>
        {remaining > 0 ? `${remaining.toLocaleString()} kcal remaining` : 'Goal reached 🎉'}
      </Text>
      {remaining > 0 && (
        <TouchableOpacity onPress={handleSuggestRecipes} disabled={suggesting}
          style={[styles.suggestBtn, { backgroundColor: theme.gradStart + '22', borderColor: theme.gradStart + '55' }]}>
          <Ionicons name={suggesting ? 'hourglass-outline' : 'bulb-outline'} size={14} color={theme.gradStart} />
          <Text style={[styles.suggestBtnText, { color: theme.gradStart }]}>
            {suggesting ? 'Thinking...' : 'Suggest Recipes'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Recipe suggestions modal */}
      <Modal visible={recipeSuggestions !== null} transparent animationType="slide" onRequestClose={() => setRecipeSuggestions(null)}>
        <View style={styles.recipeOverlay}>
          <View style={[styles.recipeSheet, { backgroundColor: theme.card }]}>
            <View style={styles.recipeHeader}>
              <Text style={[styles.recipeTitle, { color: theme.textPrimary }]}>Meal Ideas</Text>
              <TouchableOpacity onPress={() => setRecipeSuggestions(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md }}>
              {recipeSuggestions?.map((meal, i) => (
                <View key={i} style={[styles.recipeCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                  <Text style={[styles.recipeMealName, { color: theme.textPrimary }]}>{meal.name}</Text>
                  <Text style={[styles.recipeCal, { color: theme.accent }]}>{meal.calories} kcal</Text>
                  <View style={styles.recipeMacros}>
                    <Text style={[styles.recipeMacro, { color: '#FF6B35' }]}>P {meal.protein_g}g</Text>
                    <Text style={[styles.recipeMacro, { color: '#FFB830' }]}>C {meal.carbs_g}g</Text>
                    <Text style={[styles.recipeMacro, { color: '#4A90E2' }]}>F {meal.fats_g}g</Text>
                  </View>
                  <Text style={[styles.recipeIngredients, { color: theme.textSecondary }]}>
                    {meal.ingredients?.join(', ')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.macroPills}>
        {[
          { label: 'Protein', g: Math.round(consumed * 0.3 / 4), color: '#FF6B35' },
          { label: 'Carbs',   g: Math.round(consumed * 0.45 / 4), color: '#FFB830' },
          { label: 'Fat',     g: Math.round(consumed * 0.25 / 9), color: '#4A90E2' },
        ].map((m) => (
          <View key={m.label} style={[styles.macroPill, { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}>
            <Text style={[styles.macroPillVal, { color: m.color }]}>{m.g}g</Text>
            <Text style={[styles.macroPillLabel, { color: m.color, opacity: 0.75 }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.waterRow}>
        <Ionicons name="water-outline" size={14} color="#2BBCB0" />
        <View style={[styles.waterBar, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <LinearGradient colors={['#2BBCB0', '#4A90E2'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.waterBarFill, { width: `${waterPct * 100}%` as any }]} />
        </View>
        <Text style={styles.waterLabel}>{(waterMl / 1000).toFixed(1)}L / {(waterGoalMl / 1000).toFixed(1)}L</Text>
      </View>
    </LinearGradient>
  );
}

// ── WATER LOG CARD ────────────────────────────────────────────
function WaterCard({ theme, waterMl, waterGoalMl, onLog }: {
  theme: typeof colors.light; waterMl: number; waterGoalMl: number; onLog: (ml: number) => void;
}) {
  return (
    <View style={[styles.waterCard, { backgroundColor: theme.waterCard }]}>
      <View style={styles.waterCardLeft}>
        <Ionicons name="water" size={22} color="#2BBCB0" />
        <View>
          <Text style={[styles.waterCardTitle, { color: '#2BBCB0' }]}>Water Intake</Text>
          <Text style={[styles.waterCardSub, { color: '#2BBCB0', opacity: 0.75 }]}>
            {(waterMl / 1000).toFixed(1)}L of {(waterGoalMl / 1000).toFixed(1)}L
          </Text>
        </View>
      </View>
      <View style={styles.waterBtns}>
        {[250, 500, 1000].map((ml) => (
          <TouchableOpacity key={ml} onPress={() => onLog(ml)} activeOpacity={0.8}
            style={[styles.waterBtn, { backgroundColor: '#2BBCB0' + '22', borderColor: '#2BBCB0' + '55' }]}>
            <Text style={[styles.waterBtnText, { color: '#2BBCB0' }]}>+{ml < 1000 ? `${ml}ml` : '1L'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── MEAL SECTION ──────────────────────────────────────────────
function MealSection({ theme, title, mealType, items, onAddFood }: {
  theme: typeof colors.light; title: string; mealType: MealType;
  items: FoodEntry[]; onAddFood: (meal: MealType) => void;
}) {
  const MEAL_COLORS: Record<MealType, string> = {
    breakfast: '#FF6B35', lunch: '#FFB830', dinner: '#4A90E2', snacks: '#2BBCB0',
  };
  const MEAL_ICONS: Record<MealType, any> = {
    breakfast: 'sunny-outline', lunch: 'restaurant-outline', dinner: 'moon-outline', snacks: 'nutrition-outline',
  };
  const color = MEAL_COLORS[mealType];
  const totalCal = items.reduce((s, i) => s + i.calories, 0);

  return (
    <View style={[styles.mealSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.mealHeader}>
        <View style={[styles.mealIconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={MEAL_ICONS[mealType]} size={16} color={color} />
        </View>
        <Text style={[styles.mealTitle, { color: theme.textPrimary }]}>{title}</Text>
        {totalCal > 0 && (
          <Text style={[styles.mealCal, { color }]}>{totalCal} kcal</Text>
        )}
      </View>
      {items.map((item) => (
        <View key={item.id} style={[styles.foodItem, { borderColor: theme.border }]}>
          <View style={[styles.foodItemDot, { backgroundColor: color }]} />
          <Text style={[styles.foodItemName, { color: theme.textPrimary }]} numberOfLines={1}>{item.food_name}</Text>
          <Text style={[styles.foodItemCal, { color }]}>{item.calories} kcal</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => onAddFood(mealType)} activeOpacity={0.8}
        style={[styles.addFoodBtn, { borderColor: color + '66' }]}>
        <Ionicons name="add" size={16} color={color} />
        <Text style={[styles.addFoodText, { color }]}>Add food</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── ADD FOOD MODAL ────────────────────────────────────────────
function AddFoodModal({ visible, theme, mealType, onClose, onAdd, savedMeals, onSaveFavourite }: {
  visible: boolean; theme: typeof colors.light; mealType: MealType;
  onClose: () => void;
  onAdd: (entry: { food_name: string; calories: number; protein_g?: number; carbs_g?: number; fats_g?: number; meal_type: MealType }) => void;
  savedMeals: FoodResult[];
  onSaveFavourite: (food: FoodResult) => void;
}) {
  type View = 'choice' | 'search' | 'manual' | 'portion';
  const [view, setView] = useState<View>('choice');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [portion, setPortion] = useState('100');
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const reset = () => { setView('choice'); setQuery(''); setResults([]); setSelected(null); setPortion('100'); setManualName(''); setManualCal(''); setManualProtein(''); setManualCarbs(''); setManualFat(''); setAiLoading(false); };

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const raw = await searchFoods(q);
      setResults(raw.map((r) => ({ name: r.name, calories: r.calories, protein: r.protein, carbs: r.carbs, fats: r.fat, serving: r.servingSize })));
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleSelectFood = (food: FoodResult) => { setSelected(food); setPortion('100'); setView('portion'); };

  const handleAddPortion = () => {
    if (!selected) return;
    const mult = parseFloat(portion) / 100;
    onAdd({ food_name: selected.name, calories: Math.round(selected.calories * mult), protein_g: Math.round(selected.protein * mult), carbs_g: Math.round(selected.carbs * mult), fats_g: Math.round(selected.fats * mult), meal_type: mealType });
    reset(); onClose();
  };

  const handleManualAdd = () => {
    if (!manualName || !manualCal) { Alert.alert('Required', 'Please enter food name and calories.'); return; }
    onAdd({ food_name: manualName, calories: parseInt(manualCal) || 0, protein_g: parseInt(manualProtein) || 0, carbs_g: parseInt(manualCarbs) || 0, fats_g: parseInt(manualFat) || 0, meal_type: mealType });
    reset(); onClose();
  };

  const handleAutoFill = async () => {
    if (!manualName.trim()) { Alert.alert('Missing name', 'Enter a food name first.'); return; }
    setAiLoading(true);
    const { user } = useAuthStore.getState();
    if (!user?.id) { setAiLoading(false); return; }
    const result = await lookupFoodNutrition(user.id, manualName.trim());
    setAiLoading(false);
    if (!result) { Alert.alert('No results', 'Could not estimate nutrition for that food. Try being more specific.'); return; }
    setManualCal(String(result.calories));
    setManualProtein(String(result.protein_g));
    setManualCarbs(String(result.carbs_g));
    setManualFat(String(result.fats_g));
  };

  const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { if (view === 'choice') { reset(); onClose(); } else setView('choice'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={view === 'choice' ? 'close' : 'chevron-back'} size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {view === 'choice' ? `Add to ${MEAL_LABELS[mealType]}` : view === 'search' ? 'Search Food' : view === 'manual' ? 'Manual Entry' : 'Adjust Portion'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {view === 'choice' && (
            <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}>
              <TouchableOpacity onPress={() => setView('search')} activeOpacity={0.85}
                style={[styles.choiceCardOutline, { borderColor: theme.accent, backgroundColor: theme.accentDim as string }]}>
                <Ionicons name="search" size={28} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.choiceTitleDark, { color: theme.textPrimary }]}>Search Food Database</Text>
                  <Text style={[styles.choiceSubDark, { color: theme.textSecondary }]}>Indian foods + global database</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setView('manual')} activeOpacity={0.85}
                style={[styles.choiceCardOutline, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Ionicons name="create-outline" size={28} color={theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.choiceTitleDark, { color: theme.textPrimary }]}>Type Manually</Text>
                  <Text style={[styles.choiceSubDark, { color: theme.textSecondary }]}>Enter food name and calories</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              {savedMeals.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>⭐ Favourites</Text>
                  {savedMeals.map((f, i) => (
                    <TouchableOpacity key={i} onPress={() => handleSelectFood(f)} activeOpacity={0.8}
                      style={[styles.savedMealRow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <Ionicons name="star" size={16} color="#FFB830" />
                      <Text style={[styles.savedMealName, { color: theme.textPrimary }]}>{f.name}</Text>
                      <Text style={[styles.savedMealCal, { color: theme.textMuted }]}>{f.calories} kcal/100g</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {view === 'search' && (
            <View style={{ flex: 1 }}>
              <View style={[styles.searchBar, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Ionicons name="search" size={18} color={theme.textMuted} />
                <TextInput value={query} onChangeText={handleSearch} placeholder="Search food..." placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.textPrimary }]} autoFocus />
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {searching && <Text style={[styles.searchingText, { color: theme.textMuted }]}>Searching...</Text>}
                {results.map((r, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectFood(r)} activeOpacity={0.8}
                    style={[styles.resultRow, { borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: theme.textPrimary }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[styles.resultMeta, { color: theme.textMuted }]}>P:{r.protein}g · C:{r.carbs}g · F:{r.fats}g</Text>
                    </View>
                    <Text style={[styles.resultCal, { color: theme.accent }]}>{r.calories} kcal</Text>
                    <TouchableOpacity onPress={() => onSaveFavourite(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="star-outline" size={18} color="#FFB830" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {view === 'portion' && selected && (
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
              <Text style={[styles.portionFoodName, { color: theme.textPrimary }]}>{selected.name}</Text>
              <Text style={[styles.portionSub, { color: theme.textSecondary }]}>Adjust the portion size below</Text>
              <View style={[styles.portionInputRow, { borderColor: theme.accent, backgroundColor: theme.bg }]}>
                <TextInput value={portion} onChangeText={setPortion} keyboardType="number-pad" style={[styles.portionInput, { color: theme.textPrimary }]} />
                <Text style={[styles.portionUnit, { color: theme.textMuted }]}>g</Text>
              </View>
              <View style={styles.portionPills}>
                {['50', '100', '150', '200', '250'].map((p) => (
                  <TouchableOpacity key={p} onPress={() => setPortion(p)} activeOpacity={0.8}
                    style={[styles.portionPill, { backgroundColor: portion === p ? theme.accent : theme.bg, borderColor: portion === p ? theme.accent : theme.border }]}>
                    <Text style={[styles.portionPillText, { color: portion === p ? '#fff' : theme.textSecondary }]}>{p}g</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.nutritionGrid}>
                {[
                  { label: 'Calories', val: Math.round(selected.calories * parseFloat(portion || '0') / 100), unit: 'kcal', color: theme.gradStart },
                  { label: 'Protein',  val: Math.round(selected.protein  * parseFloat(portion || '0') / 100), unit: 'g', color: '#FF6B35' },
                  { label: 'Carbs',    val: Math.round(selected.carbs    * parseFloat(portion || '0') / 100), unit: 'g', color: '#FFB830' },
                  { label: 'Fat',      val: Math.round(selected.fats     * parseFloat(portion || '0') / 100), unit: 'g', color: '#4A90E2' },
                ].map((n) => (
                  <View key={n.label} style={[styles.nutritionCell, { backgroundColor: n.color + '15', borderColor: n.color + '44' }]}>
                    <Text style={[styles.nutritionCellValue, { color: n.color }]}>{n.val}</Text>
                    <Text style={[styles.nutritionCellUnit, { color: n.color, opacity: 0.7 }]}>{n.unit}</Text>
                    <Text style={[styles.nutritionCellLabel, { color: theme.textMuted }]}>{n.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.editPerfectRow}>
                <TouchableOpacity onPress={() => setView('search')} activeOpacity={0.8}
                  style={[styles.editBtn, { borderColor: theme.border }]}>
                  <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>Edit Result</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddPortion} activeOpacity={0.85} style={styles.perfectBtnWrap}>
                  <LinearGradient colors={[theme.accent, '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.perfectBtn}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.perfectBtnText}>Perfect ✓</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {view === 'manual' && (
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
              <Text style={[styles.manualHint, { color: theme.textSecondary }]}>Enter the food details manually. Only name and calories are required.</Text>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Food Name *</Text>
              <TextInput value={manualName} onChangeText={setManualName} placeholder="e.g. Jollof Rice" placeholderTextColor={theme.textMuted}
                style={[styles.manualInput, { color: theme.textPrimary, borderColor: manualName ? theme.accent : theme.border, backgroundColor: theme.bg }]} />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Calories (kcal) *</Text>
              <TextInput value={manualCal} onChangeText={setManualCal} placeholder="e.g. 320" placeholderTextColor={theme.textMuted} keyboardType="number-pad"
                style={[styles.manualInput, { color: theme.textPrimary, borderColor: manualCal ? theme.accent : theme.border, backgroundColor: theme.bg }]} />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Macros (optional)</Text>
              <View style={styles.macroRow}>
                {[{ label: 'Protein (g)', val: manualProtein, set: setManualProtein }, { label: 'Carbs (g)', val: manualCarbs, set: setManualCarbs }, { label: 'Fat (g)', val: manualFat, set: setManualFat }].map((m) => (
                  <View key={m.label} style={[styles.macroInput, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <TextInput value={m.val} onChangeText={m.set} placeholder="0" placeholderTextColor={theme.textMuted} keyboardType="number-pad" style={[styles.macroInputText, { color: theme.textPrimary }]} />
                    <Text style={[styles.macroInputLabel, { color: theme.textMuted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={handleAutoFill} disabled={aiLoading} activeOpacity={0.85}
                style={[styles.aiFillBtn, { borderColor: theme.accent, opacity: aiLoading ? 0.6 : 1 }]}>
                <Ionicons name="sparkles-outline" size={16} color={theme.accent} />
                <Text style={[styles.aiFillBtnText, { color: theme.accent }]}>
                  {aiLoading ? 'Looking up...' : 'Auto-fill with AI'}
                </Text>
              </TouchableOpacity>
              <View style={styles.editPerfectRow}>
                <TouchableOpacity onPress={() => setView('choice')} activeOpacity={0.8}
                  style={[styles.editBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleManualAdd} activeOpacity={0.85} style={styles.perfectBtnWrap}>
                  <LinearGradient colors={[theme.accent, '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.perfectBtn}>
                    <Text style={styles.perfectBtnText}>Add Food</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── MEAL PLAN TAB ──────────────────────────────────────────────
function MealPlanTab({ theme }: { theme: typeof colors.light }) {
  const navigation = useNavigation<any>();

  return (
    <ScrollView contentContainerStyle={mp.scroll} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[theme.card, theme.bg] as [string, string]} style={[mp.hero, { borderColor: theme.border }]}>
        <View style={mp.heroIconWrap}>
          <Ionicons name="restaurant-outline" size={28} color={theme.accent} />
        </View>
        <Text style={[mp.heroTitle, { color: theme.textPrimary }]}>Meal Planner</Text>
        <Text style={[mp.heroSub, { color: theme.textMuted }]}>
          Create personalized meal plans with AI — tailored to your budget, preferences, and health goals
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('MealPlan')} activeOpacity={0.85} style={[mp.goBtn, { backgroundColor: theme.accent }]}>
          <Ionicons name="sparkles-outline" size={18} color="#fff" />
          <Text style={mp.goBtnText}>Go to Meal Planner</Text>
        </TouchableOpacity>
      </LinearGradient>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const mp = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  hero: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, alignItems: 'center', marginBottom: spacing.md },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(45,220,140,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTitle: { fontSize: fontSize.xl, fontWeight: '800', marginBottom: spacing.xs },
  heroSub: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 18, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  goBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  goBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function CalorieScreen() {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuthStore();
  const theme = caloriePremiumTheme;

  const [activeView, setActiveView]             = useState<'tracker' | 'mealplan'>('tracker');
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [waterMl, setWaterMl]                   = useState(0);
  const [foodEntries, setFoodEntries]           = useState<FoodEntry[]>([]);
  const [activeMeal, setActiveMeal]             = useState<MealType>('breakfast');
  const [showAddFood, setShowAddFood]           = useState(false);
  const [isRefreshing, setIsRefreshing]         = useState(false);
  const [savedMeals, setSavedMeals]             = useState<any[]>([]);

  const calorieGoal = (profile as any)?.daily_calorie_goal ?? 2000;
  const waterGoalMl = (profile as any)?.water_goal_ml ?? 2500;

  useFocusEffect(useCallback(() => { loadData(); }, [user?.id]));

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [cal, water, entries, saved] = await Promise.all([
        getTodayCalories(user.id),
        getTodayWater(user.id),
        supabase.from('food_logs').select('id,user_id,meal_type,food_name,calories,protein_g,carbs_g,fats_g,date,created_at').eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0]).order('created_at', { ascending: false }),
        supabase.from('saved_meals').select('id,user_id,name,calories,protein_g,carbs_g,fats_g,meal_type,created_at').eq('user_id', user.id).limit(10),
      ]);
      setCaloriesConsumed(cal);
      setWaterMl(water);
      if (entries.data) setFoodEntries(entries.data as FoodEntry[]);
      if (saved.data) setSavedMeals(saved.data);
    } catch (e) { if (__DEV__) console.error('CalorieScreen loadData:', e); }
    finally { setIsRefreshing(false); }
  };

  const handleAddFood = async (entry: { food_name: string; calories: number; protein_g?: number; carbs_g?: number; fats_g?: number; meal_type: MealType }) => {
    if (!user?.id) return;
    const success = await logFood(user.id, entry);
    if (success) {
      setFoodEntries((prev) => [...prev, { id: Date.now().toString(), ...entry }]);
      setCaloriesConsumed((prev) => prev + entry.calories);
      const { notifyFoodLogged, notifyCalorieGoalReached } = await import('../../services/notificationService');
      await notifyFoodLogged(user.id, entry.food_name, entry.calories);
      if (caloriesConsumed + entry.calories >= calorieGoal && caloriesConsumed < calorieGoal) await notifyCalorieGoalReached(user.id);
    }
  };

  const handleWaterLog = async (ml: number) => {
    if (!user?.id) return;
    const success = await logWater(user.id, ml);
    if (success) setWaterMl((prev) => prev + ml);
  };

  const handleSaveFavourite = async (food: any) => {
    if (!user?.id) return;
    try {
      await supabase.from('saved_meals').insert({ user_id: user.id, meal_data: food, name: food.name });
      setSavedMeals((prev) => [...prev, food]);
      Alert.alert('Saved! ⭐', `${food.name} added to your favourites.`);
    } catch {}
  };

  const onRefresh = () => { setIsRefreshing(true); loadData(); };

  const meals: { title: string; type: MealType }[] = [
    { title: 'Breakfast', type: 'breakfast' },
    { title: 'Lunch', type: 'lunch' },
    { title: 'Dinner', type: 'dinner' },
    { title: 'Snacks', type: 'snacks' },
  ];

  const totalProtein = foodEntries.reduce((s, e) => s + (e.protein_g ?? 0), 0);
  const totalCarbs = foodEntries.reduce((s, e) => s + (e.carbs_g ?? 0), 0);
  const totalFat = foodEntries.reduce((s, e) => s + (e.fats_g ?? 0), 0);
  const calRemaining = Math.max(calorieGoal - caloriesConsumed, 0);

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={styles.header}>
        <View>
          <Text style={[styles.pageTitle, { color: PREMIUM_TEXT }]}>Calorie Tracker</Text>
          <Text style={[styles.pageDate, { color: PREMIUM_MUTED }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {activeView === 'tracker' && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('FoodScanner')}
                activeOpacity={0.85}
                style={[styles.cameraBtn, { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Ionicons name="camera-outline" size={20} color={PREMIUM_ACCENT} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setActiveMeal('breakfast'); setShowAddFood(true); }}
                activeOpacity={0.85}
                style={styles.addBtn}
              >
                <LinearGradient colors={['#FF6EB0', '#FF8C42']} style={styles.addBtnGrad}>
                  <Ionicons name="add" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <PremiumCalorieToggle active={activeView} onChange={setActiveView} />

      {activeView === 'tracker' ? (
        <ScreenScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PREMIUM_ACCENT} colors={[PREMIUM_ACCENT]} />
          }
        >
          <PremiumCalorieHero consumed={caloriesConsumed} goal={calorieGoal} />
          <PremiumSuggestRecipes remaining={calRemaining} />
          <PremiumMacroRow protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
          <PremiumWaterCard waterMl={waterMl} waterGoalMl={waterGoalMl} onLog={handleWaterLog} />
          <PremiumScanFoodCard onPress={() => navigation.navigate('FoodScanner')} />
          <Text style={[styles.scanDisclaimer, { color: PREMIUM_MUTED }]}>
            Camera estimates are approximate — always verify with nutrition labels
          </Text>

          <Text style={[styles.todaysMeals, { color: PREMIUM_TEXT }]}>Today's Meals</Text>
          {meals.map((m) => (
            <PremiumMealSection
              key={m.type}
              title={m.title}
              mealType={m.type}
              items={foodEntries.filter((e) => e.meal_type === m.type)}
              onAddFood={(meal) => { setActiveMeal(meal); setShowAddFood(true); }}
            />
          ))}

          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
            <CalorieTrendChart userId={user?.id ?? ''} calorieGoal={calorieGoal} theme={theme} />
          </View>

          <View style={{ height: 40 }} />
        </ScreenScrollView>
      ) : (
        <PremiumMealPlanPanel />
      )}

      <AddFoodModal
        visible={showAddFood} theme={theme} mealType={activeMeal}
        onClose={() => setShowAddFood(false)}
        onAdd={handleAddFood}
        savedMeals={savedMeals}
        onSaveFavourite={handleSaveFavourite}
      />
    </AndroidSafeView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  pageTitle: { fontSize: fontSize.xxl, fontWeight: '800' },
  pageDate: { fontSize: fontSize.xs, marginTop: 2 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 120 },
  heroCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: 20 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  heroBig: { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 56 },
  heroSubLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  heroRight: { alignItems: 'flex-end' },
  heroGoal: { fontSize: 24, fontWeight: '700', color: '#fff' },
  heroGoalLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)' },
  heroPB: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: spacing.sm },
  heroPBFill: { height: '100%', borderRadius: 4 },
  heroRemaining: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.md },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, marginBottom: spacing.md },
  suggestBtnText: { fontSize: fontSize.xs, fontWeight: '700' },
  recipeOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  recipeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '70%' },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  recipeTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  recipeCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 4 },
  recipeMealName: { fontSize: fontSize.base, fontWeight: '700' },
  recipeCal: { fontSize: fontSize.sm, fontWeight: '600' },
  recipeMacros: { flexDirection: 'row', gap: spacing.md },
  recipeMacro: { fontSize: fontSize.xs, fontWeight: '600' },
  recipeIngredients: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
  macroPills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  macroPill: { flex: 1, padding: spacing.sm, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  macroPillVal: { fontSize: fontSize.base, fontWeight: '800' },
  macroPillLabel: { fontSize: 10, fontWeight: '600' },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waterBar: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  waterBarFill: { height: '100%', borderRadius: 3 },
  waterLabel: { fontSize: fontSize.xs, color: '#2BBCB0', fontWeight: '600' },
  waterCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  foodScanCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  foodScanLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  foodScanIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  foodScanTitle: { fontSize: fontSize.base, fontWeight: '700' },
  foodScanSub: { fontSize: fontSize.xs, marginTop: 1 },
  waterCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  waterCardTitle: { fontSize: fontSize.base, fontWeight: '700' },
  waterCardSub: { fontSize: fontSize.xs },
  waterBtns: { flexDirection: 'row', gap: spacing.sm },
  waterBtn: { flex: 1, padding: spacing.sm, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  waterBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  mealSection: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  mealIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { flex: 1, fontSize: fontSize.base, fontWeight: '700' },
  mealCal: { fontSize: fontSize.sm, fontWeight: '700' },
  foodItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 0.5 },
  foodItemDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  foodItemName: { flex: 1, fontSize: fontSize.sm },
  foodItemCal: { fontSize: fontSize.sm, fontWeight: '600' },
  addFoodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, marginTop: spacing.xs, borderTopWidth: 0.5, borderStyle: 'dashed' },
  addFoodText: { fontSize: fontSize.sm, fontWeight: '600' },
  viewToggle: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 10, padding: 3, borderWidth: 1 },
  viewToggleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8 },
  viewToggleText: { fontSize: fontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '60%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  choiceCardOutline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: 16, borderWidth: 1.5 },
  choiceTitleDark: { fontSize: fontSize.base, fontWeight: '700' },
  choiceSubDark: { fontSize: fontSize.xs, marginTop: 2 },
  savedMealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 10, borderWidth: 1 },
  savedMealName: { flex: 1, fontSize: fontSize.sm, fontWeight: '600' },
  savedMealCal: { fontSize: fontSize.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.lg, padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: fontSize.base },
  searchingText: { textAlign: 'center', padding: spacing.lg, fontSize: fontSize.sm },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5 },
  resultName: { fontSize: fontSize.sm, fontWeight: '600' },
  resultMeta: { fontSize: fontSize.xs, marginTop: 2 },
  resultCal: { fontSize: fontSize.sm, fontWeight: '700' },
  portionFoodName: { fontSize: fontSize.xl, fontWeight: '800' },
  portionSub: { fontSize: fontSize.sm },
  portionInputRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 12, borderWidth: 2 },
  portionInput: { flex: 1, fontSize: 36, fontWeight: '800' },
  portionUnit: { fontSize: fontSize.xl, fontWeight: '600' },
  portionPills: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  portionPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 99, borderWidth: 1 },
  portionPillText: { fontSize: fontSize.sm, fontWeight: '600' },
  nutritionGrid: { flexDirection: 'row', gap: spacing.xs },
  nutritionCell: { flex: 1, padding: spacing.sm, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  nutritionCellValue: { fontSize: fontSize.lg, fontWeight: '800' },
  nutritionCellUnit: { fontSize: fontSize.xs },
  nutritionCellLabel: { fontSize: 9, marginTop: 2 },
  editPerfectRow: { flexDirection: 'row', gap: spacing.md },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  editBtnText: { fontSize: fontSize.base, fontWeight: '600' },
  perfectBtnWrap: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  perfectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md },
  perfectBtnText: { fontSize: fontSize.base, fontWeight: '700', color: '#fff' },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  manualHint: { fontSize: fontSize.sm, lineHeight: 18 },
  manualInput: { padding: spacing.md, borderRadius: 10, borderWidth: 1.5, fontSize: fontSize.base },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroInput: { flex: 1, padding: spacing.sm, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  macroInputText: { fontSize: fontSize.lg, fontWeight: '800', width: '100%' },
  macroInputLabel: { fontSize: 9, marginTop: 2, textAlign: 'center' },
  aiFillBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
  },
  aiFillBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  scanDisclaimer: {
    fontSize: fontSize.xs, textAlign: 'center', marginTop: -spacing.sm,
    marginBottom: spacing.md, paddingHorizontal: spacing.xl, lineHeight: 16,
  },
  todaysMeals: {
    fontSize: fontSize.base,
    fontWeight: '800',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});