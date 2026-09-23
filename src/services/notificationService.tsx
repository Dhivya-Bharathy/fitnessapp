import { supabase } from './supabase';

/** Represents a notification from the app's notification system. */
export interface AppNotification {
  id: string;
  type:
    | 'achievement'
    | 'social'
    | 'streak'
    | 'upgrade'
    | 'coach'
    | 'community'
    | 'goal'
    | 'system'
    | 'welcome';
  title: string;
  body: string;
  action_label?: string;
  read: boolean;
  created_at: string;
}

/** Fetches all notifications for a user. @param userId - The user's ID. @returns Array of AppNotification objects. */
export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, action_label, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (__DEV__) console.error('Failed to fetch notifications:', error.message);
    return [];
  }
  return data ?? [];
};

/** Gets the count of unread notifications for a user. @param userId - The user's ID. @returns The number of unread notifications. */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
};

/** Marks a single notification as read. @param notificationId - The notification's ID. */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
};

/** Marks all unread notifications as read for a user. @param userId - The user's ID. */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
};

/** Deletes a single notification. @param notificationId - The notification's ID. */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
};

/** Sends a notification after a user action. @param userId - The user's ID. @param type - The notification type. @param title - The notification title. @param body - The notification body. @param actionLabel - Optional call-to-action label. */
export const sendNotification = async (
  userId: string,
  type: AppNotification['type'],
  title: string,
  body: string,
  actionLabel?: string
): Promise<void> => {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    action_label: actionLabel ?? null,
    read: false,
  });
};

// ── TRIGGER FUNCTIONS ──────────────────────────────────────────
// Call these from within the app after specific user actions

/** Notifies that a food item has been logged. @param userId - The user's ID. @param foodName - The logged food name. @param calories - The calorie count. */
export const notifyFoodLogged = async (userId: string, foodName: string, calories: number) => {
  await sendNotification(
    userId,
    'goal',
    'Food Logged ✓',
    `${foodName} (${calories} kcal) has been added to your meals today.`,
  );
};

/** Notifies that the user hit their daily water goal. @param userId - The user's ID. */
export const notifyWaterGoalReached = async (userId: string) => {
  await sendNotification(
    userId,
    'goal',
    'Water Goal Hit! 💧',
    "You've hit your daily water goal. Great job staying hydrated!",
    'View Progress'
  );
};

/** Notifies that the user hit their daily calorie goal. @param userId - The user's ID. */
export const notifyCalorieGoalReached = async (userId: string) => {
  await sendNotification(
    userId,
    'goal',
    'Daily Calorie Goal Reached! 🎯',
    "You've hit your calorie target for today. Finish strong!",
    'View Calories'
  );
};

/** Notifies that a workout has been completed. @param userId - The user's ID. @param workoutName - The workout name. @param calories - Calories burned. @param duration - Duration in seconds. */
export const notifyWorkoutComplete = async (
  userId: string,
  workoutName: string,
  calories: number,
  duration: number
) => {
  const mins = Math.floor(duration / 60);
  await sendNotification(
    userId,
    'achievement',
    'Workout Complete! 💪',
    `${workoutName} done — ${mins} min · ${calories} kcal burned. Excellent work!`,
    'View History'
  );
};

/** Notifies about a streak check-in milestone. @param userId - The user's ID. @param streakCount - The current streak length. */
export const notifyStreakCheckIn = async (userId: string, streakCount: number) => {
  await sendNotification(
    userId,
    'streak',
    `${streakCount}-Day Streak! 🔥`,
    `You checked in for day ${streakCount}. Keep it going to unlock your next milestone badge.`,
    'View Streaks'
  );
};

/** Sends a reminder to maintain the user's streak. @param userId - The user's ID. */
export const notifyStreakReminder = async (userId: string) => {
  await sendNotification(
    userId,
    'streak',
    "Don't lose your streak! ⚠️",
    "You haven't checked in today. Log anything or check in now to keep your streak alive.",
    'Check In'
  );
};

/** Notifies that an AI meal plan has been generated. @param userId - The user's ID. @param planTitle - The meal plan title. */
export const notifyMealPlanGenerated = async (userId: string, planTitle: string) => {
  await sendNotification(
    userId,
    'coach',
    'Meal Plan Ready 🍽️',
    `Your AI meal plan "${planTitle}" has been generated and saved. Tap to view it.`,
    'View Plan'
  );
};

/** Notifies that the user's profile is complete. @param userId - The user's ID. */
export const notifyProfileComplete = async (userId: string) => {
  await sendNotification(
    userId,
    'system',
    'Profile Complete ✓',
    'Your profile is fully set up. Fitness App is now personalised to your goals and body stats.',
  );
};

/** Notifies about a message from an accountability partner. @param userId - The user's ID. @param partnerName - The partner's name. @param messageType - The message type (text, image, video, audio). */
export const notifyPartnerMessage = async (userId: string, partnerName: string, messageType: string) => {
  const labels: Record<string, string> = {
    text: 'sent you a message',
    image: 'sent you a photo',
    video: 'sent you a video',
    audio: 'sent you a voice note',
  };
  await sendNotification(
    userId,
    'social',
    `💬 ${partnerName}`,
    `${partnerName} ${labels[messageType] ?? 'sent you a message'}. Tap to view.`,
    'View Chat'
  );
};

/** Notifies about a partner's streak achievement. @param userId - The user's ID. @param partnerName - The partner's name. @param streakCount - The partner's streak length. */
export const notifyPartnerStreak = async (userId: string, partnerName: string, streakCount: number) => {
  await sendNotification(
    userId,
    'streak',
    `🔥 ${partnerName} is on fire!`,
    `${partnerName} has reached a ${streakCount}-day streak! Cheer them on!`,
    'View Streaks'
  );
};

/** Notifies that the AI Coach has new insights. @param userId - The user's ID. */
export const notifyCoachResponse = async (userId: string) => {
  await sendNotification(
    userId,
    'coach',
    'AI Coach Ready 🤖',
    'Your AI Coach has new insights and tips for you. Tap to chat.',
    'Open Coach'
  );
};

/** Prompts the user to upgrade to a premium plan. @param userId - The user's ID. */
export const notifyUpgradePrompt = async (userId: string) => {
  await sendNotification(
    userId,
    'upgrade',
    'Unlock the Full Fitness App Experience ⭐',
    'Upgrade to Pro or Premium to access the AI food scanner, unlimited Coach prompts, live streaming and more.',
    'View Plans'
  );
};

/** Checks if a streak reminder should be sent and sends it if needed. @param userId - The user's ID. @param lastActiveDate - The date of the user's last activity, or null. */
export const checkAndSendStreakReminder = async (
  userId: string,
  lastActiveDate: string | null
): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  // Already checked in today — no reminder needed
  if (lastActiveDate === today) return;

  // Check if we already sent a reminder today
  const { supabase } = await import('./supabase');
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'streak')
    .gte('created_at', `${today}T00:00:00`)
    .limit(1);

  // Already sent a reminder today
  if (data && data.length > 0) return;

  // Send the daily reminder
  await sendNotification(
    userId,
    'streak',
    "Don't lose your streak! ⚠️",
    "You haven't checked in today. Tap to check in now and keep your streak alive.",
    'Check In'
  );
  
};
/** Sends a welcome notification to a new user. @param userId - The user's ID. @param userName - The user's name. */
export const sendWelcomeNotification = async (userId: string, userName: string) => {
  await sendNotification(
    userId,
    'welcome',
    `Welcome to Fitness App, ${userName}! 🎉`,
    'Your personalised fitness plan is ready. Start tracking your calories, workouts, and more!',
    'Get Started'
  );
};

