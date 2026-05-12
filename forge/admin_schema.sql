-- ============================================================
-- FORGE Admin Schema
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Profile flags
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS soft_deleted BOOLEAN DEFAULT false;

-- Token tracking on forge sessions
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS ai_redirect_triggered BOOLEAN DEFAULT false;

-- Flagged content
CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  reason_detail TEXT,
  triggered_by TEXT NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin action log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only service role (backend) can access these
ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flagged_service_only" ON flagged_content FOR ALL USING (false);
CREATE POLICY "admin_actions_service_only" ON admin_actions FOR ALL USING (false);

