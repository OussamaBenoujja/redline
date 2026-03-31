require('reflect-metadata');
const { DataSource } = require('typeorm');

const connectionString = process.env.DATABASE_URL || undefined;
const useSsl = String(process.env.PGSSL || '').toLowerCase() === 'true';

const dataSource = new DataSource(
    connectionString
        ? {
              type: 'postgres',
              url: connectionString,
              ssl: useSsl ? { rejectUnauthorized: false } : false,
              synchronize: false,
              logging: false,
          }
        : {
              type: 'postgres',
              host: process.env.PGHOST || '127.0.0.1',
              port: Number(process.env.PGPORT || 5432),
              username: process.env.PGUSER || 'postgres',
              password: process.env.PGPASSWORD || 'postgres',
              database: process.env.PGDATABASE || 'fablean',
              ssl: useSsl ? { rejectUnauthorized: false } : false,
              synchronize: false,
              logging: false,
          }
);

let initialized = false;

async function ensureDataSource() {
    if (initialized && dataSource.isInitialized) return dataSource;
    await dataSource.initialize();
    initialized = true;
    return dataSource;
}

function normalizeSql(sql) {
    return String(sql)
        .replace(/IFNULL\s*\(/gi, 'COALESCE(')
        .replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT');
}

function toPgPlaceholders(sql) {
    let idx = 0;
    return normalizeSql(sql).replace(/\?/g, () => `$${++idx}`);
}

function createExecutor(queryFn) {
    const executor = {
        prepare(sql) {
            return {
                get: (...params) => executor.get(sql, ...params),
                all: (...params) => executor.all(sql, ...params),
                run: (...params) => executor.run(sql, ...params),
            };
        },

        async get(sql, ...params) {
            const query = toPgPlaceholders(sql);
            const rows = await queryFn(query, params);
            return rows[0];
        },

        async all(sql, ...params) {
            const query = toPgPlaceholders(sql);
            const rows = await queryFn(query, params);
            return rows;
        },

        async run(sql, ...params) {
            const query = toPgPlaceholders(sql);
            const hasReturning = /\breturning\b/i.test(query);
            const finalQuery = hasReturning ? query : `${query} RETURNING id`;
            const rows = await queryFn(finalQuery, params);
            return {
                changes: rows.length,
                lastInsertRowid: rows?.[0]?.id ?? null,
                rows,
            };
        },

        async exec(sql) {
            await queryFn(sql, []);
        },

        async transaction(fn) {
            const ds = await ensureDataSource();
            const qr = ds.createQueryRunner();
            await qr.connect();
            await qr.startTransaction();
            const tx = createExecutor((query, params) => qr.query(query, params));
            try {
                const result = await fn(tx);
                await qr.commitTransaction();
                return result;
            } catch (err) {
                await qr.rollbackTransaction();
                throw err;
            } finally {
                await qr.release();
            }
        },
    };

    return executor;
}

const db = createExecutor(async (query, params) => {
    const ds = await ensureDataSource();
    return ds.query(query, params);
});

async function initSchema() {
    await ensureDataSource();
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            full_name TEXT,
            bio TEXT,
            avatar_url TEXT,
            banner_url TEXT,
            followers_count INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 0,
            badges TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
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
            tags TEXT,
            synopsis TEXT,
            cover_url TEXT,
            cover_photo TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS reading_progress (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            progress REAL DEFAULT 0,
            bookmark_idx INTEGER DEFAULT 0,
            offline_downloaded INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            last_read_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY(user_id, novel_id)
        );

        CREATE TABLE IF NOT EXISTS chapters (
            id SERIAL PRIMARY KEY,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            chapter_number INTEGER NOT NULL,
            full_text TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(novel_id, chapter_number)
        );

        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
            idx INTEGER NOT NULL,
            text TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS generated_images (
            id SERIAL PRIMARY KEY,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            chapter_number INTEGER NOT NULL,
            paragraph_id TEXT REFERENCES paragraphs(id) ON DELETE CASCADE,
            image_path TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS scenes (
            id SERIAL PRIMARY KEY,
            chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
            scene_number INTEGER NOT NULL,
            start_char_idx INTEGER,
            end_char_idx INTEGER,
            start_paragraph_idx INTEGER NOT NULL,
            end_paragraph_idx INTEGER NOT NULL,
            selected_text TEXT,
            context_notes TEXT,
            prompt_override TEXT,
            image_path TEXT,
            image_status TEXT DEFAULT 'draft',
            last_error TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(chapter_id, scene_number)
        );

        CREATE TABLE IF NOT EXISTS characters (
            id SERIAL PRIMARY KEY,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            aliases TEXT,
            importance TEXT DEFAULT 'SECONDARY',
            base_description TEXT,
            visual_tags TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(novel_id, name),
            CONSTRAINT importance_check CHECK (importance IN ('MAIN', 'SECONDARY'))
        );

        CREATE TABLE IF NOT EXISTS character_looks (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            chapter_from INTEGER NOT NULL,
            chapter_to INTEGER,
            outfit TEXT,
            silhouette_notes TEXT,
            must_keep TEXT,
            avoid TEXT
        );

        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
            paragraph_idx INTEGER,
            text TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS comment_votes (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY(user_id, comment_id)
        );

        CREATE TABLE IF NOT EXISTS comment_replies (
            id SERIAL PRIMARY KEY,
            comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
            rating REAL NOT NULL,
            text TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, novel_id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            target_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS author_followers (
            follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (follower_id, author_id)
        );
    `);

    await dataSource.query(`
        ALTER TABLE scenes ADD COLUMN IF NOT EXISTS start_char_idx INTEGER;
        ALTER TABLE scenes ADD COLUMN IF NOT EXISTS end_char_idx INTEGER;
        ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS is_favorite INTEGER DEFAULT 0;
        ALTER TABLE comment_votes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    console.log('PostgreSQL schema initialized.');
}

module.exports = {
    ...db,
    dataSource,
    pool: {
        end: async () => {
            if (dataSource.isInitialized) {
                await dataSource.destroy();
                initialized = false;
            }
        },
    },
    initSchema,
    ensureDataSource,
};
