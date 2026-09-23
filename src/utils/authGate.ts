import type { User } from '@supabase/supabase-js';
import type { Profile } from '../services/profileService';
import { isFitnessAssessmentComplete } from './onboardingFlags';

/** True = show Welcome / onboarding / 22-question flow (not main app). */
export function shouldShowOnboardingFlow(
  user: User | null | undefined,
  profile: Profile | null | undefined,
  options: { forceAssessmentRetake?: boolean },
): boolean {
  if (!user) return true;
  if (options.forceAssessmentRetake) return true;
  if (!profile?.goal) return true;
  if (!isFitnessAssessmentComplete(profile)) return true;
  return false;
}
