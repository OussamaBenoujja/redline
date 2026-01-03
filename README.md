# RedLine Workspace

This workspace contains desktop, backend, GPU service, and mobile modules for the Fablean project.

## Modules
- `fablean_lab`: Electron desktop application.
- `fablean_memory`: Node.js + SQLite API for chapter ingestion and prompt generation.
- `gpu_service`: Python service for image generation workloads.
- `fablean_mobile`: Expo/React Native app targeting iOS/Android.

## Mobile App (New)
Path: `fablean_mobile`

Quick start:
1. Start backend API from `fablean_memory` on `http://localhost:4000`.
2. In `fablean_mobile`, run `npm install`.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL`.
4. Run `npm run start`.

See `fablean_mobile/README.md` for full setup notes.
