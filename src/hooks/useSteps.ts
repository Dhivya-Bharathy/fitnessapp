import { useState, useEffect, useRef } from 'react';
import {
  isPedometerAvailable,
  requestStepsPermission,
  getTodaySteps,
  subscribeToSteps,
  saveStepsToSupabase,
  loadSavedSteps,
  stepsToCalories,
} from '../services/stepService';
import { useAuthStore } from '../store/authStore';

export function useSteps(goalSteps = 10000) {
  const { user, setLiveSteps } = useAuthStore();
  const [steps, setSteps]             = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);

  const unsubRef       = useRef<(() => void) | null>(null);
  const saveTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const goalNotifiedRef = useRef(false);

  // Keep Zustand in sync so all screens share one value
  useEffect(() => {
    if (setLiveSteps) setLiveSteps(steps);
  }, [steps]);

  useEffect(() => {
    start();
    return stop;
  }, [user?.id]);

  const stop = () => {
    unsubRef.current?.();
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);
  };

  const start = async () => {
    stop();
    setIsLoading(true);

    // 1. Show saved steps immediately — no blank while pedometer warms up
    if (user?.id) {
      const saved = await loadSavedSteps(user.id);
      if (saved > 0) {
        setSteps(saved);
        if (setLiveSteps) setLiveSteps(saved);
      }
    }

    const available = await isPedometerAvailable();
    setIsAvailable(available);
    if (!available) { setIsLoading(false); return; }

    const granted = await requestStepsPermission();
    setHasPermission(granted);
    if (!granted) { setIsLoading(false); return; }

    // 2. Start polling — getTodaySteps is always midnight→now, never drifts
    unsubRef.current = subscribeToSteps(async (todaySteps) => {
      setSteps(todaySteps);

      // Goal notification (fires once per day)
      if (user?.id && !goalNotifiedRef.current && todaySteps >= goalSteps) {
        goalNotifiedRef.current = true;
        try {
          const { sendNotification } = await import('../services/notificationService');
          await sendNotification(
            user.id, 'goal',
            'Step goal reached! 🎉',
            `You've hit ${goalSteps.toLocaleString()} steps today. Amazing work!`,
            'View History'
          );
        } catch {}
      }
    });

    // 3. Save to Supabase every 60s (was 5 min — progress screen needs this)
    if (user?.id) {
      saveTimerRef.current = setInterval(async () => {
        const live = await getTodaySteps();
        if (live > 0) await saveStepsToSupabase(user.id, live, goalSteps);
      }, 60_000);
    }

    setIsLoading(false);
  };

  return {
    steps,
    calories:   stepsToCalories(steps),
    progress:   Math.min(steps / goalSteps, 1),
    percentage: Math.round(Math.min(steps / goalSteps, 1) * 100),
    isAvailable,
    hasPermission,
    isLoading,
    goalSteps,
  };
}