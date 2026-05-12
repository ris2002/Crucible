-- ============================================================
-- FORGE — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  bio TEXT CHECK (char_length(bio) <= 160),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','thinker','scholar','admin')),
  credits_remaining INTEGER DEFAULT 3,
  credits_monthly INTEGER DEFAULT 3,
  lifetime_sessions_used INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  domain TEXT NOT NULL,
  genre TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  spark_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  build_count INTEGER DEFAULT 0,
  built_on_idea_id UUID REFERENCES ideas(id),
  status TEXT DEFAULT 'published' CHECK (status IN ('published','draft')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forge Sessions
CREATE TABLE IF NOT EXISTS forge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  genre TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  turns_used INTEGER DEFAULT 0,
  max_turns_extended INTEGER,
  built_on_idea_id UUID REFERENCES ideas(id),
  draft_title TEXT,
  draft_summary TEXT,
  draft_tags TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','draft','posted','abandoned')),
  idea_id UUID REFERENCES ideas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id),
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  word_count INTEGER NOT NULL,
  spark_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sparks (unified: idea sparks and comment sparks)
CREATE TABLE IF NOT EXISTS sparks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, idea_id),
  UNIQUE(user_id, comment_id),
  CHECK (
    (idea_id IS NOT NULL AND comment_id IS NULL) OR
    (idea_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (for abusive comments)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Helper functions for atomic counters
-- ============================================================

CREATE OR REPLACE FUNCTION increment_spark_count(idea_id_param UUID)
RETURNS void AS $$
  UPDATE ideas SET spark_count = spark_count + 1 WHERE id = idea_id_param;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrement_spark_count(idea_id_param UUID)
RETURNS void AS $$
  UPDATE ideas SET spark_count = GREATEST(0, spark_count - 1) WHERE id = idea_id_param;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION increment_comment_count(idea_id_param UUID)
RETURNS void AS $$
  UPDATE ideas SET comment_count = comment_count + 1 WHERE id = idea_id_param;
$$ LANGUAGE SQL;

-- ============================================================
-- Auto-create profile on signup (fallback trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, tier, credits_remaining, credits_monthly, lifetime_sessions_used)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'free',
    3,
    3,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sparks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can update their own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ideas: published ideas are public, authors manage their own
CREATE POLICY "ideas_read_published" ON ideas FOR SELECT USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY "ideas_insert_auth" ON ideas FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ideas_update_own" ON ideas FOR UPDATE USING (auth.uid() = author_id);

-- Forge sessions: users only see their own
CREATE POLICY "sessions_own" ON forge_sessions FOR ALL USING (auth.uid() = user_id);

-- Sparks: anyone can read, auth users manage their own
CREATE POLICY "sparks_read_all" ON sparks FOR SELECT USING (true);
CREATE POLICY "sparks_insert_own" ON sparks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sparks_delete_own" ON sparks FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, auth users insert their own
CREATE POLICY "comments_read_all" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Follows: anyone can read
CREATE POLICY "follows_read_all" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_own" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Notifications: users only see their own
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Credit transactions: users see their own
CREATE POLICY "transactions_own" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Reports: auth users can insert
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
