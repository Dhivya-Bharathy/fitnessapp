import type { ExerciseCategory } from '../data/exerciseLibrary';

/** Royalty-free preview images (Pexels / Unsplash) for workout UI thumbnails. */
const DEFAULT =
  'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=600';

const BY_CATEGORY: Record<ExerciseCategory, string> = {
  Chest: 'https://images.pexels.com/photos/17840/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  Back: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=600',
  Legs: 'https://images.pexels.com/photos/6550877/pexels-photo-6550877.jpeg?auto=compress&cs=tinysrgb&w=600',
  Shoulders: 'https://images.pexels.com/photos/17840/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  Arms: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=600',
  Core: 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=600',
  Cardio: 'https://images.pexels.com/photos/3764014/pexels-photo-3764014.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Full Body': 'https://images.pexels.com/photos/2261488/pexels-photo-2261488.jpeg?auto=compress&cs=tinysrgb&w=600',
};

const BY_NAME: Record<string, string> = {
  Burpees: 'https://images.pexels.com/photos/2261488/pexels-photo-2261488.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Squat Thrusts': 'https://images.pexels.com/photos/6550877/pexels-photo-6550877.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Tuck Jumps': 'https://images.pexels.com/photos/3764014/pexels-photo-3764014.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Bear Crawls': 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Star Jumps': 'https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Jumping Jacks': 'https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Mountain Climbers': 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Push Ups': 'https://images.pexels.com/photos/17840/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  Squats: 'https://images.pexels.com/photos/6550877/pexels-photo-6550877.jpeg?auto=compress&cs=tinysrgb&w=600',
  Lunges: 'https://images.pexels.com/photos/6550877/pexels-photo-6550877.jpeg?auto=compress&cs=tinysrgb&w=600',
  Plank: 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=600',
  'High Knees': 'https://images.pexels.com/photos/3764014/pexels-photo-3764014.jpeg?auto=compress&cs=tinysrgb&w=600',
};

export function getExerciseImageUrl(name: string, category: ExerciseCategory): string {
  return BY_NAME[name] ?? BY_CATEGORY[category] ?? DEFAULT;
}
