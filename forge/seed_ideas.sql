-- Seed 6 ideas authored by forge_team
-- Run in Supabase SQL Editor

DO $$
DECLARE
  team_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  -- Create auth user entry for forge_team (service role bypasses FK)
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data
  )
  VALUES (
    team_id,
    'forge_team@forge.internal',
    '',
    NOW(), NOW(), NOW(),
    '{"username": "forge_team"}'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create profile
  INSERT INTO profiles (id, username, bio, tier, credits_remaining, credits_monthly, lifetime_sessions_used)
  VALUES (
    team_id,
    'forge_team',
    'Ideas worth arguing about.',
    'scholar',
    999,
    999,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  -- 1. Technology + Contradiction
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'The platforms built to connect us made loneliness a growth metric',
    'Social media was designed on a premise of connection, but its engagement models profit most when users feel incompletely satisfied. The infinite scroll, the algorithmic feed, the notification badge — each is optimised not for genuine connection but for return visits driven by low-grade anxiety. We have built the most connected infrastructure in human history and used it to industrialise loneliness.',
    'Technology', 'Contradiction',
    ARRAY['social media', 'loneliness', 'engagement'],
    134, 0, 'published'
  );

  -- 2. Society + Observation
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'Cities are being designed to be photographed, not inhabited',
    'Urban development increasingly prioritises instagrammability over liveability. The signature mural, the coloured staircase, the neon sign in the coffee shop — these are not accidental aesthetics but deliberate audience-capture strategies for an attention economy. When a city optimises for the visitor''s gaze, it slowly becomes uninhabitable for the resident who actually lives there.',
    'Society & Culture', 'Observation',
    ARRAY['urbanism', 'aesthetics', 'tourism'],
    89, 0, 'published'
  );

  -- 3. Philosophy + Question
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'If simulated consciousness is indistinguishable from real consciousness, is the distinction doing any work?',
    'We have no agreed test for consciousness — only behavioural proxies. If a system responds to apparent pain, forms preferences, builds memories, and reports inner experience in ways indistinguishable from a human, what principled grounds remain for denying it moral consideration? The question is not whether machines can think, but whether our concept of real consciousness is philosophically load-bearing at all.',
    'Philosophy & Ethics', 'Question',
    ARRAY['consciousness', 'AI', 'philosophy of mind'],
    112, 0, 'published'
  );

  -- 4. History + Concept
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'Every civilisation that collapsed believed it was the exception',
    'Historical collapse is almost never recognised from the inside until it is irreversible. Roman senators debated administrative reform while the currency was debased and the borders dissolved. The confidence that made a civilisation powerful is the same confidence that prevents it from reading its own decline. Civilisational exceptionalism is not a protection against collapse — it is a precondition for it.',
    'History & Civilisation', 'Concept',
    ARRAY['civilisation', 'collapse', 'history'],
    97, 0, 'published'
  );

  -- 5. Education + Problem
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'Schools teach children to answer questions but never to ask them',
    'The entire architecture of formal education is built around producing correct answers to pre-formed questions. Curricula, assessments, teacher training — all optimised for answer supply. But the most valuable skill in an age of abundant information is question formation: the ability to notice what nobody has thought to ask yet. We are producing a generation trained for a world where the questions are already given.',
    'Education & Learning', 'Problem',
    ARRAY['education', 'critical thinking', 'curriculum'],
    78, 0, 'published'
  );

  -- 6. Society + Prediction
  INSERT INTO ideas (author_id, title, summary, domain, genre, tags, spark_count, comment_count, status)
  VALUES (
    team_id,
    'Within a decade, human-made art will command a premium specifically because of its imperfection',
    'As AI-generated imagery, music, and writing becomes technically indistinguishable from or superior to human output, the market will bifurcate sharply. Algorithmic perfection becomes the commodity baseline. Human imperfection — the slightly wrong note, the awkward brushstroke, the pacing that breaks the rule — becomes the signal of authenticity and therefore the luxury good. Craft will be the new scarcity.',
    'Arts & Creativity', 'Prediction',
    ARRAY['AI art', 'authenticity', 'craft'],
    143, 0, 'published'
  );

END $$;
