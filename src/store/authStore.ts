import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../services/profileService';
import { useAssessmentStore } from './assessmentStore';


/** Authentication and user profile state managed by the auth store. */
interface AuthState {
  user: User | null; session: Session | null; profile: Profile | null;
  isLoading: boolean;
  /** False until getSession + loadProfile finish on cold start. */
  authReady: boolean;
  isAuthenticated: boolean; isOnboarding: boolean;
  userTier: 'free' | 'pro' | 'premium';  liveSteps: number;
  setLiveSteps: (steps: number) => void;
  setSession: (session: Session | null) => void;
  setOnboarding: (v: boolean) => void;
  loadProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>) => void;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; message?: string }>;
}


export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, session: null, profile: null, isLoading: false, authReady: false,
  isAuthenticated: false, isOnboarding: false, userTier: 'free',
  liveSteps: 0,

  setLiveSteps: (steps) => set({ liveSteps: steps }),
  setOnboarding: (v) => set({ isOnboarding: v }),
  setSession: (session) => {
    if (!session) {
      set({ session: null, user: null, profile: null, isAuthenticated: false, isOnboarding: false });
      return;
    }
    set({ session, user: session.user, isAuthenticated: true });

    // Only load profile if OnboardingScreen is NOT currently running.
    // If isOnboarding=true, OnboardingScreen owns the flow — don't interfere.
    // loadProfile might flip isOnboarding based on profile state which would
    // unmount OnboardingScreen mid-flow.
    if (!get().isOnboarding) {
      get().loadProfile(session.user.id).catch((e) => { if (__DEV__) console.error(e); });
    }
  },

  loadProfile: async (userId: string) => {
    try {
      const { getProfile } = await import('../services/profileService');
      const profile = await getProfile(userId);

      if (profile) {
        set({ profile });
      }

      if (!get().isOnboarding) {
        const { isAssessmentCompleteForUser, setLocalAssessmentComplete } = await import('../utils/onboardingFlags');
        let complete = await isAssessmentCompleteForUser(userId, profile);
        if (profile && !complete && profile.goal && profile.bio) {
          await setLocalAssessmentComplete(userId);
          complete = true;
        }
        if (profile && !complete) {
          set({ isOnboarding: true });
        } else if (complete) {
          set({ isOnboarding: false });
        }
        // If profile failed to load, keep current isOnboarding — do not kick user to Welcome.
      }

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
      set({
        profile: {
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
        } as Profile,
      });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally { set({ isLoading: false }); }
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const { supabase } = await import('../services/supabase');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally { set({ isLoading: false }); }
  },

  signOut: async () => {
    const userId = get().user?.id;
    try {
      const { supabase } = await import('../services/supabase');
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    if (userId) {
      try {
        const { clearLocalAssessmentComplete } = await import('../utils/onboardingFlags');
        await clearLocalAssessmentComplete();
      } catch {}
    }
    set({
      user: null,
      session: null,
      profile: null,
      isOnboarding: true,
      isAuthenticated: false,
      userTier: 'free',
      liveSteps: 0,
      authReady: true,
    });
  },

  deleteAccount: async () => {
    const userId = get().user?.id;
    if (!userId) {
      await get().signOut();
      return { ok: true };
    }

    try {
      const { deleteAccountData } = await import('../services/profileService');
      const { clearAssessmentPersistence } = await import('../utils/assessmentPersistence');
      const { clearLocalAssessmentComplete } = await import('../utils/onboardingFlags');

      await clearAssessmentPersistence();
      await clearLocalAssessmentComplete();
      useAssessmentStore.getState().reset();

      const deleted = await deleteAccountData(userId);
      if (!deleted.ok) {
        return { ok: false, message: deleted.message ?? 'Could not delete account data.' };
      }

      const { supabase } = await import('../services/supabase');
      await supabase.auth.signOut({ scope: 'local' });

      set({
        user: null,
        session: null,
        profile: null,
        isOnboarding: true,
        isAuthenticated: false,
        userTier: 'free',
        liveSteps: 0,
        authReady: true,
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Delete failed' };
    }
  },
}));