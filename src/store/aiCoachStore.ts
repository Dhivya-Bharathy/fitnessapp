import { create } from 'zustand';
import { generateWorkout, sendCoachChatMessage } from '../services/nvidia-client';
import { stripMarkdown } from '../utils/strip-markdown';
import type {
  GeneratedWorkout,
  WorkoutParams,
  UserFitnessProfile,
  ChatMessage,
} from '../types/ai-coach.types';

/** Cached workout entry used to avoid redundant regeneration within the TTL window. */
interface CacheEntry {
  params: WorkoutParams;
  workout: GeneratedWorkout;
  timestamp: number;
}

/** AI Coach store state covering workout generation, saved workouts, chat messages, and user profile. */
interface AiCoachState {
  currentWorkout: GeneratedWorkout | null;
  savedWorkouts: GeneratedWorkout[];
  isLoading: boolean;
  error: string | null;
  userProfile: UserFitnessProfile | null;
  requestCache: CacheEntry | null;

  // Chat state
  chatMessages: ChatMessage[];
  chatMessagesLoaded: boolean;
  isChatLoading: boolean;
  chatStartedAt: number | null;
  chatError: string | null;

  generateWorkout: (userId: string, params: WorkoutParams) => Promise<void>;
  saveWorkout: (userId: string, workout: GeneratedWorkout) => Promise<void>;
  deleteSavedWorkout: (userId: string, workoutId: string) => Promise<void>;
  loadSavedWorkouts: (userId: string) => Promise<void>;
  updateUserProfile: (profile: UserFitnessProfile) => void;
  clearError: () => void;
  clearCurrentWorkout: () => void;

  // Chat actions
  sendMessage: (userId: string, content: string) => Promise<void>;
  loadChatMessages: (userId: string) => Promise<void>;
  clearChat: (userId?: string) => Promise<void>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_LOADING_MS = 1200;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function paramsMatch(a: WorkoutParams, b: WorkoutParams): boolean {
  return (
    a.fitnessLevel === b.fitnessLevel &&
    a.duration === b.duration &&
    JSON.stringify(a.goals.sort()) === JSON.stringify(b.goals.sort()) &&
    JSON.stringify(a.equipment.sort()) === JSON.stringify(b.equipment.sort())
  );
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Zustand store hook for AI-powered workout generation, persistence of saved
 * workouts, and real-time chat with the AI coach.
 *
 * @returns AiCoachState — The full store including current/saved workouts,
 * chat messages, profile, cache, and all action methods.
 */
export const useAiCoachStore = create<AiCoachState>((set, get) => ({
  currentWorkout: null,
  savedWorkouts: [],
  isLoading: false,
  error: null,
  userProfile: null,
  requestCache: null,
  chatMessages: [],
  chatMessagesLoaded: false,
  isChatLoading: false,
  chatStartedAt: null,
  chatError: null,

  generateWorkout: async (userId: string, params: WorkoutParams) => {
    const { requestCache, savedWorkouts } = get();

    if (requestCache && paramsMatch(requestCache.params, params)) {
      const age = Date.now() - requestCache.timestamp;
      if (age < CACHE_TTL_MS) {
        set({ currentWorkout: requestCache.workout, error: null });
        return;
      }
    }

    set({ isLoading: true, error: null });
    const startedAt = Date.now();

    try {
      const workout = await generateWorkout(userId, {
        ...params,
        previousWorkouts: savedWorkouts.slice(0, 5),
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await delay(MIN_LOADING_MS - elapsed);

      set({
        currentWorkout: workout,
        requestCache: { params, workout, timestamp: Date.now() },
        isLoading: false,
      });

      set(state => ({
        chatMessages: [...state.chatMessages, {
          role: 'assistant',
          content: `Here's your workout: ${workout.title} — ${workout.duration} min, ${workout.exercises.length} exercises.`,
          id: generateId(),
          timestamp: Date.now(),
        }],
      }));
    } catch (e: any) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await delay(MIN_LOADING_MS - elapsed);
      set({ error: e?.message ?? 'Failed to generate workout', isLoading: false });
    }
  },

  saveWorkout: async (userId: string, workout: GeneratedWorkout) => {
    const { savedWorkouts } = get();
    if (savedWorkouts.some(w => w.id === workout.id)) return;

    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.from('ai_generated_workouts').insert({
        user_id: userId,
        title: workout.title,
        description: workout.description,
        duration: workout.duration,
        difficulty: workout.difficulty,
        exercises: workout.exercises,
        warmup: workout.warmup,
        cooldown: workout.cooldown,
        ai_notes: workout.ai_notes,
        is_saved: true,
      });

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ savedWorkouts: [...savedWorkouts, workout], error: null });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to save workout' });
    }
  },

  deleteSavedWorkout: async (userId: string, workoutId: string) => {
    const { savedWorkouts } = get();

    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase
        .from('ai_generated_workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', userId);

      if (error) {
        set({ error: error.message });
        return;
      }

      set({
        savedWorkouts: savedWorkouts.filter((w) => w.id !== workoutId),
        error: null,
      });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to delete workout' });
    }
  },

  loadSavedWorkouts: async (userId: string) => {
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase
        .from('ai_generated_workouts')
        .select('id,user_id,title,description,duration,difficulty,exercises,warmup,cooldown,is_saved,created_at')
        .eq('user_id', userId)
        .eq('is_saved', true)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message });
        return;
      }

      const workouts: GeneratedWorkout[] = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? '',
        duration: row.duration ?? 30,
        difficulty: row.difficulty ?? 5,
        exercises: row.exercises ?? [],
        warmup: row.warmup ?? [],
        cooldown: row.cooldown ?? [],
        ai_notes: row.ai_notes ?? '',
        created_at: row.created_at,
      }));

      set({ savedWorkouts: workouts, error: null });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load saved workouts' });
    }
  },

  updateUserProfile: (profile: UserFitnessProfile) => {
    set({ userProfile: profile });
  },

  clearError: () => set({ error: null }),

  clearCurrentWorkout: () => set({ currentWorkout: null }),

  // ── CHAT ACTIONS ─────────────────────────────────────────────
  sendMessage: async (userId: string, content: string) => {
    if (!content.trim() || !userId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      id: generateId(),
      timestamp: Date.now(),
    };

    set(state => ({
      chatMessages: [...state.chatMessages, userMessage],
      isChatLoading: true,
      chatStartedAt: Date.now(),
      chatError: null,
    }));

    try {
      const { chatMessages, userProfile, savedWorkouts } = get();
      const apiMessages = chatMessages.map(m => ({ role: m.role, content: m.content }));

      const profile = userProfile
        ? { name: '', goal: userProfile.goals?.join(', '), fitnessLevel: userProfile.fitness_level }
        : undefined;

      const result = await sendCoachChatMessage(userId, apiMessages, profile);

      const cleanedReply = stripMarkdown(result.reply);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: cleanedReply,
        id: generateId(),
        timestamp: Date.now(),
      };

      set(state => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isChatLoading: false,
        chatStartedAt: null,
      }));

      // Persist both messages to Supabase
      try {
        const { supabase } = await import('../services/supabase');
        await supabase.from('chat_messages').insert([
          { user_id: userId, role: 'user', content: userMessage.content },
          { user_id: userId, role: 'assistant', content: cleanedReply },
        ]);
      } catch {}

      // Notify user that AI coach responded
      try {
        const { sendInstantNotification } = await import('../services/reminderService');
        const { notifyCoachResponse } = await import('../services/notificationService');
        await sendInstantNotification('AI Coach 💬', 'Your AI Coach has responded. Tap to view.', { type: 'coach' });
        await notifyCoachResponse(userId);
      } catch {}

      if (result.action) {
        if (result.action.type === 'generate_workout' && result.action.data) {
          const params: WorkoutParams = {
            fitnessLevel: result.action.data.level || userProfile?.fitness_level || 'beginner',
            goals: result.action.data.goals || userProfile?.goals || ['general_fitness'],
            duration: result.action.data.duration || userProfile?.preferred_duration || 30,
            equipment: userProfile?.preferred_equipment || ['body-weight'],
          };
          await get().generateWorkout(userId, params);
        }
      }
    } catch (e: any) {
      set(state => ({
        chatMessages: [...state.chatMessages, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          id: generateId(),
          timestamp: Date.now(),
        }],
        isChatLoading: false,
        chatStartedAt: null,
        chatError: e?.message ?? 'Chat error',
      }));
      try {
        const { sendInstantNotification } = await import('../services/reminderService');
        await sendInstantNotification('AI Coach ⚠️', 'Your AI Coach encountered an error. Please try again.', { type: 'coach' });
      } catch {}
    }
  },

  loadChatMessages: async (userId: string) => {
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id,user_id,role,content,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) return;

      const messages: ChatMessage[] = (data ?? []).map((row: any) => ({
        role: row.role,
        content: row.content,
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
      }));

      set({ chatMessages: messages, chatMessagesLoaded: true });
    } catch {}
  },

  clearChat: async (userId?: string) => {
    set({ chatMessages: [], chatError: null, chatStartedAt: null });
    if (userId) {
      try {
        const { supabase } = await import('../services/supabase');
        await supabase.from('chat_messages').delete().eq('user_id', userId);
      } catch {}
    }
  },
}));
