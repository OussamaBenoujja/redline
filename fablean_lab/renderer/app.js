const reader = document.getElementById('reader');
const bgA = document.getElementById('bgA');
const bgB = document.getElementById('bgB');
const statusDiv = document.getElementById('status');

// Configuration
const CHAPTER_PATH = 'data/chapter1.txt';
const PREFETCH_WINDOW = 12;
const MAX_CONCURRENT_GENERATIONS = 2;

// State
let paragraphs = [];
let activeIndex = -1;
let imageCache = new Map(); // index -> imagePath (string)
let pendingGenerations = new Set(); // indices currently being generated

// ---------------------------------------------------------
// Initialization
// ---------------------------------------------------------

async function init() {
    updateStatus("Loading text...");
    const text = await window.api.readTextFile(CHAPTER_PATH);
    if (!text) {
        updateStatus("Error loading text file.");
        return;
    }

    parseAndRender(text);
    setupObserver();
    updateStatus("Ready");
}

function parseAndRender(text) {
    // Split by double newline to get paragraphs
    const rawParas = text.split(/\n\s*\n/);
    paragraphs = rawParas.map(p => p.trim()).filter(p => p.length > 0);

    paragraphs.forEach((text, index) => {
        const p = document.createElement('div'); // Using div for better control than p
        p.className = 'para';
        p.dataset.index = index;
        p.textContent = text;
        reader.appendChild(p);
    });
}

// ---------------------------------------------------------
// Scroll & Observation
// ---------------------------------------------------------

function setupObserver() {
    const observer = new IntersectionObserver((entries) => {
        // Find the most visible paragraph
        let maxRatio = 0;
        let bestIndex = -1;

        // We might need to consider all visible entries
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                bestIndex = parseInt(entry.target.dataset.index);
            }
        });

        // Simpler approach: Just trigger on any intersecting if ratio > 0.5
        // Or if multiple, pick the one closest to center. 
        // For simplicity, let's just use the first entry that crosses threshold suitable for "reading"
    }, {
        root: reader,
        threshold: [0.1, 0.5, 0.9]
    });

    // Actually, we want to know WHICH paragraph is "active" (center screen).
    // IntersectionObserver is event-based. A simpler way for a reader:
    // Listen to scroll, find element closest to center.
    reader.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
}

// Throttled scroll handler
let scrollTimeout;
function handleScroll() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
        determineActiveParagraph();
        scrollTimeout = null;
    }, 100);
}

function determineActiveParagraph() {
    const readerRect = reader.getBoundingClientRect();
    const centerLine = readerRect.top + readerRect.height / 2;

    const paraElements = document.querySelectorAll('.para');
    let closestIndex = -1;
    let minDistance = Infinity;

    paraElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - centerLine);

        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = parseInt(el.dataset.index);
        }
    });

    if (closestIndex !== -1 && closestIndex !== activeIndex) {
        setActiveParagraph(closestIndex);
    }
}

function setActiveParagraph(index) {
    // Update UI
    const prev = document.querySelector(`.para[data-index="${activeIndex}"]`);
    if (prev) prev.classList.remove('active');

    activeIndex = index;
    const curr = document.querySelector(`.para[data-index="${activeIndex}"]`);
    if (curr) curr.classList.add('active');

    updateStatus(`Active Paragraph: ${index}`);

    // Trigger Background Update
    updateBackground(index);

    // Trigger Prefetch
    prefetchImages(index);
}

// ---------------------------------------------------------
// Background & Imaging
// ---------------------------------------------------------

async function updateBackground(index) {
    const imagePath = await ensureImage(index);
    if (imagePath) {
        crossfadeTo(imagePath);
    }
}

async function ensureImage(index) {
    if (window.api && window.api.log) window.api.log(`ensureImage called for index ${index}`);
    // 1. Check in-memory map
    if (imageCache.has(index)) return imageCache.get(index);

    const paraText = paragraphs[index];
    const key = `chapter1_${index}`;

    // 2. Check disk cache
    const cachedPath = await window.api.getCachedImagePath(key);
    if (cachedPath) {
        imageCache.set(index, cachedPath);
        return cachedPath;
    }

    // 3. Generate (if not already pending)
    if (pendingGenerations.has(index)) {
        return null; // Will update when ready? Complex. For now just return null.
        // In real app, we'd wait for the promise.
    }

    // Trigger generation (async, don't await here blocks UI too long if synced)
    // But we need it now. 
    return await generateImage(index, paraText, key);
}

async function generateImage(index, text, key) {
    pendingGenerations.add(index);
    updateStatus(`Generating image for #${index}...`);

    try {
        // Direct call to Memory Service via Main Process
        // No client-side prompt generation anymore
        const result = await window.api.fetchImage({ index, chapterNumber: 1 });

        if (!result || !result.base64Png) throw new Error("No image data returned");

        const filePath = await window.api.saveImageBase64(key, result.base64Png);
        imageCache.set(index, filePath);
        pendingGenerations.delete(index);

        // If this is still the active index, update background immediately
        if (index === activeIndex) {
            crossfadeTo(filePath);
        }

        // Log the prompt used (returned from memory service)
        if (window.api && window.api.log) window.api.log(`Prompt for #${index}: ${result.prompt}`);

        return filePath;
    } catch (e) {
        console.error("Generation failed", e);
        if (window.api && window.api.log) window.api.log(`Generation failed for #${index}: ${e.message}`);
        pendingGenerations.delete(index);
        return null;
    } finally {
        updateStatus("Ready");
    }
}

function prefetchImages(currentIndex) {
    const target = Math.min(currentIndex + PREFETCH_WINDOW, paragraphs.length - 1);

    let activeGens = pendingGenerations.size;

    for (let i = currentIndex + 1; i <= target; i++) {
        if (activeGens >= MAX_CONCURRENT_GENERATIONS) break;

        if (!imageCache.has(i) && !pendingGenerations.has(i)) {
            // Check cache existence quickly first?
            // For now, just trigger ensureImage which checks cache
            // We initiate the promise but don't await it here
            ensureImage(i).then(path => {
                if (path) console.log(`Prefetched ${i}`);
            });
            activeGens++;
        }
    }
}

// ---------------------------------------------------------
// Visuals
// ---------------------------------------------------------

let currentBg = 'A'; // 'A' or 'B'

function crossfadeTo(imagePath) {
    // If path is absolute, file:// protocol is needed or handled by electron?
    // Electron renderer needs file:// for absolute paths usually, or safe loading.
    // 'safe' way: convert to file URL.
    const url = `file://${imagePath.replace(/\\/g, '/')}`;

    const nextBgEnv = currentBg === 'A' ? bgB : bgA;
    const currBgEnv = currentBg === 'A' ? bgA : bgB;

    // Set next image
    // nextBgEnv.style.backgroundImage = `url("${url}")`;
    // Use img tag? No, div background-image covers well.
    // Note: If using mocking with SVG, url might be data uri or file path.
    // Our backend returns file path.

    // Preload image to avoid blank flash?
    const img = new Image();
    img.onload = () => {
        nextBgEnv.style.backgroundImage = `url("${url}")`;
        nextBgEnv.classList.add('active');
        currBgEnv.classList.remove('active');
        currentBg = currentBg === 'A' ? 'B' : 'A';
    };
    img.src = url;
}

function updateStatus(msg) {
    if (statusDiv) statusDiv.textContent = msg;
    console.log(`[Status] ${msg}`);
    if (window.api && window.api.log) window.api.log(msg);
}

// Start
init();
