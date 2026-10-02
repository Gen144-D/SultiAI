/**
 * The real product, transcribed from the Expo app in `src/`.
 *
 * This file exists so the marketing site cannot drift away from what the app
 * actually does. When a screen, module or phrase changes in the app, change it
 * here too — every page reads from this module rather than restating facts.
 *
 * Sources:
 *   src/navigation/AppNavigator.js        -> tabs
 *   src/screens/learning/ModuleScreens.js -> learning modules
 *   src/data/pronunciationPhrases.js      -> dialects + phrases
 *   src/services/ai/                      -> pronunciation scoring
 */

/** Bottom tabs, in the order AppNavigator registers them. */
export const TABS = [
  {
    name: 'Home',
    label: 'Home',
    href: '/features',
    blurb: 'Daily goal, streak and XP at a glance',
  },
  {
    name: 'Learn',
    label: 'Learn',
    href: '/features',
    blurb: 'Eight guided modules, from grammar to roleplay',
  },
  {
    name: 'SULTI',
    label: 'SULTI',
    href: '/how-it-works',
    blurb: 'The AI tutor you talk to out loud',
  },
  {
    name: 'Community',
    label: 'Community',
    href: '/features',
    blurb: 'Share phrases and get verified by native speakers',
  },
  {
    name: 'Profile',
    label: 'Profile',
    href: '/features',
    blurb: 'Progress, achievements and badges',
  },
] as const;

/** The eight learning modules, verbatim from ModuleScreens.js. */
export const MODULES = [
  {
    key: 'scenario_practice',
    title: 'Scenario Practice',
    subtitle: 'Roleplay real-life conversations',
    icon: 'chatbubbles',
    description:
      'Step into realistic Bisaya conversations. Practice bargaining, riding, ordering, and more with SULTI.',
    cta: 'Start Roleplay',
  },
  {
    key: 'grammar',
    title: 'Grammar',
    subtitle: 'Cebuano sentence structure',
    icon: 'school',
    description:
      'Learn the core building blocks of Cebuano grammar: particles, verb focus, and word order.',
    cta: 'Practice Grammar',
  },
  {
    key: 'listening',
    title: 'Listening',
    subtitle: 'Train your ear for Bisaya',
    icon: 'ear',
    description:
      'Hear everyday Bisaya phrases at natural speed. Play them back and repeat out loud.',
    cta: 'Start Listening',
  },
  {
    key: 'writing',
    title: 'Writing',
    subtitle: 'Compose in Cebuano',
    icon: 'create',
    description:
      'Build writing confidence with guided prompts. SULTI checks your sentences and offers corrections.',
    cta: 'Writing Coach',
  },
  {
    key: 'reading',
    title: 'Reading',
    subtitle: 'Read & understand Bisaya',
    icon: 'book',
    description: 'Read short Bisaya passages with full English translations and key vocabulary.',
    cta: 'Reading Session',
  },
  {
    key: 'sulti_switch',
    title: 'Sulti Switch',
    subtitle: 'Bilingual thinking mode',
    icon: 'swap-horizontal',
    description: 'Toggle between Bisaya and English to train instant translation recall.',
    cta: 'Switch Mode',
  },
  {
    key: 'culture_notes',
    title: 'Culture Notes',
    subtitle: 'Understand Cebuano life',
    icon: 'compass',
    description: 'Cultural context behind the language — from festivals to everyday etiquette.',
    cta: 'Ask About Culture',
  },
  {
    key: 'review_center',
    title: 'Review Center',
    subtitle: 'Reinforce what you learned',
    icon: 'refresh',
    description:
      'Quick quizzes that turn learned phrases into lasting memory. Earn XP for every correct recall.',
    cta: 'Review Session',
  },
] as const;

export interface Dialect {
  id: string;
  name: string;
  tagline: string;
  language: string;
  phrases: { bisaya: string; english: string; pronunciation: string }[];
}

/** Dialects and phrases, verbatim from src/data/pronunciationPhrases.js. */
export const DIALECTS: Dialect[] = [
  {
    id: 'cebuano',
    name: 'Cebuano',
    tagline: 'Bisaya · Central Visayas',
    language: 'ceb',
    phrases: [
      { bisaya: 'Maayong buntag', english: 'Good morning', pronunciation: 'ma-YA-yong bun-TAG' },
      { bisaya: 'Kumusta ka?', english: 'How are you?', pronunciation: 'koo-MOOS-ta ka' },
      {
        bisaya: 'Salamat kaayo',
        english: 'Thank you very much',
        pronunciation: 'sa-LA-mat ka-A-yo',
      },
      { bisaya: 'Palihug', english: 'Please', pronunciation: 'pa-LEE-hoog' },
      {
        bisaya: 'Asa ang ospital?',
        english: 'Where is the hospital?',
        pronunciation: 'A-sa ang os-pee-TAL',
      },
      {
        bisaya: 'Unsa imong pangalan?',
        english: 'What is your name?',
        pronunciation: 'OON-sa EE-mong pa-NGA-lan',
      },
      { bisaya: 'Ganahan ko ani', english: 'I like this', pronunciation: 'ga-NA-han ko A-ni' },
      {
        bisaya: 'Pila ang presyo?',
        english: 'How much is the price?',
        pronunciation: 'PEE-la ang PRES-yo',
      },
    ],
  },
  {
    id: 'hiligaynon',
    name: 'Hiligaynon',
    tagline: 'Ilonggo · Western Visayas',
    language: 'hil',
    phrases: [
      { bisaya: 'Maayo nga aga', english: 'Good morning', pronunciation: 'ma-A-yo nga A-ga' },
      { bisaya: 'Kumusta ka?', english: 'How are you?', pronunciation: 'koo-MOOS-ta ka' },
      { bisaya: 'Salamat gid', english: 'Thank you very much', pronunciation: 'sa-LA-mat geed' },
      { bisaya: 'Palihog', english: 'Please', pronunciation: 'pa-LEE-hog' },
      {
        bisaya: 'Diin ang ospital?',
        english: 'Where is the hospital?',
        pronunciation: 'dee-IN ang os-pee-TAL',
      },
      {
        bisaya: 'Ano imo pangalan?',
        english: 'What is your name?',
        pronunciation: 'A-no EE-mo pa-NGA-lan',
      },
      { bisaya: 'Gusto ko sini', english: 'I like this', pronunciation: 'GOOS-to ko SEE-nee' },
      {
        bisaya: 'Pila ang presyo?',
        english: 'How much is the price?',
        pronunciation: 'PEE-la ang PRES-yo',
      },
    ],
  },
  {
    id: 'waray',
    name: 'Waray',
    tagline: 'Waray-Waray · Eastern Visayas',
    language: 'war',
    phrases: [
      { bisaya: 'Maupay nga aga', english: 'Good morning', pronunciation: 'ma-OO-pay nga A-ga' },
      { bisaya: 'Kumusta ka?', english: 'How are you?', pronunciation: 'koo-MOOS-ta ka' },
      {
        bisaya: 'Salamat hin duro',
        english: 'Thank you very much',
        pronunciation: 'sa-LA-mat hin DOO-ro',
      },
      { bisaya: 'Palihog', english: 'Please', pronunciation: 'pa-LEE-hog' },
      {
        bisaya: 'Hain an ospital?',
        english: 'Where is the hospital?',
        pronunciation: 'ha-EEN an os-pee-TAL',
      },
      {
        bisaya: 'Ano imo ngaran?',
        english: 'What is your name?',
        pronunciation: 'A-no EE-mo NGA-ran',
      },
      { bisaya: 'Karuyag ko ini', english: 'I like this', pronunciation: 'ka-ROO-yag ko EE-nee' },
      { bisaya: 'Tagpila iton?', english: 'How much is that?', pronunciation: 'tag-PEE-la EE-ton' },
    ],
  },
];

/**
 * How pronunciation scoring actually works, from
 * server/src/services/ai/pronunciationService.ts. Kept accurate because it is
 * the product's most technical claim.
 */
export const PRONUNCIATION_SIGNALS = [
  {
    label: 'MFCC',
    detail: 'Mel-frequency cepstral coefficients for spectral envelope matching',
  },
  { label: 'Pitch', detail: 'F0 tracking against the expected intonation contour' },
  { label: 'Formants', detail: 'F1/F2/F3 vowel identification' },
] as const;

export const DIFFERENTIATORS = [
  {
    icon: 'mic',
    title: 'Real acoustic scoring',
    body: 'Recordings are analysed with MFCC, pitch and formant features — the score reflects what you actually said, not just the target text.',
  },
  {
    icon: 'globe',
    title: 'Three dialects, not one',
    body: 'Cebuano, Hiligaynon and Waray each with their own G2P inventory, so stress and particles are not read with the wrong rules.',
  },
  {
    icon: 'people',
    title: 'Native-speaker verification',
    body: 'Community members verify words and phrases, so the Living Lexicon grows from people who actually speak the language.',
  },
] as const;
