const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const GPU_API_URL = process.env.GPU_API_URL || 'http://localhost:8000';

async function analyzeChapter(text) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout for GPU inference

        const res = await fetch(`${GPU_API_URL}/v1/llm/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`GPU Service error (${res.status}):`, errBody);
            return { suggestions: [], characters: [], error: `GPU service returned ${res.status}: ${errBody}` };
        }

        const data = await res.json();
        return {
            suggestions: data.suggestions || [],
            characters: data.characters || []
        };
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('AI Agent timeout: GPU service took too long');
            return { suggestions: [], characters: [], error: 'GPU service timed out (>2 min)' };
        }
        console.error('AI Agent error:', err.message);
        return { suggestions: [], characters: [], error: `GPU service unreachable: ${err.message}` };
    }
}

module.exports = { analyzeChapter };
