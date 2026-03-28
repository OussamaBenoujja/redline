const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'fablean.db');
const db = new Database(dbPath, { verbose: null }); // Set to console.log for query logging

// Initialize Schema
function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            full_name TEXT,
            bio TEXT,
            avatar_url TEXT,
            banner_url TEXT,
            followers_count INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 0,
            badges TEXT, -- JSON array
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS novels (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author_name TEXT NOT NULL,
            genre TEXT,
            status TEXT,
            featured INTEGER DEFAULT 0,
            rating REAL DEFAULT 0.0,
            reads INTEGER DEFAULT 0,
            chapters_count INTEGER DEFAULT 0,
            tags TEXT, -- JSON array
            synopsis TEXT,
            cover_url TEXT,
            cover_photo TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reading_progress (
            user_id INTEGER REFERENCES users(id),
            novel_id TEXT REFERENCES novels(id),
            progress REAL DEFAULT 0,
            bookmark_idx INTEGER DEFAULT 0,
            offline_downloaded INTEGER DEFAULT 0,
            last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(user_id, novel_id)
        );

        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id TEXT REFERENCES novels(id),
            title TEXT NOT NULL,
            chapter_number INTEGER NOT NULL,
            full_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(novel_id, chapter_number)
        );

        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            chapter_id INTEGER NOT NULL,
            idx INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(chapter_id) REFERENCES chapters(id)
        );

        CREATE TABLE IF NOT EXISTS generated_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id TEXT REFERENCES novels(id),
            chapter_number INTEGER NOT NULL,
            paragraph_id TEXT REFERENCES paragraphs(id),
            image_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id TEXT REFERENCES novels(id),
            name TEXT NOT NULL,
            aliases TEXT, -- JSON array
            importance TEXT CHECK(importance IN ('MAIN', 'SECONDARY')) DEFAULT 'SECONDARY',
            base_description TEXT,
            visual_tags TEXT, -- JSON array
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(novel_id, name)
        );

        CREATE TABLE IF NOT EXISTS character_looks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            chapter_from INTEGER NOT NULL,
            chapter_to INTEGER, -- NULL means open-ended
            outfit TEXT,
            silhouette_notes TEXT,
            must_keep TEXT, -- JSON array
            avoid TEXT, -- JSON array,
            FOREIGN KEY(character_id) REFERENCES characters(id)
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            novel_id TEXT REFERENCES novels(id),
            chapter_id INTEGER REFERENCES chapters(id),
            paragraph_idx INTEGER,
            text TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            novel_id TEXT REFERENCES novels(id),
            rating REAL NOT NULL,
            text TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, novel_id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            type TEXT NOT NULL, 
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            target_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("Database schema initialized.");
}

initSchema();

module.exports = db;
