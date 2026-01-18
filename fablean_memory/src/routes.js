const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const promptEngine = require('./prompt_engine');

const router = express.Router();

// 1. Ingestion: POST /api/chapters
router.post('/chapters', (req, res) => {
    const { title, chapterNumber, fullText } = req.body;

    if (!title || !chapterNumber || !fullText) {
        return res.status(400).json({ error: "Missing required fields: title, chapterNumber, fullText" });
    }

    try {
        // Check existence
        // Check existence
        const existing = db.prepare("SELECT id FROM chapters WHERE chapter_number = ?").get(chapterNumber);
        if (existing) {
            console.log(`Overwriting existing Chapter ${chapterNumber}`);
            const deleteParas = db.prepare("DELETE FROM paragraphs WHERE chapter_id = ?");
            const deleteChapter = db.prepare("DELETE FROM chapters WHERE id = ?");

            const overwrite = db.transaction(() => {
                deleteParas.run(existing.id);
                deleteChapter.run(existing.id);
            });
            overwrite();
        }

        const insertChapter = db.prepare(`
            INSERT INTO chapters (title, chapter_number, full_text)
            VALUES (?, ?, ?)
        `);

        const result = insertChapter.run(title, chapterNumber, fullText);
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

module.exports = router;
