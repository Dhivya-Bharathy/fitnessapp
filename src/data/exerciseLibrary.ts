export interface ExerciseData {
  id: string;
  name: string;
  category: ExerciseCategory;
  defaultDuration: number;
  caloriesPerMinute: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  muscleGroups: string[];
  equipment: string;
  instructions: string[];
}

export type ExerciseCategory =
  | 'Chest' | 'Back' | 'Legs' | 'Shoulders'
  | 'Arms' | 'Core' | 'Cardio' | 'Full Body';

export const CATEGORY_MAP: Record<ExerciseCategory, {
  label: string;
  color: string;
  icon: string;
}> = {
  Chest:     { label: 'Chest',     color: '#F0427C', icon: 'fitness-outline' },
  Back:      { label: 'Back',      color: '#4A90E2', icon: 'arrow-back-outline' },
  Legs:      { label: 'Legs',      color: '#9B6FE8', icon: 'footsteps-outline' },
  Shoulders: { label: 'Shoulders', color: '#FFB830', icon: 'body-outline' },
  Arms:      { label: 'Arms',      color: '#34D98A', icon: 'barbell-outline' },
  Core:      { label: 'Core',      color: '#2BBCB0', icon: 'radio-button-on' },
  Cardio:    { label: 'Cardio',    color: '#FF6B35', icon: 'pulse-outline' },
  'Full Body': { label: 'Full Body', color: '#FF6B9D', icon: 'body-outline' },
};

export const EXERCISE_LIBRARY: ExerciseData[] = [
  // ── CHEST (6) ──────────────────────────────────────────────
  {
    id: 'chest_01', name: 'Push Ups', category: 'Chest',
    defaultDuration: 45, caloriesPerMinute: 7, difficulty: 'beginner',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: 'None',
    instructions: [
      'Start in plank position with hands shoulder-width apart',
      'Lower your body until chest nearly touches the floor',
      'Keep your core tight and back straight',
      'Push back up to starting position',
    ],
  },
  {
    id: 'chest_02', name: 'Incline Push Ups', category: 'Chest',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'beginner',
    muscleGroups: ['Chest', 'Shoulders'], equipment: 'Bench/Couch',
    instructions: [
      'Place hands on an elevated surface like a bench',
      'Walk feet back into a plank position',
      'Lower chest toward the elevated surface',
      'Push back up to starting position',
    ],
  },
  {
    id: 'chest_03', name: 'Decline Push Ups', category: 'Chest',
    defaultDuration: 40, caloriesPerMinute: 8, difficulty: 'intermediate',
    muscleGroups: ['Upper Chest', 'Triceps', 'Shoulders'], equipment: 'Bench/Couch',
    instructions: [
      'Place feet on an elevated surface behind you',
      'Walk hands forward into a decline plank',
      'Lower your upper chest toward the floor',
      'Push back up explosively',
    ],
  },
  {
    id: 'chest_04', name: 'Diamond Push Ups', category: 'Chest',
    defaultDuration: 40, caloriesPerMinute: 8, difficulty: 'intermediate',
    muscleGroups: ['Chest', 'Triceps'], equipment: 'None',
    instructions: [
      'Start in plank position with hands together forming a diamond',
      'Lower your chest toward your hands',
      'Keep elbows close to your body',
      'Push back up to starting position',
    ],
  },
  {
    id: 'chest_05', name: 'Wide Push Ups', category: 'Chest',
    defaultDuration: 40, caloriesPerMinute: 7, difficulty: 'intermediate',
    muscleGroups: ['Outer Chest', 'Shoulders'], equipment: 'None',
    instructions: [
      'Start in plank with hands wider than shoulder-width',
      'Lower your body until chest nearly touches the floor',
      'Keep your elbows flared out at 45 degrees',
      'Push back up to starting position',
    ],
  },
  {
    id: 'chest_06', name: 'Chest Dips', category: 'Chest',
    defaultDuration: 35, caloriesPerMinute: 9, difficulty: 'advanced',
    muscleGroups: ['Lower Chest', 'Triceps', 'Shoulders'], equipment: 'Chair/Bench',
    instructions: [
      'Sit on the edge of a chair with hands gripping beside hips',
      'Slide forward off the chair with legs extended',
      'Lower your body by bending elbows to 90 degrees',
      'Push back up to starting position',
    ],
  },

  // ── BACK (6) ───────────────────────────────────────────────
  {
    id: 'back_01', name: 'Superman Hold', category: 'Back',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Lower Back', 'Glutes', 'Shoulders'], equipment: 'None',
    instructions: [
      'Lie face down on the floor with arms extended forward',
      'Simultaneously lift your arms, chest, and legs off the floor',
      'Hold the position at the top',
      'Lower back down slowly',
    ],
  },
  {
    id: 'back_02', name: 'Reverse Snow Angels', category: 'Back',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Upper Back', 'Rear Delts', 'Rhomboids'], equipment: 'None',
    instructions: [
      'Lie face down with arms at your sides',
      'Squeeze shoulder blades and lift arms off floor',
      'Slowly move arms like making a snow angel',
      'Keep your chest lifted throughout',
    ],
  },
  {
    id: 'back_03', name: 'Wide Rows', category: 'Back',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'intermediate',
    muscleGroups: ['Upper Back', 'Lats', 'Biceps'], equipment: 'Resistance band',
    instructions: [
      'Hold resistance band with wide grip at chest height',
      'Pull the band apart toward your chest',
      'Squeeze your shoulder blades together',
      'Slowly return to starting position',
    ],
  },
  {
    id: 'back_04', name: 'Narrow Rows', category: 'Back',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'intermediate',
    muscleGroups: ['Middle Back', 'Lats', 'Biceps'], equipment: 'Resistance band',
    instructions: [
      'Anchor a band at low height and hold with narrow grip',
      'Pull the band toward your lower abdomen',
      'Keep your elbows close to your body',
      'Slowly release to starting position',
    ],
  },
  {
    id: 'back_05', name: 'Cat-Cow Stretch', category: 'Back',
    defaultDuration: 45, caloriesPerMinute: 3, difficulty: 'beginner',
    muscleGroups: ['Full Spine', 'Core'], equipment: 'None',
    instructions: [
      'Start on hands and knees in tabletop position',
      'Inhale, drop belly, lift chest and tailbone (Cow)',
      'Exhale, round spine, tuck chin and tailbone (Cat)',
      'Flow between Cat and Cow positions',
    ],
  },
  {
    id: 'back_06', name: 'Pull Up Hold', category: 'Back',
    defaultDuration: 30, caloriesPerMinute: 7, difficulty: 'advanced',
    muscleGroups: ['Lats', 'Biceps', 'Upper Back'], equipment: 'Pull-up bar / sturdy surface',
    instructions: [
      'Grip a sturdy overhead surface with palms facing away',
      'Pull yourself up until chin is over the surface',
      'Hold at the top for as long as possible',
      'Lower down slowly with control',
    ],
  },

  // ── LEGS (6) ───────────────────────────────────────────────
  {
    id: 'legs_01', name: 'Squats', category: 'Legs',
    defaultDuration: 45, caloriesPerMinute: 7, difficulty: 'beginner',
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'None',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower your hips back and down like sitting in a chair',
      'Keep your chest up and knees tracking over toes',
      'Push through heels to return to standing',
    ],
  },
  {
    id: 'legs_02', name: 'Lunges', category: 'Legs',
    defaultDuration: 45, caloriesPerMinute: 7, difficulty: 'beginner',
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'None',
    instructions: [
      'Step forward with one leg and lower hips',
      'Both knees should bend to 90 degrees',
      'Front knee stays above ankle, back knee hovers',
      'Push through front heel to return to start',
    ],
  },
  {
    id: 'legs_03', name: 'Jump Squats', category: 'Legs',
    defaultDuration: 30, caloriesPerMinute: 10, difficulty: 'intermediate',
    muscleGroups: ['Quads', 'Glutes', 'Calves'], equipment: 'None',
    instructions: [
      'Perform a regular squat',
      'Explosively jump up from the bottom position',
      'Land softly with bent knees',
      'Immediately lower into next squat',
    ],
  },
  {
    id: 'legs_04', name: 'Glute Bridges', category: 'Legs',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Glutes', 'Hamstrings', 'Lower Back'], equipment: 'None',
    instructions: [
      'Lie on back with knees bent, feet flat on floor',
      'Push through heels to lift hips toward ceiling',
      'Squeeze glutes at the top',
      'Lower hips back down slowly',
    ],
  },
  {
    id: 'legs_05', name: 'Calf Raises', category: 'Legs',
    defaultDuration: 45, caloriesPerMinute: 4, difficulty: 'beginner',
    muscleGroups: ['Calves'], equipment: 'None',
    instructions: [
      'Stand on the edge of a step or flat on floor',
      'Push through the balls of your feet to rise up',
      'Hold at the top for a moment',
      'Lower heels back down slowly',
    ],
  },
  {
    id: 'legs_06', name: 'Wall Sit', category: 'Legs',
    defaultDuration: 60, caloriesPerMinute: 4, difficulty: 'intermediate',
    muscleGroups: ['Quads', 'Glutes', 'Calves'], equipment: 'Wall',
    instructions: [
      'Lean against a wall with feet shoulder-width apart',
      'Slide down until thighs are parallel to the floor',
      'Keep your back flat against the wall',
      'Hold this position',
    ],
  },

  // ── SHOULDERS (6) ──────────────────────────────────────────
  {
    id: 'sho_01', name: 'Pike Push Ups', category: 'Shoulders',
    defaultDuration: 40, caloriesPerMinute: 7, difficulty: 'intermediate',
    muscleGroups: ['Shoulders', 'Triceps', 'Upper Chest'], equipment: 'None',
    instructions: [
      'Start in downward dog position with hips high',
      'Bend elbows to lower head toward the floor',
      'Keep your body in an inverted V shape',
      'Push back up to starting position',
    ],
  },
  {
    id: 'sho_02', name: 'Lateral Raises', category: 'Shoulders',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Side Delts', 'Traps'], equipment: 'Water bottles / light weights',
    instructions: [
      'Hold weights at your sides with slight elbow bend',
      'Lift arms out to the sides to shoulder height',
      'Keep palms facing down throughout the movement',
      'Lower back down with control',
    ],
  },
  {
    id: 'sho_03', name: 'Front Raises', category: 'Shoulders',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Front Delts'], equipment: 'Water bottles / light weights',
    instructions: [
      'Hold weights in front of thighs with palms facing down',
      'Lift arms straight forward to shoulder height',
      'Keep a slight bend in your elbows',
      'Lower back down slowly',
    ],
  },
  {
    id: 'sho_04', name: 'Shoulder Taps', category: 'Shoulders',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'intermediate',
    muscleGroups: ['Shoulders', 'Core', 'Triceps'], equipment: 'None',
    instructions: [
      'Start in a plank position with hands under shoulders',
      'Lift one hand and tap the opposite shoulder',
      'Keep your hips as still as possible',
      'Alternate sides',
    ],
  },
  {
    id: 'sho_05', name: 'Arm Circles', category: 'Shoulders',
    defaultDuration: 45, caloriesPerMinute: 4, difficulty: 'beginner',
    muscleGroups: ['Shoulders', 'Rotator Cuff'], equipment: 'None',
    instructions: [
      'Extend arms straight out to the sides at shoulder height',
      'Make small circles forward for half the duration',
      'Switch to backward circles for the remaining time',
      'Gradually increase circle size',
    ],
  },
  {
    id: 'sho_06', name: 'Plank Ups', category: 'Shoulders',
    defaultDuration: 40, caloriesPerMinute: 7, difficulty: 'intermediate',
    muscleGroups: ['Shoulders', 'Core', 'Triceps'], equipment: 'None',
    instructions: [
      'Start in forearm plank position',
      'Press into right hand to straighten right arm, then left',
      'End in full plank position (push up top)',
      'Lower back down one arm at a time',
    ],
  },

  // ── ARMS (6) ───────────────────────────────────────────────
  {
    id: 'arms_01', name: 'Tricep Dips', category: 'Arms',
    defaultDuration: 40, caloriesPerMinute: 6, difficulty: 'beginner',
    muscleGroups: ['Triceps', 'Chest', 'Shoulders'], equipment: 'Chair/Bench',
    instructions: [
      'Sit on chair edge with hands beside hips',
      'Slide forward, lowering body with arms',
      'Bend elbows to 90 degrees behind you',
      'Push back up to starting position',
    ],
  },
  {
    id: 'arms_02', name: 'Bicep Curls', category: 'Arms',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Biceps', 'Forearms'], equipment: 'Water bottles / resistance band',
    instructions: [
      'Hold weights at your sides with palms facing forward',
      'Keep elbows pinned to your ribs',
      'Curl weights toward your shoulders',
      'Lower back down with control',
    ],
  },
  {
    id: 'arms_03', name: 'Tricep Kickbacks', category: 'Arms',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'intermediate',
    muscleGroups: ['Triceps'], equipment: 'Water bottles / resistance band',
    instructions: [
      'Hinge forward at hips with flat back',
      'Hold weights with elbows bent at 90 degrees',
      'Extend arms straight back behind you',
      'Squeeze triceps and return slowly',
    ],
  },
  {
    id: 'arms_04', name: 'Hammer Curls', category: 'Arms',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Biceps', 'Brachiaris'], equipment: 'Water bottles / resistance band',
    instructions: [
      'Hold weights at sides with palms facing each other',
      'Curl weights toward shoulders keeping palms in',
      'Keep elbows stationary at your sides',
      'Lower back down with control',
    ],
  },
  {
    id: 'arms_05', name: 'Wrist Curls', category: 'Arms',
    defaultDuration: 45, caloriesPerMinute: 3, difficulty: 'beginner',
    muscleGroups: ['Forearms', 'Wrist Flexors'], equipment: 'Water bottle',
    instructions: [
      'Sit with forearm resting on thigh, palm up',
      'Hold a light weight and extend wrist down',
      'Curl wrist upward squeezing the forearm',
      'Lower back down and repeat',
    ],
  },
  {
    id: 'arms_06', name: 'Fist Pumps', category: 'Arms',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Biceps', 'Shoulders', 'Forearms'], equipment: 'None',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Pump fists alternately overhead',
      'Keep core tight and rhythm steady',
      'Move as fast as you can maintain control',
    ],
  },

  // ── CORE (6) ───────────────────────────────────────────────
  {
    id: 'core_01', name: 'Crunches', category: 'Core',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'beginner',
    muscleGroups: ['Upper Abs'], equipment: 'None',
    instructions: [
      'Lie on back with knees bent, feet flat',
      'Place hands behind your head lightly',
      'Curl shoulders off the floor using your abs',
      'Lower back down with control',
    ],
  },
  {
    id: 'core_02', name: 'Leg Raises', category: 'Core',
    defaultDuration: 45, caloriesPerMinute: 5, difficulty: 'intermediate',
    muscleGroups: ['Lower Abs', 'Hip Flexors'], equipment: 'None',
    instructions: [
      'Lie flat on back with legs straight',
      'Place hands under hips for support',
      'Lift legs to 90 degrees keeping them straight',
      'Lower legs back down slowly without touching floor',
    ],
  },
  {
    id: 'core_03', name: 'Russian Twists', category: 'Core',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'intermediate',
    muscleGroups: ['Obliques', 'Lower Abs'], equipment: 'None',
    instructions: [
      'Sit with knees bent, feet hovering off floor',
      'Lean back slightly maintaining a straight back',
      'Rotate torso to the right, then to the left',
      'Keep feet off the ground throughout',
    ],
  },
  {
    id: 'core_04', name: 'Bicycle Crunches', category: 'Core',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'intermediate',
    muscleGroups: ['Obliques', 'Upper Abs', 'Lower Abs'], equipment: 'None',
    instructions: [
      'Lie on back with hands behind head',
      'Bring right knee toward chest while twisting left elbow to it',
      'Alternate sides in a pedaling motion',
      'Keep shoulders off the floor throughout',
    ],
  },
  {
    id: 'core_05', name: 'Plank', category: 'Core',
    defaultDuration: 60, caloriesPerMinute: 4, difficulty: 'beginner',
    muscleGroups: ['Full Core', 'Shoulders', 'Glutes'], equipment: 'None',
    instructions: [
      'Start in forearm plank with elbows under shoulders',
      'Keep your body in a straight line from head to heels',
      'Squeeze your glutes and core tight',
      'Hold the position without letting hips sag',
    ],
  },
  {
    id: 'core_06', name: 'Mountain Climbers', category: 'Core',
    defaultDuration: 45, caloriesPerMinute: 8, difficulty: 'intermediate',
    muscleGroups: ['Core', 'Shoulders', 'Hip Flexors'], equipment: 'None',
    instructions: [
      'Start in a full plank position',
      'Drive one knee toward your chest',
      'Quickly alternate legs in a running motion',
      'Keep your core engaged and hips down',
    ],
  },

  // ── CARDIO (6) ─────────────────────────────────────────────
  {
    id: 'cardio_01', name: 'Jumping Jacks', category: 'Cardio',
    defaultDuration: 60, caloriesPerMinute: 8, difficulty: 'beginner',
    muscleGroups: ['Full Body', 'Calves', 'Shoulders'], equipment: 'None',
    instructions: [
      'Stand with feet together and arms at sides',
      'Jump while spreading legs and raising arms overhead',
      'Jump back to starting position',
      'Maintain a steady rhythm',
    ],
  },
  {
    id: 'cardio_02', name: 'High Knees', category: 'Cardio',
    defaultDuration: 45, caloriesPerMinute: 10, difficulty: 'intermediate',
    muscleGroups: ['Quads', 'Hip Flexors', 'Core'], equipment: 'None',
    instructions: [
      'Stand in place with feet hip-width apart',
      'Drive your right knee up toward your chest',
      'Quickly alternate legs as fast as possible',
      'Pump your arms for momentum',
    ],
  },
  {
    id: 'cardio_03', name: 'Burpees', category: 'Cardio',
    defaultDuration: 30, caloriesPerMinute: 12, difficulty: 'advanced',
    muscleGroups: ['Full Body', 'Chest', 'Legs', 'Core'], equipment: 'None',
    instructions: [
      'Stand tall, then squat and place hands on floor',
      'Jump feet back into a plank position',
      'Drop chest to floor for a push up',
      'Jump feet forward and explosively jump up',
    ],
  },
  {
    id: 'cardio_04', name: 'Running in Place', category: 'Cardio',
    defaultDuration: 60, caloriesPerMinute: 9, difficulty: 'beginner',
    muscleGroups: ['Legs', 'Cardiovascular'], equipment: 'None',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Begin jogging in place lifting knees',
      'Pump your arms naturally',
      'Maintain a steady pace',
    ],
  },
  {
    id: 'cardio_05', name: 'Butt Kicks', category: 'Cardio',
    defaultDuration: 45, caloriesPerMinute: 8, difficulty: 'beginner',
    muscleGroups: ['Hamstrings', 'Calves'], equipment: 'None',
    instructions: [
      'Stand with feet hip-width apart',
      'Jog in place while kicking heels toward glutes',
      'Move as fast as you can',
      'Keep your upper body upright',
    ],
  },
  {
    id: 'cardio_06', name: 'Skater Hops', category: 'Cardio',
    defaultDuration: 45, caloriesPerMinute: 9, difficulty: 'intermediate',
    muscleGroups: ['Glutes', 'Quads', 'Calves', 'Core'], equipment: 'None',
    instructions: [
      'Stand on your right leg with left foot hovering',
      'Leap laterally to the left landing on left leg',
      'Swing arms naturally for balance',
      'Continue alternating sides',
    ],
  },

  // ── FULL BODY (6) ──────────────────────────────────────────
  {
    id: 'full_01', name: 'Burpees', category: 'Full Body',
    defaultDuration: 30, caloriesPerMinute: 12, difficulty: 'advanced',
    muscleGroups: ['Full Body', 'Chest', 'Legs', 'Core'], equipment: 'None',
    instructions: [
      'Stand tall, squat down, place hands on floor',
      'Jump feet back into a plank position',
      'Perform a push up',
      'Jump feet forward and explode up',
    ],
  },
  {
    id: 'full_02', name: 'Squat Thrusts', category: 'Full Body',
    defaultDuration: 40, caloriesPerMinute: 10, difficulty: 'intermediate',
    muscleGroups: ['Full Body', 'Legs', 'Core', 'Shoulders'], equipment: 'None',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Squat down and place hands on floor',
      'Jump feet back into plank',
      'Jump feet forward and stand up',
    ],
  },
  {
    id: 'full_03', name: 'Tuck Jumps', category: 'Full Body',
    defaultDuration: 30, caloriesPerMinute: 11, difficulty: 'advanced',
    muscleGroups: ['Legs', 'Core', 'Full Body'], equipment: 'None',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower into a shallow squat',
      'Explosively jump up tucking knees toward chest',
      'Land softly and immediately repeat',
    ],
  },
  {
    id: 'full_04', name: 'Bear Crawls', category: 'Full Body',
    defaultDuration: 45, caloriesPerMinute: 8, difficulty: 'intermediate',
    muscleGroups: ['Full Body', 'Shoulders', 'Core', 'Legs'], equipment: 'None',
    instructions: [
      'Start on hands and knees with hips lifted',
      'Move forward by stepping with right hand and left foot',
      'Alternate opposite hand and foot',
      'Keep your hips low and back flat',
    ],
  },
  {
    id: 'full_05', name: 'Star Jumps', category: 'Full Body',
    defaultDuration: 30, caloriesPerMinute: 10, difficulty: 'intermediate',
    muscleGroups: ['Full Body', 'Legs', 'Shoulders'], equipment: 'None',
    instructions: [
      'Squat down with arms crossed over chest',
      'Explosively jump spreading arms and legs wide',
      'Land softly with knees bent',
      'Return to starting squat position',
    ],
  },
  {
    id: 'full_06', name: 'Inchworms', category: 'Full Body',
    defaultDuration: 45, caloriesPerMinute: 6, difficulty: 'beginner',
    muscleGroups: ['Full Body', 'Core', 'Shoulders', 'Hamstrings'], equipment: 'None',
    instructions: [
      'Stand tall then bend to touch your toes',
      'Walk hands forward into a plank position',
      'Take small steps with your hands',
      'Walk feet back toward hands to return',
    ],
  },
];

export function getExercisesByCategory(category: ExerciseCategory): ExerciseData[] {
  return EXERCISE_LIBRARY.filter(e => e.category === category);
}

export function getExerciseById(id: string): ExerciseData | undefined {
  return EXERCISE_LIBRARY.find(e => e.id === id);
}

export function getCategoryTotalExercises(): Record<ExerciseCategory, number> {
  const counts: any = {};
  for (const cat of Object.keys(CATEGORY_MAP)) {
    counts[cat] = EXERCISE_LIBRARY.filter(e => e.category === cat).length;
  }
  return counts;
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_MAP) as ExerciseCategory[];
