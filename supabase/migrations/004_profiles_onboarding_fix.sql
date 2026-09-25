-- Safe to re-run: fixes profile save / onboarding without re-applying full schema.
-- Use this when 000_full_schema.sql fails with "policy already exists".

-- Columns needed for onboarding save
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calfit_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC(5,1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracking_preferences TEXT[];

CREATE UNIQUE INDEX IF NOT EXISTS profiles_calfit_id_idx ON public.profiles (calfit_id)
  WHERE calfit_id IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
