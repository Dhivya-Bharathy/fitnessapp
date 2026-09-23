-- ═══════════════════════════════════════════════════════════════
-- CalFit — Full Database Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- to set up a fresh project from scratch.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CORE USER TABLES ──────────────────────────────────────

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calfit_id       TEXT UNIQUE,
  full_name       TEXT,
  goal            TEXT,
  activity_level  TEXT,
  age             INTEGER,
  height_cm       NUMERIC(5,1),
  current_weight_kg NUMERIC(5,1),
  target_weight_kg  NUMERIC(5,1),
  starting_weight_kg NUMERIC(5,1),
  daily_calorie_goal  INTEGER NOT NULL DEFAULT 2000,
  protein_goal_g      INTEGER NOT NULL DEFAULT 120,
  carb_goal_g         INTEGER NOT NULL DEFAULT 200,
  fat_goal_g          INTEGER NOT NULL DEFAULT 60,
  water_goal_ml       INTEGER NOT NULL DEFAULT 2500,
  sleep_goal_hrs      NUMERIC(3,1) NOT NULL DEFAULT 8,
  step_goal           INTEGER NOT NULL DEFAULT 10000,
  theme               TEXT NOT NULL DEFAULT 'dark',
  units               TEXT NOT NULL DEFAULT 'metric',
  dietary_preference  TEXT[],
  tracking_preferences TEXT[],
  streak_count        INTEGER NOT NULL DEFAULT 0,
  streak_freeze_used_week BOOLEAN DEFAULT FALSE,
  last_active_date    DATE,
  bio                 TEXT,
  fitness_level       TEXT,
  goals               TEXT[],
  equipment_preferences TEXT[],
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Food logs
CREATE TABLE IF NOT EXISTS food_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snacks')),
  food_name TEXT NOT NULL,
  calories  INTEGER NOT NULL,
  protein_g NUMERIC(6,1),
  carbs_g   NUMERIC(6,1),
  fats_g    NUMERIC(6,1),
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, date);

-- Water logs
CREATE TABLE IF NOT EXISTS water_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_water_logs_user ON water_logs(user_id, logged_at);

-- Step logs
CREATE TABLE IF NOT EXISTS step_logs (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  steps      INTEGER NOT NULL DEFAULT 0,
  goal_steps INTEGER NOT NULL DEFAULT 10000,
  PRIMARY KEY (user_id, date)
);

-- Sleep logs
CREATE TABLE IF NOT EXISTS sleep_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours     NUMERIC(4,1) NOT NULL,
  quality   INTEGER CHECK (quality >= 1 AND quality <= 5),
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  bedtime   TIME,
  wake_time TIME,
  notes     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date);

-- Notes (journal)
CREATE TABLE IF NOT EXISTS notes (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  content   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, created_at);

-- Saved meals
CREATE TABLE IF NOT EXISTS saved_meals (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  calories  INTEGER,
  protein_g NUMERIC(6,1),
  carbs_g   NUMERIC(6,1),
  fats_g    NUMERIC(6,1),
  meal_type TEXT,
  meal_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON saved_meals(user_id);

-- ── 2. WORKOUT TABLES ────────────────────────────────────────

-- Workout routines (templates)
CREATE TABLE IF NOT EXISTS workout_routines (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  exercises   JSONB NOT NULL DEFAULT '[]',
  duration_est  INTEGER,
  calories_est  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routines_user ON workout_routines(user_id);

-- Workout sessions (completed workouts)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed',
  calories_burned INTEGER,
  duration_seconds INTEGER,
  exercises       JSONB,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON workout_sessions(user_id, status);

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_type   TEXT NOT NULL CHECK (record_type IN ('longest_duration','most_calories','most_exercises','longest_exercise')),
  exercise_name TEXT,
  value         NUMERIC NOT NULL,
  achieved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_name  TEXT NOT NULL,
  UNIQUE (user_id, record_type, exercise_name)
);
CREATE INDEX IF NOT EXISTS idx_pr_user ON personal_records(user_id);

-- ── 3. AI TABLES ─────────────────────────────────────────────

-- AI-generated workouts
CREATE TABLE IF NOT EXISTS ai_generated_workouts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  duration    INTEGER,
  difficulty  INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
  exercises   JSONB,
  warmup      JSONB,
  cooldown    JSONB,
  ai_notes    TEXT,
  is_saved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_workouts_user ON ai_generated_workouts(user_id, is_saved);

-- AI-generated meal plans
CREATE TABLE IF NOT EXISTS ai_generated_meal_plans (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  daily_calories INTEGER,
  meals       JSONB,
  nutrition_goals JSONB,
  dietary_preferences TEXT[],
  budget_level TEXT,
  excluded_foods TEXT[],
  cuisine_style TEXT,
  health_goal TEXT,
  ai_notes    TEXT,
  is_saved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_mealplans_user ON ai_generated_meal_plans(user_id, is_saved);

-- AI coach chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);

-- AI API usage logs
CREATE TABLE IF NOT EXISTS ai_api_usage (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_used  TEXT,
  tokens_input  INTEGER,
  tokens_output INTEGER,
  latency_ms    INTEGER,
  status        TEXT NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON ai_api_usage(user_id);

-- ── 4. SOCIAL & FEATURE TABLES ───────────────────────────────

-- Accountability partners
CREATE TABLE IF NOT EXISTS partners (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_goal   TEXT,
  partner_streak INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_partner ON partners(partner_id);

-- Partner chat messages
CREATE TABLE IF NOT EXISTS partner_messages (
  id            BIGSERIAL PRIMARY KEY,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message       TEXT NOT NULL DEFAULT '',
  message_type  TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','audio')),
  media_url     TEXT,
  media_duration INTEGER,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_msgs_conversation ON partner_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_partner_msgs_receiver_unread ON partner_messages(receiver_id, read);

-- Body measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chest_cm  NUMERIC(5,1),
  waist_cm  NUMERIC(5,1),
  hips_cm   NUMERIC(5,1),
  arms_cm   NUMERIC(5,1),
  thighs_cm NUMERIC(5,1),
  neck_cm   NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  notes     TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_meas_user ON body_measurements(user_id, measured_at);

-- Fasting logs
CREATE TABLE IF NOT EXISTS fasting_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol        TEXT,
  fast_hours      INTEGER,
  eating_hours    INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_end_at   TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_planned INTEGER,
  duration_actual  INTEGER,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fasting_user ON fasting_logs(user_id, started_at);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('achievement','social','streak','upgrade','coach','community','goal','system','welcome')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  action_label TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, read);

-- Mood logs
CREATE TABLE IF NOT EXISTS mood_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  mood_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_logs(user_id, created_at);

-- ── 5. SECURITY DEFINER FUNCTION ─────────────────────────────

-- Insert reverse partner row (bypasses RLS for the reverse direction)
-- See function comment for full security rationale.
CREATE OR REPLACE FUNCTION insert_partner_reverse(
  p_user_id UUID,
  p_partner_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO partners (user_id, partner_id, status)
  VALUES (p_partner_id, p_user_id, 'active')
  ON CONFLICT (user_id, partner_id) DO NOTHING;
END;
$$;

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────

-- Enable RLS on all user-data tables
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_routines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_workouts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_meal_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_api_usage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs     ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- General pattern: users can CRUD their own rows on all tables
CREATE POLICY "Users can CRUD own food_logs"
  ON food_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own water_logs"
  ON water_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own step_logs"
  ON step_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own sleep_logs"
  ON sleep_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own notes"
  ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own saved_meals"
  ON saved_meals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own workout_routines"
  ON workout_routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own workout_sessions"
  ON workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own personal_records"
  ON personal_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own ai_generated_workouts"
  ON ai_generated_workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own ai_generated_meal_plans"
  ON ai_generated_meal_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own chat_messages"
  ON chat_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own ai_api_usage"
  ON ai_api_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own body_measurements"
  ON body_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own fasting_logs"
  ON fasting_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own mood_logs"
  ON mood_logs FOR ALL USING (auth.uid() = user_id);

-- Partners table: user can see rows where they are either user_id or partner_id
CREATE POLICY "Users can view own partner rows"
  ON partners FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users can insert own partner rows"
  ON partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partner rows"
  ON partners FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own partner rows"
  ON partners FOR DELETE
  USING (auth.uid() = user_id);

-- Partner messages: user can see/send messages they participate in
CREATE POLICY "Users can view own conversations"
  ON partner_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages"
  ON partner_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark messages as read"
  ON partner_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ── 7. REALTIME ──────────────────────────────────────────────

-- Enable Realtime for partner_messages (needed for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE partner_messages;

-- Enable Realtime for notifications (needed for live push)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── 8. STORAGE BUCKETS & POLICIES ────────────────────────────

-- Insert buckets (idempotent — skip if already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-media', 'partner-media', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket: anyone can read, authenticated users can upload/delete own
CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Avatar authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Avatar own delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- Partner-media bucket: anyone can read, upload to own folder, delete own
CREATE POLICY "Partner media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-media');
CREATE POLICY "Partner media authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Partner media own delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partner-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═══════════════════════════════════════════════════════════════
-- End of schema
-- ═══════════════════════════════════════════════════════════════
