const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/author/:id/dashboard
router.get('/author/:id/dashboard', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const aggregates = await db.prepare(`
            SELECT
                IFNULL(SUM(reads), 0) as reads,
                IFNULL(AVG(rating), 0) as rating,
                (SELECT COUNT(*) FROM comments c JOIN novels n ON c.novel_id = n.id WHERE n.author_name = ?) as comments
            FROM novels WHERE author_name = ?
        `).get(user.full_name, user.full_name);

        return res.json(aggregates);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/author/:id/prompts
router.get('/author/:id/prompts', async (_req, res) => {
    try {
        const characters = await db.prepare('SELECT c.id, c.name, l.must_keep as keep, l.avoid FROM characters c LEFT JOIN character_looks l ON c.id = l.character_id').all();
        return res.json(characters);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/author/:id/novels
router.get('/author/:id/novels', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const novels = await db.prepare('SELECT * FROM novels WHERE author_name = ?').all(user.full_name);
        return res.json(novels);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
