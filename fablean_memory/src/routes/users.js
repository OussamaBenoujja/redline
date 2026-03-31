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

// GET /api/users/:id/profile
router.get('/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db.prepare('SELECT id, email, full_name, bio, avatar_url, banner_url, followers_count, streak_days, coins, badges FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const readingProgressData = await db.prepare(`
            SELECT n.*, r.progress, r.bookmark_idx, r.is_favorite, r.last_read_at
            FROM reading_progress r
            JOIN novels n ON r.novel_id = n.id
            WHERE r.user_id = ?
            ORDER BY r.last_read_at DESC
        `).all(id);

        const libraryList = readingProgressData.filter((r) => r.is_favorite === 1);
        return res.json({ ...user, readingList: libraryList, historyList: readingProgressData });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// PUT /api/users/:id/profile
router.put('/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const { full_name, bio, avatar_url, banner_url } = req.body;
    try {
        await db.prepare(`
            UPDATE users
            SET full_name = ?, bio = ?, avatar_url = ?, banner_url = ?
            WHERE id = ?
        `).run(full_name || '', bio || '', avatar_url || '', banner_url || '', id);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/library/check/:novelId
router.get('/users/:id/library/check/:novelId', async (req, res) => {
    try {
        const row = await db.prepare('SELECT 1 FROM reading_progress WHERE user_id = ? AND novel_id = ? AND is_favorite = 1').get(req.params.id, req.params.novelId);
        return res.json({ inLibrary: !!row });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/users/:id/library
router.post('/users/:id/library', async (req, res) => {
    const { novelId } = req.body;
    try {
        await db.prepare(`
            INSERT INTO reading_progress (user_id, novel_id, is_favorite)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, novel_id) DO UPDATE SET is_favorite = 1
            RETURNING user_id
        `).run(req.params.id, novelId);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// DELETE /api/users/:id/library/:novelId
router.delete('/users/:id/library/:novelId', async (req, res) => {
    try {
        await db.prepare('UPDATE reading_progress SET is_favorite = 0 WHERE user_id = ? AND novel_id = ? RETURNING user_id').run(req.params.id, req.params.novelId);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/users/:id/history
router.post('/users/:id/history', async (req, res) => {
    const { novelId, chapterNum } = req.body;
    try {
        await db.prepare(`
            INSERT INTO reading_progress (user_id, novel_id, bookmark_idx, last_read_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, novel_id) DO UPDATE SET bookmark_idx = ?, last_read_at = CURRENT_TIMESTAMP
            RETURNING user_id
        `).run(req.params.id, novelId, chapterNum, chapterNum);

        await refreshNovelMetrics(novelId);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/history/:novelId
router.get('/users/:id/history/:novelId', async (req, res) => {
    const { id, novelId } = req.params;
    try {
        const row = await db.prepare(`
            SELECT bookmark_idx, last_read_at
            FROM reading_progress
            WHERE user_id = ? AND novel_id = ?
            LIMIT 1
        `).get(id, novelId);

        if (!row) {
            return res.json({ bookmark_idx: null, last_read_at: null });
        }

        return res.json({
            bookmark_idx: row.bookmark_idx ?? null,
            last_read_at: row.last_read_at ?? null,
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/notifications
router.get('/users/:id/notifications', async (req, res) => {
    const { id } = req.params;
    try {
        const notifs = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(id);
        return res.json(notifs);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// PUT /api/users/:id/notifications/read
router.put('/users/:id/notifications/read', async (req, res) => {
    try {
        await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.params.id);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// POST /api/users/:id/follow/:authorId
router.post('/users/:id/follow/:authorId', async (req, res) => {
    try {
        const followerId = Number(req.params.id);
        const authorId = Number(req.params.authorId);
        let insertedFollow = false;

        if (Number.isNaN(followerId) || Number.isNaN(authorId)) {
            return res.status(400).json({ error: 'Invalid user id or author id' });
        }

        if (followerId === authorId) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }

        await db.transaction(async (tx) => {
            const insertResult = await tx.prepare('INSERT INTO author_followers (follower_id, author_id) VALUES (?, ?) ON CONFLICT (follower_id, author_id) DO NOTHING RETURNING follower_id').run(followerId, authorId);
            insertedFollow = Number(insertResult?.changes || 0) > 0;
            await tx.prepare(`
                UPDATE users
                SET followers_count = (
                    SELECT COUNT(*) FROM author_followers WHERE author_id = ?
                )
                WHERE id = ?
            `).run(authorId, authorId);
        });

        if (insertedFollow) {
            const follower = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(followerId);
            const msg = `${follower?.full_name || 'Someone'} started following you.`;
            const targetUrl = `/user/${followerId}`;
            await db.prepare('INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, ?, ?, ?)').run(authorId, 'new_follower', msg, targetUrl);
            const io = req.app.get('io');
            if (io) io.to('user_' + authorId).emit('new_notification', { type: 'new_follower', message: msg, target_url: targetUrl });
        }

        const countRow = await db.prepare('SELECT followers_count FROM users WHERE id = ?').get(authorId);
        return res.json({ success: true, isFollowing: true, followersCount: Number(countRow?.followers_count || 0) });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// DELETE /api/users/:id/follow/:authorId
router.delete('/users/:id/follow/:authorId', async (req, res) => {
    try {
        const followerId = Number(req.params.id);
        const authorId = Number(req.params.authorId);

        if (Number.isNaN(followerId) || Number.isNaN(authorId)) {
            return res.status(400).json({ error: 'Invalid user id or author id' });
        }

        await db.transaction(async (tx) => {
            await tx.prepare('DELETE FROM author_followers WHERE follower_id = ? AND author_id = ? RETURNING follower_id').run(followerId, authorId);
            await tx.prepare(`
                UPDATE users
                SET followers_count = (
                    SELECT COUNT(*) FROM author_followers WHERE author_id = ?
                )
                WHERE id = ?
            `).run(authorId, authorId);
        });

        const countRow = await db.prepare('SELECT followers_count FROM users WHERE id = ?').get(authorId);
        return res.json({ success: true, isFollowing: false, followersCount: Number(countRow?.followers_count || 0) });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/following/check/:authorId
router.get('/users/:id/following/check/:authorId', async (req, res) => {
    try {
        const row = await db.prepare('SELECT 1 FROM author_followers WHERE follower_id = ? AND author_id = ?').get(req.params.id, req.params.authorId);
        return res.json({ isFollowing: !!row });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/users/:id/following
router.get('/users/:id/following', async (req, res) => {
    try {
        const following = await db.prepare(`
            SELECT
                u.id,
                u.full_name,
                u.bio,
                u.avatar_url,
                u.banner_url,
                u.followers_count,
                COALESCE((
                    SELECT COUNT(*)
                    FROM novels n
                    WHERE LOWER(TRIM(n.author_name)) = LOWER(TRIM(u.full_name))
                ), 0) AS works_count
            FROM author_followers af
            JOIN users u ON u.id = af.author_id
            WHERE af.follower_id = ?
            ORDER BY af.created_at DESC
        `).all(req.params.id);

        return res.json(following || []);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
