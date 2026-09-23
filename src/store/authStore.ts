import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../services/profileService';
/** Authentication and user profile state managed by the auth store. */
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  authReady: boolean;
  isAuthenticated: boolean;
  isOnboarding: boolean;
  /** Bumped on sign-out / delete to remount navigation at Welcome. */
  authEpoch: number;
  /** After delete account — must redo 22-question assessment even if server flag remains. */
  forceAssessmentRetake: boolean;
  setForceAssessmentRetake: (v: boolean) => void;
  userTier: 'free' | 'pro' | 'premium';
  liveSteps: number;
  setLiveSteps: (steps: number) => void;
  setSession: (session: Session | null) => void;
  setOnboarding: (v: boolean) => void;
  bumpAuthEpoch: () => void;
  loadProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>) => void;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; message?: string }>;
}

function emptyProfileShell(userId: string, updates: Partial<Profile>): Profile {
  return {
    id: userId,
    calfit_id: null,
    full_name: null,
    goal: null,
    activity_level: null,
    age: null,
    height_cm: null,
    current_weight_kg: null,
    target_weight_kg: null,
    daily_calorie_goal: 2000,
    protein_goal_g: 120,
    carb_goal_g: 200,
    fat_goal_g: 60,
    water_goal_ml: 2500,
    sleep_goal_hrs: 8,
    step_goal: 10000,
    theme: 'dark',
    units: 'metric',
    dietary_preference: null,
    tracking_preferences: null,
    streak_count: 0,
    last_active_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    avatar_url: null,
    ...updates,
  } as Profile;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  authReady: false,
  isAuthenticated: false,
  isOnboarding: true,
  authEpoch: 0,
  forceAssessmentRetake: false,
  userTier: 'free',
  liveSteps: 0,

  setLiveSteps: (steps) => set({ liveSteps: steps }),
  setOnboarding: (v) => set({ isOnboarding: v }),
  bumpAuthEpoch: () => set((s) => ({ authEpoch: s.authEpoch + 1 })),
  setForceAssessmentRetake: (v) => set({ forceAssessmentRetake: v }),

  setSession: (session) => {
    if (!session) {
      set({
        session: null,
        user: null,
        profile: null,
        isAuthenticated: false,
        isOnboarding: true,
      });
      return;
    }
    set({ session, user: session.user, isAuthenticated: true });

    if (!get().isOnboarding) {
      get().loadProfile(session.user.id).catch((e) => {
        if (__DEV__) console.error(e);
      });
    }
  },

  loadProfile: async (userId: string) => {
    try {
      const { getProfile } = await import('../services/profileService');
      const profile = await getProfile(userId);

      if (profile) {
        set({ profile });
      }

      const { isAssessmentCompleteForUser } = await import('../utils/onboardingFlags');
      const force = get().forceAssessmentRetake;
      const complete = await isAssessmentCompleteForUser(userId, profile, { forceRetake: force });
      const showFlow = !get().user || force || !profile?.goal || !complete;
      set({ isOnboarding: showFlow });

      return profile;
    } catch (e) {
      if (__DEV__) console.error('[authStore] loadProfile error:', e);
      return null;
    }
  },

  updateProfile: (updates) => {
    const current = get().profile;
    const userId = get().user?.id;
    if (current) {
      set({ profile: { ...current, ...updates } });
    } else if (userId) {
      set({ profile: emptyProfileShell(userId, updates) });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      const { supabase } = await import('../services/supabase');
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    const { clearSupabaseAuthStorage } = await import('../utils/resetLocalUserState');
    clearSupabaseAuthStorage();

    set({
      user: null,
      session: null,
      profile: null,
      isOnboarding: true,
      isAuthenticated: false,
      userTier: 'free',
      liveSteps: 0,
      authReady: true,
      authEpoch: get().authEpoch + 1,
    });
  },

  deleteAccount: async () => {
    const userId = get().user?.id;

    const { persistForceAssessmentRetake } = await import('../utils/onboardingFlags');
    await persistForceAssessmentRetake(true);
    set({ forceAssessmentRetake: true, isOnboarding: true });

    const { resetLocalUserState, clearSupabaseAuthStorage } = await import('../utils/resetLocalUserState');
    await resetLocalUserState();

    if (userId) {
      const { deleteAccountData } = await import('../services/profileService');
      const deleted = await deleteAccountData(userId);
      if (!deleted.ok && __DEV__) {
        console.warn('[deleteAccount] server reset:', deleted.message);
      }
    }

    try {
      const { supabase } = await import('../services/supabase');
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    clearSupabaseAuthStorage();

    set({
      user: null,
      session: null,
      profile: null,
      isOnboarding: true,
      forceAssessmentRetake: true,
      isAuthenticated: false,
      userTier: 'free',
      liveSteps: 0,
      authReady: true,
      authEpoch: get().authEpoch + 1,
    });

    return { ok: true };
  },
}));
