import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq, and } from 'drizzle-orm';
import { connect, closeAll, getDb } from '../../db/connection';
import * as schema from '../../db/schema-pg';
import { upsertProgress, getProgress, getLessonItems, getModuleByKey } from '../../db/repositories/learning.repo';

let db: any;
let grammarModuleId: number;
let readingModuleId: number;
let cultureModuleId: number;
let alice: number;
let bob: number;

async function makeUser(email: string): Promise<number> {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing[0]) return Number(existing[0].userId);
  const inserted = await db
    .insert(schema.users)
    .values({ fullname: 'Learning Test', email, passwordHash: 'x' })
    .returning();
  return Number(inserted[0].userId);
}

async function moduleIdByKey(key: string): Promise<number> {
  const rows = await db
    .select()
    .from(schema.learningModules)
    .where(eq(schema.learningModules.moduleKey, key))
    .limit(1);
  return Number(rows[0].moduleId);
}

async function progressRows(userId: number, moduleId: number) {
  return await db
    .select()
    .from(schema.learningProgress)
    .where(
      and(
        eq(schema.learningProgress.userId, userId),
        eq(schema.learningProgress.moduleId, moduleId)
      )
    );
}

before(async () => {
  await connect();
  db = getDb();
  alice = await makeUser('alice.learning.test@sultiai.com');
  bob = await makeUser('bob.learning.test@sultiai.com');
  grammarModuleId = await moduleIdByKey('grammar');
  readingModuleId = await moduleIdByKey('reading');
  cultureModuleId = await moduleIdByKey('culture_notes');

  for (const moduleId of [grammarModuleId, readingModuleId, cultureModuleId]) {
    await db.delete(schema.learningProgress).where(eq(schema.learningProgress.moduleId, moduleId));
  }
});

after(async () => {
  for (const moduleId of [grammarModuleId, readingModuleId, cultureModuleId]) {
    await db.delete(schema.learningProgress).where(eq(schema.learningProgress.moduleId, moduleId));
  }
  for (const email of ['alice.learning.test@sultiai.com', 'bob.learning.test@sultiai.com']) {
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (rows[0]) await db.delete(schema.users).where(eq(schema.users.userId, Number(rows[0].userId)));
  }
  await closeAll();
});

test('one user cannot overwrite another user progress row', async () => {
  await upsertProgress(alice, grammarModuleId, 40);
  await upsertProgress(bob, grammarModuleId, 90);

  const aliceRows = await progressRows(alice, grammarModuleId);
  const bobRows = await progressRows(bob, grammarModuleId);

  assert.equal(aliceRows.length, 1);
  assert.equal(bobRows.length, 1);
  assert.equal(Number(aliceRows[0].completionPercent), 40);
  assert.equal(Number(bobRows[0].completionPercent), 90);
});

test('repeat writes update a single row instead of duplicating', async () => {
  await upsertProgress(alice, readingModuleId, 10);
  await upsertProgress(alice, readingModuleId, 75);
  await upsertProgress(alice, readingModuleId, 100);

  const rows = await progressRows(alice, readingModuleId);
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].completionPercent), 100);
});

test('out-of-range percentages are clamped', async () => {
  await upsertProgress(alice, cultureModuleId, 5000);
  assert.equal(Number((await progressRows(alice, cultureModuleId))[0].completionPercent), 100);

  await upsertProgress(alice, cultureModuleId, -20);
  assert.equal(Number((await progressRows(alice, cultureModuleId))[0].completionPercent), 0);
});

test('progress returns one clamped row per module keyed by moduleId', async () => {
  const rows = await getProgress('alice.learning.test@sultiai.com');
  assert.equal(rows.length, 13);
  for (const row of rows) {
    assert.ok(row.moduleId != null);
    assert.ok(row.moduleKey != null);
    assert.ok(Number(row.completionPercent) >= 0 && Number(row.completionPercent) <= 100);
  }
});

test('seeded modules expose their lesson items', async () => {
  const items = await getLessonItems(grammarModuleId);
  assert.equal(items.length, 4);
  assert.equal(items[0].nativeText, 'Ang + noun');
  assert.equal(items[0].englishText, 'The subject marker');
});

test('modules are resolvable by their stable moduleKey', async () => {
  const module = await getModuleByKey('grammar');
  assert.ok(module, 'grammar module should be seeded');
  assert.equal(Number(module!.moduleId), grammarModuleId);

  const missing = await getModuleByKey('does_not_exist');
  assert.equal(missing, null);
});

test('every content module used by a screen has seeded lesson items', async () => {
  const contentKeys = [
    'scenario_practice',
    'grammar',
    'listening',
    'writing',
    'reading',
    'sulti_switch',
    'culture_notes',
    'review_center',
  ];

  for (const key of contentKeys) {
    const module = await getModuleByKey(key);
    assert.ok(module, `${key} should be seeded`);
    const items = await getLessonItems(Number(module!.moduleId));
    assert.equal(items.length, 4, `${key} should have 4 lesson items`);
    for (const item of items) {
      assert.ok(item.nativeText, `${key} item should have native text`);
      assert.ok(item.englishText, `${key} item should have english text`);
    }
  }
});

test('review_center items drive the quiz questions', async () => {
  const module = await getModuleByKey('review_center');
  const items = await getLessonItems(Number(module!.moduleId));
  const questions = items.filter((i) => i.nativeText && i.englishText);
  assert.equal(questions.length, 4, 'quiz should be built from all review items');
});
