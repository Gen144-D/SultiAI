import { connect, getDb } from '../src/db/connection';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema-sqlite';
import { getModules, getProgress } from '../src/db/repositories/learning.repo';
import { recommendationEngine } from '../src/services/adaptive';

(async () => {
  await connect();

  const modules = await getModules();
  console.log('MODULES:', modules.length);
  console.log(modules.map((m: any) => `${m.sortOrder}:${m.moduleKey}(${m.moduleId})`).join(' '));

  const db = getDb();

  const users = await (db as any)
    .select({ id: schema.users.userId, email: schema.users.email, name: schema.users.fullname })
    .from(schema.users)
    .limit(5);
  console.log('USERS:', JSON.stringify(users));

  for (const u of users) {
    const progress = await getProgress(u.email);
    const started = progress.filter((p: any) => Number(p.completionPercent) > 0).length;
    console.log(`\n--- user ${u.email} (id=${u.id}) progress rows=${progress.length} started=${started}`);

    const profile = await (db as any)
      .select()
      .from(schema.learnerProfiles)
      .where(eq(schema.learnerProfiles.userId, u.id))
      .limit(1);
    console.log('learner_profile:', profile.length ? JSON.stringify(profile[0]) : 'NONE');

    const due = await (db as any)
      .select({ word: schema.vocabularyReviews.word })
      .from(schema.vocabularyReviews)
      .where(eq(schema.vocabularyReviews.userId, u.id))
      .limit(5);
    console.log('vocab_reviews:', due.length, JSON.stringify(due.map((d: any) => d.word)));

    const plan = await recommendationEngine.generateStudyPlan(u.id);
    console.log('PLAN:', JSON.stringify(plan));
  }

  process.exit(0);
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});

