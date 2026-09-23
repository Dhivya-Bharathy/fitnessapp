export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type FitnessGoal =
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'weight_loss'
  | 'muscle_gain'
  | 'general_fitness';

export type Equipment =
  | 'body-weight'
  | 'dumbbells'
  | 'barbell'
  | 'kettlebell'
  | 'bands';

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  form_tips: string;
  progression: string;
}

export interface GeneratedWorkout {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: number;
  exercises: Exercise[];
  warmup: string[];
  cooldown: string[];
  ai_notes: string;
  created_at: string;
}

export interface WorkoutParams {
  fitnessLevel: FitnessLevel;
  goals: FitnessGoal[];
  duration: number;
  equipment: Equipment[];
}

export interface UserFitnessProfile {
  fitness_level: FitnessLevel;
  goals: FitnessGoal[];
  preferred_equipment: Equipment[];
  preferred_duration: number;
  bio?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: number;
}

export interface Meal {
  name: string;
  foods: string[];
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

export interface GeneratedMealPlan {
  id: string;
  title: string;
  description: string;
  daily_calories: number;
  meals: Meal[];
  nutrition_goals: {
    protein_g?: number;
    carbs_g?: number;
    fats_g?: number;
  };
  dietary_preferences: string[];
  budget_level: 'low' | 'moderate' | 'high';
  budget_amount?: number;
  budget_period?: 'day' | 'week' | 'month';
  budget_mode?: 'fixed' | 'auto';
  excluded_foods: string[];
  cuisine_style: string;
  health_goal: string;
  ai_notes: string;
  created_at: string;
}

export interface MealPlanParams {
  dietary_preferences: string[];
  budget_level: 'low' | 'moderate' | 'high';
  budget_amount?: number;
  budget_period?: 'day' | 'week' | 'month';
  budget_mode?: 'fixed' | 'auto';
  calories_target: number;
  meals_per_day: number;
  excluded_foods: string[];
  cuisine_style: string;
  health_goal: string;
}

export interface ApiUsageRecord {
  user_id: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}
