-- Learning path integration: stable module keys, ordered modules, lesson content,
-- and per-user progress integrity.

-- ============================================
-- 1. Module identity and ordering
-- ============================================
ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS module_key TEXT;
ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill keys for any modules that predate this change, from a slugified title.
UPDATE public.learning_modules
SET module_key = lower(regexp_replace(trim(module_title), '[^a-zA-Z0-9]+', '_', 'g'))
WHERE module_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_modules_key
  ON public.learning_modules (module_key)
  WHERE module_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_modules_sort_order
  ON public.learning_modules (sort_order, module_id);

-- ============================================
-- 2. Lesson content
-- ============================================
CREATE TABLE IF NOT EXISTS public.lesson_items (
  item_id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES public.learning_modules(module_id) ON DELETE CASCADE,
  section_title TEXT,
  native_text TEXT NOT NULL,
  english_text TEXT,
  note TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_items
  ADD COLUMN IF NOT EXISTS section_title TEXT;

CREATE INDEX IF NOT EXISTS idx_lesson_items_module
  ON public.lesson_items (module_id, sort_order);

ALTER TABLE public.lesson_items ENABLE ROW LEVEL SECURITY;

-- Lesson content is course material: readable by any signed-in user, writable by admins.
DROP POLICY IF EXISTS "Anyone can view lesson items" ON public.lesson_items;
CREATE POLICY "Anyone can view lesson items" ON public.lesson_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage lesson items" ON public.lesson_items;
CREATE POLICY "Admins can manage lesson items" ON public.lesson_items
  FOR ALL USING (is_admin());

-- ============================================
-- 3. Progress integrity
-- ============================================
ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- One row per user per module. Keep the furthest-progressed row when collapsing dupes.
DELETE FROM public.learning_progress lp
USING public.learning_progress dup
WHERE dup.user_id = lp.user_id
  AND dup.module_id = lp.module_id
  AND dup.progress_id < lp.progress_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_progress_user_module
  ON public.learning_progress (user_id, module_id);

-- Reject percentages outside 0-100.
ALTER TABLE public.learning_progress
  DROP CONSTRAINT IF EXISTS learning_progress_completion_percent_range;
ALTER TABLE public.learning_progress
  ADD CONSTRAINT learning_progress_completion_percent_range
  CHECK (completion_percent IS NULL OR (completion_percent >= 0 AND completion_percent <= 100));

UPDATE public.learning_progress
SET completion_percent = 0
WHERE completion_percent IS NULL OR completion_percent < 0;

UPDATE public.learning_progress
SET completion_percent = 100
WHERE completion_percent > 100;

-- ============================================
-- 4. Seed the learning path
-- ============================================
INSERT INTO public.learning_modules (module_title, module_key, sort_order, difficulty, language)
VALUES
  ('Voice Practice',        'voice_practice',       0,  'beginner', 'Bisaya'),
  ('Scenario Practice',     'scenario_practice',    1,  'beginner', 'Bisaya'),
  ('Phrasebook',            'phrasebook',           2,  'beginner', 'Bisaya'),
  ('Flashcards',            'flashcards',           3,  'beginner', 'Bisaya'),
  ('Pronunciation Lab',     'pronunciation_lab',    4,  'beginner', 'Bisaya'),
  ('Grammar',               'grammar',              5,  'beginner', 'Bisaya'),
  ('Vocabulary Notebook',   'vocabulary_notebook',  6,  'beginner', 'Bisaya'),
  ('Listening',             'listening',            7,  'beginner', 'Bisaya'),
  ('Writing',               'writing',              8,  'beginner', 'Bisaya'),
  ('Reading',               'reading',              9,  'beginner', 'Bisaya'),
  ('Sulti Switch',          'sulti_switch',         10, 'beginner', 'Bisaya'),
  ('Culture Notes',         'culture_notes',        11, 'beginner', 'Bisaya'),
  ('Review Center',         'review_center',        12, 'beginner', 'Bisaya')
ON CONFLICT DO NOTHING;

-- Seed lesson content, keyed by module_key so re-running is safe.
INSERT INTO public.lesson_items (module_id, section_title, native_text, english_text, note, sort_order)
SELECT m.module_id, seed.section_title, seed.native_text, seed.english_text, seed.note, seed.sort_order
FROM (
  VALUES
    ('scenario_practice', 'Scenarios',        'Palengke',        'At the Market',        'Bargaining & buying food', 0),
    ('scenario_practice', 'Scenarios',        'Jeepney',         'Riding a Jeepney',     'Routes & paying the driver', 1),
    ('scenario_practice', 'Scenarios',        'Karenderia',      'Eating Out',           'Ordering at a carenderia', 2),
    ('scenario_practice', 'Scenarios',        'Ospital',         'At the Hospital',      'Emergency & checkup phrases', 3),
    ('grammar',           'Core Rules',       'Ang + noun',      'The subject marker',   'Ang akong amigo = my friend', 0),
    ('grammar',           'Core Rules',       'Si + name',       'Proper noun marker',   'Si Maria muadto = Maria will go', 1),
    ('grammar',           'Core Rules',       'nag-/ni-',        'Verb focus prefixes',  'nagluto = cooking', 2),
    ('grammar',           'Core Rules',       'Palihog',         'Please (softener)',    'Palihog ug hatag = please give', 3),
    ('listening',         'Daily Expressions','Kumusta ka?',     'How are you?',         'Casual greeting', 0),
    ('listening',         'Daily Expressions','Asa ka paingon?', 'Where are you going?', 'Small talk', 1),
    ('listening',         'Daily Expressions','Moadto ko sa merkado', 'I am going to the market', 'Future tense', 2),
    ('listening',         'Daily Expressions','Nindot ang panahon karon', 'The weather is nice today', 'Weather small talk', 3),
    ('writing',           'Vocabulary Bank',  'matulog',         'to sleep',             'verb', 0),
    ('writing',           'Vocabulary Bank',  'mumata',          'to wake up',           'verb', 1),
    ('writing',           'Vocabulary Bank',  'pamahaw',         'breakfast',            'noun', 2),
    ('writing',           'Vocabulary Bank',  'trabaho',         'work',                 'noun', 3),
    ('reading',           'Today''s Passage', 'Ako si Juan.',    'I am Juan.',           'Introduction', 0),
    ('reading',           'Today''s Passage', 'Taga-Cebu ko.',   'I am from Cebu.',      'Origin', 1),
    ('reading',           'Today''s Passage', 'Nagtuon ko og Bisaya.', 'I am studying Bisaya.', 'Study', 2),
    ('reading',           'Today''s Passage', 'Gusto ko makakat-on og dugang.', 'I want to learn more.', 'Desire', 3),
    ('sulti_switch',      'Practice Pairs',   'Unsa ni?',        'What is this?',        'Question', 0),
    ('sulti_switch',      'Practice Pairs',   'Gusto ko ani.',   'I want this.',         'Preference', 1),
    ('sulti_switch',      'Practice Pairs',   'Pila ni?',        'How much is this?',    'Shopping', 2),
    ('sulti_switch',      'Practice Pairs',   'Asa ang banyo?',  'Where is the bathroom?', 'Directions', 3),
    ('culture_notes',     'Did You Know?',    'Sinulog Festival', 'Cebu''s grandest celebration', 'Every January in Cebu City', 0),
    ('culture_notes',     'Did You Know?',    'Bahala Na',       'Come what may',        'A famous Filipino mindset', 1),
    ('culture_notes',     'Did You Know?',    'Po & Opo',        'Respect markers',      'Shown to elders and authority', 2),
    ('culture_notes',     'Did You Know?',    'Kamayan',         'Eating with hands',    'Common in casual meals', 3),
    ('review_center',     'Key Phrases',      'Salamat',         'Thank you',            'Essential', 0),
    ('review_center',     'Key Phrases',      'Palihog',         'Please',               'Essential', 1),
    ('review_center',     'Key Phrases',      'Kumusta ka?',     'How are you?',         'Essential', 2),
    ('review_center',     'Key Phrases',      'Gihigugma ko ikaw', 'I love you',          'Essential', 3)
) AS seed(module_key, section_title, native_text, english_text, note, sort_order)
JOIN public.learning_modules m ON m.module_key = seed.module_key
WHERE NOT EXISTS (
  SELECT 1 FROM public.lesson_items li
  WHERE li.module_id = m.module_id AND li.native_text = seed.native_text
);
