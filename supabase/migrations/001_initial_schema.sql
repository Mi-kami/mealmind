-- MealMind — 001_initial_schema.sql
-- Run this in the Supabase SQL editor or via Supabase CLI
-- Creates all tables and enables Row Level Security

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid PRIMARY KEY DEFAULT auth.uid(),
  email           text NOT NULL UNIQUE,
  display_name    text,
  persona         text NOT NULL CHECK (persona IN ('student', 'professional', 'family', 'other')),
  dietary_filters jsonb NOT NULL DEFAULT '[]'::jsonb,
  cuisine_preference text NOT NULL DEFAULT 'both'
                  CHECK (cuisine_preference IN ('nigerian', 'international', 'both')),
  onboarded       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- SCORING WEIGHTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scoring_weights (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  variety_weight          float4 NOT NULL DEFAULT 0.25
                          CHECK (variety_weight BETWEEN 0.05 AND 0.60),
  nutrition_weight        float4 NOT NULL DEFAULT 0.25
                          CHECK (nutrition_weight BETWEEN 0.05 AND 0.60),
  effort_weight           float4 NOT NULL DEFAULT 0.25
                          CHECK (effort_weight BETWEEN 0.05 AND 0.60),
  ingredient_match_weight float4 NOT NULL DEFAULT 0.25
                          CHECK (ingredient_match_weight BETWEEN 0.05 AND 0.60),
  feedback_count          integer NOT NULL DEFAULT 0,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scoring_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weights"
  ON public.scoring_weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own weights"
  ON public.scoring_weights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weights"
  ON public.scoring_weights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PANTRY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pantry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  category        text,
  added_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ingredient_name)
);

CREATE INDEX idx_pantry_user_id ON public.pantry(user_id);

ALTER TABLE public.pantry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pantry"
  ON public.pantry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own pantry"
  ON public.pantry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own pantry"
  ON public.pantry FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- MEAL HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dish_id      text NOT NULL,
  dish_name    text NOT NULL,
  meal_type    text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'any')),
  suggested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_history_user_date
  ON public.meal_history(user_id, suggested_at DESC);

ALTER TABLE public.meal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal history"
  ON public.meal_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal history"
  ON public.meal_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FEEDBACK EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dish_id               text NOT NULL,
  dish_name             text NOT NULL,
  action                text NOT NULL CHECK (action IN ('accepted', 'skipped', 'rejected', 'rerolled')),
  variety_score         float4,
  nutrition_score       float4,
  effort_score          float4,
  ingredient_match_score float4,
  weights_at_event      jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_events_user_id
  ON public.feedback_events(user_id, created_at DESC);

ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.feedback_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at on users
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER weights_updated_at
  BEFORE UPDATE ON public.scoring_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();