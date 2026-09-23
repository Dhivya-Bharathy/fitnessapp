import type { AssessmentAnswers } from '../store/assessmentStore';

function formatAnswers(answers: AssessmentAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}

function trainingDaysCount(answers: AssessmentAnswers): string {
  const d = answers.days_per_week;
  if (Array.isArray(d)) return String(d.length || 3);
  return String(d ?? '3');
}

export function buildDemicAssessmentSystemPrompt(): string {
  return `You are an elite fitness coach combining:
1) Practical strength training, calisthenics, and gym-based workouts tailored to the client's level
2) Indian nutrition (regional foods, veg/non-veg, budget in INR)

Principles: progressive overload, joint-friendly regressions, clear form cues, sustainable weekly volume.
Never mention brands, influencers, or social media handles.
Safety: respect injuries, suggest regressions, no medical claims.
Output ONLY valid JSON matching the requested schema.`;
}

export function buildDemicAssessmentUserPrompt(answers: AssessmentAnswers): string {
  return `Client intake — use EVERY field below; do not ignore injuries, diet_type, indian_meals, budget_inr, days_per_week (weekday list), equipment, training_focus, or avoid_foods.

${formatAnswers(answers)}

Create a deeply personalized plan (not generic):

1) **workout** — Match primary_goal, experience, pullups/pushups level, session_minutes, training_place, equipment, injuries, and training_focus. Exercises must be feasible with their equipment (e.g. gym vs home). Include warmup, 5–8 main exercises, cooldown, ai_notes referencing their goals (no brand names).

2) **indian_diet_plan** — Match diet_type, indian_meals preferences, meals_per_day, budget_inr, cooking, avoid_foods, and water_liters. Use specific Indian dishes they would eat (region preferences). Realistic calories for their goal (fat loss vs muscle).

3) **weekly_outline** — Exactly ${trainingDaysCount(answers)} entries aligned with their selected training days (days_per_week). Each line names focus for that day.

4) **coach_summary** — 2–3 sentences referencing their actual goals, schedule, and diet choices from the intake. Motivational, specific, not generic.

JSON schema:
{
  "coach_summary": "string",
  "weekly_outline": ["string"],
  "workout": {
    "title": "string",
    "description": "string",
    "duration": number,
    "difficulty": number,
    "warmup": ["string"],
    "exercises": [{"name":"string","sets":number,"reps":"string","rest":number,"form_tips":"string","progression":"string"}],
    "cooldown": ["string"],
    "ai_notes": "string",
    "focus_moves": ["string"]
  },
  "indian_diet_plan": {
    "title": "string",
    "description": "string",
    "daily_calories": number,
    "meals": [{"name":"string","foods":["string"],"calories":number,"protein_g":number,"carbs_g":number,"fats_g":number}],
    "hydration_tip": "string",
    "budget_note": "string"
  }
}`;
}
