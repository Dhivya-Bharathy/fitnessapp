import { supabase } from './supabase';

/** Represents a user's profile data including goals, body metrics, preferences, and daily targets. */
export interface Profile {
  id: string;
  calfit_id: string | null;
  full_name: string | null;
  goal: string | null;
  activity_level: string | null;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  daily_calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  sleep_goal_hrs: number;
  step_goal: number;
  theme: string;
  units: string;
  dietary_preference: string[] | null;
  tracking_preferences: string[] | null;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
}

/**
 * Fetches the full profile for a given user.
 * @param userId - The UUID of the user whose profile to retrieve.
 * @returns The user's Profile object, or null if not found or on error.
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, calfit_id, full_name, goal, activity_level, age, height_cm, current_weight_kg, target_weight_kg, daily_calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g, water_goal_ml, sleep_goal_hrs, step_goal, theme, units, dietary_preference, tracking_preferences, streak_count, last_active_date, created_at, updated_at, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.error('Error fetching profile:', error.message);
    return null;
  }
  return data;
};

/**
 * Partially updates the profile fields for a given user.
 * @param userId - The UUID of the user whose profile to update.
 * @param updates - An object containing the profile fields to change.
 * @returns True if the update succeeded, false if an error occurred.
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    if (__DEV__) console.error('Error updating profile:', error.message);
    return false;
  }
  return true;
};

/**
 * Returns the sum of calories logged by the user for today.
 * @param userId - The UUID of the user.
 * @returns The total calorie count for today, or 0 if no entries exist or on error.
 */
export const getTodayCalories = async (userId: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('food_logs')
    .select('calories')
    .eq('user_id', userId)
    .eq('date', today);

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.calories || 0), 0);
};

/**
 * Returns the total water logged by the user in milliliters for today.
 * @param userId - The UUID of the user.
 * @returns The total water amount in ml for today, or 0 if none found or on error.
 */
export const getTodayWater = async (userId: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const start = `${today}T00:00:00`;
  const end = `${today}T23:59:59`;

  const { data, error } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lte('logged_at', end);

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.amount_ml || 0), 0);
};

/**
 * Inserts a water-log entry for the user.
 * @param userId - The UUID of the user.
 * @param amount_ml - The amount of water in milliliters to log.
 * @returns True if the log was inserted successfully, false if an error occurred.
 */
export const logWater = async (
  userId: string,
  amount_ml: number
): Promise<boolean> => {
  const { error } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, amount_ml });

  if (error) {
    if (__DEV__) console.error('Error logging water:', error.message);
    return false;
  }
  return true;
};

/**
 * Inserts a food-log entry for the user for today's date.
 * @param userId - The UUID of the user.
 * @param entry - An object containing the meal details (meal type, food name, calories, and optional macros).
 * @returns True if the log was inserted successfully, false if an error occurred.
 */
export const logFood = async (
  userId: string,
  entry: {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
    food_name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fats_g?: number;
  }
): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, date: today, ...entry });

  if (error) {
    if (__DEV__) console.error('Error logging food:', error.message);
    return false;
  }
  return true;
};

/**
 * Returns the step count logged by the user for today.
 * Uses maybeSingle() so that missing entries return null safely instead of throwing.
 * @param userId - The UUID of the user.
 * @returns The step count for today, or 0 if no entry exists or on error.
 */
export const getTodaySteps = async (userId: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('step_logs')
    .select('steps')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return 0;
  return data.steps || 0;
};