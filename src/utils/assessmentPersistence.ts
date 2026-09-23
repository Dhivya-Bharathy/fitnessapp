import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AssessmentAnswers } from '../store/assessmentStore';

const ANSWERS_KEY = '@fitness_assessment_answers_v1';
const INDEX_KEY = '@fitness_assessment_index_v1';

export async function loadPersistedAssessment(): Promise<{ answers: AssessmentAnswers; index: number } | null> {
  try {
    const [rawAnswers, rawIndex] = await Promise.all([
      AsyncStorage.getItem(ANSWERS_KEY),
      AsyncStorage.getItem(INDEX_KEY),
    ]);
    if (!rawAnswers) return null;
    const answers = JSON.parse(rawAnswers) as AssessmentAnswers;
    const index = rawIndex ? Number(rawIndex) : 0;
    return { answers, index: Number.isFinite(index) ? index : 0 };
  } catch {
    return null;
  }
}

export async function persistAssessmentAnswers(answers: AssessmentAnswers): Promise<void> {
  try {
    await AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  } catch {
    /* ignore */
  }
}

export async function persistAssessmentIndex(index: number): Promise<void> {
  try {
    await AsyncStorage.setItem(INDEX_KEY, String(index));
  } catch {
    /* ignore */
  }
}

export async function clearAssessmentPersistence(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ANSWERS_KEY, INDEX_KEY]);
  } catch {
    /* ignore */
  }
}
