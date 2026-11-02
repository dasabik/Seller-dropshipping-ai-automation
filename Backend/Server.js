'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = express();
const PORT = Number(process.env.PORT || 5000);
const production = process.env.NODE_ENV === 'production';
let databaseReady = false;
const jwtSecretConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 && !/replace_with_|change_me|placeholder/i.test(process.env.JWT_SECRET));
if (!jwtSecretConfigured) {
  if (production) throw new Error('JWT_SECRET must be a unique random value of at least 32 characters; replace the example placeholder.');
  console.warn('[Startup] Set a unique random JWT_SECRET of at least 32 characters before deployment.');
}
const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  max: Number(process.env.DB_POOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000
} : {
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'seller_dropshipping_db', user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, max: Number(process.env.DB_POOL_MAX || 10), connectionTimeoutMillis: 5000
});
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5000').split(',').map(s => s.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(production ? 'combined' : 'dev'));
app.use((req,res,next)=>{ res.setHeader('Cache-Control','no-store'); next(); });

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, store_name VARCHAR(120) NOT NULL, phone VARCHAR(30) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(100) NOT NULL, seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
      marketplace VARCHAR(40) NOT NULL, pay_method VARCHAR(30), phone VARCHAR(30), pincode VARCHAR(12),
      risk_score VARCHAR(20), awb VARCHAR(100), courier VARCHAR(80), status VARCHAR(80) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (seller_id, id)
    );
    CREATE INDEX IF NOT EXISTS orders_seller_created_idx ON orders(seller_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL, sku VARCHAR(100), cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      selling_price NUMERIC(12,2) NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS carrier_logs (
      id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      order_id VARCHAR(100), carrier VARCHAR(80) NOT NULL, awb VARCHAR(100), status VARCHAR(80) NOT NULL,
      response_payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      provider VARCHAR(40) NOT NULL, access_token_enc TEXT, refresh_token_enc TEXT, metadata JSONB NOT NULL DEFAULT '{}',
      connected_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(seller_id, provider)
    );
  `);
  databaseReady = true;
}
function signToken(seller) {
  if (!jwtSecretConfigured) throw new Error('Authentication is not configured: set a unique random JWT_SECRET of at least 32 characters.');
  return jwt.sign({ sub: String(seller.id), email: seller.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'seller-drop-shipping-ai', audience: 'seller-dashboard' });
}
function auth(req,res,next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ success:false, message:'Please sign in to continue.' });
  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, { issuer:'seller-drop-shipping-ai', audience:'seller-dashboard' });
    req.sellerId = payload.sub; next();
  } catch (_) { return res.status(401).json({ success:false, message:'Your session has expired. Please sign in again.' }); }
}
const publicSeller = row => ({ id:String(row.id), name:row.name, email:row.email, storeName:row.store_name, phone:row.phone, createdAt:row.created_at });
app.get('/api/health', async (req,res) => {
  let database = 'unavailable'; try { await pool.query('SELECT 1'); database = databaseReady ? 'connected' : 'schema-not-ready'; } catch (_) {}
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'online' : 'degraded', database, message: healthy ? 'Backend and database are ready.' : 'The website is running, but PostgreSQL/schema setup is not ready. Check database settings and logs.', integrations: { flipkart: Boolean(process.env.FLIPKART_CLIENT_ID && process.env.FLIPKART_CLIENT_SECRET), amazon: Boolean(process.env.AMAZON_CLIENT_ID && process.env.AMAZON_CLIENT_SECRET), meesho: Boolean(process.env.MEESHO_API_BASE_URL && process.env.MEESHO_API_TOKEN), shopify: Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET), delhivery: Boolean(process.env.DELHIVERY_API_TOKEN), shiprocket: Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) }, timestamp:new Date().toISOString() });
});
app.use('/api', (req,res,next) => {
  if (req.path === '/health') return next();
  if (!databaseReady) return res.status(503).json({success:false,code:'DATABASE_NOT_READY',message:'The website server is running, but PostgreSQL is not ready. Start PostgreSQL, check DATABASE_URL / DB settings, and wait for the server to initialize the database.'});
  next();
});
app.post('/api/auth/register', async (req,res,next) => {
  try {
    const name = String(req.body.name || '').trim(); const storeName = String(req.body.storeName || '').trim();
    const phone = String(req.body.phone || '').trim(); const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100 || storeName.length < 2 || storeName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || phone.length < 7 || phone.length > 30 || password.length < 10 || password.length > 128) return res.status(400).json({success:false,message:'Enter valid name, store, phone, email, and a password between 10 and 128 characters.'});
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO sellers(name,email,password_hash,store_name,phone) VALUES($1,$2,$3,$4,$5) RETURNING *',[name,email,hash,storeName,phone]);
    const seller = publicSeller(result.rows[0]); res.status(201).json({success:true, token:signToken(seller), seller});
  } catch (e) { if (e.code === '23505') return res.status(409).json({success:false,message:'An account with this email already exists.'}); next(e); }
});
app.post('/api/auth/login', async (req,res,next) => {
  try {
    const identifier = String(req.body.phone || req.body.identifier || req.body.email || '').trim(); const password = String(req.body.password || '');
    if (!identifier || !password) return res.status(400).json({success:false,message:'Registered mobile number and password are required.'});
    const normalized = identifier.toLowerCase();
    const result = await pool.query("SELECT * FROM sellers WHERE regexp_replace(phone, '[^0-9]', '', 'g')=regexp_replace($1, '[^0-9]', '', 'g') OR lower(email)=$2 ORDER BY CASE WHEN regexp_replace(phone, '[^0-9]', '', 'g')=regexp_replace($1, '[^0-9]', '', 'g') THEN 0 ELSE 1 END LIMIT 1",[identifier,normalized]);
    if (!result.rowCount || !(await bcrypt.compare(password,result.rows[0].password_hash))) return res.status(401).json({success:false,message:'Mobile number or password is incorrect.'});
    const seller = publicSeller(result.rows[0]); res.json({success:true,token:signToken(seller),seller});
  } catch(e) { next(e); }
});
app.get('/api/auth/me', auth, async (req,res,next) => { try { const r=await pool.query('SELECT * FROM sellers WHERE id=$1',[req.sellerId]); if(!r.rowCount)return res.status(401).json({success:false,message:'Account not found.'}); res.json({success:true,seller:publicSeller(r.rows[0])}); } catch(e){next(e);} });
app.get('/api/orders', auth, async (req,res,next) => { try { const r=await pool.query(`SELECT id,product_name AS "productName",amount,marketplace,pay_method AS "payMethod",phone,pincode,risk_score AS "riskScore",awb,courier,status,created_at AS "createdAt" FROM orders WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 500`,[req.sellerId]); res.json({success:true,count:r.rowCount,data:r.rows}); } catch(e){next(e);} });
app.get('/api/catalog', auth, async (req,res,next) => { try { const r=await pool.query('SELECT id,name,sku,cost_price AS "costPrice",selling_price AS "sellingPrice",stock FROM products WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 500',[req.sellerId]); res.json({success:true,count:r.rowCount,data:r.rows}); } catch(e){next(e);} });
function notConnected(provider, envKeys) { return (req,res) => { const missing=envKeys.filter(k=>!process.env[k]); if(missing.length) return res.status(503).json({success:false,code:'INTEGRATION_NOT_CONFIGURED',message:`${provider} connection is not configured. Add the required credentials and complete the provider authorization flow.`,missingConfiguration:missing}); return res.status(501).json({success:false,code:'PROVIDER_ADAPTER_REQUIRED',message:`${provider} credentials exist, but the provider-specific API adapter and authorization flow must be implemented and verified before this action can run.`}); }; }
app.post('/api/orders/sync/:channel', auth, (req,res) => { const channel=String(req.params.channel||'').toLowerCase(); const config={flipkart:['FLIPKART_CLIENT_ID','FLIPKART_CLIENT_SECRET'],amazon:['AMAZON_CLIENT_ID','AMAZON_CLIENT_SECRET'],meesho:['MEESHO_API_BASE_URL','MEESHO_API_TOKEN'],shopify:['SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET']}; if(!config[channel])return res.status(400).json({success:false,message:'Unsupported channel.'}); return notConnected(channel,config[channel])(req,res); });
app.post('/api/logistics/generate-awb', auth, (req,res) => { const carrier=String(req.body.carrier||'delhivery').toLowerCase(); if(carrier.includes('shiprocket'))return notConnected('Shiprocket',['SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD'])(req,res); return notConnected('Delhivery',['DELHIVERY_API_TOKEN'])(req,res); });
app.get('/api/logistics/track/:awb', auth, (req,res) => { if(!process.env.DELHIVERY_API_TOKEN)return res.status(503).json({success:false,code:'INTEGRATION_NOT_CONFIGURED',message:'Delhivery tracking is unavailable until the official API token and tracking adapter are configured.'}); return res.status(501).json({success:false,code:'PROVIDER_ADAPTER_REQUIRED',message:'Tracking adapter is not implemented yet; no estimated delivery or status will be fabricated.'}); });
// Google Gemini AI integration. Keys remain server-side; live success is never simulated.
const googleAI = require('./services/aiStudioService');
function aiConfigStatus(){
  const googleReady = googleAI.isConfigured();
  const openAIReady = Boolean(process.env.AI_API_KEY && process.env.AI_MODEL);
  const openAIImageReady = Boolean(process.env.AI_API_KEY && process.env.AI_IMAGE_MODEL);
  return {
    chatConfigured: googleReady || openAIReady,
    imageConfigured: googleReady || openAIImageReady,
    provider: googleReady ? 'Google Gemini' : (openAIReady || openAIImageReady ? 'OpenAI-compatible' : 'Not configured'),
    configurationPresent: googleReady || openAIReady || openAIImageReady
  };
}
app.get('/api/ai/status', (req,res)=>{
  const s=aiConfigStatus();
  res.json({success:true,chatConfigured:s.chatConfigured,imageConfigured:s.imageConfigured,provider:s.provider,status:s.configurationPresent?'configured-not-live-tested':'missing-api-key'});
});
app.post('/api/ai/chat', auth, async (req,res)=>{
  const message=typeof req.body.message==='string'?req.body.message.trim():'';
  if(!message||message.length>5000)return res.status(400).json({success:false,message:'A message between 1 and 5000 characters is required.'});
  const incoming=Array.isArray(req.body.history)?req.body.history.slice(-12):[];
  const history=incoming.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=5000).map(m=>({role:m.role,content:m.content}));
  try {
    if(googleAI.isConfigured()) {
      const reply=await googleAI.generateChat(message,history);
      return res.json({success:true,reply,model:process.env.GEMINI_MODEL||'gemini-3.8-flash',provider:'Google Gemini'});
    }
    const key=process.env.AI_API_KEY, model=process.env.AI_MODEL, base=(process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
    if(!key||!model)return res.status(503).json({success:false,code:'AI_NOT_CONFIGURED',message:'Gemini AI is not configured. Add GEMINI_API_KEY to the backend .env file, then restart the server.'});
    const response=await fetch(base+'/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'You are Seller AI, a capable assistant for general questions and Indian e-commerce, dropshipping, product research, business planning, writing, troubleshooting and marketing. Reply in the user’s language. Never claim external actions happened unless confirmed.'},...history,{role:'user',content:message}],temperature:0.6,max_tokens:1200}),signal:AbortSignal.timeout(60000)});
    const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(response.status===429?429:502).json({success:false,message:data?.error?.message||'AI provider request failed.'});
    const reply=data?.choices?.[0]?.message?.content;if(typeof reply!=='string'||!reply.trim())return res.status(502).json({success:false,message:'AI provider returned no text answer.'});
    return res.json({success:true,reply:reply.trim(),model,provider:'OpenAI-compatible'});
  } catch(e) { const status=e.statusCode===429?429:502; res.status(status).json({success:false,message:e.message||'Could not reach the configured AI provider.'}); }
});
app.post('/api/ai/image', auth, async (req,res)=>{
  const prompt=typeof req.body.prompt==='string'?req.body.prompt.trim():'';
  const allowedSizes=new Set(['1024x1024','1024x1536','1536x1024']);
  const size=allowedSizes.has(req.body.size)?req.body.size:'1024x1024';
  if(!prompt||prompt.length>2000)return res.status(400).json({success:false,message:'An image prompt between 1 and 2000 characters is required.'});
  try {
    if(googleAI.isConfigured()) {
      const image=await googleAI.generateHighGraphicsImage(prompt,size);
      return res.json({success:true,imageData:image.imageData,mimeType:image.mimeType,model:image.model,provider:'Google Gemini'});
    }
    const key=process.env.AI_API_KEY, model=process.env.AI_IMAGE_MODEL, base=(process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
    if(!key||!model)return res.status(503).json({success:false,code:'IMAGE_AI_NOT_CONFIGURED',message:'Image generation is not configured. Add GEMINI_API_KEY or configure an image provider in the server .env file.'});
    const response=await fetch(base+'/images/generations',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,prompt,size,n:1}),signal:AbortSignal.timeout(120000)});
    const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(response.status===429?429:502).json({success:false,message:data?.error?.message||'Image provider request failed.'});
    const item=data?.data?.[0];if(item?.b64_json)return res.json({success:true,imageData:item.b64_json,mimeType:'image/png',model,provider:'OpenAI-compatible'});
    if(item?.url){const img=await fetch(item.url,{signal:AbortSignal.timeout(30000)});if(!img.ok)throw new Error('Image provider returned a URL that could not be downloaded.');const type=img.headers.get('content-type')||'image/png';const buf=Buffer.from(await img.arrayBuffer());if(!type.startsWith('image/')||buf.length>12*1024*1024)throw new Error('Image provider returned an invalid or oversized image.');return res.json({success:true,imageData:'data:'+type+';base64,'+buf.toString('base64'),mimeType:type,model,provider:'OpenAI-compatible'});}
    return res.status(502).json({success:false,message:'Image provider returned no image data.'});
  } catch(e) { res.status(e.statusCode===429?429:502).json({success:false,message:e.message||'Image generation failed.'}); }
});
app.post('/api/ai/generate-marketing', auth, async (req,res)=>{
  const title=typeof req.body.title==='string'?req.body.title.trim():'';
  const category=typeof req.body.category==='string'?req.body.category.trim():'';
  const price=String(req.body.price??'').trim();
  if(!title||title.length>250||!category||category.length>120||!price||price.length>40)return res.status(400).json({success:false,message:'Provide a product title, category and price.'});
  if(!googleAI.isConfigured())return res.status(503).json({success:false,message:'Marketing generation requires GEMINI_API_KEY in the backend .env file.'});
  try {
    const marketingCopy=await googleAI.generateProductCopy(title,category,price);
    let generatedImage=null;
    if(req.body.generateImage===true&&marketingCopy.imagePrompt){try{const image=await googleAI.generateHighGraphicsImage(marketingCopy.imagePrompt);generatedImage=image.imageData;}catch(imageError){console.warn('[AI] Optional marketing image generation failed:',imageError.message);}}
    res.json({success:true,data:{...marketingCopy,generatedImage},provider:'Google Gemini'});
  } catch(e) { res.status(502).json({success:false,message:e.message||'Marketing generation failed.'}); }
});
app.use('/api', (req,res)=>res.status(404).json({success:false,message:`API endpoint not found: ${req.path}`}));
app.use(express.static(path.join(__dirname,'../frontend')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../frontend/index.html')));
app.use((err,req,res,next)=>{ console.error('[API error]',err.message); if(res.headersSent)return next(err); res.status(500).json({success:false,message:production?'An unexpected server error occurred.':'Server error: '+err.message}); });
async function start(){
  const server=app.listen(PORT,()=>console.log(`Seller Drop Shipping AI listening on port ${PORT}`));
  let retryTimer=null;
  const attemptDatabaseInit=async()=>{try{await initDatabase();console.log('[Database] PostgreSQL schema is ready.');if(retryTimer){clearInterval(retryTimer);retryTimer=null;}}catch(e){databaseReady=false;console.error('[Database] Not ready:',e.message,'— website stays available; database initialization will retry.');if(!retryTimer)retryTimer=setInterval(attemptDatabaseInit,15000);}};
  await attemptDatabaseInit();
  const shutdown=async()=>{if(retryTimer)clearInterval(retryTimer);server.close(async()=>{await pool.end();process.exit(0);});};
  process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
start().catch(e=>{console.error('[Startup failed]',e.message);process.exit(1);});
