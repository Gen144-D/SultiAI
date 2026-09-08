import type {
  AdminUser,
  CommunityPost,
  CommunityReport,
  FeedbackItem,
  LessonModule,
  PreservedWord,
  UserDetail,
} from '@/types';

const firstNames = [
  'Genesis',
  'Maria',
  'Jose',
  'Angel',
  'Rhea',
  'Paolo',
  'Alyssa',
  'Miguel',
  'Nica',
  'Carlo',
  'Diana',
  'Rafael',
  'Bea',
  'Adrian',
  'Camille',
  'Joshua',
  'Patricia',
  'Emman',
  'Katrina',
  'Ralph',
  'Sofia',
  'Luis',
  'Charmaine',
  'Mark',
  'Elaine',
  'Nico',
  'Andrea',
  'Jethro',
  'Kristine',
  'Gab',
  'Danica',
  'Renzo',
  'Sarah',
  'Bryan',
  'Liza',
  'Von',
  'Trisha',
  'Omar',
  'Wendy',
  'Xavier',
];

const lastNames = [
  'Diaz',
  'Ramos',
  'Santos',
  'Villanueva',
  'Garcia',
  'Mendoza',
  'Bautista',
  'Aquino',
  'Cruz',
  'Dela Cruz',
  'Fernandez',
  'Gonzales',
  'Lim',
  'Navarro',
  'Perez',
  'Reyes',
  'Tan',
  'Uy',
  'Valdez',
  'Yap',
  'Alvarez',
  'Bonifacio',
  'Castillo',
  'Domingo',
  'Espino',
  'Flores',
  'Hernandez',
  'Ibarra',
  'Javier',
  'Lopez',
  'Marquez',
  'Nolasco',
  'Ortega',
  'Quizon',
  'Romero',
  'Salazar',
  'Torres',
  'Ulan',
  'Vega',
  'Zamora',
];

const badges = [
  'First Steps',
  'Streak Master',
  'Voice Virtuoso',
  'Culture Keeper',
  'Community Hero',
  'Polyglot',
];

const weakAreas = ['Word order', 'Verb focus', 'Ligatures', 'Politeness markers', 'Numbers'];

const nativeLanguages = [
  'English',
  'Tagalog',
  'Japanese',
  'Korean',
  'Chinese',
  'Spanish',
  'French',
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fullName(i: number) {
  return `${firstNames[i % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`;
}

function emailFor(name: string, i: number) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}${i % 3 === 0 ? '' : i}@gmail.com`;
}

function iso(daysAgo: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, randomInt(0, 59), 0, 0);
  return d.toISOString();
}

/** Calculate XP-based level (1-15) matching the server logic */
function xpToLevel(xp: number): number {
  if (xp >= 5000) return 15;
  if (xp >= 3500) return 12;
  if (xp >= 2500) return 10;
  if (xp >= 1800) return 8;
  if (xp >= 1200) return 6;
  if (xp >= 700) return 5;
  if (xp >= 400) return 4;
  if (xp >= 200) return 3;
  if (xp >= 80) return 2;
  return 1;
}

/** Realistic XP distribution for language learners */
function realisticXp(): number {
  const roll = Math.random();
  if (roll < 0.35) return randomInt(0, 150); // 35% beginners
  if (roll < 0.55) return randomInt(150, 500); // 20% casual
  if (roll < 0.75) return randomInt(500, 1200); // 20% regular
  if (roll < 0.9) return randomInt(1200, 2500); // 15% dedicated
  return randomInt(2500, 4650); // 10% hardcore
}

export const seedUsers: AdminUser[] = Array.from({ length: 48 }, (_, i) => {
  const name = fullName(i);
  const role = i < 2 ? 'admin' : i < 6 ? 'moderator' : 'user';
  const status = i % 17 === 0 ? 'banned' : i % 13 === 0 ? 'suspended' : 'active';
  const xp = realisticXp();
  return {
    id: i + 1,
    name,
    email: emailFor(name, i),
    role,
    status,
    level: xpToLevel(xp),
    xp,
    streak: randomInt(0, 38),
    lessons: randomInt(2, 180),
    verified: i % 4 === 0,
    nativeSpeaker: i % 7 === 0,
    joinedAt: iso(randomInt(10, 340)),
    lastActive: iso(randomInt(0, 6), randomInt(6, 22)),
    country: i % 5 === 0 ? 'Philippines' : i % 3 === 0 ? 'USA' : 'Philippines',
  };
});

export const userDetails = new Map<number, UserDetail>(
  seedUsers.map((u) => [
    u.id,
    {
      ...u,
      badges: Array.from({ length: randomInt(1, 4) }, () => pick(badges)),
      weakAreas: Array.from({ length: randomInt(1, 3) }, () => pick(weakAreas)),
      favoriteCategory: pick(['Everyday', 'Food', 'Travel', 'Family', 'Work']),
      totalCoins: randomInt(50, 5000),
      dailyGoal: pick([25, 50, 75, 100]),
      feedbackCount: randomInt(0, 6),
    },
  ])
);

export const seedLessons: LessonModule[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  title: pick([
    'Greetings & Introductions',
    'Everyday Phrases',
    'Numbers & Time',
    'At the Market',
    'Family & Relationships',
    'Food & Dining',
    'Travel & Directions',
    'Weather & Seasons',
    'Shopping & Money',
    'Health & Body',
    'Work & School',
    'Festivals & Celebrations',
    'Feelings & Emotions',
    'Giving Directions',
  ]),
  difficulty: (i % 3 === 0
    ? 'beginner'
    : i % 3 === 1
      ? 'intermediate'
      : 'advanced') as LessonModule['difficulty'],
  language: 'Bisaya (Cebuano)',
  lessons: randomInt(6, 24),
  completions: randomInt(200, 14800),
  avgCompletionPercent: randomInt(42, 96),
  published: i !== 13,
  updatedAt: iso(randomInt(1, 90)),
}));

export const seedPosts: CommunityPost[] = Array.from({ length: 26 }, (_, i) => {
  const author = seedUsers[i % seedUsers.length];
  return {
    id: i + 1,
    author: { id: author.id, name: author.name },
    title: pick([
      'Unsa ang ' +
        pick(['kapalaran', 'halad', 'gisaligan', 'hinumduman', 'tugyanan', 'pangandoy']),
      'How do you say this at a ' + pick(['market', 'bank', 'hospital', 'barangay hall', 'church']),
      'My first week learning Bisaya!',
      'Practice partner anyone?',
      'Daily phrase challenge day ' + randomInt(3, 60),
      'What does ' + pick(['amoma', 'hiwaga', 'damgo', 'kalipay', 'paglaum']) + ' mean?',
      'Share your favorite Bisaya proverb',
      'Help me improve my accent',
      'Bisrock recommendations',
      'Cultural question: ' + pick(['Simbang Gabi', 'Kadayawan', 'Sinulog', 'Pintados', 'Pahiyas']),
    ]),
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Bisaya learners helping each other one phrase at a time. Maayong adlaw ninyo!',
    category: pick(['Practice', 'Questions', 'Culture', 'Daily Challenge', 'Announcements']),
    likes: randomInt(0, 240),
    comments: randomInt(0, 48),
    reports: i % 9 === 0 ? randomInt(1, 4) : 0,
    featured: i % 8 === 0,
    hidden: false,
    createdAt: iso(randomInt(0, 40)),
  };
});

export const seedReports: CommunityReport[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  postId: seedPosts[i % seedPosts.length].id,
  reportedBy: {
    id: seedUsers[(i * 3) % seedUsers.length].id,
    name: seedUsers[(i * 3) % seedUsers.length].name,
  },
  reason: pick([
    'Spam',
    'Inappropriate content',
    'Offensive language',
    'Misinformation',
    'Harassment',
  ]),
  status: (i % 4 === 0
    ? 'resolved'
    : i % 3 === 0
      ? 'dismissed'
      : 'open') as CommunityReport['status'],
  createdAt: iso(randomInt(0, 14)),
}));

export const seedFeedback: FeedbackItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  user: { id: seedUsers[i % seedUsers.length].id, name: seedUsers[i % seedUsers.length].name },
  functionality: randomInt(1, 5),
  usability: randomInt(1, 5),
  reliability: randomInt(1, 5),
  comment: i % 2 === 0 ? 'Ang app kay nindot kaayo! More cultural content please.' : undefined,
  resolved: i % 3 === 0,
  createdAt: iso(randomInt(0, 20)),
}));

export const seedPreserved: PreservedWord[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  word: pick([
    'amoma',
    'kinaraan',
    'hiwaga',
    'damgo',
    'halad',
    'gisaligan',
    'tugyanan',
    'pangandoy',
    'kalipay',
    'paglaum',
    'inipit',
    'padayon',
  ]),
  dialect: pick(['Cebuano', 'Boholano', 'Surigaonon', 'Davaoeño']),
  meaning: 'A cherished Bisaya word passed down through generations.',
  submittedBy: {
    id: seedUsers[(i * 5) % seedUsers.length].id,
    name: seedUsers[(i * 5) % seedUsers.length].name,
  },
  status: (i % 3 === 0
    ? 'pending'
    : i % 4 === 0
      ? 'rejected'
      : 'approved') as PreservedWord['status'],
  variations: Array.from(
    { length: randomInt(1, 3) },
    (_, v) => `${pick(['Ceb.', 'Boh.', 'Sur.'])} alt ${v + 1}`
  ),
  createdAt: iso(randomInt(0, 30)),
}));

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
