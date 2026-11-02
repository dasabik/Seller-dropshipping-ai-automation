# Netlify + Render Deployment Guide (বাংলা)

এই প্রজেক্টে Render-এ থাকা বর্তমান backend/database-ই ব্যবহার হবে। Netlify-তে শুধু `frontend/` প্রকাশ হবে। Netlify-তে নতুন Site তৈরি করার দরকার নেই।

## গুরুত্বপূর্ণ: আগে নিরাপদে কাজ করুন
1. GitHub repository-তে বর্তমান `main` branch-এর একটি backup branch তৈরি করুন অথবা বর্তমান commit hash লিখে রাখুন।
2. Render service-এর settings, environment variables বা database পরিবর্তন করবেন না। এই ZIP-এর Netlify fix Render-এর backend code বদলায় না।
3. `.env`, database password, JWT secret বা Gemini key GitHub-এ upload করবেন না।

## GitHub-এ কী আপলোড করবেন
1. ZIP extract করুন।
2. ZIP-এর ভিতরের project files/folders repository root-এ upload করুন; `frontend` ফোল্ডারটি যেন root-এ থাকে।
3. নতুন `netlify.toml` ফাইলটিও repository root-এ থাকতে হবে (একই স্তরে `package.json`-এর পাশে)।
4. GitHub-এ commit করুন। পুরোনো ফাইলের সঙ্গে একই নামের ফাইল replace করুন; duplicate nested folder তৈরি করবেন না।

## Existing Netlify Site ঠিক করা
1. আগে থেকে থাকা Netlify Site খুলুন: `https://seller-drpshipping-ai-automation.netlify.app/`
2. Site configuration / Build & deploy / Build settings-এ যান।
3. Publish directory যদি আলাদা করে সেট করা থাকে, `frontend` দিন। `netlify.toml` থাকলে এটি একই সেটিং নির্দেশ করবে।
4. Build command খালি রাখুন (এই static frontend-এর build step নেই)।
5. GitHub repository connection একই রাখুন; নতুন Site তৈরি করবেন না।
6. Deploys থেকে সর্বশেষ commit-এর deploy চালু/অপেক্ষা করুন।

## কীভাবে API কাজ করবে
- Browser Netlify-র `/api/...` ঠিকানায় request পাঠাবে।
- `netlify.toml` সেই request-কে Render backend-এ proxy করবে।
- তাই frontend-এ `API_BASE = ''` অপরিবর্তিত থাকবে।
- Render-এর বর্তমান backend/database settings পরিবর্তনের প্রয়োজন নেই।

## পরীক্ষা করার ক্রম
1. Netlify URL খুলুন; Welcome/Login page আসা উচিত।
2. নতুন deploy-এর পরে `https://seller-drpshipping-ai-automation.netlify.app/api/health` খুলুন। এটি Render-এর health JSON দেখাবে।
3. `database: "connected"` না এলে Netlify নয়—Render/PostgreSQL backend readiness সমস্যা; Render dashboard/logs-এ দেখুন।
4. Health ঠিক থাকলে Register দিয়ে নতুন account তৈরি করুন; এরপর Logout করে Login পরীক্ষা করুন।
5. Dashboard, Catalog, Orders এবং AI Assistant খুলে দেখুন। AI ব্যবহারের জন্য Gemini key Render backend-এ থাকতে হবে; Netlify-তে secret key রাখবেন না।

## সীমাবদ্ধতা—সত্যিকারের live integration
এই build-এ Login/Register, database-backed product/order endpoints এবং Gemini endpoints-এর foundation আছে। Flipkart/Amazon/Meesho/Shopify OAuth ও product publish/order sync, supplier live catalog, Delhivery/Shiprocket booking ও tracking-এর পূর্ণ provider adapters এই ZIP-এ সম্পূর্ণ করা নেই। শুধু API key বসালেই এগুলো কাজ করবে না। Official API access, provider-specific adapter code এবং sandbox/live end-to-end tests প্রয়োজন। UI-তে এসব অসম্পূর্ণ integration-কে connected বা successful বলে দেখানো হবে না।

## নিরাপত্তা
- `GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET` শুধু Render-এর Environment Variables-এ রাখুন।
- GitHub-এ `.env` কখনও commit করবেন না।
- API key আগে কোথাও প্রকাশ হয়ে থাকলে সেটি revoke করে নতুন key তৈরি করুন।

## Rollback
Netlify deploy-এ সমস্যা হলে Netlify Deploys থেকে আগের successful deploy-এ rollback করুন। Render-এ কোনো পরিবর্তন করবেন না।
