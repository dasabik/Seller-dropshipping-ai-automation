# Ready-to-Upload Checklist (GitHub)

## Before uploading
1. Keep a backup of the existing GitHub repository.
2. Extract this ZIP on your device.
3. Upload the **contents** of the extracted folder to the repository root (do not upload a ZIP inside the repository).
4. Keep the root `package.json`, `.nvmrc`, `.env.example`, `README.md`, `backend/`, `frontend/`, and `tests/` in their shown locations.
5. Do not upload `.env`, database passwords, JWT secrets, Gemini keys, or marketplace/courier credentials.

## Run locally
- Install Node.js 20 or newer.
- Install PostgreSQL and create a database, or obtain a hosted PostgreSQL connection string.
- Copy `.env.example` to `.env` locally and fill in the database settings plus a unique random `JWT_SECRET` of at least 32 characters.
- Add `GEMINI_API_KEY` only if you want live Google AI Studio/Gemini features.
- Run `npm install`, then `npm test`, then `npm start`.
- Open `http://localhost:5000` and check `http://localhost:5000/api/health`.

## Hosting notes
This is an Express + Node.js app with a PostgreSQL database. GitHub Pages alone cannot run its backend, authentication, database, or server-side AI requests. Deploy to a Node.js hosting provider and configure environment variables in that provider's dashboard.

## Integration status (important)
The interface contains marketplace, supplier, and courier sections, but those connections are not automatically live. Official API credentials, provider approval/OAuth, provider-specific adapters, webhooks where required, and end-to-end tests are still needed. The server intentionally reports unavailable/incomplete integrations rather than pretending that orders synced or shipments were booked.

## Validation completed for this archive
- `node --check backend/server.js`
- `node --check backend/services/aiStudioService.js`
- `npm test` (12 tests, 0 failures)
- ZIP integrity verification

These checks validate source syntax and static/regression expectations. They are not a substitute for testing against a real PostgreSQL database, real AI credentials, or official marketplace/courier accounts.
