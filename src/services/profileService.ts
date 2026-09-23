import { supabase } from './supabase';
import { stripAssessmentDoneFromPrefs } from '../utils/onboardingFlags';

function missingColumnFromError(message: string | undefined): string | null {
  if (!message) return null;
  const quoted = message.match(/'([^']+)'\s+column/i);
  if (quoted?.[1]) return quoted[1];
  const doesNotExist = message.match(/column profiles\.([a-z0-9_]+) does not exist/i);
  if (doesNotExist?.[1]) return doesNotExist[1];
  return null;
}

async function upsertProfileRow(
  row: Record<string, unknown>,
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; message: string }> {
  const payload = { ...row };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (!error) return { ok: true, row: payload };

    if (error.code === '23505' && error.message?.includes('calfit_id') && 'calfit_id' in payload) {
      const base = String(payload.calfit_id ?? 'user');
      payload.calfit_id = `${base}_${Math.random().toString(36).slice(2, 6)}`.slice(0, 32);
      continue;
    }

    const missing = missingColumnFromError(error.message);
    if (missing && missing in payload) {
      delete payload[missing];
      continue;
    }

    if (__DEV__) console.error('[upsertProfileRow]', error.message);
    return { ok: false, message: error.message || 'Could not save profile.' };
  }
  return { ok: false, message: 'Could not save profile after retries.' };
}

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
  streak_freeze_used_week?: boolean;
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
export async function saveOnboardingProfile(
  userId: string,
  fields: {
    full_name: string;
    calfit_id: string;
    goal: string;
    height_cm: number | null;
    current_weight_kg: number | null;
    tracking_preferences: string[];
  },
): Promise<{ ok: true; profile: Partial<Profile> } | { ok: false; message: string }> {
  const calfit_id = fields.calfit_id.trim().toLowerCase();
  if (calfit_id.length < 3) {
    return { ok: false, message: 'Username must be at least 3 characters (letters, numbers, underscore).' };
  }

  const row: Record<string, unknown> = {
    id: userId,
    full_name: fields.full_name.trim() || null,
    calfit_id,
    goal: fields.goal || null,
    height_cm: fields.height_cm,
    current_weight_kg: fields.current_weight_kg,
    tracking_preferences: stripAssessmentDoneFromPrefs(fields.tracking_preferences),
    bio: JSON.stringify({
      onboarding_v1: {
        display_name: fields.full_name.trim(),
        username: calfit_id,
        height_cm: fields.height_cm,
        weight_kg: fields.current_weight_kg,
        tracking: fields.tracking_preferences,
      },
    }),
  };

  const upserted = await upsertProfileRow(row);
  if (!upserted.ok) {
    return {
      ok: false,
      message: `${upserted.message} Apply supabase/migrations/000_full_schema.sql (or 002_profiles_calfit_id.sql) in Supabase → SQL.`,
    };
  }

  return {
    ok: true,
    profile: { ...upserted.row, calfit_id } as Partial<Profile>,
  };
}

/** Wipes profile fields so user must redo onboarding + 22 questions (works without DELETE policy). */
export async function wipeProfileOnServer(userId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: null,
      calfit_id: null,
      goal: null,
      bio: null,
      height_cm: null,
      current_weight_kg: null,
      tracking_preferences: stripAssessmentDoneFromPrefs([]),
      equipment_preferences: [],
      streak_count: 0,
      last_active_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    if (__DEV__) console.error('[wipeProfileOnServer]', error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Deletes profile row (cascades), or wipes fields if DELETE is blocked by RLS. */
export async function deleteAccountData(userId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (!error) return { ok: true };

  if (__DEV__) console.warn('[deleteAccountData] delete failed, wiping profile:', error.message);
  return wipeProfileOnServer(userId);
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.error('Error fetching profile:', error.message);
    return null;
  }
  if (!data) return null;
  return data as Profile;
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