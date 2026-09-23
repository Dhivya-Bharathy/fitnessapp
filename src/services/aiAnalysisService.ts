import { supabase } from './supabase';

/** Analysis of a user's workout data over a time period. */
export interface WorkoutAnalysis {
  totalSessions: number;
  totalCalories: number;
  totalDurationMinutes: number;
  averageCaloriesPerSession: number;
  averageDurationPerSession: number;
  streakDays: number;
  weeklyBreakdown: WeeklyBreakdown[];
  categoryDistribution: Record<string, number>;
  recentTrend: 'improving' | 'steady' | 'declining' | 'insufficient_data';
  prediction: GoalPrediction;
  suggestions: string[];
}

/** Weekly summary of workout sessions. */
export interface WeeklyBreakdown {
  weekStart: string;
  sessions: number;
  totalCalories: number;
  totalMinutes: number;
}

/** Prediction of when a user will reach their next fitness goal. */
export interface GoalPrediction {
  estimatedDate: string | null;
  confidence: 'high' | 'medium' | 'low';
  message: string;
  milestoneNext: Milestone | null;
}

/** Represents a fitness milestone a user is working toward. */
export interface Milestone {
  label: string;
  targetCalories: number;
  targetSessions: number;
  currentProgress: number;
}

/** Supported time ranges for workout analysis. */
export type TimeRange = '7d' | '30d' | '90d';

/** Fetches and analyzes workout data for a user over a given time range. @param userId - The user's ID. @param timeRange - The time range to analyze (defaults to 30d). @returns A comprehensive WorkoutAnalysis object. */
export async function fetchWorkoutAnalysis(
  userId: string,
  timeRange: TimeRange = '30d'
): Promise<WorkoutAnalysis> {
  const now = new Date();
  const pastDate = new Date(now);

  switch (timeRange) {
    case '7d': pastDate.setDate(pastDate.getDate() - 7); break;
    case '30d': pastDate.setDate(pastDate.getDate() - 30); break;
    case '90d': pastDate.setDate(pastDate.getDate() - 90); break;
  }

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, user_id, name, status, calories_burned, duration_seconds, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', pastDate.toISOString())
    .order('completed_at', { ascending: false });

  if (error || !sessions || sessions.length === 0) {
    return buildEmptyAnalysis();
  }

  const totalSessions = sessions.length;
  const totalCalories = sessions.reduce((s, x) => s + (x.calories_burned || 0), 0);
  const totalDurationMinutes = Math.round(
    sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60
  );
  const averageCaloriesPerSession = totalSessions > 0 ? Math.round(totalCalories / totalSessions) : 0;
  const averageDurationPerSession = totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0;

  const streakDays = calculateStreak(sessions);
  const weeklyBreakdown = buildWeeklyBreakdown(sessions);
  const categoryDistribution = buildCategoryDistribution(sessions);
  const recentTrend = analyzeTrend(weeklyBreakdown);
  const prediction = buildPrediction(totalCalories, totalSessions, weeklyBreakdown);
  const suggestions = generateSuggestions(recentTrend, streakDays, categoryDistribution, totalSessions, timeRange);

  return {
    totalSessions, totalCalories, totalDurationMinutes,
    averageCaloriesPerSession, averageDurationPerSession,
    streakDays, weeklyBreakdown, categoryDistribution,
    recentTrend, prediction, suggestions,
  };
}

function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(sorted[0].completed_at);
  firstDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - firstDate.getTime()) / 86400000);
  if (diffDays > 1) return 0;

  for (let i = 1; i < sorted.length; i++) {
    const curr = new Date(sorted[i].completed_at);
    curr.setHours(0, 0, 0, 0);
    const prev = new Date(sorted[i - 1].completed_at);
    prev.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (dayDiff === 1) {
      streak++;
    } else if (dayDiff === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function buildWeeklyBreakdown(sessions: any[]): WeeklyBreakdown[] {
  const weeks: Record<string, { sessions: number; calories: number; minutes: number }> = {};

  for (const s of sessions) {
    const d = new Date(s.completed_at);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = monday.toISOString().split('T')[0];

    if (!weeks[key]) weeks[key] = { sessions: 0, calories: 0, minutes: 0 };
    weeks[key].sessions += 1;
    weeks[key].calories += s.calories_burned || 0;
    weeks[key].minutes += Math.round((s.duration_seconds || 0) / 60);
  }

  return Object.entries(weeks)
    .map(([weekStart, data]) => ({
      weekStart,
      sessions: data.sessions,
      totalCalories: data.calories,
      totalMinutes: data.minutes,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function buildCategoryDistribution(sessions: any[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const s of sessions) {
    const name = s.name || 'Workout';
    const cat = name.replace(/ Workout$/, '');
    dist[cat] = (dist[cat] || 0) + 1;
  }
  return dist;
}

function analyzeTrend(weekly: WeeklyBreakdown[]): 'improving' | 'steady' | 'declining' | 'insufficient_data' {
  if (weekly.length < 2) return 'insufficient_data';

  const recent = weekly.slice(-2);
  const firstCal = recent[0].totalCalories;
  const lastCal = recent[1].totalCalories;

  const diff = lastCal - firstCal;
  const threshold = firstCal * 0.15;

  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'steady';
}

function buildPrediction(
  totalCalories: number,
  totalSessions: number,
  weekly: WeeklyBreakdown[]
): GoalPrediction {
  const avgWeeklyCalories = weekly.length > 0
    ? Math.round(totalCalories / weekly.length)
    : 0;

  if (totalSessions < 3 || avgWeeklyCalories === 0) {
    return {
      estimatedDate: null,
      confidence: 'low',
      message: 'Complete more workouts to get a personalized goal prediction.',
      milestoneNext: null,
    };
  }

  const weeklySessions = weekly.length > 0
    ? Math.round(totalSessions / weekly.length)
    : 0;

  const milestones = [
    { label: 'Burn 5,000 kcal', targetCalories: 5000, targetSessions: 0 },
    { label: '10 Workout Sessions', targetCalories: 0, targetSessions: 10 },
    { label: 'Burn 10,000 kcal', targetCalories: 10000, targetSessions: 0 },
    { label: '25 Workout Sessions', targetCalories: 0, targetSessions: 25 },
    { label: 'Burn 25,000 kcal', targetCalories: 25000, targetSessions: 0 },
  ];

  let nearestMilestone: Milestone | null = null;
  for (const m of milestones) {
    let progress = 0;
    if (m.targetCalories > 0) {
      progress = Math.min(totalCalories / m.targetCalories, 1);
    } else {
      progress = Math.min(totalSessions / m.targetSessions, 1);
    }
    if (progress < 1) {
      nearestMilestone = {
        label: m.label,
        targetCalories: m.targetCalories,
        targetSessions: m.targetSessions,
        currentProgress: Math.round(progress * 100),
      };
      break;
    }
  }

  const weeksToGoal = nearestMilestone
    ? Math.ceil(
        (nearestMilestone.targetCalories > 0
          ? (nearestMilestone.targetCalories - totalCalories) / (avgWeeklyCalories || 1)
          : (nearestMilestone.targetSessions - totalSessions) / (weeklySessions || 1))
      )
    : 0;

  const estimatedDate = weeksToGoal > 0 && weeksToGoal < 52
    ? new Date(Date.now() + weeksToGoal * 7 * 86400000).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const confidence = totalSessions >= 10 ? 'high' : totalSessions >= 5 ? 'medium' : 'low';

  const message = estimatedDate
    ? `At your current pace, you'll reach "${nearestMilestone?.label}" by ${estimatedDate}.`
    : 'Keep going! Your consistency is building momentum.';

  return { estimatedDate, confidence, message, milestoneNext: nearestMilestone };
}

function generateSuggestions(
  trend: string,
  streakDays: number,
  categoryDist: Record<string, number>,
  totalSessions: number,
  timeRange: TimeRange
): string[] {
  const suggestions: string[] = [];

  if (totalSessions === 0) {
    suggestions.push('Start with 2-3 short workouts this week to build a routine.');
    suggestions.push('Try a Full Body workout to engage all muscle groups.');
    suggestions.push('Set a daily reminder to stay consistent.');
    return suggestions;
  }

  if (trend === 'declining') {
    suggestions.push('Your activity has dropped recently. Try a shorter 15-min workout to rebuild momentum.');
    suggestions.push('Switch to a different muscle group to keep things fresh.');
    suggestions.push('Work out with a partner or join an accountability group for motivation.');
  }

  if (trend === 'steady' || trend === 'improving') {
    suggestions.push(`Great consistency! Try adding 5 more minutes to each workout to accelerate progress.`);
    suggestions.push('Increase intensity by reducing rest between exercises.');
    suggestions.push('Challenge yourself with a new exercise category this week.');
  }

  const categories = Object.keys(categoryDist);
  if (categories.length <= 2 && totalSessions >= 5) {
    suggestions.push(`You mostly train ${categories.join(' and ')}. Add variety by including other muscle groups for balanced growth.`);
  }

  if (streakDays >= 7) {
    suggestions.push(`Amazing ${streakDays}-day streak! Keep it up — consistency is the #1 predictor of fitness success.`);
  } else if (streakDays >= 3) {
    suggestions.push(`You're on a ${streakDays}-day streak! Try to make it a full week.`);
  }

  suggestions.push('Stay hydrated and fuel properly before workouts for better performance.');
  suggestions.push('Track your meals in the Calorie tab to optimize nutrition for your goals.');

  return suggestions.slice(0, 5);
}

function buildEmptyAnalysis(): WorkoutAnalysis {
  return {
    totalSessions: 0, totalCalories: 0, totalDurationMinutes: 0,
    averageCaloriesPerSession: 0, averageDurationPerSession: 0,
    streakDays: 0, weeklyBreakdown: [], categoryDistribution: {},
    recentTrend: 'insufficient_data',
    prediction: {
      estimatedDate: null, confidence: 'low',
      message: 'Complete a workout to start tracking your progress!',
      milestoneNext: null,
    },
    suggestions: [
      'Start with 2-3 short workouts this week to build a routine.',
      'Try a Full Body workout to engage all muscle groups.',
      'Set a daily reminder to stay consistent.',
    ],
  };
}
