const db = require('./src/db');

const novels = db.prepare("SELECT DISTINCT author_name FROM novels").all();
let added = 0;

novels.forEach(n => {
    if (!n.author_name) return;
    const existing = db.prepare("SELECT * FROM users WHERE full_name = ?").get(n.author_name);
    if (!existing) {
        // Removed the invalid "role" column
        db.prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)").run(
            n.author_name,
            n.author_name.replace(/\s+/g, '').toLowerCase() + '@example.com',
            'hash'
        );
        console.log("Inserted " + n.author_name);
        added++;
    }
});

console.log(`Inserted ${added} missing authors into the database!`);
