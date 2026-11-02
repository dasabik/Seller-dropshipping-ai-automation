-- Reference schema for Seller Drop Shipping AI.
-- backend/server.js currently creates/updates these tables at startup using CREATE TABLE IF NOT EXISTS.
-- This file is for inspection and backup documentation; it is not automatically executed by Docker.
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
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
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
