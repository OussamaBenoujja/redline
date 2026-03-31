const db = require('./db');
const crypto = require('crypto');

const AUTHORS = [
    'Lana Mourad',
    'Mina Selim',
    'Rami Idris',
    'Nora Kazem',
    'Youssef Haleem',
    'Dina Farouk',
    'Sami Rahal',
    'Aya Khoury',
    'Karim Beltagi',
    'Leila Haddad',
];

const READER_NAMES = [
    'Fablean Demo Reader',
    'Nadia Alwan',
    'Omar Nabil',
    'Sara Ezzat',
    'Tariq Mostafa',
    'Mariam Fawzy',
    'Ziad Ashraf',
    'Hana Younes',
];

const NOVEL_BLUEPRINTS = [
    { title: 'Clockwork Rain on Atlas Street', genre: 'Sci-Fi', mood: 'electric', place: 'a floating market of copper bridges', core: 'a map that predicts memories before they happen', tags: ['Cyberpunk', 'Mystery', 'Urban'] },
    { title: 'The Foxglove Cartographer', genre: 'Fantasy', mood: 'enchanted', place: 'a forest that redraws itself each dawn', core: 'an atlas inked with living roots', tags: ['Magic', 'Adventure', 'Myth'] },
    { title: 'A Choir of Salt and Iron', genre: 'Drama', mood: 'tender', place: 'a storm-bent harbor town', core: 'songs hidden in rusted ship bells', tags: ['Emotional', 'Family', 'Literary'] },
    { title: 'Sunset Protocol 77', genre: 'Thriller', mood: 'tense', place: 'a desert relay station at the edge of signal range', core: 'a shutdown code everyone wants erased', tags: ['Conspiracy', 'Action', 'Suspense'] },
    { title: 'Velvet Siege of Moon Harbor', genre: 'Fantasy', mood: 'opulent', place: 'a moonlit port ruled by masked guilds', core: 'a treaty signed with stolen starlight', tags: ['Politics', 'Romance', 'Epic'] },
    { title: 'The Last Lantern in Marrow Lane', genre: 'Mystery', mood: 'haunting', place: 'an alley where shadows keep ledgers', core: 'a lamp that reveals forgotten witnesses', tags: ['Noir', 'Secrets', 'Detective'] },
    { title: 'Bluebird Engine', genre: 'Sci-Fi', mood: 'restless', place: 'an orbital rail circling a silent planet', core: 'an engine powered by lullabies', tags: ['Space', 'AI', 'Adventure'] },
    { title: 'Honeyglass Dynasty', genre: 'Fantasy', mood: 'regal', place: 'a capital built inside amber cliffs', core: 'a throne carved from fossilized storms', tags: ['Court', 'Magic', 'Legacy'] },
    { title: 'Neon Prayer at District Nine', genre: 'Thriller', mood: 'sharp', place: 'a city quarter lit by counterfeit dawn', core: 'a prayer app that predicts crimes', tags: ['Tech', 'Crime', 'Dark'] },
    { title: 'When Rivers Learn to Burn', genre: 'Drama', mood: 'lyrical', place: 'a farming valley beneath volcanic skies', core: 'a pact between riverkeepers and fire monks', tags: ['Nature', 'Conflict', 'Hope'] },
    { title: 'The Orchard of Hollow Suns', genre: 'Fantasy', mood: 'dreamlike', place: 'a village under three fading suns', core: 'fruit that stores yesterday\'s voices', tags: ['Folklore', 'Wonder', 'Quest'] },
    { title: 'Paper Crown, Steel Heart', genre: 'Romance', mood: 'warm', place: 'a revolution-era print shop', core: 'love letters smuggled in newspaper margins', tags: ['Romance', 'Historical', 'Slow Burn'] },
    { title: 'Nightshift at Aurora Terminal', genre: 'Sci-Fi', mood: 'melancholic', place: 'an interstellar train station with no daylight', core: 'tickets that lead to impossible timelines', tags: ['Time', 'Space', 'Character'] },
    { title: 'The Basilisk Auditor', genre: 'Fantasy', mood: 'wry', place: 'a dragon bank beneath old catacombs', core: 'a ledger that bites when lies are written', tags: ['Humor', 'Magic', 'Heist'] },
    { title: 'Cinder Atlas', genre: 'Adventure', mood: 'gritty', place: 'a post-war archipelago of black sand', core: 'coordinates etched into volcanic glass', tags: ['Journey', 'Survival', 'Maps'] },
    { title: 'Midnight Cinema for Lost Saints', genre: 'Drama', mood: 'bittersweet', place: 'a one-screen theater that appears once a month', core: 'films made from real memories', tags: ['Magical Realism', 'Healing', 'Community'] },
    { title: 'Thirteen Doors Under Vanta Pier', genre: 'Mystery', mood: 'ominous', place: 'a flooded boardwalk beneath an old pier', core: 'doors that open to erased neighborhoods', tags: ['Horror', 'Urban', 'Puzzle'] },
    { title: 'The Sparrow General', genre: 'Fantasy', mood: 'heroic', place: 'a mountain republic at war with winter', core: 'an army trained by messenger birds', tags: ['War', 'Courage', 'Legend'] },
    { title: 'Low Tide Republic', genre: 'Political', mood: 'urgent', place: 'a city-state built on moving docks', core: 'votes cast with tides instead of paper', tags: ['Politics', 'Society', 'Satire'] },
    { title: 'Ghostlight Over Cedar Run', genre: 'Mystery', mood: 'quiet', place: 'a railway town abandoned by schedules', core: 'a station lamp that signals missing trains', tags: ['Small Town', 'Paranormal', 'Investigation'] },
    { title: 'The Mercury Seamstress', genre: 'Fantasy', mood: 'elegant', place: 'a couture house above alchemical sewers', core: 'dresses stitched from liquid metal', tags: ['Fashion', 'Alchemy', 'Drama'] },
    { title: 'Brassheart Kindergarten', genre: 'Sci-Fi', mood: 'hopeful', place: 'a school for children with mechanical implants', core: 'toys that remember future birthdays', tags: ['Family', 'Future', 'Wholesome'] },
    { title: 'Stormglass Witness', genre: 'Thriller', mood: 'stormy', place: 'a lighthouse district on a knife-edge coast', core: 'a testimony hidden in lightning rods', tags: ['Coastal', 'Pursuit', 'Mystery'] },
    { title: 'The Republic of Wild Ink', genre: 'Fantasy', mood: 'rebellious', place: 'a city where tattoos are legal contracts', core: 'an ink recipe outlawed for a century', tags: ['Rebellion', 'Body Magic', 'Law'] },
    { title: 'Copper Wolves of East Meridian', genre: 'Adventure', mood: 'bold', place: 'a railway frontier of steel canyons', core: 'a freight train carrying a sleeping machine god', tags: ['Western', 'Steampunk', 'Quest'] },
    { title: 'Afterlight Garden', genre: 'Romance', mood: 'soft', place: 'a botanical conservatory powered by moon mirrors', core: 'flowers that bloom for true confessions', tags: ['Romance', 'Atmospheric', 'Healing'] },
    { title: 'Static in the Temple Wires', genre: 'Sci-Fi', mood: 'mystic', place: 'an ancient temple wired into a data grid', core: 'an oracle running on broken firmware', tags: ['Techno-Myth', 'Faith', 'AI'] },
    { title: 'The Mapmaker\'s Quiet Revolt', genre: 'Drama', mood: 'resolute', place: 'an occupied capital with censored streets', core: 'secret maps sewn into coats', tags: ['Resistance', 'Identity', 'Spy'] },
    { title: 'Ivory Harbor After the Flood', genre: 'Literary', mood: 'reflective', place: 'a rebuilt city of suspended walkways', core: 'a registry of homes lost to water', tags: ['Recovery', 'Memory', 'Humanity'] },
    { title: 'The Kindling Parliament', genre: 'Fantasy', mood: 'fiery', place: 'a senate hall warmed by captive comets', core: 'a motion that could ignite the sky', tags: ['Politics', 'Magic', 'High Stakes'] },
];

const CHAPTER_HOOKS = [
    'First Signal',
    'Hidden Ledger',
    'Ash and Oath',
    'Velvet Ambush',
    'Borrowed Dawn',
    'A Door Remembers',
    'The Quiet Coup',
    'Thread of Thunder',
    'Glassfoot Parade',
    'After the Bell',
    'Names in the Rain',
    'The Third Key',
];

function paragraphId(chapterId, idx, text) {
    return crypto
        .createHash('md5')
        .update(`${chapterId}-${idx}-${text.slice(0, 64)}`)
        .digest('hex');
}

function buildChapterText(novel, chapterNumber) {
    const beat = CHAPTER_HOOKS[(chapterNumber + novel.title.length) % CHAPTER_HOOKS.length];
    const para1 = `Chapter ${chapterNumber} opens in ${novel.place}, where the air feels ${novel.mood} and every rumor points to ${novel.core}. The protagonist learns that timing matters more than strength, and missing one hour could cost the city a decade.`;
    const para2 = `At the center of ${beat}, allies disagree on method but not on purpose. One wants caution, one wants speed, and one wants to burn the old rules. Their argument spills into the streets, pulling strangers into a cause they barely understand.`;
    const para3 = `By the end, a small victory reveals a larger trap. A signature is forged, a promise is made, and a witness vanishes with the final clue. The chapter closes with a choice: protect the people now, or risk everything for the truth tomorrow.`;
    return `${para1}\n\n${para2}\n\n${para3}`;
}

async function clearAllTables() {
    const tables = [
        'character_looks',
        'characters',
        'generated_images',
        'paragraphs',
        'scenes',
        'chapters',
        'reading_progress',
        'comment_votes',
        'comment_replies',
        'comments',
        'reviews',
        'notifications',
        'author_followers',
        'novels',
        'users',
    ];

    await db.transaction(async (tx) => {
        for (const tableName of tables) {
            await tx.exec(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
        }
    });

    console.log(`Cleared tables (${tables.length}).`);
}

async function seed() {
    console.log('Seeding database with rich demo data...');

    await clearAllTables();

    const insertUser = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, bio, avatar_url, banner_url, followers_count, streak_days, coins, badges)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const allUserNames = [...AUTHORS, ...READER_NAMES];
    const userIdsByName = new Map();

    for (let i = 0; i < allUserNames.length; i += 1) {
        const fullName = allUserNames[i];
        const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
        const isAuthor = AUTHORS.includes(fullName);
        const bio = isAuthor
            ? `${fullName} writes cinematic ${i % 2 === 0 ? 'speculative' : 'character-driven'} fiction for late-night readers.`
            : `${fullName} is a curious reader who bookmarks cliffhangers and leaves thoughtful comments.`;
        const result = await insertUser.run(
            `${slug}@fablean.app`,
            'hash',
            fullName,
            bio,
            `https://i.pravatar.cc/320?img=${(i % 70) + 1}`,
            `https://picsum.photos/seed/banner-${slug}/1400/420`,
            isAuthor ? 20 + i * 3 : 3 + i,
            2 + (i % 17),
            120 + i * 35,
            JSON.stringify(isAuthor ? ['Author', 'Creator'] : ['Reader'])
        );
        userIdsByName.set(fullName, Number(result.lastInsertRowid));
    }

    const insertNovel = db.prepare(`
        INSERT INTO novels (id, title, author_name, genre, status, featured, rating, reads, chapters_count, tags, synopsis, cover_url, cover_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertChapter = db.prepare(`
        INSERT INTO chapters (novel_id, title, chapter_number, full_text)
        VALUES (?, ?, ?, ?)
    `);
    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, chapter_id, idx, text)
        VALUES (?, ?, ?, ?)
    `);
    const insertReview = db.prepare(`
        INSERT INTO reviews (user_id, novel_id, rating, text, likes)
        VALUES (?, ?, ?, ?, ?)
    `);
    const insertProgress = db.prepare(`
        INSERT INTO reading_progress (user_id, novel_id, progress, bookmark_idx, offline_downloaded, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING user_id
    `);
    const insertComment = db.prepare(`
        INSERT INTO comments (user_id, novel_id, chapter_id, paragraph_idx, text, likes)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const readerIds = READER_NAMES.map((name) => userIdsByName.get(name)).filter(Boolean);

    let totalChapters = 0;
    let totalParagraphs = 0;

    for (let i = 0; i < NOVEL_BLUEPRINTS.length; i += 1) {
        const blueprint = NOVEL_BLUEPRINTS[i];
        const novelId = `n_seed_${String(i + 1).padStart(2, '0')}`;
        const authorName = AUTHORS[i % AUTHORS.length];
        const chapterCount = 2 + (i % 3); // 2 to 4 chapters per novel
        const featured = i < 8 ? 1 : 0;
        const status = i % 4 === 0 ? 'Completed' : 'Ongoing';
        const synopsis = `${blueprint.title} follows unlikely allies in ${blueprint.place}, chasing ${blueprint.core} while every chapter raises the stakes.`;

        await insertNovel.run(
            novelId,
            blueprint.title,
            authorName,
            blueprint.genre,
            status,
            featured,
            0,
            0,
            chapterCount,
            JSON.stringify(blueprint.tags),
            synopsis,
            `https://picsum.photos/seed/fablean-cover-${String(i + 1).padStart(2, '0')}/480/720`,
            null
        );

        for (let chapterNumber = 1; chapterNumber <= chapterCount; chapterNumber += 1) {
            const chapterTitle = `${CHAPTER_HOOKS[(i + chapterNumber) % CHAPTER_HOOKS.length]} - Part ${chapterNumber}`;
            const chapterText = buildChapterText(blueprint, chapterNumber);
            const chapterRes = await insertChapter.run(novelId, chapterTitle, chapterNumber, chapterText);
            const chapterId = Number(chapterRes.lastInsertRowid);

            const paragraphs = chapterText
                .split(/\n\s*\n/)
                .map((p) => p.trim())
                .filter(Boolean);

            for (let pIdx = 0; pIdx < paragraphs.length; pIdx += 1) {
                const text = paragraphs[pIdx];
                await insertParagraph.run(paragraphId(chapterId, pIdx, text), chapterId, pIdx, text);
                totalParagraphs += 1;
            }

            if (chapterNumber === 1) {
                const commenterId = readerIds[i % readerIds.length];
                await insertComment.run(
                    commenterId,
                    novelId,
                    chapterId,
                    0,
                    `The opening of ${blueprint.title} is sharp and atmospheric. Hooked already.`,
                    2 + (i % 9)
                );
            }

            totalChapters += 1;
        }

        const reviewAUser = readerIds[i % readerIds.length];
        const reviewBUser = readerIds[(i + 3) % readerIds.length];
        const ratingA = Number((4.1 + ((i % 8) * 0.1)).toFixed(1));
        const ratingB = Number((4.0 + (((i + 2) % 7) * 0.1)).toFixed(1));

        await insertReview.run(
            reviewAUser,
            novelId,
            ratingA,
            `Cinematic pacing and great chapter endings. ${blueprint.title} keeps the pressure high without losing heart.`,
            4 + (i % 11)
        );
        await insertReview.run(
            reviewBUser,
            novelId,
            ratingB,
            `Loved the worldbuilding in ${blueprint.place}. The central mystery around ${blueprint.core} feels fresh.`,
            1 + (i % 6)
        );

        const progressUsers = [
            readerIds[i % readerIds.length],
            readerIds[(i + 1) % readerIds.length],
            readerIds[(i + 2) % readerIds.length],
        ];

        for (let p = 0; p < progressUsers.length; p += 1) {
            const readerId = progressUsers[p];
            const progress = Math.min(0.95, 0.22 + (p * 0.24) + ((i % 5) * 0.07));
            const bookmark = Math.max(1, Math.min(chapterCount, Math.ceil(progress * chapterCount)));
            await insertProgress.run(
                readerId,
                novelId,
                Number(progress.toFixed(2)),
                bookmark,
                p % 2,
                i % 6 === 0 && p === 0 ? 1 : 0
            );
        }
    }

    console.log(`Inserted users: ${allUserNames.length}`);
    console.log(`Inserted novels: ${NOVEL_BLUEPRINTS.length}`);
    console.log(`Inserted chapters: ${totalChapters}`);
    console.log(`Inserted paragraphs: ${totalParagraphs}`);
    console.log('Seeding complete.');
}

db.initSchema()
    .then(() => seed())
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await db.pool.end();
    });
