const db = require('./src/db');

async function insertAuthors() {
    await db.initSchema();

    const novels = await db.prepare("SELECT DISTINCT author_name FROM novels").all();
    let added = 0;

    for (const n of novels) {
        if (!n.author_name) continue;
        const existing = await db.prepare("SELECT * FROM users WHERE full_name = ?").get(n.author_name);
        if (!existing) {
            await db.prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)").run(
                n.author_name,
                n.author_name.replace(/\s+/g, '').toLowerCase() + '@example.com',
                'hash'
            );
            console.log("Inserted " + n.author_name);
            added++;
        }
    }

    console.log(`Inserted ${added} missing authors into the database!`);
}

insertAuthors()
    .catch((err) => {
        console.error('Failed inserting authors:', err);
        process.exit(1);
    })
    .finally(async () => {
        await db.pool.end();
    });
