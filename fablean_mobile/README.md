# Fablean Mobile

True mobile app module for iOS/Android using Expo (React Native).

## Prerequisites
- Node.js 20+
- npm 10+
- Expo Go app on device OR Android/iOS emulator

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   copy .env.example .env
   ```
3. Update API base URL in `.env`:
   - Android emulator: `http://10.0.2.2:4000`
   - iOS simulator: `http://localhost:4000`
   - Physical device: `http://<your-lan-ip>:4000`
4. Add Google OAuth client IDs in `.env` for third-party sign-in:
   - `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

## Run
```bash
npm run start
```
Then press `a` for Android or `i` for iOS in Expo CLI.

## Current Scope
- Auth-first shell (`App.js`) with Sign In and Sign Up pages
- Google sign-in option (Expo Auth Session)
- Full novel app shell with tabs for Home, Profile, and Settings
- Home template with featured novels, search, and genre/sort filters
- Profile menu with banner image, profile image, bio, and My Novels section
- Settings menu with reader toggles and developer API health check
- API configuration (`src/config/api.js`)

## Authentication Notes
- Email sign-in and sign-up are currently local UI flow placeholders.
- Google sign-in opens the OAuth flow and marks session success on OAuth callback.
- Next step is wiring token verification/session issuance with your backend auth endpoints.

## Demo User (Testing)
- Email: `demo@fablean.app`
- Password: `Demo@12345`
- Use the **Use demo account** button on the Sign In page to auto-fill credentials.

## Backend Dependency
This module expects the memory API server to be running from `fablean_memory` on port `4000`.

Start backend:
```bash
cd ..\fablean_memory
npm install
node src/server.js
```
