const db = require('./src/db');

async function test() {
    console.log("Testing API Endpoint...");

    // 1. Get a Paragraph ID
    const para = db.prepare("SELECT id, text FROM paragraphs WHERE text LIKE '%Silas%' LIMIT 1").get();
    if (!para) {
        console.error("No paragraph found!");
        process.exit(1);
    }
    console.log(`Using Paragraph ID: ${para.id}`);

    // 2. Make Request
    const response = await fetch('http://localhost:4000/api/images/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chapterId: 1, // We know seed ID is 1
            paragraphId: para.id
        })
    });

    if (!response.ok) {
        console.error("API Error:", response.status, await response.text());
        process.exit(1);
    }

    const data = await response.json();
    console.log("\nAPI Response:");
    console.log(JSON.stringify(data, null, 2));

    // Validation
    if (data.prompt.includes("fedora")) {
        console.log("\nPASS: API returned prompt with constraints.");
    } else {
        console.error("\nFAIL: API response missing constraints.");
    }

    if (data.imageBase64 && data.imageBase64.startsWith("data:image/png;base64,")) {
        console.log("PASS: API returned generated image.");
    } else {
        console.error("FAIL: API returned no image or invalid format.");
    }
}

test().catch(console.error);
