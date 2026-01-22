const db = require('./src/db');
const engine = require('./src/prompt_engine');

console.log("Testing Prompt Engine Logic...");

// 1. Get a paragraph with Silas
const para = db.prepare("SELECT * FROM paragraphs WHERE text LIKE '%Silas%' LIMIT 1").get();
if (!para) {
    console.error("No paragraph found with Silas!");
    process.exit(1);
}

console.log(`Testing Paragraph: "${para.text.substring(0, 50)}..."`);

// 2. Detect Characters
const chars = engine.detectCharacters(para.text);
console.log("Detected Characters:", chars.map(c => c.name));

if (!chars.find(c => c.name.includes("Silas"))) {
    console.error("FAIL: Silas not detected!");
} else {
    console.log("PASS: Silas detected.");
}

// 3. Assemble Prompt
const result = engine.assemblePrompt(para.text, 1);
console.log("\nGenerated Prompt:\n", result.prompt);
console.log("\nNegative Prompt:\n", result.negative_prompt);

// 4. Verify Constraints
if (result.prompt.includes("long dark trench coat") && result.prompt.includes("fedora")) {
    console.log("PASS: Prompt contains Silas's outfit constraints.");
} else {
    console.error("FAIL: Prompt missing Silas's outfit constraints!");
}

if (result.negative_prompt.includes("hoodie")) {
    console.log("PASS: Negative prompt contains 'hoodie'.");
} else {
    console.error("FAIL: Negative prompt missing 'hoodie'!");
}
