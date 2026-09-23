import { create } from 'zustand';
import { generateMealPlan } from '../services/nvidia-client';
import type { GeneratedMealPlan, MealPlanParams } from '../types/ai-coach.types';

const MIN_LOADING_MS = 1500;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Meal plan store state covering generation, saved plans, and loading/error indicators. */
interface MealPlanState {
  currentPlan: GeneratedMealPlan | null;
  savedPlans: GeneratedMealPlan[];
  isLoading: boolean;
  error: string | null;

  generatePlan: (userId: string, params: MealPlanParams) => Promise<void>;
  savePlan: (userId: string, plan: GeneratedMealPlan) => Promise<void>;
  loadSavedPlans: (userId: string) => Promise<void>;
  deleteSavedPlan: (userId: string, planId: string) => Promise<void>;
  clearCurrentPlan: () => void;
  clearError: () => void;
}

/**
 * Zustand store hook for AI-generated meal plan creation, persistence, and
 * management of saved meal plans.
 *
 * @returns MealPlanState — The full store including current/saved plans,
 * loading and error state, and all action methods.
 */
export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  currentPlan: null,
  savedPlans: [],
  isLoading: false,
  error: null,

  generatePlan: async (userId: string, params: MealPlanParams) => {
    set({ isLoading: true, error: null, currentPlan: null });

    const startedAt = Date.now();

    try {
      const plan = await generateMealPlan(userId, params);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await delay(MIN_LOADING_MS - elapsed);
      set({ currentPlan: plan, isLoading: false });
    } catch (e: any) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await delay(MIN_LOADING_MS - elapsed);
      set({ error: e?.message ?? 'Failed to generate meal plan', isLoading: false });
    }
  },

  savePlan: async (userId: string, plan: GeneratedMealPlan) => {
    const { savedPlans } = get();
    if (savedPlans.some(p => p.id === plan.id)) return;

    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.from('ai_generated_meal_plans').insert({
        user_id: userId,
        title: plan.title,
        description: plan.description,
        daily_calories: plan.daily_calories,
        meals: plan.meals,
        nutrition_goals: plan.nutrition_goals,
        dietary_preferences: plan.dietary_preferences,
        budget_level: plan.budget_level,
        excluded_foods: plan.excluded_foods,
        cuisine_style: plan.cuisine_style,
        health_goal: plan.health_goal,
        ai_notes: plan.ai_notes,
        is_saved: true,
      });

      if (error) {
        set({ error: error.message });
        return;
      }

      set(state => ({ savedPlans: [...state.savedPlans, plan], error: null }));
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to save meal plan' });
    }
  },

  loadSavedPlans: async (userId: string) => {
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase
        .from('ai_generated_meal_plans')
        .select('id,user_id,title,description,daily_calories,meals,nutrition_goals,is_saved,created_at')
        .eq('user_id', userId)
        .eq('is_saved', true)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message });
        return;
      }

      const plans: GeneratedMealPlan[] = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        daily_calories: row.daily_calories ?? 2000,
        meals: row.meals ?? [],
        nutrition_goals: row.nutrition_goals ?? {},
        dietary_preferences: row.dietary_preferences ?? [],
        budget_level: row.budget_level ?? 'moderate',
        excluded_foods: row.excluded_foods ?? [],
        cuisine_style: row.cuisine_style ?? '',
        health_goal: row.health_goal ?? '',
        ai_notes: row.ai_notes ?? '',
        created_at: row.created_at,
      }));

      set({ savedPlans: plans, error: null });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load saved meal plans' });
    }
  },

  deleteSavedPlan: async (userId: string, planId: string) => {
    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase
        .from('ai_generated_meal_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) {
        set({ error: error.message });
        return;
      }

      set(state => ({
        savedPlans: state.savedPlans.filter(p => p.id !== planId),
        error: null,
      }));
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to delete meal plan' });
    }
  },

  clearCurrentPlan: () => set({ currentPlan: null }),
  clearError: () => set({ error: null }),
}));
