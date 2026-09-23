import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../services/profileService';

/** Stored in profiles.tracking_preferences when the 22-question AI intake is complete. */
export const FITNESS_ASSESSMENT_DONE = 'fitness_assessment_done';

const LOCAL_ASSESSMENT_KEY = '@fitness_assessment_complete_v1';
const FORCE_RETAKE_KEY = '@fitness_force_assessment_retake_v1';

export async function persistForceAssessmentRetake(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(FORCE_RETAKE_KEY, '1');
  } else {
    await AsyncStorage.removeItem(FORCE_RETAKE_KEY);
  }
}

export async function readForceAssessmentRetake(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FORCE_RETAKE_KEY)) === '1';
  } catch {
    return false;
  }
}

export function isFitnessAssessmentComplete(profile: Profile | null | undefined): boolean {
  return profile?.tracking_preferences?.includes(FITNESS_ASSESSMENT_DONE) ?? false;
}

export function mergeAssessmentDonePrefs(existing: string[] | null | undefined): string[] {
  const base = existing?.filter(Boolean) ?? [];
  if (base.includes(FITNESS_ASSESSMENT_DONE)) return base;
  return [...base, FITNESS_ASSESSMENT_DONE];
}

export async function setLocalAssessmentComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ASSESSMENT_KEY, userId);
}

export async function getLocalAssessmentComplete(userId: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(LOCAL_ASSESSMENT_KEY);
    return v === userId;
  } catch {
    return false;
  }
}

export async function clearLocalAssessmentComplete(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_ASSESSMENT_KEY);
}

/** Server flag or local fallback (avoids sending users back to Welcome after refresh). */
export async function isAssessmentCompleteForUser(
  userId: string,
  profile: Profile | null | undefined,
  options?: { forceRetake?: boolean },
): Promise<boolean> {
  if (options?.forceRetake) return false;
  if (isFitnessAssessmentComplete(profile)) return true;
  return getLocalAssessmentComplete(userId);
}

export function stripAssessmentDoneFromPrefs(
  existing: string[] | null | undefined,
): string[] {
  return (existing ?? []).filter((p) => p && p !== FITNESS_ASSESSMENT_DONE);
}
