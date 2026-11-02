# API Reference

All API routes are served by the Express backend. Authenticated routes require the bearer token returned after successful sign-in, unless otherwise noted. Request and response details may evolve as integrations are implemented.

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | No | Server/database health status |
| `POST` | `/api/auth/register` | No | Register a seller account |
| `POST` | `/api/auth/login` | No | Sign in and receive a token |
| `GET` | `/api/auth/me` | Yes | Read the current seller profile |
| `GET` | `/api/orders` | Yes | Read orders scoped to the signed-in seller |
| `GET` | `/api/catalog` | Yes | Read catalog data scoped to the signed-in seller |
| `POST` | `/api/orders/sync/:channel` | Yes | Check/request order synchronization; provider adapter required for live sync |
| `POST` | `/api/logistics/generate-awb` | Yes | Carrier AWB request; approved carrier adapter required |
| `GET` | `/api/logistics/track/:awb` | Yes | Tracking request; approved carrier adapter required |
| `GET` | `/api/ai/status` | Yes | Check whether AI configuration is present |
| `POST` | `/api/ai/chat` | Yes | Send a chat prompt to the configured AI service |
| `POST` | `/api/ai/image` | Yes | Request an AI-generated image |
| `POST` | `/api/ai/generate-marketing` | Yes | Generate product marketing copy and an optional image |

## Notes

- `/api/ai/status` reports configuration, not a guaranteed successful provider request.
- Marketplace and carrier endpoints must not be interpreted as live integrations until a real provider adapter and approved credentials are configured and tested.
- Never send API keys or database credentials from the browser. AI provider keys belong only in server-side environment variables.
