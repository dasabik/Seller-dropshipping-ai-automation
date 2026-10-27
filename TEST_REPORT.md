# Test Report

## Test environment

- Node.js: runtime available in the build environment
- Test command: `npm test`
- Syntax checks: `node --check backend/server.js` and `node --check backend/services/aiStudioService.js`

## Results for this package build

- Backend JavaScript syntax check: PASS
- Gemini service JavaScript syntax check: PASS
- Static regression suite: **12 tests passed, 0 failed**

The regression suite checks package scripts/runtime metadata, JavaScript parsing, API and UI presence, unique HTML IDs, inline click-handler references, no seeded fake supplier/seller identity, safe handling of marketplace/carrier actions, server-side AI credential handling, startup behavior, and AI service wiring.

## Not tested by these checks

These are static/code-level tests only. They do not prove:

- successful PostgreSQL connection or migrations in the target hosting environment;
- live Google AI Studio model access, image generation, quotas, or billing;
- marketplace OAuth or live catalog/order synchronization;
- courier AWB creation or live tracking;
- production security, load, accessibility, or browser/device compatibility.

Run `npm test` again after any code change. Complete the deployment checklist in `DEPLOY_GUIDE.md` before using the application with real sellers or customers.
