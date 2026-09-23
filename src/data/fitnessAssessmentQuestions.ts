export type AssessmentQuestionType = 'single' | 'multi' | 'text' | 'number';

export interface AssessmentOption {
  value: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  section: string;
  question: string;
  subtitle?: string;
  type: AssessmentQuestionType;
  options?: AssessmentOption[];
  placeholder?: string;
  min?: number;
  max?: number;
}

/** 22-question intake before AI generates Demic Story–style training + Indian diet. */
export const FITNESS_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  { id: 'primary_goal', section: 'Goals', question: 'What is your #1 fitness goal right now?', type: 'single', options: [
    { value: 'fat_loss', label: 'Lose fat' }, { value: 'muscle', label: 'Build muscle' }, { value: 'strength', label: 'Get stronger' },
    { value: 'skills', label: 'Calisthenics skills (pull-ups, dips, etc.)' }, { value: 'energy', label: 'More energy & stamina' },
  ]},
  { id: 'timeline', section: 'Goals', question: 'When do you want to see clear progress?', type: 'single', options: [
    { value: '4w', label: '4 weeks' }, { value: '8w', label: '8 weeks' }, { value: '12w', label: '12 weeks' }, { value: 'long', label: 'No rush — stay consistent' },
  ]},
  { id: 'experience', section: 'Training', question: 'How long have you trained consistently?', type: 'single', options: [
    { value: 'new', label: 'Just starting' }, { value: '6m', label: 'Under 6 months' }, { value: '1y', label: '6–12 months' }, { value: '2y+', label: '1+ years' },
  ]},
  { id: 'pullups', section: 'Training', question: 'How many strict pull-ups can you do?', type: 'single', options: [
    { value: '0', label: '0' }, { value: '1-3', label: '1–3' }, { value: '4-8', label: '4–8' }, { value: '9+', label: '9+' },
  ]},
  { id: 'pushups', section: 'Training', question: 'How many push-ups in one set?', type: 'single', options: [
    { value: '0-5', label: '0–5' }, { value: '6-15', label: '6–15' }, { value: '16-30', label: '16–30' }, { value: '31+', label: '31+' },
  ]},
  { id: 'days_per_week', section: 'Training', question: 'How many days per week can you train?', type: 'single', options: [
    { value: '2', label: '2 days' }, { value: '3', label: '3 days' }, { value: '4', label: '4 days' }, { value: '5', label: '5+ days' },
  ]},
  { id: 'session_minutes', section: 'Training', question: 'Typical workout length?', type: 'single', options: [
    { value: '20', label: '20 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '60+ min' },
  ]},
  { id: 'training_place', section: 'Training', question: 'Where will you mostly train?', type: 'single', options: [
    { value: 'home', label: 'Home' }, { value: 'park', label: 'Outdoor / bars' }, { value: 'gym', label: 'Gym' }, { value: 'mixed', label: 'Mix of places' },
  ]},
  { id: 'equipment', section: 'Training', question: 'Equipment you have access to', subtitle: 'Select all that apply', type: 'multi', options: [
    { value: 'bodyweight', label: 'Bodyweight only' }, { value: 'bands', label: 'Resistance bands' }, { value: 'dumbbells', label: 'Dumbbells' },
    { value: 'pullup_bar', label: 'Pull-up bar' }, { value: 'dip_bars', label: 'Parallel bars / dips' }, { value: 'kettlebell', label: 'Kettlebell' },
  ]},
  { id: 'injuries', section: 'Health', question: 'Any injuries or pain areas?', subtitle: 'Select all that apply', type: 'multi', options: [
    { value: 'none', label: 'None' }, { value: 'knee', label: 'Knees' }, { value: 'shoulder', label: 'Shoulders' }, { value: 'back', label: 'Lower back' }, { value: 'wrist', label: 'Wrists' },
  ]},
  { id: 'sleep_hours', section: 'Health', question: 'Average sleep per night?', type: 'single', options: [
    { value: '5', label: '≤5 hours' }, { value: '6', label: '6 hours' }, { value: '7', label: '7 hours' }, { value: '8+', label: '8+ hours' },
  ]},
  { id: 'stress', section: 'Health', question: 'Daily stress level', type: 'single', options: [
    { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
  ]},
  { id: 'activity_job', section: 'Health', question: 'Daily activity outside workouts?', type: 'single', options: [
    { value: 'sedentary', label: 'Mostly sitting' }, { value: 'light', label: 'Light walking' }, { value: 'active', label: 'On feet most of the day' },
  ]},
  { id: 'diet_type', section: 'Indian diet', question: 'Diet preference', type: 'single', options: [
    { value: 'veg', label: 'Vegetarian' }, { value: 'eggetarian', label: 'Eggetarian' }, { value: 'nonveg', label: 'Non-vegetarian' }, { value: 'vegan', label: 'Vegan' },
  ]},
  { id: 'indian_meals', section: 'Indian diet', question: 'Indian meals you enjoy most', subtitle: 'Select all that apply', type: 'multi', options: [
    { value: 'north', label: 'North (roti, paratha, chole)' }, { value: 'south', label: 'South (idli, dosa, sambar)' },
    { value: 'biryani', label: 'Biryani & rice dishes' }, { value: 'dal_roti', label: 'Dal & roti staples' }, { value: 'street', label: 'Lighter / street-style snacks' },
  ]},
  { id: 'meals_per_day', section: 'Indian diet', question: 'Meals per day (including snacks)?', type: 'single', options: [
    { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5+' },
  ]},
  { id: 'budget_inr', section: 'Indian diet', question: 'Rough daily food budget (₹)?', type: 'single', options: [
    { value: '150', label: 'Under ₹150' }, { value: '300', label: '₹150–300' }, { value: '500', label: '₹300–500' }, { value: '500+', label: '₹500+' },
  ]},
  { id: 'cooking', section: 'Indian diet', question: 'How often do you cook at home?', type: 'single', options: [
    { value: 'rarely', label: 'Rarely' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'daily', label: 'Most meals at home' },
  ]},
  { id: 'avoid_foods', section: 'Indian diet', question: 'Foods to avoid or dislike', type: 'text', placeholder: 'e.g. dairy, very spicy, gluten…' },
  { id: 'water_liters', section: 'Indian diet', question: 'Water intake per day (liters)?', type: 'single', options: [
    { value: '1', label: 'Under 1L' }, { value: '2', label: '1–2L' }, { value: '3', label: '2–3L' }, { value: '3+', label: '3L+' },
  ]},
  { id: 'demic_style', section: 'Demic Story training', question: 'Which Demic Story–style training excites you most?', subtitle: 'Inspired by @demicstory calisthenics & athletic drills', type: 'multi', options: [
    { value: 'pull_progressions', label: 'Pull-up & muscle-up progressions' }, { value: 'push_power', label: 'Push strength & handstand prep' },
    { value: 'core_skills', label: 'Core & L-sit / lever basics' }, { value: 'leg_power', label: 'Leg power & plyometrics' }, { value: 'conditioning', label: 'HIIT & conditioning finishers' },
  ]},
  { id: 'motivation', section: 'Mindset', question: 'What keeps you accountable?', type: 'single', options: [
    { value: 'schedule', label: 'Fixed schedule' }, { value: 'partner', label: 'Training partner' }, { value: 'metrics', label: 'Tracking numbers' }, { value: 'coach', label: 'Coach / plan to follow' },
  ]},
];

export const ASSESSMENT_QUESTION_COUNT = FITNESS_ASSESSMENT_QUESTIONS.length;
