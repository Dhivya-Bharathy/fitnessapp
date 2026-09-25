import type { User } from '@supabase/supabase-js';
import type { Profile } from '../services/profileService';
import { isFitnessAssessmentComplete, isProfileSetupComplete } from './onboardingFlags';

/** True = show Welcome / onboarding / 22-question flow (not main app). */
export function shouldShowOnboardingFlow(
  user: User | null | undefined,
  profile: Profile | null | undefined,
  options: { forceAssessmentRetake?: boolean },
): boolean {
  if (!user) return true;
  if (options.forceAssessmentRetake) return true;
  if (!isProfileSetupComplete(profile)) return true;
  if (!isFitnessAssessmentComplete(profile)) return true;
  return false;
}
