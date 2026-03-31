const express = require('express');
const db = require('../db');

const router = express.Router();

async function refreshNovelMetrics(novelId) {
    const ratingRow = await db.prepare(`
        SELECT COALESCE(AVG(rating), 0) AS avg_rating
        FROM reviews
        WHERE novel_id = ?
    `).get(novelId);

    const readsRow = await db.prepare(`
        SELECT COALESCE(COUNT(DISTINCT user_id), 0) AS reads_count
        FROM reading_progress
        WHERE novel_id = ? AND COALESCE(bookmark_idx, 0) > 0
    `).get(novelId);

    await db.prepare(`
        UPDATE novels
        SET rating = ?, reads = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING id
    `).run(Number(ratingRow?.avg_rating || 0), Number(readsRow?.reads_count || 0), novelId);
}

// GET /api/novels
router.get('/novels', async (_req, res) => {
    try {
        const novels = await db.prepare(`
            SELECT
                n.*,
                CAST(COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.novel_id = n.id), 0) AS DOUBLE PRECISION) AS rating,
                CAST(COALESCE((SELECT COUNT(DISTINCT rp.user_id) FROM reading_progress rp WHERE rp.novel_id = n.id AND COALESCE(rp.bookmark_idx, 0) > 0), 0) AS INTEGER) AS reads
            FROM novels n
        `).all();
        return res.json(novels);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id
router.get('/novels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const novel = await db.prepare(`
            SELECT
                n.*,
                u.id as author_id,
                CAST(COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.novel_id = n.id), 0) AS DOUBLE PRECISION) AS rating,
                CAST(COALESCE((SELECT COUNT(DISTINCT rp.user_id) FROM reading_progress rp WHERE rp.novel_id = n.id AND COALESCE(rp.bookmark_idx, 0) > 0), 0) AS INTEGER) AS reads
            FROM novels n
            LEFT JOIN users u ON LOWER(TRIM(n.author_name)) = LOWER(TRIM(u.full_name))
            WHERE n.id = ?
        `).get(id);
        if (!novel) return res.status(404).json({ error: 'Novel not found' });
        return res.json(novel);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id/reviews
router.get('/novels/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const reviews = await db.prepare(`
            SELECT r.*, u.full_name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE novel_id = ?
            ORDER BY r.created_at DESC
        `).all(id);
        return res.json(reviews);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/novels/:id/reviews
router.post('/novels/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const { userId, rating, text } = req.body;
    try {
        const insert = await db.prepare('INSERT INTO reviews (novel_id, user_id, rating, text) VALUES (?, ?, ?, ?)');
        const result = await insert.run(id, userId, rating, text);

        await refreshNovelMetrics(id);

        const newReview = await db.prepare(`
            SELECT r.*, u.full_name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `).get(result.lastInsertRowid);

        return res.json(newReview);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/reviews/:id/helpful
router.post('/reviews/:id/helpful', async (req, res) => {
    const reviewId = Number(req.params.id);
    const { userId } = req.body || {};

    if (Number.isNaN(reviewId)) {
        return res.status(400).json({ error: 'Invalid review id' });
    }

    try {
        const review = await db.prepare('SELECT id, user_id, likes FROM reviews WHERE id = ?').get(reviewId);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (userId && Number(userId) === Number(review.user_id)) {
            return res.status(400).json({ error: 'You cannot mark your own review as helpful' });
        }

        await db.prepare('UPDATE reviews SET likes = COALESCE(likes, 0) + 1 WHERE id = ?').run(reviewId);
        const updated = await db.prepare('SELECT id, likes FROM reviews WHERE id = ?').get(reviewId);

        return res.json({ id: updated.id, likes: Number(updated.likes || 0) });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id/chapters
router.get('/novels/:id/chapters', async (req, res) => {
    const { id } = req.params;
    try {
        const chapters = await db.prepare(`
            SELECT id, chapter_number, title
            FROM chapters
            WHERE novel_id = ?
            ORDER BY chapter_number ASC
        `).all(id);
        return res.json(chapters);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:id/chapters/:chapterNumber
router.get('/novels/:id/chapters/:chapterNumber', async (req, res) => {
    const { id, chapterNumber } = req.params;
    try {
        const chapter = await db.prepare(`
            SELECT *
            FROM chapters
            WHERE novel_id = ? AND chapter_number = ?
            LIMIT 1
        `).get(id, Number(chapterNumber));

        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

        const paragraphs = await db.prepare('SELECT * FROM paragraphs WHERE chapter_id = ? ORDER BY idx ASC').all(chapter.id);
        return res.json({ ...chapter, paragraphs });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/novels
router.post('/novels', async (req, res) => {
    const { title, authorName } = req.body;
    try {
        const id = 'n' + Math.floor(Math.random() * 1000000);
        const effectiveAuthorName = authorName || 'Fablean Demo Reader';
        const insert = await db.prepare("INSERT INTO novels (id, title, author_name, status, chapters_count) VALUES (?, ?, ?, 'Ongoing', 0)");
        await insert.run(id, title || 'Untitled Workspace', effectiveAuthorName);

        const authorRow = await db.prepare('SELECT id FROM users WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?))').get(effectiveAuthorName);
        if (authorRow) {
            const followers = await db.prepare('SELECT follower_id FROM author_followers WHERE author_id = ?').all(authorRow.id);
            const io = req.app.get('io');
            for (const f of followers) {
                const notifMsg = `${effectiveAuthorName} published a new novel workspace: ${title || 'Untitled Workspace'}!`;
                const targetUrl = `/novel/${id}`;
                await db.prepare('INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, ?, ?, ?)').run(f.follower_id, 'new_novel', notifMsg, targetUrl);
                if (io) io.to('user_' + f.follower_id).emit('new_notification', { type: 'new_novel', message: notifMsg, target_url: targetUrl });
            }
        }

        return res.json({ id });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// PUT /api/novels/:id
router.put('/novels/:id', async (req, res) => {
    const { id } = req.params;
    const { title, synopsis, cover_url, coverUrl, cover_photo, coverPhoto } = req.body || {};

    const updates = [];
    const values = [];

    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }

    if (synopsis !== undefined) {
        updates.push('synopsis = ?');
        values.push(synopsis);
    }

    const resolvedCoverUrl = cover_url !== undefined ? cover_url : coverUrl;
    if (resolvedCoverUrl !== undefined) {
        updates.push('cover_url = ?');
        values.push(resolvedCoverUrl);
    }

    const resolvedCoverPhoto = cover_photo !== undefined ? cover_photo : coverPhoto;
    if (resolvedCoverPhoto !== undefined) {
        updates.push('cover_photo = ?');
        values.push(resolvedCoverPhoto);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
    }

    try {
        values.push(id);
        await db.prepare(`UPDATE novels SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/novels/:novelId/characters
router.get('/novels/:novelId/characters', async (req, res) => {
    try {
        const chars = await db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(req.params.novelId);
        return res.json(chars.map((c) => ({ ...c, visual_tags: c.visual_tags ? JSON.parse(c.visual_tags) : [] })));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
