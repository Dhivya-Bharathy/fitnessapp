import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@fitness_local_streak_v1';

export type LocalStreak = {
  userId: string;
  streak_count: number;
  last_active_date: string;
  streak_freeze_used_week?: boolean;
};

export async function readLocalStreak(userId: string): Promise<LocalStreak | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalStreak;
    return parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeLocalStreak(data: LocalStreak): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
