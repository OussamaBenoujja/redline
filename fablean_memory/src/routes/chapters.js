const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const promptEngine = require('../prompt_engine');

const router = express.Router();

// 1. Ingestion: POST /api/chapters
router.post('/chapters', async (req, res) => {
    const { novelId, title, chapterNumber, fullText } = req.body;

    if (!novelId || !title || !chapterNumber || !fullText) {
        return res.status(400).json({ error: 'Missing required fields: novelId, title, chapterNumber, fullText' });
    }

    try {
        const existing = await db.prepare('SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?').get(novelId, chapterNumber);
        if (existing) {
            await db.transaction(async (tx) => {
                await tx.prepare('DELETE FROM paragraphs WHERE chapter_id = ?').run(existing.id);
                await tx.prepare('DELETE FROM scenes WHERE chapter_id = ?').run(existing.id);
                await tx.prepare('DELETE FROM chapters WHERE id = ?').run(existing.id);
            });
        }

        const insertChapter = await db.prepare(`
            INSERT INTO chapters (novel_id, title, chapter_number, full_text)
            VALUES (?, ?, ?, ?)
        `);

        const result = await insertChapter.run(novelId, title, chapterNumber, fullText);
        const chapterId = result.lastInsertRowid;

        const paras = fullText.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);

        const insertPara = await db.prepare(`
            INSERT INTO paragraphs (id, chapter_id, idx, text)
            VALUES (?, ?, ?, ?)
        `);

        for (const [i, text] of paras.entries()) {
            const hash = crypto.createHash('md5').update(`${chapterId}-${i}-${text.substring(0, 20)}`).digest('hex');
            await insertPara.run(hash, chapterId, i, text);
        }

        const favoriters = await db.prepare('SELECT user_id FROM reading_progress WHERE novel_id = ? AND is_favorite = 1').all(novelId);
        const novelMeta = await db.prepare(`
            SELECT n.title, n.author_name, u.id AS author_id
            FROM novels n
            LEFT JOIN users u ON LOWER(TRIM(n.author_name)) = LOWER(TRIM(u.full_name))
            WHERE n.id = ?
            LIMIT 1
        `).get(novelId);

        const followerRows = novelMeta?.author_id
            ? await db.prepare('SELECT follower_id FROM author_followers WHERE author_id = ?').all(novelMeta.author_id)
            : [];

        const recipients = new Set();
        for (const f of favoriters || []) {
            if (Number.isFinite(Number(f.user_id))) recipients.add(Number(f.user_id));
        }
        for (const f of followerRows || []) {
            if (Number.isFinite(Number(f.follower_id))) recipients.add(Number(f.follower_id));
        }

        const io = req.app.get('io');
        for (const recipientId of recipients) {
            const notifMsg = `New chapter "${title}" was published for "${novelMeta?.title || 'a novel you follow'}".`;
            const targetUrl = `/read/${novelId}/${chapterNumber}`;
            await db.prepare('INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, ?, ?, ?)').run(recipientId, 'new_chapter', notifMsg, targetUrl);
            if (io) io.to('user_' + recipientId).emit('new_notification', { type: 'new_chapter', message: notifMsg, target_url: targetUrl });
        }

        return res.json({ chapterId, message: `Ingested chapter with ${paras.length} paragraphs.` });
    } catch (e) {
        console.error('Ingestion Error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Scene authoring: POST /api/chapters/:id/scenes
router.post('/chapters/:id/scenes', async (req, res) => {
    const chapterId = Number(req.params.id);
    const { startCharIdx, endCharIdx, contextNotes, promptOverride } = req.body;

    if (Number.isNaN(chapterId)) {
        return res.status(400).json({ error: 'Invalid chapter id' });
    }

    if (startCharIdx === undefined || endCharIdx === undefined || Number(startCharIdx) < 0 || Number(endCharIdx) <= Number(startCharIdx)) {
        return res.status(400).json({ error: 'Invalid scene character range' });
    }

    try {
        const chapter = await db.prepare('SELECT id, full_text FROM chapters WHERE id = ?').get(chapterId);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

        const fullText = String(chapter.full_text || '');
        const startIdx = Number(startCharIdx);
        const endIdx = Number(endCharIdx);

        if (endIdx > fullText.length) {
            return res.status(400).json({ error: `Character range exceeds chapter length (${fullText.length})` });
        }

        const selectedText = fullText.slice(startIdx, endIdx);
        if (!selectedText.trim()) {
            return res.status(400).json({ error: 'Selected range must include non-whitespace text' });
        }

        const existingScenes = await db.prepare('SELECT id, start_char_idx, end_char_idx, selected_text FROM scenes WHERE chapter_id = ?').all(chapterId);
        const overlap = existingScenes.some((row) => {
            let existingStart = Number(row.start_char_idx);
            let existingEnd = Number(row.end_char_idx);

            if (!(Number.isFinite(existingStart) && Number.isFinite(existingEnd) && existingStart >= 0 && existingEnd > existingStart) && row.selected_text) {
                const fallbackStart = fullText.indexOf(String(row.selected_text));
                if (fallbackStart >= 0) {
                    existingStart = fallbackStart;
                    existingEnd = fallbackStart + String(row.selected_text).length;
                }
            }

            if (!(Number.isFinite(existingStart) && Number.isFinite(existingEnd) && existingStart >= 0 && existingEnd > existingStart)) {
                return false;
            }

            return !(endIdx <= existingStart || startIdx >= existingEnd);
        });

        if (overlap) {
            return res.status(409).json({ error: 'Selected text overlaps an existing scene. Delete or adjust the other scene first.' });
        }

        const nextSceneNumberRow = await db.prepare('SELECT IFNULL(MAX(scene_number), 0) AS maxScene FROM scenes WHERE chapter_id = ?').get(chapterId);
        const nextSceneNumber = Number(nextSceneNumberRow?.maxScene || 0) + 1;

        const insert = await db.prepare(`
            INSERT INTO scenes (
                chapter_id,
                scene_number,
                start_char_idx,
                end_char_idx,
                start_paragraph_idx,
                end_paragraph_idx,
                selected_text,
                context_notes,
                prompt_override,
                image_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `);

        const result = await insert.run(chapterId, nextSceneNumber, startIdx, endIdx, -1, -1, selectedText, contextNotes || '', promptOverride || '');

        const created = await db.prepare('SELECT * FROM scenes WHERE id = ?').get(result.lastInsertRowid);
        return res.json(created);
    } catch (e) {
        console.error('Create scene error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// List scenes for a chapter: GET /api/chapters/:id/scenes
router.get('/chapters/:id/scenes', async (req, res) => {
    const chapterId = Number(req.params.id);
    if (Number.isNaN(chapterId)) {
        return res.status(400).json({ error: 'Invalid chapter id' });
    }

    try {
        const scenes = await db.prepare(`
            SELECT *
            FROM scenes
            WHERE chapter_id = ?
            ORDER BY start_char_idx ASC, scene_number ASC
        `).all(chapterId);
        return res.json(scenes);
    } catch (e) {
        console.error('List scenes error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Delete scene and keep numbering compact: DELETE /api/scenes/:id
router.delete('/scenes/:id', async (req, res) => {
    const sceneId = Number(req.params.id);
    if (Number.isNaN(sceneId)) {
        return res.status(400).json({ error: 'Invalid scene id' });
    }

    try {
        const scene = await db.prepare('SELECT id, chapter_id, scene_number FROM scenes WHERE id = ?').get(sceneId);
        if (!scene) return res.status(404).json({ error: 'Scene not found' });

        await db.transaction(async (tx) => {
            await tx.prepare('DELETE FROM scenes WHERE id = ?').run(sceneId);
            await tx.prepare(`
                UPDATE scenes
                SET scene_number = scene_number - 1, updated_at = CURRENT_TIMESTAMP
                WHERE chapter_id = ? AND scene_number > ?
            `).run(scene.chapter_id, scene.scene_number);
        });
        return res.json({ success: true, deletedId: sceneId });
    } catch (e) {
        console.error('Delete scene error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Generate and persist image for scene: POST /api/scenes/:id/generate-image
router.post('/scenes/:id/generate-image', async (req, res) => {
    const sceneId = Number(req.params.id);
    if (Number.isNaN(sceneId)) {
        return res.status(400).json({ error: 'Invalid scene id' });
    }

    try {
        const scene = await db.prepare('SELECT * FROM scenes WHERE id = ?').get(sceneId);
        if (!scene) return res.status(404).json({ error: 'Scene not found' });

        const chapter = await db.prepare('SELECT chapter_number FROM chapters WHERE id = ?').get(scene.chapter_id);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found for scene' });

        const sourceText = [scene.selected_text || '', scene.context_notes || ''].map((v) => String(v).trim()).filter(Boolean).join('\n\n');

        if (!sourceText) {
            return res.status(400).json({ error: 'Scene has no selected text to generate from' });
        }

        const assembled = promptEngine.assemblePrompt(sourceText, chapter.chapter_number);
        const prompt = (scene.prompt_override || '').trim() || assembled.prompt;
        const negativePrompt = assembled.negative_prompt;

        const gpuUrl = process.env.GPU_API_URL;
        if (!gpuUrl) {
            return res.status(500).json({ error: 'GPU_API_URL is not configured on backend' });
        }

        await db.prepare("UPDATE scenes SET image_status = 'generating', last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sceneId);

        const gpuRes = await fetch(`${gpuUrl}/v1/image/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                negative_prompt: negativePrompt,
                width: 832,
                height: 832,
                steps: 20,
                cfg: 7.0,
                seed: Math.floor(Math.random() * 1000000),
            }),
        });

        if (!gpuRes.ok) {
            const errText = await gpuRes.text();
            const errorMsg = `GPU generation failed (${gpuRes.status}): ${errText.slice(0, 240)}`;
            await db.prepare("UPDATE scenes SET image_status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(errorMsg, sceneId);
            return res.status(502).json({ error: errorMsg });
        }

        const arrayBuf = await gpuRes.arrayBuffer();
        const outputDir = path.resolve(__dirname, '../../data/generated/scenes');
        fs.mkdirSync(outputDir, { recursive: true });

        const fileName = `scene_${sceneId}_${Date.now()}.png`;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(arrayBuf));

        const publicPath = `/generated/scenes/${fileName}`;
        await db.prepare(`
            UPDATE scenes
            SET image_path = ?, image_status = 'ready', last_error = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(publicPath, sceneId);

        const updated = await db.prepare('SELECT * FROM scenes WHERE id = ?').get(sceneId);
        return res.json({ ...updated, promptUsed: prompt, negativePromptUsed: negativePrompt });
    } catch (e) {
        console.error('Generate scene image error:', e);
        await db.prepare("UPDATE scenes SET image_status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(e.message, sceneId);
        return res.status(500).json({ error: e.message });
    }
});

// 2. Retrieval: GET /api/chapters/:id
router.get('/chapters/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const chapter = await db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

        const paragraphs = await db.prepare('SELECT * FROM paragraphs WHERE chapter_id = ? ORDER BY idx ASC').all(id);
        return res.json({ ...chapter, paragraphs });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// 3. Prompt Request: POST /api/images/request
router.post('/images/request', async (req, res) => {
    const { chapterId, paragraphId, contextText } = req.body;

    if (!chapterId || !paragraphId) {
        return res.status(400).json({ error: 'Missing chapterId or paragraphId' });
    }

    try {
        const chapter = await db.prepare('SELECT chapter_number FROM chapters WHERE id = ?').get(chapterId);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

        const paragraph = await db.prepare('SELECT text FROM paragraphs WHERE id = ?').get(paragraphId);
        if (!paragraph) return res.status(404).json({ error: 'Paragraph not found' });

        const promptSourceText = typeof contextText === 'string' && contextText.trim().length > 0 ? contextText : paragraph.text;
        const result = promptEngine.assemblePrompt(promptSourceText, chapter.chapter_number);

        let imageData = null;
        let gpuError = null;
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
                        seed: Math.floor(Math.random() * 1000000),
                    }),
                });

                if (gpuRes.ok) {
                    const buf = await gpuRes.arrayBuffer();
                    imageData = Buffer.from(buf).toString('base64');
                    imageData = `data:image/png;base64,${imageData}`;
                } else {
                    const errText = await gpuRes.text();
                    gpuError = `GPU generation failed (${gpuRes.status}): ${errText.slice(0, 240)}`;
                }
            } catch (err) {
                gpuError = `GPU connection failed: ${err.message}`;
            }
        } else {
            gpuError = 'GPU_API_URL is not configured on backend';
        }

        if (!imageData && gpuError) {
            return res.status(502).json({ error: gpuError });
        }

        return res.json({
            paragraphId,
            chapterNumber: chapter.chapter_number,
            imageBase64: imageData,
            ...result,
        });
    } catch (e) {
        console.error('Prompt Gen Error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// 3. Prompt Request (By Index Convenience): POST /api/generate
router.post('/generate', async (req, res) => {
    const { chapterNumber, paragraphIndex } = req.body;

    if (chapterNumber === undefined || paragraphIndex === undefined) {
        return res.status(400).json({ error: 'Missing chapterNumber or paragraphIndex' });
    }

    try {
        const chapter = await db.prepare('SELECT id, chapter_number FROM chapters WHERE chapter_number = ?').get(chapterNumber);
        if (!chapter) return res.status(404).json({ error: `Chapter ${chapterNumber} not found` });

        const paragraph = await db.prepare('SELECT * FROM paragraphs WHERE chapter_id = ? AND idx = ?').get(chapter.id, paragraphIndex);
        if (!paragraph) return res.status(404).json({ error: `Paragraph index ${paragraphIndex} not found` });

        const result = promptEngine.assemblePrompt(paragraph.text, chapter.chapter_number);

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
                        seed: Math.floor(Math.random() * 1000000),
                    }),
                });

                if (gpuRes.ok) {
                    const buf = await gpuRes.arrayBuffer();
                    imageData = Buffer.from(buf).toString('base64');
                    imageData = `data:image/png;base64,${imageData}`;
                }
            } catch (_err) {
                // preserve previous behavior: soft fail, still return prompt data
            }
        }

        return res.json({
            chapterNumber: chapter.chapter_number,
            paragraphIndex,
            paragraphId: paragraph.id,
            imageBase64: imageData,
            ...result,
        });
    } catch (e) {
        console.error('Generate Error:', e);
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
