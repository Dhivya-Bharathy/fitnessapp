import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../services/profileService';


/** Authentication and user profile state managed by the auth store. */
interface AuthState {
  user: User | null; session: Session | null; profile: Profile | null;
  isLoading: boolean; isAuthenticated: boolean; isOnboarding: boolean;
  userTier: 'free' | 'pro' | 'premium';  liveSteps: number;
  setLiveSteps: (steps: number) => void;
  setSession: (session: Session | null) => void;
  setOnboarding: (v: boolean) => void;
  loadProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>) => void;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}


export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, session: null, profile: null, isLoading: false,
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

        if (!get().isOnboarding) {
          if (!profile.goal) {
            set({ isOnboarding: true });
          }
        }
      } else {
        if (!get().isOnboarding) {
          set({ isOnboarding: true });
        }
      }

      return profile;
    } catch (e) {
      if (__DEV__) console.error('[authStore] loadProfile error:', e);
      return null;
    }
  },

  updateProfile: (updates) => {
    const current = get().profile;
    if (current) set({ profile: { ...current, ...updates } });
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
    try {
      const { supabase } = await import('../services/supabase');
      await supabase.auth.signOut();
    } catch {}
    set({ user: null, session: null, profile: null, isOnboarding: false, isAuthenticated: false, userTier: 'free', liveSteps: 0 });
  },
}));