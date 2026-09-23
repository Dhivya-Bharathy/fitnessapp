import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAssessmentPersistence } from './assessmentPersistence';
import { clearLocalAssessmentComplete } from './onboardingFlags';
import { useAssessmentStore } from '../store/assessmentStore';

/** Clears on-device assessment + completion flags (fresh 22-question flow). */
export async function resetLocalUserState(): Promise<void> {
  await clearAssessmentPersistence();
  await clearLocalAssessmentComplete();
  useAssessmentStore.getState().reset();
}

/** Removes Supabase auth tokens from browser storage so session cannot restore. */
export function clearSupabaseAuthStorage(): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  const projectRef = process.env.EXPO_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith('sb-') ||
      key.includes('supabase') ||
      (projectRef && key.includes(projectRef))
    ) {
      localStorage.removeItem(key);
    }
  }
}
