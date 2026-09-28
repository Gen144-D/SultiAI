export type LessonItemSeed = {
  native: string;
  english: string;
  note?: string;
};

export type LearningModuleSeed = {
  key: string;
  title: string;
  difficulty: string;
  sections?: { title: string; items: LessonItemSeed[] }[];
};

export const LEARNING_MODULES: LearningModuleSeed[] = [
  {
    key: 'voice_practice',
    title: 'Voice Practice',
    difficulty: 'beginner',
  },
  {
    key: 'scenario_practice',
    title: 'Scenario Practice',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Scenarios',
        items: [
          { native: 'Palengke', english: 'At the Market', note: 'Bargaining & buying food' },
          { native: 'Jeepney', english: 'Riding a Jeepney', note: 'Routes & paying the driver' },
          { native: 'Karenderia', english: 'Eating Out', note: 'Ordering at a carenderia' },
          { native: 'Ospital', english: 'At the Hospital', note: 'Emergency & checkup phrases' },
        ],
      },
    ],
  },
  {
    key: 'phrasebook',
    title: 'Phrasebook',
    difficulty: 'beginner',
  },
  {
    key: 'flashcards',
    title: 'Flashcards',
    difficulty: 'beginner',
  },
  {
    key: 'pronunciation_lab',
    title: 'Pronunciation Lab',
    difficulty: 'beginner',
  },
  {
    key: 'grammar',
    title: 'Grammar',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Core Rules',
        items: [
          { native: 'Ang + noun', english: 'The subject marker', note: 'Ang akong amigo = my friend' },
          { native: 'Si + name', english: 'Proper noun marker', note: 'Si Maria muadto = Maria will go' },
          { native: 'nag-/ni-', english: 'Verb focus prefixes', note: 'nagluto = cooking' },
          { native: 'Palihog', english: 'Please (softener)', note: 'Palihog ug hatag = please give' },
        ],
      },
    ],
  },
  {
    key: 'vocabulary_notebook',
    title: 'Vocabulary Notebook',
    difficulty: 'beginner',
  },
  {
    key: 'listening',
    title: 'Listening',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Daily Expressions',
        items: [
          { native: 'Kumusta ka?', english: 'How are you?', note: 'Casual greeting' },
          { native: 'Asa ka paingon?', english: 'Where are you going?', note: 'Small talk' },
          { native: 'Moadto ko sa merkado', english: 'I am going to the market', note: 'Future tense' },
          { native: 'Nindot ang panahon karon', english: 'The weather is nice today', note: 'Weather small talk' },
        ],
      },
    ],
  },
  {
    key: 'writing',
    title: 'Writing',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Vocabulary Bank',
        items: [
          { native: 'matulog', english: 'to sleep', note: 'verb' },
          { native: 'mumata', english: 'to wake up', note: 'verb' },
          { native: 'pamahaw', english: 'breakfast', note: 'noun' },
          { native: 'trabaho', english: 'work', note: 'noun' },
        ],
      },
    ],
  },
  {
    key: 'reading',
    title: 'Reading',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Today\u2019s Passage',
        items: [
          { native: 'Ako si Juan.', english: 'I am Juan.', note: 'Introduction' },
          { native: 'Taga-Cebu ko.', english: 'I am from Cebu.', note: 'Origin' },
          { native: 'Nagtuon ko og Bisaya.', english: 'I am studying Bisaya.', note: 'Study' },
          { native: 'Gusto ko makakat-on og dugang.', english: 'I want to learn more.', note: 'Desire' },
        ],
      },
    ],
  },
  {
    key: 'sulti_switch',
    title: 'Sulti Switch',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Practice Pairs',
        items: [
          { native: 'Unsa ni?', english: 'What is this?', note: 'Question' },
          { native: 'Gusto ko ani.', english: 'I want this.', note: 'Preference' },
          { native: 'Pila ni?', english: 'How much is this?', note: 'Shopping' },
          { native: 'Asa ang banyo?', english: 'Where is the bathroom?', note: 'Directions' },
        ],
      },
    ],
  },
  {
    key: 'culture_notes',
    title: 'Culture Notes',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Did You Know?',
        items: [
          { native: 'Sinulog Festival', english: 'Cebu\u2019s grandest celebration', note: 'Every January in Cebu City' },
          { native: 'Bahala Na', english: 'Come what may', note: 'A famous Filipino mindset' },
          { native: 'Po & Opo', english: 'Respect markers', note: 'Shown to elders and authority' },
          { native: 'Kamayan', english: 'Eating with hands', note: 'Common in casual meals' },
        ],
      },
    ],
  },
  {
    key: 'review_center',
    title: 'Review Center',
    difficulty: 'beginner',
    sections: [
      {
        title: 'Key Phrases',
        items: [
          { native: 'Salamat', english: 'Thank you', note: 'Essential' },
          { native: 'Palihog', english: 'Please', note: 'Essential' },
          { native: 'Kumusta ka?', english: 'How are you?', note: 'Essential' },
          { native: 'Gihigugma ko ikaw', english: 'I love you', note: 'Essential' },
        ],
      },
    ],
  },
];
