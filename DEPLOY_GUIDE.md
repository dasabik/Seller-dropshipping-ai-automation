# Deployment Guide

This application is an Express-served web app with a PostgreSQL database. Deploy it to a Node.js hosting service that supports environment variables and outbound HTTPS requests. Static-only hosting (for example, serving `index.html` alone) cannot provide the authenticated backend or AI endpoints.

## Before deployment

- Node.js 20 or later.
- A managed PostgreSQL database.
- A host that runs `npm install` and `npm start`.
- A private, unique `JWT_SECRET` with at least 32 random characters.
- A valid `DATABASE_URL` and optional provider credentials.

## Deploy steps

1. Upload the **contents** of this project to your Git repository. Keep the folder structure shown in `PROJECT_FILE_MAP.md`.
2. Configure the hosting service to use the repository root as the application root.
3. Set the build/install command to `npm install` and the start command to `npm start`.
4. Add environment variables in the host dashboard. Do not upload `.env` to GitHub.
5. Set `NODE_ENV=production`, `PORT` if required by the host, `DATABASE_URL`, `JWT_SECRET`, and any other required database settings.
6. If cross-origin requests are needed, set `FRONTEND_ORIGINS` to the exact trusted HTTPS origin(s). When frontend and backend are served from the same origin, the default same-origin API base is preferred.
7. Deploy and open `/api/health` on the deployed domain.
8. Confirm the response reports the database as connected before testing registration and login.
9. Register a new account and test the main dashboard workflows.
10. If using Gemini, set `GEMINI_API_KEY` and confirm chat and image generation with a real signed-in session.

## Database setup

Create an empty PostgreSQL database named `seller_dropshipping_db`, or use the database name supplied by your hosting provider. Set `DATABASE_URL` to the provider's connection string. If the database provider requires TLS, set `DATABASE_SSL=true`. Only set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` when the provider's documented connection requirements specifically require it and you understand the security trade-off.

The server attempts database initialization at startup and retries when the database is unavailable. A healthy web process does not by itself mean the database is ready.

## Required environment variables

- `NODE_ENV`: `production` on the production host.
- `PORT`: supplied by many hosting providers automatically.
- `JWT_SECRET`: unique, random, private secret of at least 32 characters.
- `DATABASE_URL`: PostgreSQL connection string.
- `GEMINI_API_KEY`: optional, required for Google Gemini features.
- `GEMINI_MODEL` and `GEMINI_IMAGE_MODEL`: model IDs available to your provider project.
- `FRONTEND_ORIGINS`: exact trusted origins if cross-origin requests are required.

See `.env.example` for the complete list of optional provider configuration variables.

## Verification checklist

- [ ] `npm test` passes before deployment.
- [ ] `/api/health` responds successfully.
- [ ] Database status is connected.
- [ ] New account registration works.
- [ ] Login and authenticated profile access work.
- [ ] Orders/catalog endpoints return seller-scoped data.
- [ ] AI chat and image generation work if configured.
- [ ] The site uses HTTPS.
- [ ] No `.env`, API keys, database credentials, or real customer data are committed.
- [ ] Marketplace and carrier actions are tested only with approved sandbox/live credentials and never report success without a provider response.

## Important limitations

The included UI and API foundation do not automatically complete marketplace OAuth, catalog/listing publication, live order synchronization, courier booking, or tracking. Those integrations require provider-specific implementation and verification. The included automated tests are not a substitute for end-to-end production testing.
