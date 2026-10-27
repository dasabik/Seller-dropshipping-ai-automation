/**
 * Master Server Script for Seller Dropshipping & AI Studio
 * Resolves all backend routes, Database connection logic, and Gemini AI integration.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files if available in public or frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------
// 1. PostgreSQL Database Setup & Auto Table Generation
// -----------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/seller_dropshipping_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabaseSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'seller',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INT DEFAULT 0,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id),
        quantity INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        prompt TEXT NOT NULL,
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Database Schema & Tables synced successfully.');
  } catch (err) {
    console.warn('⚠ Database warning (check DATABASE_URL in .env):', err.message);
  }
}
initDatabaseSchema();

// -----------------------------------------------------------------
// 2. Gemini AI Service Initialization
// -----------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI = null;
if (geminiApiKey) {
  genAI = new GoogleGenerativeAI(geminiApiKey);
}

// -----------------------------------------------------------------
// 3. API Routes Integration
// -----------------------------------------------------------------

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', system: 'Seller Dropshipping & AI Studio', timestamp: new Date() });
});

// AI Text & Product Content Generation Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!genAI) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is not configured in .env file.' 
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // Log the prompt and response into the DB
    try {
      await pool.query('INSERT INTO ai_logs (prompt, response) VALUES ($1, $2)', [prompt, aiResponse]);
    } catch (dbError) {
      console.error('Failed to log AI query to DB:', dbError.message);
    }

    res.json({ success: true, response: aiResponse });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to process AI request', details: error.message });
  }
});

// AI Mock Image Route
app.post('/api/ai/generate-image', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  res.json({
    success: true,
    imageUrl: `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(prompt)}`
  });
});

// Product Management APIs
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, products: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { title, description, price, stock, image_url } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO products (title, description, price, stock, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, price, stock || 10, image_url]
    );
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

// -----------------------------------------------------------------
// 4. Default Fallback Route
// -----------------------------------------------------------------
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'frontend', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Seller Studio Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-gray-800 p-6 rounded-xl shadow-lg text-center">
          <h1 class="text-2xl font-bold text-blue-400 mb-2">Backend Server Connected</h1>
          <p class="text-gray-400 text-sm">Your AI Studio & Dropshipping APIs are active and working smoothly.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`✓ Master Server running on port ${PORT}`);
});