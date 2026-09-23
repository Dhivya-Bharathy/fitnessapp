import type { WorkoutParams, MealPlanParams } from '../types/ai-coach.types';

const MAX_PROMPT_INPUT_LENGTH = 500;

function sanitizeForPrompt(input: string | null | undefined, maxLength = MAX_PROMPT_INPUT_LENGTH): string {
  if (!input) return '';
  return input
    .replace(/[\0\\\x00-\x1f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeArray(items: string[] | undefined): string {
  if (!items || items.length === 0) return 'None specified';
  return items.map(i => sanitizeForPrompt(i)).filter(Boolean).join(', ');
}

function wrapUserInput(value: string | null | undefined): string {
  return `<user_data>${sanitizeForPrompt(value)}</user_data>`;
}

/**
 * Builds the base system prompt for the AI coach.
 * @returns The system prompt string.
 */
export const buildSystemPrompt = (): string =>
  `You are a certified fitness coach with 15 years of experience. ` +
  `You design safe, effective workouts that respect the client's level and goals. ` +
  `Every exercise must include form tips to prevent injury.`;

/**
 * Builds the coach chat system prompt, optionally injecting a user profile.
 * @param userProfile - Optional object with user's name, goal, and fitness level.
 * @returns The coach chat system prompt string.
 */
export function buildCoachChatSystemPrompt(userProfile?: {
  name?: string; goal?: string; fitnessLevel?: string;
}): string {
  const profile = userProfile
    ? `\nUser profile:\n- Name: ${wrapUserInput(userProfile.name) || 'Unknown'}\n- Goal: ${wrapUserInput(userProfile.goal) || 'Not set'}\n- Fitness level: ${wrapUserInput(userProfile.fitnessLevel) || 'Not set'}`
    : '';

  return `You are Fitness App Coach — a supportive fitness and nutrition coach focused on practical strength training, calisthenics, gym work, and Indian meal guidance. Your tone is encouraging but honest. Never mention brands or influencers.

You help users with:
- Workout recommendations and exercise form guidance
- Nutrition advice and meal planning
- Progress tracking motivation
- Answering health and fitness questions
- Generating structured workout plans (use <action:generate_workout>JSON</action> to trigger workout generation)
- Creating meal plans (use <action:generate_meal_plan>JSON</action> when the user asks for meal plans)

Rules:
- Keep responses concise (2-4 sentences unless asked for detail)
- Never give medical advice — recommend consulting a doctor for injuries/conditions
- Encourage consistency over perfection
- Reference the user's profile when relevant
- If the user asks for a workout, include <action:generate_workout>{"goals":["strength"],"duration":30,"level":"beginner"}</action> in your response with appropriate params
- If the user asks for a meal plan, include <action:generate_meal_plan>{"goal":"weight_loss","calories":2000}</action>
- If the user wants to track progress, suggest using the app's tracking features
${profile}`;
}

/**
 * Generates the workout prompt for the AI, embedding client profile and constraints.
 * @param params - Workout parameters including goals, duration, equipment, fitness level, and optional previous workouts.
 * @returns The workout generation prompt string.
 */
export const generateWorkoutPrompt = (
  params: WorkoutParams & { previousWorkouts?: string[] }
): string => {
  const prevSummary =
    params.previousWorkouts?.length
      ? params.previousWorkouts.map(w => sanitizeForPrompt(w)).filter(Boolean).join(', ')
      : 'None';
  const fitnessLevel = sanitizeForPrompt(params.fitnessLevel) || 'beginner';
  const goals = sanitizeArray(params.goals);
  const equipment = sanitizeArray(params.equipment);

  return `
Generate a detailed workout for a ${fitnessLevel} client.

**Client Profile:**
- Fitness Level: ${fitnessLevel}
- Goals: ${goals}
- Duration: ${params.duration} minutes
- Available Equipment: ${equipment}
- Previous workouts this week: ${prevSummary}

**Requirements:**
1. Duration: ${params.duration} ± 5 minutes
2. No exercise should repeat within their last 5 workouts
3. Every exercise must have form tips to prevent injury
4. Include progression advice so they can advance next time
5. Structure: Warmup → Exercises → Cooldown

**Output Rules:**
- Respond ONLY with valid JSON (no markdown, no preamble, no backticks)
- No extra text before or after JSON
- All strings must be properly escaped

**JSON Structure (EXACT):**
{
  "title": "Workout name (e.g. 'Upper Body Strength Focus')",
  "description": "1-2 sentence description of what this workout targets",
  "duration": ${params.duration},
  "difficulty": <number 1-10>,
  "warmup": ["5 min light cardio", "Arm circles 10 reps", "Cat-cow stretches 10 reps"],
  "exercises": [
    {
      "name": "Exercise name",
      "sets": <number>,
      "reps": "8-12 or 20 (whatever is appropriate)",
      "rest": <seconds>,
      "form_tips": "Specific coaching point to prevent injury",
      "progression": "How to make it harder next time"
    }
  ],
  "cooldown": ["5 min walking", "Quad stretch 30 sec each leg", "Child's pose 30 sec"],
  "ai_notes": "Why this workout is perfect for their goals. Mention periodization strategy."
}

Remember: ONLY output the JSON. Nothing else.`;
};

/**
 * Generates the meal plan prompt for the AI, embedding dietary preferences, budget, and health goals.
 * @param params - Meal plan parameters including dietary preferences, budget mode, calorie target, cuisine style, etc.
 * @returns The meal plan generation prompt string.
 */
export const generateMealPlanPrompt = (params: MealPlanParams): string => {
  const budgetStr = params.budget_mode === 'fixed'
    ? `- Fixed Budget: ${params.budget_amount} (${params.budget_period || 'week'})`
    : `- Budget Level: ${params.budget_level} (auto-calculated based on food costs)`;
  const dietaryPrefs = sanitizeArray(params.dietary_preferences);
  const excludedFoods = sanitizeArray(params.excluded_foods);
  const cuisineStyle = sanitizeForPrompt(params.cuisine_style) || 'Any';
  const healthGoal = sanitizeForPrompt(params.health_goal) || 'General health';

  return `
Generate a detailed daily meal plan with the following preferences:

**Client Preferences:**
- Dietary Preferences: ${dietaryPrefs}
${budgetStr}
- Daily Calorie Target: ${params.calories_target} kcal
- Meals per Day: ${params.meals_per_day}
- Excluded Foods: ${excludedFoods}
- Cuisine Style: ${cuisineStyle}
- Health Goal: ${healthGoal}

**Requirements:**
1. Create ${params.meals_per_day} meals covering the full day
2. Total calories should be close to ${params.calories_target} kcal
3. You have deep knowledge of local food markets and ingredient costs in India and other countries. Suggest realistic, locally available ingredients.
4. For Indian cuisine: use ingredients like rice, wheat roti, dal (toor, moong, chana), paneer, yogurt, ghee, mustard oil, cumin, coriander, turmeric, garam masala, ginger, garlic, onion, tomato, potato, spinach, cauliflower, okra, chickpeas, lentils, tamarind, coconut, fish, chicken, mutton, eggs, idli/dosa batter, poha, and regional staples.
5. ${params.budget_mode === 'fixed'
     ? `Respect the fixed budget of ${params.budget_amount} (${params.budget_period || 'week'}). Suggest affordable ingredient combinations that fit within this amount.`
     : `Consider the budget level — suggest affordable ingredients for 'low', mid-range for 'moderate', premium for 'high'. For 'low' budget, focus on staple foods like rice, dal, roti, eggs, seasonal vegetables, and local market produce.`}
6. Avoid any excluded foods
7. Include estimated protein, carbs, fats for each meal using realistic portion sizes

**Output Rules:**
- Respond ONLY with valid JSON (no markdown, no preamble, no backticks)
- No extra text before or after JSON

**JSON Structure (EXACT):**
{
  "title": "Meal plan title (e.g. 'Balanced Budget Meal Plan')",
  "description": "1-2 sentence description",
  "daily_calories": ${params.calories_target},
  "meals": [
    {
      "name": "Breakfast",
      "foods": ["Food 1", "Food 2", "Food 3"],
      "calories": 450,
      "protein_g": 25,
      "carbs_g": 45,
      "fats_g": 15
    }
  ],
  "nutrition_goals": {
    "protein_g": 120,
    "carbs_g": 200,
    "fats_g": 60
  },
  "ai_notes": "Why this meal plan suits their preferences, budget, and goals. Include practical shopping tips."
}

Remember: ONLY output the JSON. Nothing else.`;
};
