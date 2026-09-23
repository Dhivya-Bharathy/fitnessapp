import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const isPedometerAvailable = async (): Promise<boolean> => {
  try { return await Pedometer.isAvailableAsync(); }
  catch { return false; }
};

export const requestStepsPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await Pedometer.requestPermissionsAsync();
      return status === 'granted';
    }
    return true;
  } catch { return false; }
};

// ── THE KEY FIX: query midnight → now, not watchStepCount ────
export const getTodaySteps = async (): Promise<number> => {
  try {
    if (!(await Pedometer.isAvailableAsync())) return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const result = await Pedometer.getStepCountAsync(start, new Date());
    return result.steps ?? 0;
  } catch { return 0; }
};

// ── POLLING SUBSCRIPTION (replaces watchStepCount delta) ─────
// No local state — every poll calls getTodaySteps fresh.
// Safe to tear down and recreate without losing count.
export const subscribeToSteps = (
  onUpdate: (steps: number) => void,
  intervalMs = 10_000
): (() => void) => {
  let active = true;
  const tick = async () => {
    if (!active) return;
    const s = await getTodaySteps();
    if (active) onUpdate(s);
  };
  tick(); // immediate first read
  const id = setInterval(tick, intervalMs);
  return () => { active = false; clearInterval(id); };
};

export const loadSavedSteps = async (userId: string): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('step_logs').select('steps')
      .eq('user_id', userId).eq('date', today).maybeSingle();
    return data?.steps ?? 0;
  } catch { return 0; }
};

export const saveStepsToSupabase = async (
  userId: string, steps: number, goalSteps: number
): Promise<void> => {
  if (!userId || steps < 0) return;
  const today = new Date().toISOString().split('T')[0];
  try {
    await supabase.from('step_logs').upsert(
      { user_id: userId, steps, goal_steps: goalSteps, date: today },
      { onConflict: 'user_id,date' }
    );
  } catch {}
};

export const stepsToCalories = (steps: number) => Math.round(steps * 0.04);
export const stepsProgress   = (steps: number, goal: number) => Math.min(steps / goal, 1);