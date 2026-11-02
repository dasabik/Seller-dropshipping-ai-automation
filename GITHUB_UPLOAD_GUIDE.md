# GitHub Upload Guide

## Keep the project structure intact

Upload the extracted project contents, not a nested ZIP and not just `index.html`. At the repository root, the structure should include:

```text
backend/server.js
backend/services/aiStudioService.js
frontend/index.html
tests/static.test.js
.env.example
.gitignore
.nvmrc
package.json
README.md
AI_SETUP.md
API_REFERENCE.md
DEPLOY_GUIDE.md
PROJECT_FILE_MAP.md
TEST_REPORT.md
```

## Upload using the GitHub website

1. Open your repository.
2. Choose **Add file → Upload files**.
3. Extract the project ZIP on your device first.
4. Upload the project files and folders while preserving the paths shown above. If your browser cannot upload folders, use GitHub Desktop or Git from a computer instead.
5. Review the file list before committing.
6. Commit the changes to the intended branch.
7. Open `package.json` and confirm that the `start` and `test` scripts are present.

## Critical safety notes

- Never upload the real `.env` file. Upload `.env.example` only.
- Do not paste API keys, database passwords, JWT secrets, or customer data into GitHub.
- Do not delete existing project files until you have a backup and have compared the old and new versions.
- Uploading code to GitHub does not automatically run the Node.js server. Configure a Node.js hosting service using `DEPLOY_GUIDE.md`.
- GitHub Pages is static hosting and cannot run this Express/PostgreSQL backend.
