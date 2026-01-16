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
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            chapter_number INTEGER NOT NULL,
            full_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(chapter_number)
        );

        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            chapter_id INTEGER NOT NULL,
            idx INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(chapter_id) REFERENCES chapters(id)
        );

        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            aliases TEXT, -- JSON array
            importance TEXT CHECK(importance IN ('MAIN', 'SECONDARY')) DEFAULT 'SECONDARY',
            base_description TEXT,
            visual_tags TEXT, -- JSON array
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS character_looks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            chapter_from INTEGER NOT NULL,
            chapter_to INTEGER, -- NULL means open-ended
            outfit TEXT,
            silhouette_notes TEXT,
            must_keep TEXT, -- JSON array
            avoid TEXT, -- JSON array
            FOREIGN KEY(character_id) REFERENCES characters(id)
        );
    `);
    console.log("Database schema initialized.");
}

initSchema();

module.exports = db;
