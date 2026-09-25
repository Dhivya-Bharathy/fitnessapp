-- Streak / activity columns (missing on some older profiles tables).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_freeze_used_week BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Refresh PostgREST schema cache (Supabase API).
NOTIFY pgrst, 'reload schema';
