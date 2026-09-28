import { eq } from 'drizzle-orm';
import { connect, closeAll, getDb } from '../db/connection';
import * as schema from '../db/schema-pg';
import { LEARNING_MODULES } from '../data/learningCatalog';

async function run() {
  await connect();
  const db = getDb();
  let moduleUpserts = 0;
  let itemInserts = 0;
  let itemDeletes = 0;

  for (let index = 0; index < LEARNING_MODULES.length; index += 1) {
    const seedModule = LEARNING_MODULES[index];

    const existing = await (db as any)
      .select()
      .from(schema.learningModules)
      .where(eq(schema.learningModules.moduleKey, seedModule.key))
      .limit(1);

    let moduleId: number;

    if (existing[0]) {
      moduleId = Number(existing[0].moduleId);
      await (db as any)
        .update(schema.learningModules)
        .set({
          moduleTitle: seedModule.title,
          sortOrder: index,
          difficulty: seedModule.difficulty,
          language: 'Bisaya',
        })
        .where(eq(schema.learningModules.moduleId, moduleId));
    } else {
      const inserted = await (db as any)
        .insert(schema.learningModules)
        .values({
          moduleTitle: seedModule.title,
          moduleKey: seedModule.key,
          sortOrder: index,
          difficulty: seedModule.difficulty,
          language: 'Bisaya',
        })
        .returning();
      moduleId = Number(inserted[0].moduleId);
      moduleUpserts += 1;
    }

    const items = (seedModule.sections ?? []).flatMap((section) =>
      section.items.map((item, itemIndex) => ({ sectionTitle: section.title, item, itemIndex }))
    );

    const deleted = await (db as any)
      .delete(schema.lessonItems)
      .where(eq(schema.lessonItems.moduleId, moduleId))
      .returning({ itemId: schema.lessonItems.itemId });
    itemDeletes += deleted.length;

    if (items.length) {
      await (db as any)
        .insert(schema.lessonItems)
        .values(
          items.map(({ sectionTitle, item, itemIndex }) => ({
            moduleId,
            sectionTitle,
            nativeText: item.native,
            englishText: item.english,
            note: item.note ?? null,
            sortOrder: itemIndex,
          }))
        );
      itemInserts += items.length;
    }
  }

  const allModules = await (db as any)
    .select()
    .from(schema.learningModules)
    .orderBy(schema.learningModules.sortOrder);

  const allItems = await (db as any).select().from(schema.lessonItems);

  console.log(`Seeded ${LEARNING_MODULES.length} learning modules.`);
  console.log(`  modules created: ${moduleUpserts}, updated: ${LEARNING_MODULES.length - moduleUpserts}`);
  console.log(`  lesson items inserted: ${itemInserts}, cleared: ${itemDeletes}`);
  console.log(`  learning_modules rows: ${allModules.length}, lesson_items rows: ${allItems.length}`);

  for (const module of allModules) {
    console.log(
      `  - [${module.sortOrder}] ${module.moduleKey} -> #${module.moduleId} "${module.moduleTitle}"`
    );
  }
}

run()
  .then(async () => {
    await closeAll();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Learning content seed failed:', err);
    try {
      await closeAll();
    } catch {
      // ignore
    }
    process.exit(1);
  });
