const db = require('./db');
const crypto = require('crypto');

const NOVELS = [
    {
        id: 'n1', title: 'Echoes of Blackwood', author_name: 'Lana Mourad', genre: 'Mystery', status: 'Ongoing', featured: 1, rating: 4.8, reads: 128340, chapters_count: 28, synopsis: 'A memory detective decodes haunted alleys where every clue rewrites the past.', tags: JSON.stringify(['Noir', 'Urban', 'Secrets']), cover_url: 'https://picsum.photos/seed/blackwood/480/720', cover_photo: null
    },
    {
        id: 'n2', title: 'Glass Crown Rebellion', author_name: 'Mina Selim', genre: 'Fantasy', status: 'Completed', featured: 1, rating: 4.9, reads: 301103, chapters_count: 54, synopsis: 'A street thief steals the monarch\'s source of magic—a glass crown.', tags: JSON.stringify(['Epic', 'Politics', 'Magic']), cover_url: 'https://picsum.photos/seed/glasscrown/480/720', cover_photo: null
    },
    {
        id: 'n3', title: 'Neon Lotus Terminal', author_name: 'Rami Idris', genre: 'Sci-Fi', status: 'Ongoing', featured: 0, rating: 4.7, reads: 219450, chapters_count: 17, synopsis: 'An AI wakes up with memories of a murdered human.', tags: JSON.stringify(['Cyberpunk', 'AI', 'Thriller']), cover_url: 'https://picsum.photos/seed/neonlotus/480/720', cover_photo: null
    },
    {
        id: 'n4', title: 'Letters to a Drowned City', author_name: 'Nora Kazem', genre: 'Drama', status: 'Completed', featured: 0, rating: 4.6, reads: 88770, chapters_count: 31, synopsis: 'Romance blossoms through letters delivered by the deep sea currents.', tags: JSON.stringify(['Romance', 'Literary', 'Emotional']), cover_url: 'https://picsum.photos/seed/drownedcity/480/720', cover_photo: null
    },
    {
        id: 'n5', title: 'The Alchemist of Hollow Street', author_name: 'Fablean Demo Reader', genre: 'Fantasy', status: 'Ongoing', featured: 0, rating: 4.4, reads: 17720, chapters_count: 9, synopsis: 'A fledgling alchemist discovers that turning lead to gold has an unfortunate side effect: turning the soul to ash.', tags: JSON.stringify(['My Novel', 'Alchemy', 'Dark Fantasy']), cover_url: 'https://picsum.photos/seed/hollowstreet/480/720', cover_photo: null
    }
];

function seed() {
    console.log("Seeding database...");

    // 1. Clear Data
    db.exec(`DELETE FROM character_looks`);
    db.exec(`DELETE FROM characters`);
    db.exec(`DELETE FROM generated_images`);
    db.exec(`DELETE FROM paragraphs`);
    db.exec(`DELETE FROM chapters`);
    db.exec(`DELETE FROM reading_progress`);
    db.exec(`DELETE FROM comments`);
    db.exec(`DELETE FROM reviews`);
    db.exec(`DELETE FROM notifications`);
    db.exec(`DELETE FROM novels`);
    db.exec(`DELETE FROM users`);
    db.exec(`DELETE FROM sqlite_sequence`); // Reset auto-increment

    // 2. Insert Users
    const insertUser = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, bio, avatar_url, banner_url, followers_count, streak_days, coins, badges)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('lana@fablean.app', 'hash', 'Lana Mourad', 'Mystery author', '', '', 100, 12, 450, JSON.stringify(['Author']));
    insertUser.run('rami@fablean.app', 'hash', 'Rami Idris', 'Sci Fi author', '', '', 400, 5, 120, JSON.stringify(['Author']));
    const demoUserId = insertUser.run(
        'demo@fablean.app', 'hash', 'Fablean Demo Reader', 
        'Fantasy addict, late-night worldbuilder...', 
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80', 
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1400&q=80', 
        142,
        34, /* streak */
        1250, /* coins */
        JSON.stringify(['Early Adopter', 'Avid Reader', 'Top Commenter'])
    ).lastInsertRowid;
    console.log(`Inserted Demo User (${demoUserId})`);

    // 3. Insert Novels
    const insertNovel = db.prepare(`
        INSERT INTO novels (id, title, author_name, genre, status, featured, rating, reads, chapters_count, tags, synopsis, cover_url, cover_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    NOVELS.forEach(n => insertNovel.run(n.id, n.title, n.author_name, n.genre, n.status, n.featured, n.rating, n.reads, n.chapters_count, n.tags, n.synopsis, n.cover_url, n.cover_photo));
    console.log(`Inserted ${NOVELS.length} Novels.`);

    const novel1Id = 'n1';

    // 4. Insert Reading Progress
    const insertProgress = db.prepare(`
        INSERT INTO reading_progress (user_id, novel_id, progress, bookmark_idx, offline_downloaded) VALUES (?, ?, ?, ?, ?)
    `);
    // demoUser has read to chapter 1, paragraph index 3 in n1, safely downloaded
    insertProgress.run(demoUserId, 'n1', 0.42, 3, 1);
    insertProgress.run(demoUserId, 'n2', 0.9, 0, 0);

    // 5. Insert Characters for novel n1
    const insertChar = db.prepare(`
        INSERT INTO characters (novel_id, name, aliases, importance, base_description, visual_tags)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const silasId = insertChar.run(
        novel1Id, "Detective Silas Vane", JSON.stringify(["Silas", "Detective Vane", "Vane"]), "MAIN",
        "tall, slender, noir detective silhouette, mysterious",
        JSON.stringify(["noir", "detective", "victorian", "silhouette", "foggy"])
    ).lastInsertRowid;

    const maskId = insertChar.run(
        novel1Id, "The Masked Figure", JSON.stringify(["Masked Figure", "figure", "masked man", "porcelain mask"]), "SECONDARY",
        "tall, impossibly slender silhouette, eerie",
        JSON.stringify(["mysterious", "ominous", "tall", "shadowy"])
    ).lastInsertRowid;

    // 6. Insert Looks
    const insertLook = db.prepare(`
        INSERT INTO character_looks (character_id, chapter_from, chapter_to, outfit, silhouette_notes, must_keep, avoid)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLook.run(silasId, 1, 12, "long dark trench coat, fedora hat", "coat hem below knees, structured shoulders, hands near coat pockets", JSON.stringify(["long trench coat", "fedora"]), JSON.stringify(["hoodie", "short jacket", "modern sneakers", "t-shirt"]));
    insertLook.run(maskId, 1, 90, "dark cloak, porcelain mask hinted in rim light", "cloak merges with shadows, narrow shoulders, elongated outline", JSON.stringify(["dark cloak silhouette", "tall slender outline"]), JSON.stringify(["bright colors", "modern clothing"]));

    // 7. Insert Chapter
    const insertChapter = db.prepare(`
        INSERT INTO chapters (novel_id, title, chapter_number, full_text)
        VALUES (?, ?, ?, ?)
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

    const chapterId = insertChapter.run(novel1Id, "Blackwood Alley", 1, chapterText).lastInsertRowid;
    console.log(`Inserted Chapter: Blackwood Alley (${chapterId})`);

    // 8. Split Paragraphs
    const paras = chapterText.split(/\\n\\s*\\n/).map(p => p.trim()).filter(p => p.length > 0);
    const insertPara = db.prepare(`
        INSERT INTO paragraphs (id, chapter_id, idx, text)
        VALUES (?, ?, ?, ?)
    `);
    const insertImage = db.prepare(`
        INSERT INTO generated_images (novel_id, chapter_number, paragraph_id, image_path)
        VALUES (?, ?, ?, ?)
    `);

    paras.forEach((text, i) => {
        const hash = crypto.createHash('md5').update(`${chapterId}-${i}-${text.substring(0, 20)}`).digest('hex');
        insertPara.run(hash, chapterId, i, text);

        // Dummy insert for generated_images if it's the first paragraph
        if (i === 0) {
            insertImage.run(novel1Id, 1, hash, `/images/${novel1Id}/ch1_p${i}.png`);
        }
    });

    console.log(`Inserted ${paras.length} Paragraphs.`);

    // 9. Community & Social Data
    const insertComment = db.prepare(`INSERT INTO comments (user_id, novel_id, chapter_id, paragraph_idx, text, likes) VALUES (?, ?, ?, ?, ?, ?)`);
    insertComment.run(demoUserId, novel1Id, chapterId, 0, "Wow, setting the mood immediately! Love this opening.", 24);
    insertComment.run(demoUserId, novel1Id, chapterId, 4, "Is he holding the silver pocket watch from the prequel?", 12);
    
    const insertReview = db.prepare(`INSERT INTO reviews (user_id, novel_id, rating, text, likes) VALUES (?, ?, ?, ?, ?)`);
    insertReview.run(demoUserId, novel1Id, 5.0, "An absolute masterpiece of noir suspense. The AI visuals make every scene come alive.", 156);

    const insertNotification = db.prepare(`INSERT INTO notifications (user_id, type, message, is_read, target_url) VALUES (?, ?, ?, ?, ?)`);
    insertNotification.run(demoUserId, "STREAK_BONUS", "You hit a 30-day streak! +500 Coins awarded.", 0, "/profile");
    insertNotification.run(demoUserId, "NEW_CHAPTER", "Lana Mourad just published Chapter 29 of Echoes of Blackwood!", 1, "/novel/n1");

    console.log("Seeding Complete.");
}

seed();
