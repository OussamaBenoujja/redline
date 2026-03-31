# Fablean Memory Service

A Node.js + PostgreSQL service (with TypeORM) for maintaining character consistency and assembling image generation prompts for the Fablean project.

## Features
- **Character Memory**: Stores character details and "looks" that change over time (chapters).
- **Chapter Ingestion**: Splits full chapter text into stable paragraphs.
- **Prompt Assembly**: Generates SDXL-ready prompts combining Style + Scene + Character Locks + Negatives.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run PostgreSQL in Docker (creates DB automatically)**
  ```bash
  npm run db:docker:up
  ```
  This runs a `postgres:16` container named `fablean-postgres` and creates database `fablean`.

  You can also use:
  ```bash
  docker compose up -d
  ```

3.  **Configure Environment**
  Set either `DATABASE_URL` or standard PG variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) in `.env`.

4.  **Seed Database**
    Populates initial characters (Silas Vane, Masked Figure) and Chapter 1.
    ```bash
  npm run seed
    ```

5.  **Start Server**
    ```bash
  npm start
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
