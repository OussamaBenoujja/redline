require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const MEMORY_SERVICE_URL = 'http://localhost:4000';

let mainWindow;

async function ingestChapter1() {
    try {
        const text = await fs.readFile(path.join(__dirname, 'data', 'chapter1.txt'), 'utf-8');
        const res = await fetch(`${MEMORY_SERVICE_URL}/api/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Blackwood Alley",
                chapterNumber: 1,
                fullText: text
            })
        });
        const data = await res.json();
        console.log("Ingestion Result:", data);
    } catch (e) {
        console.error("Ingestion Failed:", e);
    }
}


async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Allow loading local resources for dev/demo purposes
        },
        backgroundColor: '#000000',
        title: "Fablean Lab"
    });

    mainWindow.loadFile('renderer/index.html');
    mainWindow.maximize();
    mainWindow.webContents.openDevTools(); // Debugging: Open DevTools
}

// Log Handler
ipcMain.handle('log', (event, msg) => {
    console.log(`[Renderer] ${msg}`);
});


app.whenReady().then(() => {
    setupIPC();
    createWindow();
    ingestChapter1(); // Ingest on startup

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------

function setupIPC() {

    // 1. Read Text File
    ipcMain.handle('readTextFile', async (event, relativePath) => {
        try {
            const filePath = path.join(__dirname, relativePath);
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('Data Load Error:', error);
            return null;
        }
    });

    // 2. Get Cached Image Path
    ipcMain.handle('getCachedImagePath', async (event, key) => {
        const imagePath = path.join(__dirname, 'cache', 'images', `${key}.png`);
        try {
            await fs.access(imagePath);
            return imagePath; // Return absolute path if exists
        } catch (e) {
            return null;
        }
    });

    // 3. Save Image (Base64 -> File)
    ipcMain.handle('saveImageBase64', async (event, key, base64Data) => {
        const imagePath = path.join(__dirname, 'cache', 'images', `${key}.png`);
        // Remove header if present (e.g., "data:image/png;base64,")
        const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(data, 'base64');

        try {
            await fs.writeFile(imagePath, buf);
            return imagePath;
        } catch (e) {
            console.error("Save Image Error:", e);
            throw e;
        }
    });

    // 4. Fetch Scene Prompt (Real LLM API)
    ipcMain.handle('fetchScenePrompt', async (event, paragraphText, meta) => {
        const apiUrl = process.env.GPU_API_URL;
        console.log("fetchScenePrompt called. GPU_API_URL:", apiUrl);

        if (!apiUrl || apiUrl.includes('replace_with')) {
            console.warn("GPU_API_URL not configured. Returning stub.");
            // Fallback Stub
            const hash = paragraphText.length % 5;
            const themes = ["foggy alley", "dark forest", "neon cyberpunk", "desert ruin", "snowy peak"];
            return {
                prompt: `(Stub) minimalist silhouette of a character in a ${themes[hash]}`,
                negativePrompt: "text, watermark",
                seed: 42 + hash
            };
        }

        try {
            console.log(`Calling LLM: ${apiUrl}/v1/llm/direct`);
            const response = await fetch(`${apiUrl}/v1/llm/direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapter_id: "chapter1",
                    text: paragraphText,
                    known_characters: [],
                    n_scenes: 1
                })
            });

            console.log("LLM Response Status:", response.status);
            if (!response.ok) throw new Error(`LLM API Error: ${response.statusText}`);

            const data = await response.json();
            console.log("LLM Response Data:", JSON.stringify(data).substring(0, 100) + "...");

            let sceneStr = "";
            let seed = 42;

            if (Array.isArray(data)) {
                if (data.length > 0) sceneStr = data[0].scene_prompt;
            } else if (data.scenes && Array.isArray(data.scenes)) {
                if (data.scenes.length > 0) sceneStr = data.scenes[0].scene_prompt;
            } else if (data.scene_prompt) {
                sceneStr = data.scene_prompt;
            } else {
                console.warn("Unexpected LLM response format", data);
                // Try to find ANY reasonable field
                const possible = Object.values(data).find(v => typeof v === 'string' && v.length > 10);
                if (possible) sceneStr = possible;
                else sceneStr = `minimalist silhouette, mysterious atmosphere`;
            }

            console.log("Extracted Scene Prompt:", sceneStr);

            return {
                prompt: sceneStr || "minimalist silhouette",
                negativePrompt: "text, watermark, ugly, deformed, blurry",
                seed: Math.floor(Math.random() * 10000)
            };

        } catch (e) {
            console.error("LLM Fetch Failed:", e);
            return {
                prompt: "minimalist silhouette, error fallback",
                negativePrompt: "",
                seed: 0
            };
        }
    });

    // 5. Fetch Image (Real SDXL API)
    // 5. Fetch Image (Via Memory Service)
    ipcMain.handle('fetchImage', async (event, payload) => {
        console.log(`Requesting Image via Memory Service: Ch ${payload.chapterNumber}, Para ${payload.index}`);

        try {
            const response = await fetch(`${MEMORY_SERVICE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapterNumber: payload.chapterNumber || 1,
                    paragraphIndex: payload.index
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Memory Service Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();

            // If data.imageBase64 is null (GPU down), return a fallback/stub?
            // Or let renderer handle it.
            // Renderer expects { base64Png: ... }

            if (!data.imageBase64) {
                // Fallback Stub if GPU is down but Memory Service is up
                console.warn("Memory Service returned no image (GPU likely down). Returning Stub.");
                const hue = (payload.index * 50) % 360;
                const svg = `
                    <svg width="832" height="832" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="hsl(${hue}, 20%, 10%)" />
                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#555" font-size="24">
                            GPU Offline - Prompt Generated
                        </text>
                        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#444" font-size="14">
                            ${(data.prompt || "").substring(0, 40)}...
                        </text>
                    </svg>`;
                return {
                    base64Png: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
                    prompt: data.prompt
                };
            }

            return {
                base64Png: data.imageBase64,
                prompt: data.prompt
            };

        } catch (e) {
            console.error("Image Generation Failed:", e);
            throw e;
        }
    });
}


