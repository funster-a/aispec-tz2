-- Supabase SQL Migration: create orders table
-- Run this in the Supabase SQL editor or via supabase/migrations

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  retailcrm_id VARCHAR(50) UNIQUE NOT NULL,
  number      VARCHAR(50),
  created_at  TIMESTAMPTZ,
  status      VARCHAR(50),
  total       NUMERIC(10, 2),
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  email       VARCHAR(200),
  phone       VARCHAR(50),
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
