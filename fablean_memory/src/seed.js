const db = require('./db');
const crypto = require('crypto');

function seed() {
    console.log("Seeding database...");

    // 1. Clear Data
    db.exec(`DELETE FROM character_looks`);
    db.exec(`DELETE FROM characters`);
    db.exec(`DELETE FROM paragraphs`);
    db.exec(`DELETE FROM chapters`);
    db.exec(`DELETE FROM sqlite_sequence`); // Reset auto-increment

    // 2. Insert Characters
    const insertChar = db.prepare(`
        INSERT INTO characters (name, aliases, importance, base_description, visual_tags)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Silas
    const silasId = insertChar.run(
        "Detective Silas Vane",
        JSON.stringify(["Silas", "Detective Vane", "Vane"]),
        "MAIN",
        "tall, slender, noir detective silhouette, mysterious",
        JSON.stringify(["noir", "detective", "victorian", "silhouette", "foggy"])
    ).lastInsertRowid;

    // Masked Figure
    const maskId = insertChar.run(
        "The Masked Figure",
        JSON.stringify(["Masked Figure", "figure", "masked man", "porcelain mask"]),
        "SECONDARY",
        "tall, impossibly slender silhouette, eerie",
        JSON.stringify(["mysterious", "ominous", "tall", "shadowy"])
    ).lastInsertRowid;

    console.log(`Inserted Characters: Silas (${silasId}), Masked Figure (${maskId})`);

    // 3. Insert Looks
    const insertLook = db.prepare(`
        INSERT INTO character_looks 
        (character_id, chapter_from, chapter_to, outfit, silhouette_notes, must_keep, avoid)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Silas (Ch 1-12)
    insertLook.run(
        silasId, 1, 12,
        "long dark trench coat, fedora hat",
        "coat hem below knees, structured shoulders, hands near coat pockets",
        JSON.stringify(["long trench coat", "fedora"]),
        JSON.stringify(["hoodie", "short jacket", "modern sneakers", "t-shirt"])
    );

    // Masked Figure (Ch 1-90)
    insertLook.run(
        maskId, 1, 90,
        "dark cloak, porcelain mask hinted in rim light",
        "cloak merges with shadows, narrow shoulders, elongated outline",
        JSON.stringify(["dark cloak silhouette", "tall slender outline"]),
        JSON.stringify(["bright colors", "modern clothing"])
    );

    console.log("Inserted Character Looks.");

    // 4. Insert Test Chapter
    const insertChapter = db.prepare(`
        INSERT INTO chapters (title, chapter_number, full_text)
        VALUES (?, ?, ?)
    `);

    const chapterText = `
The fog hung heavy over the cobblestone streets of Old London, a thick, suffocating blanket that dampened sound and obscured vision. Detective Silas Vane adjusted the collar of his trench coat, the damp air seeping into his bones. He wasn't supposed to be here, not tonight. But the letter had been specific.

'Midnight. The Blackwood Alley. Come alone.'

Silas checked his pocket watch. 11:58 PM. The ticking of the mechanism felt loud in the oppressive silence. He stepped into the alley, his boots splashing in a shallow puddle. A single gas lamp flickered at the far end, casting long, dancing shadows that seemed to claw at the brick walls.

Suddenly, a figure emerged from the gloom. Tall, slender, wrapped in a dark cloak that seemed to merge with the shadows. Silas's hand drifted to his revolver.

'You came,' a voice whispered, smooth as velvet but cold as ice.

'I don't leave loose ends,' Silas replied, his voice gritty. 'Who are you?'

The figure stepped closer, the gaslight catching the rim of a porcelain mask. 'I am the one who knows what you did in Calcutta, Silas.'
    `.trim();

    const chapterId = insertChapter.run("Blackwood Alley", 1, chapterText).lastInsertRowid;
    console.log(`Inserted Chapter: Blackwood Alley (${chapterId})`);

    // 5. Split Paragraphs
    const paras = chapterText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    const insertPara = db.prepare(`
        INSERT INTO paragraphs (id, chapter_id, idx, text)
        VALUES (?, ?, ?, ?)
    `);

    paras.forEach((text, i) => {
        // Deterministic ID: hash(chapter_id + idx + text_preview)
        const hash = crypto.createHash('md5')
            .update(`${chapterId}-${i}-${text.substring(0, 20)}`)
            .digest('hex');

        insertPara.run(hash, chapterId, i, text);
    });

    console.log(`Inserted ${paras.length} Paragraphs.`);
    console.log("Seeding Complete.");
}

seed();
