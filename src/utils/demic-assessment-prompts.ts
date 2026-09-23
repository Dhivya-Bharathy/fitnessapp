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
  return `Client intake (all questions answered):

${formatAnswers(answers)}

Create a personalized plan:

1) **workout** — Session for their level, equipment, injuries, and training days. Include warmup, 5–8 main exercises, cooldown, and motivating ai_notes (no brand names).

2) **indian_diet_plan** — One day of Indian meals (breakfast, lunch, dinner, optional snack) with realistic home options, macros estimate, and ₹ budget alignment.

3) **weekly_outline** — Array of ${trainingDaysCount(answers)} short strings describing each training day focus (use their selected weekdays when provided).

4) **coach_summary** — 2–3 warm, motivational sentences tying AI training + Indian diet together. No influencer or brand references.

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
