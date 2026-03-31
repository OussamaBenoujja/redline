# RedLine (Fablean) Workspace

Full-stack storytelling platform with:
- Web desktop app (React + Vite)
- Backend API and realtime layer (Node.js + Express + PostgreSQL + Socket.IO)
- Mobile app (Expo + React Native)
- Optional GPU inference service (FastAPI + Diffusers/Transformers)
- Legacy/experimental Electron module

This guide is the main runbook to get the whole project running locally.

## Project Structure

- `fablean_desktop`: Main web UI for readers/authors.
- `fablean_memory`: Backend API, auth, notifications, comments, follows, chapter ingestion, prompt assembly.
- `gpu_service`: Optional AI image + LLM service used by backend for generation endpoints.
- `fablean_mobile`: Mobile app (Expo).
- `fablean_lab`: Electron prototype module.

## Prerequisites

Install these first:
- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL container)
- Python 3.10+ (only if running `gpu_service` locally)
- Git

## Quick Start (Desktop + API + Database)

If you just want the main app running, follow this section.

### 1) Start PostgreSQL

From `fablean_memory`:

```bash
npm install
npm run db:docker:up
```

This creates/starts the `fablean` database in Docker.

### 2) Configure Backend Environment

Create `fablean_memory/.env` from `fablean_memory/.env.example`.

Example values:

```env
PORT=4000
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=fablean
PGSSL=false
JWT_SECRET=dev_jwt_secret_change_me
JWT_EXPIRES_IN=7d
GPU_API_URL=http://localhost:8000
```

Notes:
- You can use `DATABASE_URL` instead of individual `PG*` variables.
- If you are not running the GPU service, keep `GPU_API_URL` as-is; only generation endpoints depend on it.

### 3) Seed Data

From `fablean_memory`:

```bash
npm run seed
```

Useful extras:

```bash
npm run clear
```

### 4) Start Backend API

From `fablean_memory`:

```bash
npm start
```

Backend runs on:
- `http://localhost:4000`
- Health: `http://localhost:4000/health`

### 5) Configure Desktop Web App

Create `fablean_desktop/.env.local` from `fablean_desktop/.env.example`.

Recommended local values:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SCENE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

Important:
- Set `VITE_SCENE_API_BASE_URL` to `4000` unless you intentionally run a separate scene service.

### 6) Start Desktop App

From `fablean_desktop`:

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal (typically `http://localhost:5173`).

## Optional: Run GPU Service (for image/LLM generation)

Only needed for generation endpoints like scene image creation.

From `gpu_service`:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install and run:

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Then keep backend `GPU_API_URL=http://localhost:8000`.

## Optional: Run Mobile App

From `fablean_mobile`:

```bash
npm install
```

Create `fablean_mobile/.env` from `fablean_mobile/.env.example` and set:
- `EXPO_PUBLIC_API_BASE_URL`

Typical values:
- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`
- Physical device: `http://<your-lan-ip>:4000`

Start:

```bash
npm run start
```

## Optional: Run Electron Prototype

From `fablean_lab`:

```bash
npm install
npm start
```

## Recommended Startup Order

1. Database (`fablean_memory` `npm run db:docker:up`)
2. Backend (`fablean_memory` `npm start`)
3. Desktop (`fablean_desktop` `npm run dev`)
4. Optional GPU (`gpu_service` `uvicorn ...`)
5. Optional Mobile (`fablean_mobile` `npm run start`)

## Common Commands

### Backend (`fablean_memory`)

```bash
npm run db:docker:up
npm run seed
npm run clear
npm start
```

### Desktop (`fablean_desktop`)

```bash
npm run dev
npm run build
npm run lint
```

### Mobile (`fablean_mobile`)

```bash
npm run start
npm run android
npm run ios
```

## Troubleshooting

### `npm start` fails at workspace root

Run commands inside module folders (`fablean_memory`, `fablean_desktop`, etc.).
There is no single root orchestrator script for all services.

### Desktop cannot reach backend

- Confirm backend health: `http://localhost:4000/health`
- Check `fablean_desktop/.env.local` values
- Restart Vite after changing env vars

### Database connection errors

- Ensure Docker container is running
- Verify `PG*` values in `fablean_memory/.env`
- Check that port `5432` is not blocked/in use by another PostgreSQL instance

### Generation endpoints fail

- Ensure `gpu_service` is running on `8000`
- Check backend `GPU_API_URL`
- Confirm machine has enough VRAM for selected models

## API and Realtime Notes

- API base path: `/api`
- Realtime notifications/edit channel: Socket.IO on backend server
- Static generated assets served from `/generated`

## Development Notes

- Backend routes are modularized under `fablean_memory/src/routes/` and mounted via `fablean_memory/src/routes.js`.
- Seed data is maintained in `fablean_memory/src/seed.js`.

