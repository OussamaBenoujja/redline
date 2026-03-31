const express = require('express');
const db = require('../db');
const aiAgent = require('../ai_agent');

const router = express.Router();

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

        for (const char of result.characters) {
            if (!char.name) continue;
            const existing = await db.prepare('SELECT * FROM characters WHERE novel_id = ? AND name = ?').get(novelId, char.name);
            if (existing) {
                existingCharacters.push({ ...existing, visual_tags: existing.visual_tags ? JSON.parse(existing.visual_tags) : [] });
            } else {
                const insertResult = await db.prepare(
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

        return res.json({ suggestions: result.suggestions || [], newCharacters, existingCharacters });
    } catch (e) {
        console.error('AI Analyze error:', e);
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
