import { create } from 'zustand';
import type { GeneratedWorkout } from '../types/ai-coach.types';
import { persistAssessmentAnswers } from '../utils/assessmentPersistence';

export type AssessmentAnswerValue = string | string[];
export type AssessmentAnswers = Record<string, AssessmentAnswerValue>;

export interface IndianDietPlanResult {
  title: string;
  description: string;
  daily_calories: number;
  meals: {
    name: string;
    foods: string[];
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fats_g?: number;
  }[];
  hydration_tip?: string;
  budget_note?: string;
}

export interface DemicAssessmentResult {
  coach_summary: string;
  weekly_outline: string[];
  workout: GeneratedWorkout & { focus_moves?: string[]; demic_story_moves?: string[] };
  indian_diet_plan: IndianDietPlanResult;
}

interface AssessmentState {
  answers: AssessmentAnswers;
  result: DemicAssessmentResult | null;
  isGenerating: boolean;
  error: string | null;
  setAnswer: (id: string, value: AssessmentAnswerValue) => void;
  toggleMulti: (id: string, value: string) => void;
  hydrateAnswers: (answers: AssessmentAnswers) => void;
  reset: () => void;
  setResult: (r: DemicAssessmentResult | null) => void;
  setGenerating: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  answers: {},
  result: null,
  isGenerating: false,
  error: null,
  setAnswer: (id, value) => {
    const answers = { ...get().answers, [id]: value };
    set({ answers });
    persistAssessmentAnswers(answers);
  },
  toggleMulti: (id, value) => {
    const cur = get().answers[id];
    const list = Array.isArray(cur) ? [...cur] : cur ? [String(cur)] : [];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    const answers = { ...get().answers, [id]: next };
    set({ answers });
    persistAssessmentAnswers(answers);
  },
  hydrateAnswers: (answers: AssessmentAnswers) => {
    set({ answers });
    persistAssessmentAnswers(answers);
  },
  reset: () => set({ answers: {}, result: null, error: null, isGenerating: false }),
  setResult: (r) => set({ result: r }),
  setGenerating: (v) => set({ isGenerating: v }),
  setError: (e) => set({ error: e }),
}));
