import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function css(): string {
  return `
    @page { margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 0; }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 3px solid #4A90E2; margin-bottom: 20px; }
    .header h1 { font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
    .header p { font-size: 13px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; font-weight: 700; color: #4A90E2; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
    .stat-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .stat-card { flex: 1; min-width: 100px; background: #f8f9ff; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-card .value { font-size: 22px; font-weight: 900; color: #1a1a2e; }
    .stat-card .label { font-size: 10px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; padding: 6px 8px; border-bottom: 2px solid #eee; }
    td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 30px; padding-top: 12px; border-top: 1px solid #eee; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
    .badge-up { background: #e8f8ef; color: #2DDC8C; }
    .badge-steady { background: #fff4e0; color: #FFB830; }
    .badge-down { background: #ffe8e8; color: #FF6B6B; }
  `;
}

export async function exportWorkoutAnalysis(data: {
  totalSessions: number;
  totalCalories: number;
  totalDurationMinutes: number;
  averageCaloriesPerSession: number;
  averageDurationPerSession: number;
  streakDays: number;
  recentTrend: string;
  weeklyBreakdown: { weekStart: string; totalCalories: number; sessions: number }[];
  categoryDistribution: Record<string, number>;
  prediction: { message: string; estimatedDate?: string; milestoneNext?: { label: string; currentProgress: number }; confidence: string };
  suggestions: string[];
}, period: string, userName?: string): Promise<string> {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${css()}</style></head><body>
<div class="header">
  <h1>Workout Analysis Report</h1>
  <p>${userName ? `${userName} &mdash; ` : ''}${period} &mdash; Generated ${formatDate()}</p>
</div>

<div class="section">
  <h2>Overview</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${data.totalSessions}</div><div class="label">Workouts</div></div>
    <div class="stat-card"><div class="value">${data.totalCalories}</div><div class="label">Calories Burned</div></div>
    <div class="stat-card"><div class="value">${data.totalDurationMinutes}</div><div class="label">Minutes</div></div>
    <div class="stat-card"><div class="value">${data.streakDays}</div><div class="label">Day Streak</div></div>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${data.averageCaloriesPerSession}</div><div class="label">Avg Cal/Workout</div></div>
    <div class="stat-card"><div class="value">${data.averageDurationPerSession}</div><div class="label">Avg Min/Workout</div></div>
    <div class="stat-card"><div class="value"><span class="badge badge-${data.recentTrend === 'improving' ? 'up' : data.recentTrend === 'declining' ? 'down' : 'steady'}">${data.recentTrend}</span></div><div class="label">Trend</div></div>
  </div>
</div>

${data.weeklyBreakdown.length > 0 ? `<div class="section">
  <h2>Weekly Breakdown</h2>
  <table><thead><tr><th>Week</th><th>Sessions</th><th>Calories</th></tr></thead><tbody>
  ${data.weeklyBreakdown.map((w, i) => `<tr><td>Week ${data.weeklyBreakdown.length - i}</td><td>${w.sessions}</td><td>${w.totalCalories}</td></tr>`).join('')}
  </tbody></table>
</div>` : ''}

${Object.keys(data.categoryDistribution).length > 0 ? `<div class="section">
  <h2>Categories Trained</h2>
  <table><thead><tr><th>Category</th><th>Sessions</th><th>%</th></tr></thead><tbody>
  ${Object.entries(data.categoryDistribution).sort(([,a],[,b])=>b-a).map(([cat, count]) => {
    const total = Object.values(data.categoryDistribution).reduce((s, v) => s + v, 0);
    return `<tr><td>${cat}</td><td>${count}</td><td>${Math.round((count / total) * 100)}%</td></tr>`;
  }).join('')}
  </tbody></table>
</div>` : ''}

<div class="section">
  <h2>AI Prediction</h2>
  <p style="font-size:14px;line-height:1.5;margin-bottom:8px">${data.prediction.message}</p>
  ${data.prediction.estimatedDate ? `<p style="font-size:13px;color:#4A90E2;font-weight:600">Target: ${formatDate(data.prediction.estimatedDate)}</p>` : ''}
  ${data.prediction.milestoneNext ? `<p style="font-size:13px;color:#666">Next Milestone: ${data.prediction.milestoneNext.label} (${data.prediction.milestoneNext.currentProgress}% complete)</p>` : ''}
  <p style="font-size:11px;color:#999;margin-top:4px">Confidence: ${data.prediction.confidence}</p>
</div>

${data.suggestions.length > 0 ? `<div class="section">
  <h2>Suggestions</h2>
  <ul style="padding-left:20px">${data.suggestions.map(s => `<li style="font-size:13px;line-height:1.6;margin-bottom:4px">${s}</li>`).join('')}</ul>
</div>` : ''}

<div class="footer">Generated by Fitness App &mdash; AI-powered fitness tracking</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const pdfName = `workout-analysis-${Date.now()}.pdf`;
  const dest = `${FileSystem.cacheDirectory}${pdfName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf' });
  }
  return dest;
}

export async function exportProgressReport(data: {
  totalCal: number;
  totalBurned: number;
  totalWater: number;
  totalSteps: number;
  avgSleep: number;
  workoutsDone: number;
  streak: number;
  weight: number | null;
  targetWeight: number | null;
  calorieGoal: number;
  waterGoal: number;
  recentWorkouts: { name: string; calories_burned: number; completed_at: string; duration_seconds: number }[];
}, period: string, userName?: string): Promise<string> {
  const netCal = data.totalCal - data.totalBurned;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${css()}</style></head><body>
<div class="header">
  <h1>Progress Report</h1>
  <p>${userName ? `${userName} &mdash; ` : ''}${period} &mdash; Generated ${formatDate()}</p>
</div>

<div class="section">
  <h2>Statistics</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${data.totalCal.toLocaleString()}</div><div class="label">Calories In</div></div>
    <div class="stat-card"><div class="value">${data.totalBurned.toLocaleString()}</div><div class="label">Calories Out</div></div>
    <div class="stat-card"><div class="value">${netCal >= 0 ? '+' : ''}${netCal.toLocaleString()}</div><div class="label">Net Calories</div></div>
    <div class="stat-card"><div class="value">${data.workoutsDone}</div><div class="label">Workouts</div></div>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${(data.totalWater / 1000).toFixed(1)}L</div><div class="label">Water (of ${(data.waterGoal / 1000).toFixed(1)}L goal)</div></div>
    <div class="stat-card"><div class="value">${data.totalSteps.toLocaleString()}</div><div class="label">Steps</div></div>
    <div class="stat-card"><div class="value">${data.avgSleep.toFixed(1)}h</div><div class="label">Avg Sleep</div></div>
    <div class="stat-card"><div class="value">${data.streak}</div><div class="label">Day Streak</div></div>
  </div>
</div>

${data.weight ? `<div class="section">
  <h2>Body Metrics</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${data.weight} kg</div><div class="label">Current Weight</div></div>
    ${data.targetWeight ? `<div class="stat-card"><div class="value">${data.targetWeight} kg</div><div class="label">Target Weight</div></div>` : ''}
    ${data.targetWeight ? `<div class="stat-card"><div class="value">${(data.weight - data.targetWeight) >= 0 ? '+' : ''}${(data.weight - data.targetWeight).toFixed(1)} kg</div><div class="label">To Goal</div></div>` : ''}
  </div>
</div>` : ''}

${data.recentWorkouts.length > 0 ? `<div class="section">
  <h2>Recent Workouts</h2>
  <table><thead><tr><th>Workout</th><th>Calories</th><th>Duration</th><th>Date</th></tr></thead><tbody>
  ${data.recentWorkouts.map(w => `<tr><td>${w.name}</td><td>${w.calories_burned}</td><td>${Math.round(w.duration_seconds / 60)} min</td><td>${formatDate(w.completed_at)}</td></tr>`).join('')}
  </tbody></table>
</div>` : ''}

<div class="section">
  <h2>Daily Goal Status</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="value">${Math.round((data.totalCal / (data.calorieGoal * (data.recentWorkouts.length || 1))) * 100)}%</div><div class="label">Avg Daily Calorie Intake</div></div>
    <div class="stat-card"><div class="value">${data.totalWater > 0 ? Math.round((data.totalWater / data.waterGoal) * 100) : 0}%</div><div class="label">Water Goal</div></div>
  </div>
</div>

<div class="footer">Generated by Fitness App &mdash; AI-powered fitness tracking</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const pdfName = `progress-report-${Date.now()}.pdf`;
  const dest = `${FileSystem.cacheDirectory}${pdfName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf' });
  }
  return dest;
}
