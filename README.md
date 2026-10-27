# Seller Drop Shipping AI — Unified Seller Workspace

**Tagline:** Your Business. Our Automation.

An English-first, responsive seller dashboard prototype with a Node.js/Express backend, PostgreSQL-backed seller authentication and data APIs, and optional server-side Google Gemini chat/image generation.

> **Important scope note:** This repository includes the dashboard UI and a working backend foundation. Marketplace, supplier, and courier connections are not automatically live just because credentials are present. Real integrations require approved provider access, provider-specific adapters, OAuth/webhooks where applicable, and end-to-end testing. Do not treat demo previews or connection indicators as proof of a live connection.

## Features included

- Welcome screen, registration/sign-in flow, and seller dashboard.
- Responsive workspace for dashboard metrics, store connection status, suppliers, orders, logistics, inventory/operations, profit estimates, growth/support, and profile.
- Browser-rendered promotional video studio with scene editing and WebM export where supported by the browser.
- Product graphic studio with product-photo upload, square/portrait/story/landscape layouts, theme choices, and PNG export.
- Social content workspace with caption assistance, platform selection, local draft calendar, editing, deletion, and text export.
- Channel connection hub for Flipkart, Amazon, Meesho, Shopify, Delhivery, and Shiprocket status/configuration review.
- Seller-scoped PostgreSQL APIs for authentication, orders, and catalog data.
- Optional Google Gemini chat, product marketing copy, and image generation through authenticated server-side endpoints.
- Static regression tests for syntax, UI hooks, API routes, and safeguards against fabricated marketplace/carrier success.

## Technology

- Node.js 20 or later
- Express 4
- PostgreSQL
- `pg`, `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `dotenv`, and `morgan`
- Plain HTML, CSS utilities, and browser JavaScript in `frontend/index.html`

This project does **not** require Vite; there is no `vite.config.js` because the Express server serves the static frontend directly.

## Project structure

```text
.
├── frontend/
│   └── index.html
├── backend/
│   ├── server.js
│   └── services/
│       └── aiStudioService.js
├── tests/
│   └── static.test.js
├── .env.example
├── .gitignore
├── .nvmrc
├── AI_SETUP.md
├── API_REFERENCE.md
├── COMPLETE_PROJECT_AUDIT.md
├── DEPLOY_GUIDE.md
├── GITHUB_UPLOAD_GUIDE.md
├── PROJECT_FILE_MAP.md
├── PROJECT_FILE_MANIFEST.md
├── README.md
├── READY_TO_UPLOAD_CHECKLIST.md
├── TEST_REPORT.md
└── package.json
```

## Run locally

1. Install Node.js 20+ and PostgreSQL.
2. Create a PostgreSQL database named `seller_dropshipping_db`.
3. Copy `.env.example` to `.env` in the project root.
4. Set `DATABASE_URL` to your database connection string and replace `JWT_SECRET` with a unique random secret of at least 32 characters.
5. Keep `NODE_ENV=development` for local setup. Never commit `.env` or put secrets in frontend files.
6. Install dependencies and start the server:

   ```bash
   npm install
   npm test
   npm start
   ```

7. Open `http://localhost:5000`.
8. Check `http://localhost:5000/api/health`. A `database: "connected"` status means database initialization succeeded.
9. Register a new account through the hosted app. Accounts created in an older standalone HTML preview are not automatically server accounts.

If PostgreSQL is temporarily unavailable, the web server can still start and will retry database initialization. Authentication and database-backed features remain unavailable until the database is ready.

## Configure Google Gemini (optional)

1. Follow `AI_SETUP.md` to obtain a private Google AI Studio API key.
2. Put the key in `GEMINI_API_KEY` in the server-side `.env` file only.
3. Confirm `GEMINI_MODEL` and `GEMINI_IMAGE_MODEL` are available to your Google AI Studio project and region.
4. Restart the server and sign in.
5. Check `/api/ai/status`, then make a real chat/image request. A configured status only confirms that a key is present; it does not prove provider access works.

AI image generation may be unavailable, rate-limited, or billable depending on provider access and current terms. The marketing tool generates a script; it does not render a finished AI video. The built-in video studio renders browser-based scenes and is a separate feature.

## Security and production checklist

- Use HTTPS, `NODE_ENV=production`, a strong unique `JWT_SECRET`, and a managed PostgreSQL database.
- Set `FRONTEND_ORIGINS` to exact trusted origins when cross-origin access is needed.
- Back up the database and monitor server errors.
- Add rate limiting, email verification, password reset/account recovery, audit logging, and operational monitoring before a public launch.
- Review provider-specific security and data-handling rules before connecting marketplace or carrier accounts.
- Never commit `.env`, API keys, database passwords, JWT secrets, or customer data.

## Validation

Run:

```bash
node --check backend/server.js
node --check backend/services/aiStudioService.js
npm test
```

The included tests are static regression checks. They do not prove live database connectivity, provider credentials, AI model availability, marketplace authorization, carrier booking, or production readiness. See `TEST_REPORT.md` and `DEPLOY_GUIDE.md`.


## Docker (optional)
Copy `.env.example` to `.env`, set a strong `POSTGRES_PASSWORD` and a unique `JWT_SECRET` (32+ characters), then run `docker compose up --build -d`. Open `http://localhost:5000/api/health` to inspect server/database readiness. See `A_TO_Z_COMPLETENESS_AND_LIMITATIONS.md` for release test results and provider integration gaps.
