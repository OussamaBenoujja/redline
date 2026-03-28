const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const promptEngine = require('./prompt_engine');
const aiAgent = require('./ai_agent');

const router = express.Router();

// 1. Ingestion: POST /api/chapters
router.post('/chapters', (req, res) => {
    const { novelId, title, chapterNumber, fullText } = req.body;

    if (!novelId || !title || !chapterNumber || !fullText) {
        return res.status(400).json({ error: "Missing required fields: novelId, title, chapterNumber, fullText" });
    }

    try {
        // Check existence
        const existing = db.prepare("SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?").get(novelId, chapterNumber);
        if (existing) {
            console.log(`Overwriting existing Chapter ${chapterNumber} for Novel ${novelId}`);
            const deleteParas = db.prepare("DELETE FROM paragraphs WHERE chapter_id = ?");
            const deleteChapter = db.prepare("DELETE FROM chapters WHERE id = ?");

            const overwrite = db.transaction(() => {
                deleteParas.run(existing.id);
                deleteChapter.run(existing.id);
            });
            overwrite();
        }

        const insertChapter = db.prepare(`
            INSERT INTO chapters (novel_id, title, chapter_number, full_text)
            VALUES (?, ?, ?, ?)
        `);

        const result = insertChapter.run(novelId, title, chapterNumber, fullText);
        const chapterId = result.lastInsertRowid;

        // Split text into paragraphs (double newline)
        const paras = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

        const insertPara = db.prepare(`
            INSERT INTO paragraphs (id, chapter_id, idx, text)
            VALUES (?, ?, ?, ?)
        `);

        paras.forEach((text, i) => {
            // Deterministic ID
            const hash = crypto.createHash('md5')
                .update(`${chapterId}-${i}-${text.substring(0, 20)}`)
                .digest('hex');

            insertPara.run(hash, chapterId, i, text);
        });

        // --- WebSockets Notification ---
        const favoriters = db.prepare("SELECT user_id FROM reading_progress WHERE novel_id = ? AND is_favorite = 1").all(novelId);
        const io = req.app.get('io');
        favoriters.forEach(f => {
            const notifMsg = `A new chapter "${title}" was just uploaded for a novel in your Library!`;
            db.prepare("INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, ?, ?, ?)").run(f.user_id, 'new_chapter', notifMsg, `/novel/${novelId}`);
            if (io) io.to('user_' + f.user_id).emit('new_notification', { type: 'new_chapter', message: notifMsg });
        });
        // -------------------------------

        res.json({
            chapterId,
            message: `Ingested chapter with ${paras.length} paragraphs.`
        });

    } catch (e) {
        console.error("Ingestion Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Retrieval: GET /api/chapters/:id
router.get('/chapters/:id', (req, res) => {
    const { id } = req.params;

    try {
        const chapter = db.prepare("SELECT * FROM chapters WHERE id = ?").get(id);
        if (!chapter) return res.status(404).json({ error: "Chapter not found" });

        const paragraphs = db.prepare("SELECT * FROM paragraphs WHERE chapter_id = ? ORDER BY idx ASC").all(id);

        res.json({ ...chapter, paragraphs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Prompt Request: POST /api/images/request
router.post('/images/request', async (req, res) => {
    const { chapterId, paragraphId } = req.body;

    if (!chapterId || !paragraphId) {
        return res.status(400).json({ error: "Missing chapterId or paragraphId" });
    }

    try {
        // Get Context
        const chapter = db.prepare("SELECT chapter_number FROM chapters WHERE id = ?").get(chapterId);
        if (!chapter) return res.status(404).json({ error: "Chapter not found" });

        const paragraph = db.prepare("SELECT text FROM paragraphs WHERE id = ?").get(paragraphId);
        // Also support index-based lookup for simpler testing?
        // Let's stick to ID for now, assuming client knows it.

        if (!paragraph) return res.status(404).json({ error: "Paragraph not found" });

        // Assemble Prompt
        const result = promptEngine.assemblePrompt(paragraph.text, chapter.chapter_number);

        // GPU Call
        let imageData = null;
        const gpuUrl = process.env.GPU_API_URL;

        if (gpuUrl) {
            try {
                const gpuRes = await fetch(`${gpuUrl}/v1/image/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: result.prompt,
                        negative_prompt: result.negative_prompt,
                        width: 832,
                        height: 832,
                        steps: 20,
                        cfg: 7.0,
                        seed: Math.floor(Math.random() * 1000000)
                    })
                });

                if (gpuRes.ok) {
                    const buf = await gpuRes.arrayBuffer();
                    imageData = Buffer.from(buf).toString('base64');
                    // Add data URI prefix for easier frontend usage
                    imageData = `data:image/png;base64,${imageData}`;
                } else {
                    const errText = await gpuRes.text();
                    console.error("GPU Error Status:", gpuRes.status);
                    console.error("GPU Error Text:", errText);
                }
            } catch (err) {
                console.error("GPU Connection Failed:", err.message);
                console.error("GPU URL was:", gpuUrl);
            }
        }

        res.json({
            paragraphId,
            chapterNumber: chapter.chapter_number,
            imageBase64: imageData,
            ...result
        });

    } catch (e) {
        console.error("Prompt Gen Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 3. Prompt Request (By Index Convenience): POST /api/generate
router.post('/generate', async (req, res) => {
    const { chapterNumber, paragraphIndex } = req.body;

    if (chapterNumber === undefined || paragraphIndex === undefined) {
        return res.status(400).json({ error: "Missing chapterNumber or paragraphIndex" });
    }

    try {
        const chapter = db.prepare("SELECT id, chapter_number FROM chapters WHERE chapter_number = ?").get(chapterNumber);
        if (!chapter) return res.status(404).json({ error: `Chapter ${chapterNumber} not found` });

        const paragraph = db.prepare("SELECT * FROM paragraphs WHERE chapter_id = ? AND idx = ?").get(chapter.id, paragraphIndex);
        if (!paragraph) return res.status(404).json({ error: `Paragraph index ${paragraphIndex} not found` });

        const result = promptEngine.assemblePrompt(paragraph.text, chapter.chapter_number);

        // GPU Call
        let imageData = null;
        const gpuUrl = process.env.GPU_API_URL;

        if (gpuUrl) {
            try {
                const gpuRes = await fetch(`${gpuUrl}/v1/image/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: result.prompt,
                        negative_prompt: result.negative_prompt,
                        width: 832,
                        height: 832,
                        steps: 20,
                        cfg: 7.0,
                        seed: Math.floor(Math.random() * 1000000)
                    })
                });

                if (gpuRes.ok) {
                    const buf = await gpuRes.arrayBuffer();
                    imageData = Buffer.from(buf).toString('base64');
                    imageData = `data:image/png;base64,${imageData}`;
                } else {
                    const errText = await gpuRes.text();
                    console.error("GPU Error Status:", gpuRes.status);
                    console.error("GPU Error Text:", errText);
                }
            } catch (err) {
                console.error("Generate GPU Connection Failed:", err.message);
                console.error("GPU URL was:", gpuUrl);
            }
        }

        res.json({
            chapterNumber: chapter.chapter_number,
            paragraphIndex,
            paragraphId: paragraph.id,
            imageBase64: imageData,
            ...result
        });

    } catch (e) {
        console.error("Generate Error:", e);
        res.status(500).json({ error: e.message });
    }
});
// --- NEW API ENDPOINTS FOR DESKTOP UI ---

// GET /api/novels
router.get('/novels', (req, res) => {
    try {
        const novels = db.prepare(`SELECT * FROM novels`).all();
        res.json(novels);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id
router.get('/novels/:id', (req, res) => {
    const { id } = req.params;
    try {
        const novel = db.prepare(`
            SELECT n.*, u.id as author_id 
            FROM novels n 
            LEFT JOIN users u ON n.author_name = u.full_name 
            WHERE n.id = ?
        `).get(id);
        if (!novel) return res.status(404).json({ error: "Novel not found" });
        res.json(novel);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id/reviews
router.get('/novels/:id/reviews', (req, res) => {
    const { id } = req.params;
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.full_name as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE novel_id = ?
            ORDER BY r.created_at DESC
        `).all(id);
        res.json(reviews);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// POST /api/novels/:id/reviews
router.post('/novels/:id/reviews', (req, res) => {
    const { id } = req.params;
    const { userId, rating, text } = req.body;
    try {
        const insert = db.prepare("INSERT INTO reviews (novel_id, user_id, rating, text) VALUES (?, ?, ?, ?)");
        const result = insert.run(id, userId, rating, text);
        
        // Return the freshly inserted review with the joined user_name so React can natively prepend it
        const newReview = db.prepare(`
            SELECT r.*, u.full_name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `).get(result.lastInsertRowid);
        
        res.json(newReview);
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// GET /api/novels/:id/chapters
router.get('/novels/:id/chapters', (req, res) => {
    const { id } = req.params;
    try {
        const chapters = db.prepare(`
            SELECT id, chapter_number, title 
            FROM chapters 
            WHERE novel_id = ?
            ORDER BY chapter_number ASC
        `).all(id);
        res.json(chapters);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// GET /api/chapters/:id/comments
router.get('/chapters/:id/comments', (req, res) => {
    const { id } = req.params;
    try {
        const comments = db.prepare(`
            SELECT c.*, u.full_name as user_name 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE chapter_id = ?
            ORDER BY c.created_at ASC
        `).all(id);
        res.json(comments);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// POST /api/chapters/:id/comments
router.post('/chapters/:id/comments', (req, res) => {
    const { id } = req.params;
    const { userId, novelId, paragraphIdx, text } = req.body;
    try {
        const insert = db.prepare(`
            INSERT INTO comments (user_id, novel_id, chapter_id, paragraph_idx, text) 
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = insert.run(userId, novelId, id, paragraphIdx, text);
        
        const newComment = db.prepare(`
            SELECT c.*, u.full_name as user_name 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?
        `).get(result.lastInsertRowid);
        
        res.json(newComment);
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// GET /api/users/:id/profile
router.get('/users/:id/profile', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.prepare("SELECT id, email, full_name, bio, avatar_url, banner_url, followers_count, streak_days, coins, badges FROM users WHERE id = ?").get(id);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        const readingProgressData = db.prepare(`
            SELECT n.*, r.progress, r.bookmark_idx, r.is_favorite, r.last_read_at 
            FROM reading_progress r 
            JOIN novels n ON r.novel_id = n.id 
            WHERE r.user_id = ?
            ORDER BY r.last_read_at DESC
        `).all(id);
        
        const libraryList = readingProgressData.filter(r => r.is_favorite === 1);

        // Parse JSON tags for nested response if needed, although frontend can also parse
        res.json({ ...user, readingList: libraryList, historyList: readingProgressData });
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// PUT /api/users/:id/profile
router.put('/users/:id/profile', (req, res) => {
    const { id } = req.params;
    const { full_name, bio, avatar_url, banner_url } = req.body;
    try {
        db.prepare(`
            UPDATE users 
            SET full_name = ?, bio = ?, avatar_url = ?, banner_url = ?
            WHERE id = ?
        `).run(full_name || '', bio || '', avatar_url || '', banner_url || '', id);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/library/check/:novelId
router.get('/users/:id/library/check/:novelId', (req, res) => {
    try {
        const row = db.prepare("SELECT 1 FROM reading_progress WHERE user_id = ? AND novel_id = ? AND is_favorite = 1").get(req.params.id, req.params.novelId);
        res.json({ inLibrary: !!row });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/users/:id/library
router.post('/users/:id/library', (req, res) => {
    const { novelId } = req.body;
    try {
        db.prepare(`
            INSERT INTO reading_progress (user_id, novel_id, is_favorite) 
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, novel_id) DO UPDATE SET is_favorite = 1
        `).run(req.params.id, novelId);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/users/:id/library/:novelId
router.delete('/users/:id/library/:novelId', (req, res) => {
    try {
        db.prepare("UPDATE reading_progress SET is_favorite = 0 WHERE user_id = ? AND novel_id = ?").run(req.params.id, req.params.novelId);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/users/:id/history
router.post('/users/:id/history', (req, res) => {
    const { novelId, chapterNum } = req.body;
    try {
        db.prepare(`
            INSERT INTO reading_progress (user_id, novel_id, bookmark_idx, last_read_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, novel_id) DO UPDATE SET bookmark_idx = ?, last_read_at = CURRENT_TIMESTAMP
        `).run(req.params.id, novelId, chapterNum, chapterNum);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/notifications
router.get('/users/:id/notifications', (req, res) => {
    const { id } = req.params;
    try {
        const notifs = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(id);
        res.json(notifs);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id/notifications/read
router.put('/users/:id/notifications/read', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/author/:id/dashboard
router.get('/author/:id/dashboard', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.prepare("SELECT full_name FROM users WHERE id = ?").get(id);
        if(!user) return res.status(404).json({error: "User not found"});

        const aggregates = db.prepare(`
            SELECT 
                IFNULL(SUM(reads), 0) as reads,
                IFNULL(AVG(rating), 0) as rating,
                (SELECT COUNT(*) FROM comments c JOIN novels n ON c.novel_id = n.id WHERE n.author_name = ?) as comments
            FROM novels WHERE author_name = ?
        `).get(user.full_name, user.full_name);

        res.json(aggregates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/author/:id/prompts
router.get('/author/:id/prompts', (req, res) => {
    try {
        const characters = db.prepare("SELECT c.id, c.name, l.must_keep as keep, l.avoid FROM characters c LEFT JOIN character_looks l ON c.id = l.character_id").all();
        res.json(characters);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/author/:id/novels
router.get('/author/:id/novels', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.prepare("SELECT full_name FROM users WHERE id = ?").get(id);
        if(!user) return res.status(404).json({error: "User not found"});
        const novels = db.prepare("SELECT * FROM novels WHERE author_name = ?").all(user.full_name);
        res.json(novels);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/novels
router.post('/novels', (req, res) => {
    const { title, authorName } = req.body;
    try {
        const id = 'n' + Math.floor(Math.random() * 1000000);
        const insert = db.prepare("INSERT INTO novels (id, title, author_name, status, chapters_count) VALUES (?, ?, ?, 'Ongoing', 0)");
        insert.run(id, title || 'Untitled Workspace', authorName || 'Fablean Demo Reader');
        
        // --- WebSockets Notification ---
        const authorRow = db.prepare("SELECT id FROM users WHERE full_name = ?").get(authorName || 'Fablean Demo Reader');
        if (authorRow) {
            const followers = db.prepare("SELECT follower_id FROM author_followers WHERE author_id = ?").all(authorRow.id);
            const io = req.app.get('io');
            followers.forEach(f => {
                const notifMsg = `${authorName} published a new novel workspace: ${title || 'Untitled Workspace'}!`;
                db.prepare("INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, ?, ?, ?)").run(f.follower_id, 'new_novel', notifMsg, `/novel/${id}`);
                if (io) io.to('user_' + f.follower_id).emit('new_notification', { type: 'new_novel', message: notifMsg });
            });
        }
        // -------------------------------
        
        res.json({ id });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// PUT /api/novels/:id
router.put('/novels/:id', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        db.prepare("UPDATE novels SET title = ? WHERE id = ?").run(title, id);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// POST /api/users/:id/follow/:authorId
router.post('/users/:id/follow/:authorId', (req, res) => {
    try {
        db.prepare('INSERT OR IGNORE INTO author_followers (follower_id, author_id) VALUES (?, ?)').run(req.params.id, req.params.authorId);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/users/:id/follow/:authorId
router.delete('/users/:id/follow/:authorId', (req, res) => {
    try {
        db.prepare('DELETE FROM author_followers WHERE follower_id = ? AND author_id = ?').run(req.params.id, req.params.authorId);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/:id/following/check/:authorId
router.get('/users/:id/following/check/:authorId', (req, res) => {
    try {
        const row = db.prepare('SELECT 1 FROM author_followers WHERE follower_id = ? AND author_id = ?').get(req.params.id, req.params.authorId);
        res.json({ isFollowing: !!row });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/analyze - AI Grammar + Character RAG Extraction
router.post('/ai/analyze', async (req, res) => {
    const { novelId, text } = req.body;
    if (!text || !novelId) return res.status(400).json({ error: 'novelId and text are required' });

    try {
        const result = await aiAgent.analyzeChapter(text);
        if (result.error) {
            return res.json({ suggestions: [], newCharacters: [], existingCharacters: [], error: result.error });
        }

        const newCharacters = [];
        const existingCharacters = [];

        // RAG Dedup: Check each character against the database
        for (const char of result.characters) {
            if (!char.name) continue;
            const existing = db.prepare('SELECT * FROM characters WHERE novel_id = ? AND name = ?').get(novelId, char.name);
            if (existing) {
                existingCharacters.push({ ...existing, visual_tags: existing.visual_tags ? JSON.parse(existing.visual_tags) : [] });
            } else {
                // INSERT new character
                const insertResult = db.prepare(
                    'INSERT INTO characters (novel_id, name, importance, base_description, visual_tags) VALUES (?, ?, ?, ?, ?)'
                ).run(
                    novelId,
                    char.name,
                    char.importance || 'SECONDARY',
                    char.base_description || '',
                    JSON.stringify(char.visual_tags || [])
                );
                newCharacters.push({ id: insertResult.lastInsertRowid, ...char });
            }
        }

        res.json({
            suggestions: result.suggestions || [],
            newCharacters,
            existingCharacters
        });
    } catch (e) {
        console.error('AI Analyze error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:novelId/characters
router.get('/novels/:novelId/characters', (req, res) => {
    try {
        const chars = db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(req.params.novelId);
        res.json(chars.map(c => ({ ...c, visual_tags: c.visual_tags ? JSON.parse(c.visual_tags) : [] })));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
