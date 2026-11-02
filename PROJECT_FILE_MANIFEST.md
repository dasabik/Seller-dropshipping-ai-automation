# Project File Manifest — v4

This manifest lists every file included in `Seller_Drop_Shipping_AI_FIXED_READY_GITHUB_v4_ENV_MATCHED.zip`.
The ZIP is packaged so these paths extract directly into the repository root.

## Application and test files
- `.env.example` — safe environment-variable template; placeholders only.
- `.gitignore` — excludes `.env`, secrets, dependencies, logs, and temporary files.
- `.nvmrc` — requests Node.js major version 20.
- `package.json` — dependencies and `start`, `dev`, and `test` scripts.
- `backend/server.js` — Express server, authentication/API routes, PostgreSQL schema initialization, and frontend hosting.
- `backend/services/aiStudioService.js` — server-side Gemini adapter.
- `frontend/index.html` — complete bundled HTML/CSS/browser-JavaScript interface.
- `tests/static.test.js` — static regression tests.

## Setup and documentation files
- `README.md` — overview and local setup.
- `AI_SETUP.md` — Gemini setup notes.
- `API_REFERENCE.md` — API endpoint reference.
- `COMPLETE_PROJECT_AUDIT.md` — audit results and known limitations.
- `DEPLOY_GUIDE.md` — deployment guide.
- `GITHUB_UPLOAD_GUIDE.md` — repository upload instructions.
- `PROJECT_FILE_MAP.md` — file purpose map.
- `READY_TO_UPLOAD_CHECKLIST.md` — pre-upload and deployment checklist.
- `TEST_REPORT.md` — test results and limits.
- `PROJECT_FILE_MANIFEST.md` — this inventory.

## Completeness notes
- The database tables are initialized by `backend/server.js`; a separate SQL schema/migration file is not required by the current implementation.
- The frontend interface is bundled into `frontend/index.html`; the current source does not reference any required local image/CSS/JavaScript asset files.
- `package-lock.json` is not included. `npm install` resolves dependencies from `package.json`; for reproducible deployments, a lockfile can be generated and committed after installing dependencies.
- Live marketplace/courier adapters, provider OAuth/webhooks, and production email/password-recovery workflows are not present as separate files because they are not implemented in this project version. Their UI/status placeholders must not be mistaken for live integrations.
- A real `.env` is intentionally not included. Create it privately from `.env.example` and supply your own database credentials and secrets.


## Release packaging files added in the audited bundle
- `.dockerignore` — excludes local secrets and development files from Docker build context.
- `Dockerfile` — Node.js application image.
- `docker-compose.yml` — local application + PostgreSQL services.
- `db/schema.sql` — reference SQL schema matching backend table initialization.
- `A_TO_Z_COMPLETENESS_AND_LIMITATIONS.md` — release checks and explicit live-integration limitations.
