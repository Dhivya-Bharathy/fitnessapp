import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../services/profileService';

/** Stored in profiles.tracking_preferences when the 22-question AI intake is complete. */
export const FITNESS_ASSESSMENT_DONE = 'fitness_assessment_done';
/** User chose to enter the app first; can finish intake later from AI Coach. */
export const FITNESS_ASSESSMENT_DEFERRED = 'fitness_assessment_deferred';

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

function onboardingBioFields(profile: Profile | null | undefined): {
  full_name?: string;
  calfit_id?: string;
  goal?: string;
} {
  const raw = profile?.bio;
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw) as { onboarding_v1?: Record<string, unknown> };
    const o = parsed.onboarding_v1;
    if (!o || typeof o !== 'object') return {};
    return {
      full_name: typeof o.display_name === 'string' ? o.display_name : undefined,
      calfit_id: typeof o.username === 'string' ? o.username : undefined,
      goal: typeof o.goal === 'string' ? o.goal : undefined,
    };
  } catch {
    return {};
  }
}

/** Google + name + Fitness ID saved (step before the 22-question intake). */
export function isProfileSetupComplete(profile: Profile | null | undefined): boolean {
  const bio = onboardingBioFields(profile);
  return !!(
    (profile?.goal?.trim() || bio.goal?.trim())
    && (profile?.full_name?.trim() || bio.full_name?.trim())
    && (profile?.calfit_id?.trim() || bio.calfit_id?.trim())
  );
}

export function isFitnessAssessmentComplete(profile: Profile | null | undefined): boolean {
  const prefs = profile?.tracking_preferences ?? [];
  return prefs.includes(FITNESS_ASSESSMENT_DONE) || prefs.includes(FITNESS_ASSESSMENT_DEFERRED);
}

export function mergeDeferredAssessmentPrefs(existing: string[] | null | undefined): string[] {
  const base = (existing ?? []).filter(Boolean).filter((p) => p !== FITNESS_ASSESSMENT_DONE);
  if (base.includes(FITNESS_ASSESSMENT_DEFERRED)) return base;
  return [...base, FITNESS_ASSESSMENT_DEFERRED];
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
