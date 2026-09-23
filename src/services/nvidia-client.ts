import { supabase } from './supabase';
import { buildSystemPrompt, generateWorkoutPrompt, buildCoachChatSystemPrompt, generateMealPlanPrompt } from '../utils/ai-coach-prompts';
import { extractJSON } from '../utils/json-parser';
import type { GeneratedWorkout, GeneratedMealPlan, MealPlanParams, Exercise, WorkoutParams, ChatMessage } from '../types/ai-coach.types';

const MODEL = process.env.EXPO_PUBLIC_NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const VISION_MODEL = process.env.EXPO_PUBLIC_NVIDIA_VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct';

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function invokeAI(body: Record<string, unknown>): Promise<{ data: any; error: string | null }> {
  try {
    const result = await supabase.functions.invoke('ai-proxy', { body });
    if (result.error) {
      let detail = result.error.message;
      try {
        const resp = result.response || (result.error as any).context;
        if (resp?.status) detail += ` (status=${resp.status})`;
        const cloned = resp?.clone?.();
        if (cloned) {
          const text = await cloned.text();
          if (text) detail += ` body=${text.slice(0, 300)}`;
        }
      } catch {}
      if (__DEV__) console.warn('[invokeAI] error detail:', detail);
      return { data: null, error: detail };
    }
    return { data: result.data, error: null };
  } catch (e: any) {
    if (__DEV__) console.warn('[invokeAI] exception:', e?.message);
    return { data: null, error: e?.message ?? 'Network error' };
  }
}

function validateWorkout(data: any): data is GeneratedWorkout {
  return (
    typeof data?.title === 'string' &&
    typeof data?.description === 'string' &&
    typeof data?.duration === 'number' &&
    typeof data?.difficulty === 'number' &&
    Array.isArray(data?.exercises) &&
    Array.isArray(data?.warmup) &&
    Array.isArray(data?.cooldown) &&
    typeof data?.ai_notes === 'string' &&
    data.exercises.every(
      (e: any) =>
        typeof e.name === 'string' &&
        typeof e.sets === 'number' &&
        typeof e.reps === 'string' &&
        typeof e.rest === 'number' &&
        typeof e.form_tips === 'string' &&
        typeof e.progression === 'string'
    )
  );
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const defaultExercises: Exercise[] = [
  { name: 'Push-ups', sets: 3, reps: '10-15', rest: 60, form_tips: 'Keep core tight and back straight', progression: 'Add weighted vest or decline' },
  { name: 'Bodyweight Squats', sets: 3, reps: '15-20', rest: 60, form_tips: 'Knees track over toes, chest up', progression: 'Add dumbbells or go pistol squat' },
  { name: 'Plank', sets: 3, reps: '30-45 seconds', rest: 45, form_tips: 'Keep core engaged, don\'t let hips sag', progression: 'Add leg lifts or side plank' },
];

function fallbackWorkout(params: WorkoutParams): GeneratedWorkout {
  return {
    id: generateId(),
    title: 'Full Body Foundation',
    description: 'A balanced full-body workout using only bodyweight movements. Perfect for building a baseline.',
    duration: params.duration,
    difficulty: 3,
    exercises: defaultExercises,
    warmup: ['5 min light cardio', 'Arm circles 10 reps', 'Leg swings 10 each'],
    cooldown: ['5 min walking', 'Quad stretch 30 sec each', 'Child\'s pose 30 sec'],
    ai_notes: 'This is a fallback workout generated while the AI service is unavailable. Focus on form and controlled movement.',
    created_at: new Date().toISOString(),
  };
}

async function logApiUsage(params: {
  userId: string;
  status: string;
  latencyMs: number;
  errorMessage?: string;
  tokensInput?: number;
  tokensOutput?: number;
}): Promise<void> {
  try {
    await supabase.from('ai_api_usage').insert({
      user_id: params.userId,
      model_used: MODEL,
      tokens_input: params.tokensInput ?? 0,
      tokens_output: params.tokensOutput ?? 0,
      latency_ms: params.latencyMs,
      status: params.status,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // Non-critical — don't throw
  }
}

/** Generates a personalized workout plan using the NVIDIA AI model. Falls back to a default workout if the API is unavailable or returns invalid data. @param userId - The authenticated user's ID. @param params - Workout parameters including duration, difficulty, target muscles, and optional previous workouts for context. @returns A validated GeneratedWorkout object. @throws Never throws — falls back to a default workout on failure. */
export async function generateWorkout(
  userId: string,
  params: WorkoutParams & { previousWorkouts?: GeneratedWorkout[] }
): Promise<GeneratedWorkout> {
  const prompt = generateWorkoutPrompt({
    ...params,
    previousWorkouts: params.previousWorkouts?.map((w) => w.title),
  });

  let lastError: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      const { data, error } = await invokeAI({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        lastError = error || 'No response from AI proxy';
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: lastError ?? undefined });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return fallbackWorkout(params);
      }

      const responseText = data?.choices?.[0]?.message?.content ?? '';
      const usage = data?.usage ?? {};

      const parsed = extractJSON<GeneratedWorkout>(responseText);

      if (parsed && validateWorkout(parsed)) {
        const workout: GeneratedWorkout = {
          ...parsed,
          id: generateId(),
          created_at: new Date().toISOString(),
        };

        await logApiUsage({
          userId, status: 'success', latencyMs,
          tokensInput: usage.prompt_tokens, tokensOutput: usage.completion_tokens,
        });

        return workout;
      }

      lastError = 'Invalid JSON structure in response';
      await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: lastError ?? undefined });

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    } catch (e: any) {
      lastError = e?.message ?? 'Network error';
      const latencyMs = Date.now() - startTime;
      await logApiUsage({ userId, status: 'timeout', latencyMs, errorMessage: lastError ?? undefined });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return fallbackWorkout(params);
}

function validateMealPlan(data: any): data is GeneratedMealPlan {
  return (
    typeof data?.title === 'string' &&
    typeof data?.description === 'string' &&
    typeof data?.daily_calories === 'number' &&
    Array.isArray(data?.meals) &&
    data.meals.length > 0 &&
    data.meals.every(
      (m: any) =>
        typeof m.name === 'string' &&
        Array.isArray(m.foods) &&
        typeof m.calories === 'number'
    ) &&
    typeof data?.ai_notes === 'string'
  );
}

function fallbackMealPlan(params: MealPlanParams): GeneratedMealPlan {
  return {
    id: generateId(),
    title: 'Simple Balanced Meal Plan',
    description: 'A balanced meal plan with affordable, easy-to-prepare options.',
    daily_calories: params.calories_target,
    meals: [
      { name: 'Breakfast', foods: ['Oatmeal with banana', 'Scrambled eggs', 'Glass of milk'], calories: 450, protein_g: 25, carbs_g: 45, fats_g: 15 },
      { name: 'Lunch', foods: ['Grilled chicken breast', 'Brown rice', 'Steamed vegetables'], calories: 550, protein_g: 35, carbs_g: 50, fats_g: 12 },
      { name: 'Dinner', foods: ['Baked fish', 'Sweet potato', 'Mixed salad'], calories: 500, protein_g: 30, carbs_g: 40, fats_g: 18 },
    ],
    nutrition_goals: { protein_g: 90, carbs_g: 135, fats_g: 45 },
    dietary_preferences: params.dietary_preferences,
    budget_level: params.budget_level,
    excluded_foods: params.excluded_foods,
    cuisine_style: params.cuisine_style,
    health_goal: params.health_goal,
    ai_notes: 'This is a fallback meal plan generated while the AI service is unavailable.',
    created_at: new Date().toISOString(),
  };
}

/** Generates a personalized meal plan using the NVIDIA AI model. Falls back to a default meal plan if the API is unavailable or returns invalid data. @param userId - The authenticated user's ID. @param params - Meal plan parameters including calorie target, dietary preferences, budget level, and health goal. @returns A validated GeneratedMealPlan object. @throws Never throws — falls back to a default meal plan on failure. */
export async function generateMealPlan(
  userId: string,
  params: MealPlanParams
): Promise<GeneratedMealPlan> {
  const prompt = generateMealPlanPrompt(params);
  let lastError: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      const { data, error } = await invokeAI({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        lastError = error || 'No response from AI proxy';
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: lastError ?? undefined });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return fallbackMealPlan(params);
      }

      const responseText = data?.choices?.[0]?.message?.content ?? '';
      const usage = data?.usage ?? {};

      const parsed = extractJSON<GeneratedMealPlan>(responseText);

      if (parsed && validateMealPlan(parsed)) {
        const plan: GeneratedMealPlan = {
          ...parsed,
          id: generateId(),
          dietary_preferences: params.dietary_preferences,
          budget_level: params.budget_level,
          excluded_foods: params.excluded_foods,
          cuisine_style: params.cuisine_style,
          health_goal: params.health_goal,
          created_at: new Date().toISOString(),
        };

        await logApiUsage({
          userId, status: 'success', latencyMs,
          tokensInput: usage.prompt_tokens, tokensOutput: usage.completion_tokens,
        });

        return plan;
      }

      lastError = 'Invalid JSON structure in meal plan response';
      await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: lastError ?? undefined });

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    } catch (e: any) {
      lastError = e?.message ?? 'Network error';
      await logApiUsage({ userId, status: 'timeout', latencyMs: Date.now() - startTime, errorMessage: lastError ?? undefined });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return fallbackMealPlan(params);
}

/** Sends a chat message to the AI fitness coach and returns the coach's reply. Maintains conversation context via the message history. @param userId - The authenticated user's ID. @param messages - Array of prior chat messages with role ('user'/'assistant') and content. @param userProfile - Optional profile info (name, goal, fitnessLevel) used to tailor the coach's system prompt. @returns An object containing the coach's text `reply` and an optional parsed `action` from embedded action tags. @throws Never throws — returns a fallback error message on failure. */
export async function sendCoachChatMessage(
  userId: string,
  messages: { role: string; content: string }[],
  userProfile?: { name?: string; goal?: string; fitnessLevel?: string }
): Promise<{ reply: string; action?: { type: string; data?: any } }> {
  const systemPrompt = buildCoachChatSystemPrompt(userProfile);
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map(m => ({ role: m.role, content: m.content.slice(0, 1000) })),
  ];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const { data, error } = await invokeAI({
          model: MODEL,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1024,
        });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        const errMsg = error || 'No response from AI proxy';
        if (__DEV__) console.warn('[nvidia-client] sendCoachChatMessage error:', errMsg);
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: errMsg });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return { reply: `Sorry, I could not process your request. (${errMsg})` };
      }

      const reply = data?.choices?.[0]?.message?.content ?? '';
      const usage = data?.usage ?? {};

      await logApiUsage({
        userId, status: 'success', latencyMs,
        tokensInput: usage.prompt_tokens, tokensOutput: usage.completion_tokens,
      });

      const actionMatch = reply.match(/<action:(\w+)>(.*?)<\/action>/);
      if (actionMatch) {
        return {
          reply: reply.replace(/<action:\w+>.*?<\/action>/, '').trim(),
          action: { type: actionMatch[1], data: actionMatch[2] ? extractJSON(actionMatch[2]) : undefined },
        };
      }

      return { reply };
    } catch (e: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = e?.message ?? 'Network error';
      if (__DEV__) console.warn('[nvidia-client] sendCoachChatMessage exception:', errMsg);
      await logApiUsage({ userId, status: 'timeout', latencyMs, errorMessage: errMsg });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return { reply: 'Unable to reach the AI coach. Please check your connection.' };
}

/** Analyzes a food image using the NVIDIA vision model and returns detected food items with estimated nutritional values. @param userId - The authenticated user's ID. @param imageBase64 - Base64-encoded JPEG image of the food. @returns An object with an `items` array of detected foods and `total_calories`, or `null` on failure. @throws Never throws — returns `null` on failure. */
export async function scanFoodImage(
  userId: string,
  imageBase64: string
): Promise<{
  items: Array<{ name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; serving_size: string }>;
  total_calories: number;
} | null> {
  const prompt = `Analyze this food image. Identify ALL visible food items and estimate their nutritional values per serving.

For each item, provide:
- name: food name
- calories: estimated calories per serving
- protein_g: protein in grams
- carbs_g: carbohydrates in grams  
- fats_g: fat in grams
- serving_size: estimated serving size description

Respond ONLY with valid JSON in this exact structure (no markdown, no preamble):
{
  "items": [
    { "name": "Food name", "calories": 250, "protein_g": 12, "carbs_g": 30, "fats_g": 8, "serving_size": "1 cup (200g)" }
  ],
  "total_calories": 250
}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const { data, error } = await invokeAI({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: error || 'No response' });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return null;
      }

      const responseText = data?.choices?.[0]?.message?.content ?? '';
      const usage = data?.usage ?? {};

      await logApiUsage({
        userId, status: 'success', latencyMs,
        tokensInput: usage.prompt_tokens, tokensOutput: usage.completion_tokens,
      });

      const parsed = extractJSON<{
        items: Array<{ name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; serving_size: string }>;
        total_calories: number;
      }>(responseText);

      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    } catch (e: any) {
      const latencyMs = Date.now() - startTime;
      await logApiUsage({ userId, status: 'timeout', latencyMs, errorMessage: e?.message ?? 'Scan network error' });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return null;
}

/** Suggests meal ideas based on remaining daily macros. @param userId - The authenticated user's ID. @param remainingProtein - Remaining protein goal in grams. @param remainingCarbs - Remaining carbs goal in grams. @param remainingFats - Remaining fats goal in grams. @returns An array of suggested meals with names and macros, or empty array on failure. @throws Never throws — returns empty array on failure. */
export async function suggestRecipes(
  userId: string,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFats: number
): Promise<Array<{ name: string; ingredients: string[]; calories: number; protein_g: number; carbs_g: number; fats_g: number }>> {
  const prompt = `Given remaining daily macros of: ${remainingProtein}g protein, ${remainingCarbs}g carbs, ${remainingFats}g fat, suggest 3 meal ideas that fit within these remaining macros.

For each meal, provide:
- name: meal name
- ingredients: list of ingredients
- calories: estimated total calories
- protein_g: protein in grams
- carbs_g: carbs in grams  
- fats_g: fat in grams

Respond ONLY with valid JSON array in this exact structure (no markdown, no preamble):
[
  { "name": "Grilled Chicken Salad", "ingredients": ["chicken breast", "mixed greens", "...", "..."], "calories": 450, "protein_g": 35, "carbs_g": 20, "fats_g": 15 }
]`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const { data, error } = await invokeAI({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: error || 'No response' });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return [];
      }

      const responseText = data?.choices?.[0]?.message?.content ?? '';
      await logApiUsage({ userId, status: 'success', latencyMs, tokensInput: data?.usage?.prompt_tokens, tokensOutput: data?.usage?.completion_tokens });

      const parsed = extractJSON<Array<{ name: string; ingredients: string[]; calories: number; protein_g: number; carbs_g: number; fats_g: number }>>(responseText);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    } catch (e: any) {
      const latencyMs = Date.now() - startTime;
      await logApiUsage({ userId, status: 'timeout', latencyMs, errorMessage: e?.message ?? 'Recipe suggestion error' });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return [];
}

/** Looks up estimated nutritional information for a given food name using the NVIDIA AI model. @param userId - The authenticated user's ID. @param foodName - The name of the food to look up (sanitized and truncated to 200 characters). @returns An object with the food name, calories, macros, and serving size, or `null` if the lookup fails or input is empty. @throws Never throws — returns `null` on failure. */
export async function lookupFoodNutrition(
  userId: string,
  foodName: string
): Promise<{
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_size: string;
} | null> {
  const sanitizedFood = (foodName || '')
    .replace(/[\0\\\x00-\x1f]/g, '')
    .trim()
    .slice(0, 200);

  if (!sanitizedFood) return null;

  const prompt = `You are a nutrition database. Given a food name, estimate its nutritional values per standard serving.

Food: <user_input>${sanitizedFood}</user_input>

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "name": "Food name",
  "calories": 250,
  "protein_g": 12,
  "carbs_g": 30,
  "fats_g": 8,
  "serving_size": "1 cup (200g)"
}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const { data, error } = await invokeAI({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      });

      const latencyMs = Date.now() - startTime;

      if (error || !data) {
        await logApiUsage({ userId, status: 'error', latencyMs, errorMessage: error || 'No response' });
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }
        return null;
      }

      const responseText = data?.choices?.[0]?.message?.content ?? '';
      await logApiUsage({ userId, status: 'success', latencyMs, tokensInput: data?.usage?.prompt_tokens, tokensOutput: data?.usage?.completion_tokens });

      const parsed = extractJSON<{
        name: string; calories: number; protein_g: number;
        carbs_g: number; fats_g: number; serving_size: string;
      }>(responseText);

      if (parsed && parsed.name && typeof parsed.calories === 'number') {
        return parsed;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    } catch (e: any) {
      const latencyMs = Date.now() - startTime;
      await logApiUsage({ userId, status: 'timeout', latencyMs, errorMessage: e?.message ?? 'Lookup network error' });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  return null;
}
