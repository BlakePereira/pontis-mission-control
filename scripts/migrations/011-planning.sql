-- ============================================================
-- 011-planning.sql
-- Planning loop: quarterly goals -> weekly plans -> daily tasks
-- ============================================================

-- Quarterly goals
CREATE TABLE IF NOT EXISTS planning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'business'
    CHECK (category IN ('business', 'product', 'sales', 'personal', 'ops')),
  target_metric TEXT,
  current_value NUMERIC(12,2) DEFAULT 0,
  target_value NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed')),
  owner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly plans
CREATE TABLE IF NOT EXISTS planning_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  quarter TEXT NOT NULL,
  theme TEXT,
  planned_outcomes JSONB DEFAULT '[]'::jsonb,
  retrospective TEXT,
  score INTEGER,
  blake_score INTEGER,
  joe_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily tasks
CREATE TABLE IF NOT EXISTS planning_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  week_id UUID REFERENCES planning_weeks(id),
  owner TEXT NOT NULL,
  task TEXT NOT NULL,
  goal_id UUID REFERENCES planning_goals(id),
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'deferred')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_planning_goals_quarter ON planning_goals(quarter);
CREATE INDEX IF NOT EXISTS idx_planning_goals_owner ON planning_goals(owner);
CREATE INDEX IF NOT EXISTS idx_planning_weeks_quarter ON planning_weeks(quarter);
CREATE INDEX IF NOT EXISTS idx_planning_weeks_week_start ON planning_weeks(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_planning_daily_date ON planning_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_planning_daily_owner ON planning_daily(owner);
CREATE INDEX IF NOT EXISTS idx_planning_daily_week_id ON planning_daily(week_id);

ALTER TABLE planning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'planning_goals' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON planning_goals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'planning_weeks' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON planning_weeks
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'planning_daily' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON planning_daily
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION planning_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_planning_goals_updated_at ON planning_goals;
CREATE TRIGGER set_planning_goals_updated_at
  BEFORE UPDATE ON planning_goals
  FOR EACH ROW EXECUTE FUNCTION planning_update_updated_at();

DROP TRIGGER IF EXISTS set_planning_weeks_updated_at ON planning_weeks;
CREATE TRIGGER set_planning_weeks_updated_at
  BEFORE UPDATE ON planning_weeks
  FOR EACH ROW EXECUTE FUNCTION planning_update_updated_at();
