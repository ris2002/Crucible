-- ============================================================
-- FORGE — Seed Data
-- Run AFTER schema.sql
-- Creates 2 seed users and 6 seed ideas
-- ============================================================

-- Note: Seed users must be created via Supabase Auth first.
-- Use the Supabase dashboard → Authentication → Users → Add user
-- Then manually set their profile IDs below.
-- OR: run the app, sign up two accounts, then insert the ideas using their UUIDs.

-- Alternatively, use the service role to insert directly:
-- Replace <USER_ID_1> and <USER_ID_2> with real UUIDs from auth.users

DO $$
DECLARE
  u1 UUID;
  u2 UUID;
BEGIN
  -- Create two seed users in auth (will fail silently if Supabase doesn't allow it via SQL)
  -- In practice: create these via Supabase dashboard or signup flow

  -- Try to find existing seeded profiles
  SELECT id INTO u1 FROM profiles WHERE username = 'seeduser1' LIMIT 1;
  SELECT id INTO u2 FROM profiles WHERE username = 'seeduser2' LIMIT 1;

  IF u1 IS NULL THEN
    u1 := gen_random_uuid();
    INSERT INTO profiles (id, username, bio, tier, credits_remaining, credits_monthly, lifetime_sessions_used)
    VALUES (u1, 'seeduser1', 'Thinking about systems and second-order effects.', 'thinker', 8, 10, 2);
  END IF;

  IF u2 IS NULL THEN
    u2 := gen_random_uuid();
    INSERT INTO profiles (id, username, bio, tier, credits_remaining, credits_monthly, lifetime_sessions_used)
    VALUES (u2, 'seeduser2', 'Philosopher of technology. Pessimist about short-termism.', 'scholar', 20, 25, 5);
  END IF;

  -- Seed Ideas
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status) VALUES

  (u1,
   'Attention is the new scarcity and we have no language to price it',
   'Every economic system assumes that capital, labour, or land is the binding constraint — but in 2025 the genuine bottleneck is human attention. We have built trillion-dollar industries that extract it, yet we treat it as a free good in our accounting. Until attention appears on balance sheets, the companies most skilled at harvesting it will face no structural check on their behaviour.',
   'Technology',
   'Problem',
   ARRAY['attention economy', 'economics', 'digital society'],
   14, 3, 'published'),

  (u2,
   'Universities have inverted their purpose by optimising for prestige over understanding',
   'The original function of a university was to transmit and extend understanding — to teach people how to think about hard problems. Modern universities have replaced this with credential manufacturing: grades, rankings, and employability metrics that measure performance of understanding, not understanding itself. The result is graduates fluent in the language of a subject but unable to work with the underlying ideas.',
   'Education & Learning',
   'Contradiction',
   ARRAY['education', 'credentialism', 'institutions'],
   27, 8, 'published'),

  (u1,
   'Prediction markets fail precisely when the stakes are highest',
   'Prediction markets are accurate in proportion to their liquidity, which is highest for low-stakes, high-frequency events. The events that most need good forecasting — pandemics, geopolitical crises, technological transitions — are exactly the ones where participation thins out, time horizons stretch, and the feedback loops that calibrate forecasters dissolve. We are building forecasting infrastructure optimised for the wrong problems.',
   'Philosophy & Ethics',
   'Contradiction',
   ARRAY['prediction markets', 'forecasting', 'epistemics'],
   19, 5, 'published'),

  (u2,
   'The internet replaced gatekeepers with algorithms and we lost something important',
   'Print and broadcast media had editors whose job was to ask: does this deserve to exist? Algorithms replaced that question with: will this generate engagement? These are not equivalent. The editor was accountable — their name was on the masthead. The algorithm is optimising for a metric set by engineers who are not reading the output. We traded human judgement, which was fallible, for machine optimisation, which is reliable but aligned to the wrong objective.',
   'Society & Culture',
   'Challenge',
   ARRAY['media', 'algorithms', 'gatekeeping'],
   31, 11, 'published'),

  (u1,
   'Most software complexity is not technical debt but political debt',
   'Technical debt is the conventional explanation for why software becomes unmaintainable over time. But the deeper cause in most organisations is political: teams build redundant systems to maintain autonomy, rewrites are funded to justify headcount, and interfaces proliferate because nobody has the authority to delete. The codebase is a map of the org chart. Refactoring the code without refactoring the organisation produces temporary relief.',
   'Technology',
   'Observation',
   ARRAY['software', 'organisations', 'complexity'],
   22, 6, 'published'),

  (u2,
   'Sleep deprivation in leadership is a structural problem disguised as individual failing',
   'We treat executive sleep deprivation as a personal lifestyle choice — the heroic founder who sleeps four hours. But decisions made by sleep-deprived leaders cause measurable harm to the organisations, people, and markets they affect. It is a public health problem with externalities. A CEO making acquisitions at 2am after 18-hour days is not exercising personal freedom — they are making consequential choices with impaired cognition on behalf of others.',
   'Health & Mind',
   'Problem',
   ARRAY['sleep', 'leadership', 'cognitive performance'],
   16, 4, 'published');

END $$;
