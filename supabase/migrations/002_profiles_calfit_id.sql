-- Username handle shown as @calfit_id (required for onboarding save on older projects).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calfit_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_calfit_id_idx ON public.profiles (calfit_id)
  WHERE calfit_id IS NOT NULL;
