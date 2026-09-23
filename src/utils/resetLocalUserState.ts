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
  if (Platform.OS !== 'web') return;
  const projectRef = process.env.EXPO_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

  const clearStorage = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token') ||
        (projectRef && key.includes(projectRef))
      ) {
        storage.removeItem(key);
      }
    }
  };

  if (typeof localStorage !== 'undefined') clearStorage(localStorage);
  if (typeof sessionStorage !== 'undefined') clearStorage(sessionStorage);
}
