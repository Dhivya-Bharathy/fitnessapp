import type { AssessmentAnswers } from '../store/assessmentStore';
import { DEMIC_STORY_SIGNATURE_MOVES, DEMIC_STORY_TRAINING_PRINCIPLES } from './demic-story-knowledge';

function formatAnswers(answers: AssessmentAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}

export function buildDemicAssessmentSystemPrompt(): string {
  return `You are an elite fitness coach combining:
1) Demic Story–style athletic calisthenics (Instagram inspiration: @demicstory — bar work, bodyweight skills, conditioning)
2) Practical Indian nutrition (regional foods, veg/non-veg, budget in INR)

${DEMIC_STORY_TRAINING_PRINCIPLES}

Reference signature move families when relevant: ${DEMIC_STORY_SIGNATURE_MOVES.join(', ')}.

Safety: respect injuries, suggest regressions, no medical claims.
Output ONLY valid JSON matching the requested schema.`;
}

export function buildDemicAssessmentUserPrompt(answers: AssessmentAnswers): string {
  return `Client intake (all questions answered):

${formatAnswers(answers)}

Create a personalized plan:

1) **workout** — Demic Story–inspired session for their level, equipment, injuries, and days/week. Use exercise names they can film like short-form fitness content. Include warmup, 5–8 main exercises, cooldown, ai_notes referencing why moves match @demicstory style progressions.

2) **indian_diet_plan** — One day of Indian meals (breakfast, lunch, dinner, optional snack) with realistic home/street options, macros estimate, and ₹ budget alignment.

3) **weekly_outline** — Array of ${answers.days_per_week ?? '3'} short strings describing each training day focus.

4) **coach_summary** — 2–3 encouraging sentences tying training + Indian diet together.

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
    "demic_story_moves": ["string"]
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
