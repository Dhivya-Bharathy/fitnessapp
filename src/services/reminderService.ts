import * as Notifications from 'expo-notifications';

// ── NOTIFICATION HANDLER SETUP ────────────────────────────────
// Call this once in App.tsx before the return statement
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

// ── REQUEST PERMISSIONS ───────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ── REMINDER IDs ──────────────────────────────────────────────
export const REMINDER_IDS = {
  MEAL_BREAKFAST: 'reminder_meal_breakfast',
  MEAL_LUNCH:     'reminder_meal_lunch',
  MEAL_DINNER:    'reminder_meal_dinner',
  WATER:          'reminder_water',
  WORKOUT:        'reminder_workout',
  SLEEP:          'reminder_sleep',
  STREAK:         'reminder_streak',
};

// ── CANCEL A SPECIFIC REMINDER ────────────────────────────────
export const cancelReminder = async (identifier: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (_) {}
};

// ── CANCEL ALL CALFIT REMINDERS ───────────────────────────────
export const cancelAllReminders = async (): Promise<void> => {
  await Promise.all(Object.values(REMINDER_IDS).map(cancelReminder));
};

// ── INTERNAL: schedule a daily repeating notification ─────────
const scheduleDailyReminder = async (
  identifier: string,
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<void> => {
  await cancelReminder(identifier);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true, data: { type: 'reminder', identifier } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

// ── MEAL REMINDERS ────────────────────────────────────────────
export const scheduleMealReminders = async (enabled: boolean): Promise<void> => {
  if (!enabled) {
    await cancelReminder(REMINDER_IDS.MEAL_BREAKFAST);
    await cancelReminder(REMINDER_IDS.MEAL_LUNCH);
    await cancelReminder(REMINDER_IDS.MEAL_DINNER);
    return;
  }
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleDailyReminder(REMINDER_IDS.MEAL_BREAKFAST, '🍳 Log your breakfast', 'Start your day right — log what you ate for breakfast.', 8, 0);
  await scheduleDailyReminder(REMINDER_IDS.MEAL_LUNCH, '🥗 Log your lunch', "Midday check-in — don't forget to log your lunch.", 13, 0);
  await scheduleDailyReminder(REMINDER_IDS.MEAL_DINNER, '🍽️ Log your dinner', 'Evening log — add your dinner to stay on track with your goals.', 19, 0);
};

// ── WATER REMINDER ────────────────────────────────────────────
export const scheduleWaterReminder = async (enabled: boolean): Promise<void> => {
  if (!enabled) { await cancelReminder(REMINDER_IDS.WATER); return; }
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleDailyReminder(REMINDER_IDS.WATER, '💧 Stay hydrated', 'Time to drink some water and log your intake in Fitness App.', 12, 0);
};

// ── WORKOUT REMINDER ──────────────────────────────────────────
export const scheduleWorkoutReminder = async (enabled: boolean): Promise<void> => {
  if (!enabled) { await cancelReminder(REMINDER_IDS.WORKOUT); return; }
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleDailyReminder(REMINDER_IDS.WORKOUT, '💪 Time to move', 'Your workout is waiting — open Fitness App and crush it today.', 7, 0);
};

// ── SLEEP REMINDER ────────────────────────────────────────────
export const scheduleSleepReminder = async (enabled: boolean): Promise<void> => {
  if (!enabled) { await cancelReminder(REMINDER_IDS.SLEEP); return; }
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleDailyReminder(REMINDER_IDS.SLEEP, '🌙 Wind down time', 'Aim for 8 hours tonight. Log your sleep tomorrow morning in Fitness App.', 22, 0);
};

// ── STREAK REMINDER ───────────────────────────────────────────
export const scheduleStreakReminder = async (enabled: boolean): Promise<void> => {
  if (!enabled) { await cancelReminder(REMINDER_IDS.STREAK); return; }
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await scheduleDailyReminder(REMINDER_IDS.STREAK, "🔥 Don't break your streak", 'Check in today to keep your streak alive. Tap to check in now.', 20, 0);
};

// ── INSTANT LOCAL NOTIFICATION (for partner messages, coach, etc.) ──
export const sendInstantNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: data ?? {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    });
  } catch (_) {}
};

// ── SCHEDULE ALL ──────────────────────────────────────────────
export const scheduleAllReminders = async (prefs: {
  meals: boolean; water: boolean; workout: boolean;
  sleep: boolean; streak: boolean;
}): Promise<void> => {
  await Promise.all([
    scheduleMealReminders(prefs.meals),
    scheduleWaterReminder(prefs.water),
    scheduleWorkoutReminder(prefs.workout),
    scheduleSleepReminder(prefs.sleep),
    scheduleStreakReminder(prefs.streak),
  ]);
};