import type { Profile } from '../services/profileService';

/** Stored in profiles.tracking_preferences when the 22-question AI intake is complete. */
export const FITNESS_ASSESSMENT_DONE = 'fitness_assessment_done';

export function isFitnessAssessmentComplete(profile: Profile | null | undefined): boolean {
  return profile?.tracking_preferences?.includes(FITNESS_ASSESSMENT_DONE) ?? false;
}

export function mergeAssessmentDonePrefs(existing: string[] | null | undefined): string[] {
  const base = existing?.filter(Boolean) ?? [];
  if (base.includes(FITNESS_ASSESSMENT_DONE)) return base;
  return [...base, FITNESS_ASSESSMENT_DONE];
}
