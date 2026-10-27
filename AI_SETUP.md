# Google Gemini AI setup (simple checklist)

1. Open Google AI Studio and create an API key for a project.
2. Keep the key private. If it has been shared publicly, revoke it and create a new one.
3. In the project root, copy .env.example to .env.
4. Set GEMINI_API_KEY=your_private_key in .env. Do not add the key to frontend/index.html.
5. Confirm the configured GEMINI_MODEL and GEMINI_IMAGE_MODEL are available to your account; update them if Google changes model availability.
6. Configure PostgreSQL and a unique JWT_SECRET (at least 32 random characters).
7. Run npm install and npm start, then register/sign in in the browser.
8. Test the chat with a simple question, then test image generation. A status badge only means settings are present; only successful requests prove the model is working.

Costs and limits depend on your Google AI Studio account, model, region and current pricing. This project generates marketing text and a video script; it does not create a finished video file.
