export type AssessmentQuestionType = 'single' | 'multi' | 'text' | 'number' | 'weekdays';

export type QuestionUiLayout = 'rich-quad' | 'quad' | 'grid' | 'list' | 'weekdays' | 'text';

export interface AssessmentOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUri?: string;
}

export interface AssessmentQuestion {
  id: string;
  section: string;
  question: string;
  questionHighlight?: string;
  subtitle?: string;
  bannerLead?: string;
  bannerAccent?: string;
  bannerSub?: string;
  type: AssessmentQuestionType;
  options?: AssessmentOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  heroImage?: string;
}

export const WEEKDAY_OPTIONS: AssessmentOption[] = [
  { value: 'mon', label: 'Mon', icon: 'calendar-outline' },
  { value: 'tue', label: 'Tue', icon: 'calendar-outline' },
  { value: 'wed', label: 'Wed', icon: 'calendar-outline' },
  { value: 'thu', label: 'Thu', icon: 'calendar-outline' },
  { value: 'fri', label: 'Fri', icon: 'calendar-outline' },
  { value: 'sat', label: 'Sat', icon: 'calendar-outline' },
  { value: 'sun', label: 'Sun', icon: 'calendar-outline' },
];

const G = '#2DDC8C';
const B = '#6699FF';
const P = '#B280FF';
const O = '#FFB347';
const R = '#FF6B35';
const M = '#FF6B9D';

/** 22-question intake before AI generates training + Indian diet plan. */
export const FITNESS_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'primary_goal',
    section: 'Goals',
    question: 'What is your #1 fitness goal right now?',
    type: 'single',
    options: [
      { value: 'fat_loss', label: 'Lose fat', icon: 'flame-outline', color: R },
      { value: 'muscle', label: 'Build muscle', icon: 'barbell-outline', color: G },
      { value: 'strength', label: 'Get stronger', icon: 'flash-outline', color: B },
      { value: 'skills', label: 'Calisthenics skills (pull-ups, dips, etc.)', icon: 'body-outline', color: P },
      { value: 'endurance', label: 'Endurance', icon: 'bicycle-outline', color: O },
    ],
  },
  {
    id: 'timeline',
    section: 'Goals',
    question: 'When do you want to see clear progress?',
    questionHighlight: 'clear progress?',
    subtitle: 'We’ll pace your plan to match your timeline.',
    bannerLead: 'Your goal,',
    bannerAccent: 'your timeline.',
    bannerSub: 'Honest targets win.',
    type: 'single',
    options: [
      { value: '4w', label: '4 weeks', description: 'Sprint focus', icon: 'timer-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
      { value: '8w', label: '8 weeks', description: 'Solid block', icon: 'calendar-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
      { value: '12w', label: '12 weeks', description: 'Full phase', icon: 'today-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
      { value: 'long', label: 'No rush', description: 'Stay consistent', icon: 'infinite-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80' },
    ],
  },
  {
    id: 'experience',
    section: 'Training',
    question: 'How long have you trained consistently?',
    questionHighlight: 'consistently?',
    subtitle: 'This helps us create the right plan for your current fitness level.',
    bannerLead: 'Consistency',
    bannerAccent: 'beats intensity.',
    bannerSub: 'You’ve got this.',
    type: 'single',
    heroImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    options: [
      {
        value: 'new',
        label: 'Just starting',
        description: "I'm new to training",
        icon: 'rocket-outline',
        color: G,
        imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
      },
      {
        value: '6-12m',
        label: '6 – 12 months',
        description: 'Building consistency',
        icon: 'bar-chart-outline',
        color: B,
        imageUri: 'https://images.unsplash.com/photo-1556909114-f6e7ad776fee?w=400&q=80',
      },
      {
        value: '2-4y',
        label: 'Below 2–4 years',
        description: 'Some experience',
        icon: 'calendar-outline',
        color: P,
        imageUri: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2e?w=400&q=80',
      },
      {
        value: '5y+',
        label: '5+ years',
        description: 'Advanced experience',
        icon: 'trophy-outline',
        color: O,
        imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
      },
    ],
  },
  {
    id: 'pullups',
    section: 'Training',
    question: 'How many strict pull-ups can you do?',
    questionHighlight: 'pull-ups',
    subtitle: 'Be honest — we’ll scale progressions safely.',
    bannerLead: 'Upper body',
    bannerAccent: 'strength check.',
    type: 'single',
    options: [
      { value: '0', label: '0', description: 'Working up', color: G, imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
      { value: '1-3', label: '1–3', description: 'Early gains', color: B, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
      { value: '4-8', label: '4–8', description: 'Solid base', color: P, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
      { value: '9+', label: '9+', description: 'Strong', color: O, imageUri: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2e?w=400&q=80' },
    ],
  },
  {
    id: 'pushups',
    section: 'Training',
    question: 'How many push-ups in one set?',
    questionHighlight: 'one set?',
    subtitle: 'Max reps with good form.',
    bannerLead: 'Push',
    bannerAccent: 'power baseline.',
    bannerSub: 'Form over ego.',
    type: 'single',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    options: [
      { value: '0-5', label: '0–5', description: 'Starting out', color: G, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
      { value: '6-15', label: '6–15', description: 'Building', color: B, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
      { value: '16-30', label: '16–30', description: 'Intermediate', color: P, imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
      { value: '31+', label: '31+', description: 'Advanced', color: O, imageUri: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2e?w=400&q=80' },
    ],
  },
  {
    id: 'days_per_week',
    section: 'Training',
    question: 'Which days can you train?',
    subtitle: 'Tap all days that work for you',
    type: 'weekdays',
    options: WEEKDAY_OPTIONS,
  },
  {
    id: 'session_minutes',
    section: 'Training',
    question: 'Typical workout length?',
    questionHighlight: 'workout length?',
    subtitle: 'Pick what you can repeat most weeks.',
    type: 'single',
    options: [
      { value: '20', label: '20 min', description: 'Quick sessions', icon: 'time-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
      { value: '30', label: '30 min', description: 'Balanced', icon: 'hourglass-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
      { value: '45', label: '45 min', description: 'Standard', icon: 'stopwatch-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
      { value: '60', label: '60+ min', description: 'Long blocks', icon: 'alarm-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2e?w=400&q=80' },
    ],
  },
  {
    id: 'training_place',
    section: 'Training',
    question: 'Where will you mostly train?',
    questionHighlight: 'mostly train?',
    subtitle: 'We’ll tailor exercises to your environment.',
    type: 'single',
    options: [
      { value: 'home', label: 'Home', description: 'Minimal setup', icon: 'home-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80' },
      { value: 'park', label: 'Outdoor / bars', description: 'Calisthenics', icon: 'sunny-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80' },
      { value: 'gym', label: 'Gym', description: 'Full equipment', icon: 'barbell-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
      { value: 'mixed', label: 'Mix of places', description: 'Flexible', icon: 'shuffle-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
    ],
  },
  {
    id: 'equipment',
    section: 'Training',
    question: 'Equipment you have access to',
    subtitle: 'Select all that apply',
    type: 'multi',
    options: [
      { value: 'bodyweight', label: 'Bodyweight only', icon: 'body-outline', color: G },
      { value: 'bands', label: 'Resistance bands', icon: 'fitness-outline', color: B },
      { value: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline', color: P },
      { value: 'gym', label: 'Gym (full access)', icon: 'business-outline', color: O },
      { value: 'dip_bars', label: 'Parallel bars / dips', icon: 'git-commit-outline', color: R },
      { value: 'kettlebell', label: 'Kettlebell', icon: 'disc-outline', color: M },
    ],
  },
  {
    id: 'injuries',
    section: 'Health',
    question: 'Any injuries or pain areas?',
    subtitle: 'Select all that apply',
    type: 'multi',
    heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    options: [
      { value: 'none', label: 'None', icon: 'checkmark-circle-outline', color: G },
      { value: 'knee', label: 'Knees', icon: 'medkit-outline', color: R },
      { value: 'shoulder', label: 'Shoulders', icon: 'medkit-outline', color: O },
      { value: 'back', label: 'Lower back', icon: 'medkit-outline', color: P },
      { value: 'wrist', label: 'Wrists', icon: 'medkit-outline', color: B },
    ],
  },
  {
    id: 'sleep_hours',
    section: 'Health',
    question: 'Average sleep per night?',
    questionHighlight: 'per night?',
    subtitle: 'Recovery drives results as much as training.',
    type: 'single',
    options: [
      { value: '5', label: '≤5 hours', description: 'Needs focus', icon: 'moon-outline', color: R, imageUri: 'https://images.unsplash.com/photo-1541781774459-bb2af2d0555e?w=400&q=80' },
      { value: '6', label: '6 hours', description: 'Okay', icon: 'bed-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80' },
      { value: '7', label: '7 hours', description: 'Good', icon: 'moon-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80' },
      { value: '8+', label: '8+ hours', description: 'Optimal', icon: 'sparkles-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1541781774459-bb2af2d0555e?w=400&q=80' },
    ],
  },
  {
    id: 'stress',
    section: 'Health',
    question: 'Daily stress level',
    type: 'single',
    options: [
      { value: 'low', label: 'Low', icon: 'happy-outline', color: G },
      { value: 'medium', label: 'Medium', icon: 'remove-outline', color: O },
      { value: 'high', label: 'High', icon: 'thunderstorm-outline', color: R },
    ],
  },
  {
    id: 'activity_job',
    section: 'Health',
    question: 'Daily activity outside workouts?',
    type: 'single',
    options: [
      { value: 'sedentary', label: 'Mostly sitting', icon: 'desktop-outline', color: P },
      { value: 'light', label: 'Light walking', icon: 'walk-outline', color: B },
      { value: 'active', label: 'On feet most of the day', icon: 'footsteps-outline', color: G },
    ],
  },
  {
    id: 'diet_type',
    section: 'Indian diet',
    question: 'Diet preference',
    questionHighlight: 'preference',
    subtitle: 'Meal plans will respect this.',
    type: 'single',
    heroImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
    options: [
      { value: 'veg', label: 'Vegetarian', description: 'Plant-focused', icon: 'leaf-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: 'eggetarian', label: 'Eggetarian', description: 'Veg + eggs', icon: 'nutrition-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: 'nonveg', label: 'Non-vegetarian', description: 'Includes meat', icon: 'restaurant-outline', color: R, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: 'vegan', label: 'Vegan', description: 'No animal products', icon: 'nutrition-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
    ],
  },
  {
    id: 'indian_meals',
    section: 'Indian diet',
    question: 'Indian meals you enjoy most',
    subtitle: 'Select all that apply',
    type: 'multi',
    options: [
      { value: 'north', label: 'North (roti, paratha, chole)', icon: 'fast-food-outline', color: O },
      { value: 'south', label: 'South (idli, dosa, sambar)', icon: 'cafe-outline', color: G },
      { value: 'biryani', label: 'Biryani & rice dishes', icon: 'flame-outline', color: R },
      { value: 'dal_roti', label: 'Dal & roti staples', icon: 'restaurant-outline', color: B },
      { value: 'street', label: 'Lighter / street-style snacks', icon: 'cart-outline', color: P },
    ],
  },
  {
    id: 'meals_per_day',
    section: 'Indian diet',
    question: 'Meals per day (including snacks)?',
    questionHighlight: 'per day',
    type: 'single',
    options: [
      { value: '2', label: '2', description: 'Light structure', color: G, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '3', label: '3', description: 'Classic', color: B, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '4', label: '4', description: 'With snacks', color: P, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '5', label: '5+', description: 'Frequent fuel', color: O, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
    ],
  },
  {
    id: 'budget_inr',
    section: 'Indian diet',
    question: 'Rough daily food budget (₹)?',
    questionHighlight: 'budget',
    subtitle: 'Realistic plans beat perfect ones.',
    type: 'single',
    options: [
      { value: '150', label: 'Under ₹150', description: 'Budget-smart', icon: 'wallet-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '300', label: '₹150–300', description: 'Moderate', icon: 'cash-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '500', label: '₹300–500', description: 'Flexible', icon: 'card-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
      { value: '500+', label: '₹500+', description: 'Premium', icon: 'diamond-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80' },
    ],
  },
  {
    id: 'cooking',
    section: 'Indian diet',
    question: 'How often do you cook at home?',
    type: 'single',
    options: [
      { value: 'rarely', label: 'Rarely', icon: 'restaurant-outline', color: O },
      { value: 'sometimes', label: 'Sometimes', icon: 'cloud-outline', color: B },
      { value: 'daily', label: 'Most meals at home', icon: 'home-outline', color: G },
    ],
  },
  {
    id: 'avoid_foods',
    section: 'Indian diet',
    question: 'Foods to avoid or dislike',
    type: 'text',
    placeholder: 'e.g. dairy, very spicy, gluten…',
    subtitle: 'Optional — tap a quick tag or type your own',
  },
  {
    id: 'water_liters',
    section: 'Indian diet',
    question: 'Water intake per day (liters)?',
    questionHighlight: 'per day',
    type: 'single',
    options: [
      { value: '1', label: 'Under 1L', description: 'Low', icon: 'water-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1548839140-5a941f05e04?w=400&q=80' },
      { value: '2', label: '1–2L', description: 'Fair', icon: 'water-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1548839140-5a941f05e04?w=400&q=80' },
      { value: '3', label: '2–3L', description: 'Good', icon: 'water-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1548839140-5a941f05e04?w=400&q=80' },
      { value: '3+', label: '3L+', description: 'Hydrated', icon: 'water-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1548839140-5a941f05e04?w=400&q=80' },
    ],
  },
  {
    id: 'training_focus',
    section: 'AI training',
    question: 'Which training excites you most?',
    subtitle: 'Select all that apply',
    type: 'multi',
    heroImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    options: [
      { value: 'pull_progressions', label: 'Pull-up & muscle-up progressions', icon: 'arrow-up-outline', color: G },
      { value: 'push_power', label: 'Push strength & handstand prep', icon: 'fitness-outline', color: B },
      { value: 'core_skills', label: 'Core & L-sit / lever basics', icon: 'ellipse-outline', color: P },
      { value: 'leg_power', label: 'Leg power & plyometrics', icon: 'flash-outline', color: O },
      { value: 'conditioning', label: 'HIIT & conditioning finishers', icon: 'pulse-outline', color: R },
    ],
  },
  {
    id: 'motivation',
    section: 'Mindset',
    question: 'What keeps you accountable?',
    questionHighlight: 'accountable?',
    subtitle: 'We’ll nudge you in the way that works for you.',
    bannerLead: 'Last step —',
    bannerAccent: 'you’ve got this.',
    type: 'single',
    heroImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    options: [
      { value: 'schedule', label: 'Fixed schedule', description: 'Routine', icon: 'calendar-outline', color: G, imageUri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80' },
      { value: 'partner', label: 'Training partner', description: 'Social', icon: 'people-outline', color: B, imageUri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
      { value: 'metrics', label: 'Tracking numbers', description: 'Data-driven', icon: 'stats-chart-outline', color: P, imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
      { value: 'coach', label: 'Coach / plan', description: 'Guided', icon: 'school-outline', color: O, imageUri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
    ],
  },
];

export const ASSESSMENT_QUESTION_COUNT = FITNESS_ASSESSMENT_QUESTIONS.length;

export const ASSESSMENT_SECTION_IMAGES: Record<string, string> = {
  Goals: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  Training: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  Health: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  'Indian diet': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  'AI training': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  Mindset: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
};

export const SECTION_ACCENT: Record<string, string> = {
  Goals: G,
  Training: B,
  Health: P,
  'Indian diet': O,
  'AI training': R,
  Mindset: M,
};

export const MOTIVATIONAL_LINES = [
  'Small steps today — stronger you tomorrow.',
  'Your plan is built for real life, not perfection.',
  'Consistency beats intensity. You’ve got this.',
  'Train smart. Eat well. Repeat.',
  'Every answer shapes a plan that fits you.',
  'You’re closer than you think — keep going.',
  'Strong habits start with honest answers.',
  'Your future self will thank you for this.',
  'No perfect week required — just show up.',
  'Building muscle and mindset, one tap at a time.',
  'Indian meals you love, portions that work.',
  'Recovery and sleep count as training too.',
  'Equipment doesn’t limit you — creativity does.',
  'Progress loves patience.',
  'Let’s match workouts to your real schedule.',
  'Food budget? We’ll work with what you have.',
  'Hydration is the cheapest performance boost.',
  'Skills take time — your plan will respect that.',
  'Accountability looks different for everyone.',
  'Almost there — your AI plan is loading up.',
  'Last stretch — then we generate your plan.',
  'Final question. You’re doing great.',
];

export function getQuestionHeroUri(q: AssessmentQuestion): string {
  return q.heroImage ?? ASSESSMENT_SECTION_IMAGES[q.section] ?? ASSESSMENT_SECTION_IMAGES.Training;
}

export function getQuestionUiLayout(q: AssessmentQuestion): QuestionUiLayout {
  if (q.type === 'text') return 'text';
  if (q.type === 'weekdays') return 'weekdays';
  if (!q.options?.length) return 'list';

  if (q.type === 'single' && q.options.length === 4) {
    if (q.options.every((o) => Boolean(o.description))) return 'rich-quad';
    const short = q.options.every((o) => o.label.length <= 16);
    if (short) return 'quad';
  }

  if (q.type === 'multi') {
    const gridOk = q.options.length <= 6 && q.options.every((o) => o.label.length <= 24);
    return gridOk ? 'grid' : 'list';
  }

  if (q.type === 'single') {
    if (q.options.length <= 6 && q.options.every((o) => o.label.length <= 22)) return 'grid';
  }

  return 'list';
}

export function getSectionAccent(section: string): string {
  return SECTION_ACCENT[section] ?? G;
}
