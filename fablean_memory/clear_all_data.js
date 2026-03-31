const db = require('./src/db');

async function clearAll() {
  await db.initSchema();

  const tables = [
    'character_looks',
    'characters',
    'generated_images',
    'paragraphs',
    'scenes',
    'chapters',
    'reading_progress',
    'comments',
    'reviews',
    'notifications',
    'author_followers',
    'novels',
    'users',
  ];

  await db.transaction(async (tx) => {
    for (const tableName of tables) {
      await tx.exec(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
    }
  });

  console.log(`Cleared tables (${tables.length}): ${tables.join(', ')}`);
}

clearAll()
  .catch((err) => {
    console.error('Failed to clear data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.pool.end();
  });
