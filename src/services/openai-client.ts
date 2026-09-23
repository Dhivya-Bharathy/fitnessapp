import { extractJSON } from '../utils/json-parser';
import {
  buildDemicAssessmentSystemPrompt,
  buildDemicAssessmentUserPrompt,
} from '../utils/demic-assessment-prompts';
import type { AssessmentAnswers, DemicAssessmentResult } from '../store/assessmentStore';
import type { GeneratedWorkout } from '../types/ai-coach.types';

const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

function getApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_OPENAI_API_KEY;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeWorkout(workout: GeneratedWorkout & { focus_moves?: string[]; demic_story_moves?: string[] }) {
  const focus = workout.focus_moves ?? workout.demic_story_moves;
  return { ...workout, focus_moves: focus, demic_story_moves: undefined };
}

function fallbackPlan(answers: AssessmentAnswers): DemicAssessmentResult {
  const duration = Number(answers.session_minutes) || 30;
  const workout: GeneratedWorkout & { focus_moves?: string[] } = {
    id: generateId(),
    title: 'AI Training — Full Body Session',
    description: 'Balanced strength and conditioning matched to your level and equipment.',
    duration,
    difficulty: 4,
    warmup: ['5 min march + arm circles', 'Band pull-aparts or arm swings', 'Hip openers'],
    exercises: [
      { name: 'Incline / Knee Push-ups', sets: 3, reps: '8-12', rest: 60, form_tips: 'Ribs down, full range', progression: 'Lower incline weekly' },
      { name: 'Rows (band or gym)', sets: 3, reps: '8-10', rest: 60, form_tips: 'Body straight, squeeze shoulder blades', progression: 'Add weight or slow tempo' },
      { name: 'Bodyweight Squats', sets: 3, reps: '15', rest: 45, form_tips: 'Knees track toes', progression: 'Add goblet squat if gym access' },
      { name: 'Plank', sets: 3, reps: '30-45s', rest: 45, form_tips: 'Glutes tight', progression: 'Shoulder taps' },
    ],
    cooldown: ['Walk 3 min', 'Quad & chest stretch'],
    ai_notes: 'Offline template — add EXPO_PUBLIC_OPENAI_API_KEY for a fully personalized AI plan.',
    created_at: new Date().toISOString(),
    focus_moves: ['Push patterns', 'Pull / row', 'Squat pattern', 'Core bracing'],
  };

  return {
    coach_summary: 'You’re building a habit that lasts. Pair these workouts with simple Indian home meals and show up on the days you picked — progress will follow.',
    weekly_outline: ['Full body strength', 'Active recovery / walk', 'Repeat + add reps'],
    workout,
    indian_diet_plan: {
      title: 'Simple Indian Day Plan',
      description: 'Balanced vegetarian-friendly sample; adjust for your diet type.',
      daily_calories: 2000,
      meals: [
        { name: 'Breakfast', foods: ['Vegetable poha', 'Curd', 'Banana'], calories: 450, protein_g: 12, carbs_g: 70, fats_g: 10 },
        { name: 'Lunch', foods: ['Dal', '2 roti', 'Salad'], calories: 650, protein_g: 22, carbs_g: 85, fats_g: 12 },
        { name: 'Dinner', foods: ['Paneer bhurji', 'Jeera rice', 'Cucumber raita'], calories: 700, protein_g: 28, carbs_g: 75, fats_g: 22 },
      ],
      hydration_tip: 'Aim for 2–3L water; masala chai in moderation.',
      budget_note: 'Uses affordable staples from local Indian markets.',
    },
  };
}

/** Generates AI training + Indian diet from 22-question intake. */
export async function generateDemicAssessmentPlan(
  answers: AssessmentAnswers,
): Promise<DemicAssessmentResult> {
  const key = getApiKey();
  if (!key) {
    return fallbackPlan(answers);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.65,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildDemicAssessmentSystemPrompt() },
          { role: 'user', content: buildDemicAssessmentUserPrompt(answers) },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (__DEV__) console.warn('[openai-client]', res.status, errText.slice(0, 200));
      return fallbackPlan(answers);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJSON<DemicAssessmentResult>(content);

    if (!parsed?.workout?.exercises?.length || !parsed.indian_diet_plan?.meals?.length) {
      return fallbackPlan(answers);
    }

    parsed.workout = normalizeWorkout({
      ...parsed.workout,
      id: generateId(),
      created_at: new Date().toISOString(),
    });

    return parsed;
  } catch (e) {
    if (__DEV__) console.warn('[openai-client] exception', e);
    return fallbackPlan(answers);
  }
}
