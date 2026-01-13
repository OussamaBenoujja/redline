# Fablean Memory Service

A Node.js + SQLite service for maintaining character consistency and assembling image generation prompts for the Fablean project.

## Features
- **Character Memory**: Stores character details and "looks" that change over time (chapters).
- **Chapter Ingestion**: Splits full chapter text into stable paragraphs.
- **Prompt Assembly**: Generates SDXL-ready prompts combining Style + Scene + Character Locks + Negatives.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Seed Database**
    Populates initial characters (Silas Vane, Masked Figure) and Chapter 1.
    ```bash
    node src/seed.js
    ```

3.  **Start Server**
    ```bash
    node src/server.js
    ```
    Runs on `http://localhost:4000`.

## API Endpoints

### 1. Ingest Chapter
**POST** `/api/chapters`
```json
{
  "title": "Blackwood Alley",
  "chapterNumber": 1,
  "fullText": "..."
}
```

### 2. Get Chapter
**GET** `/api/chapters/:id`

### 3. Request Image Prompt
**POST** `/api/images/request`
```json
{
  "chapterId": 1,
  "paragraphId": "..."
}
```

**Response:**
```json
{
  "prompt": "cinematic illustration... [Scene] ... [Character Constraints]",
  "negative_prompt": "...",
  "components": { ... }
}
```

## Testing
Run the included test script to verify successful prompt generation:
```bash
node test_api_client.js
```
