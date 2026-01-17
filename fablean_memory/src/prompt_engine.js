const db = require('./db');

// Fixed Blocks
const STYLE_BLOCK = "sli artstyle, cinematic illustration, soft fog diffusion, muted monochrome palette, silhouette-focused scene, readable shapes, gentle contrast, filmic lighting, atmospheric perspective";
const GLOBAL_NEGATIVE = "photorealistic, hyperreal skin detail, text, captions, logos, watermark, oversharp edges, extreme contrast, posterized, glitch, distortion, bad anatomy, blurry";

// Heuristic: Detect characters in text
function detectCharacters(text) {
    const chars = db.prepare("SELECT * FROM characters").all();
    const found = [];

    chars.forEach(char => {
        let aliases = [];
        try { aliases = JSON.parse(char.aliases || "[]"); } catch (e) { }

        // Also check name
        aliases.push(char.name);

        // precise word matching might be better, but includes valid for MVP
        // "Silas" matches "Silas's"
        const isPresent = aliases.some(alias => text.toLowerCase().includes(alias.toLowerCase()));

        if (isPresent) {
            found.push(char);
        }
    });

    return found;
}

// Get constraints for detected characters
function getCharacterConstraints(characterIds, chapterNum) {
    const constraints = [];
    const avoid = new Set(); // dedupe avoids

    characterIds.forEach(charId => {
        const look = db.prepare(`
            SELECT * FROM character_looks 
            WHERE character_id = ? 
            AND chapter_from <= ? 
            AND (chapter_to IS NULL OR chapter_to >= ?)
        `).get(charId, chapterNum, chapterNum);

        if (look) {
            const char = db.prepare("SELECT * FROM characters WHERE id = ?").get(charId);

            // Build Description Block
            let desc = `${char.name}: ${char.base_description}.`;
            if (look.outfit) desc += ` Wearing ${look.outfit}.`;
            if (look.silhouette_notes) desc += ` ${look.silhouette_notes}.`;

            // Add Must Keep
            let mustKeeps = [];
            try { mustKeeps = JSON.parse(look.must_keep || "[]"); } catch (e) { }
            if (mustKeeps.length > 0) desc += ` Must show: ${mustKeeps.join(", ")}.`;

            constraints.push(desc);

            // Add Avoids
            let avoids = [];
            try { avoids = JSON.parse(look.avoid || "[]"); } catch (e) { }
            avoids.forEach(a => avoid.add(a));
        }
    });

    return {
        characterBlock: constraints.join(" | "),
        avoidList: Array.from(avoid)
    };
}

function assemblePrompt(text, chapterNum) {
    // 1. Scene Summary (Send the full paragraph text to get all environmental details)
    const sceneBlock = text.trim();

    // 2. Character Logic
    const detectedChars = detectCharacters(text);
    const { characterBlock, avoidList } = getCharacterConstraints(detectedChars.map(c => c.id), chapterNum);

    // 3. Assemble
    // Review: Scene must be first for SDXL to attend to it most strongly.
    // Format: [Scene] . [Characters] . [Style]
    const promptParts = [sceneBlock];

    if (characterBlock) {
        promptParts.push(characterBlock);
    } else {
        // No characters detected. Force landscape/scenic shot
        promptParts.push("landscape shot, pure scenery, no people, empty, wide angle");
        avoidList.push("person", "human", "character", "man", "woman", "figure", "silhouette of a person");
    }

    promptParts.push(STYLE_BLOCK);

    const fullPrompt = promptParts.join(" . ");

    // 4. Negatives
    const fullNegative = [GLOBAL_NEGATIVE, ...avoidList].join(", ");

    return {
        prompt: fullPrompt,
        negative_prompt: fullNegative,
        components: {
            style: STYLE_BLOCK,
            scene: sceneBlock,
            characters: characterBlock,
            detected_characters: detectedChars.map(c => c.name)
        }
    };
}

module.exports = {
    detectCharacters,
    getCharacterConstraints,
    assemblePrompt
};
