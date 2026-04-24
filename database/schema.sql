-- Stock-Z Database Schema
-- PostgreSQL / Supabase compatible

-- Recreate schema from scratch (drop old objects first)
DROP VIEW IF EXISTS product_stock;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS generated_codes CASCADE;
DROP TABLE IF EXISTS product_types CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Products table (no stock stored here!)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product types for Code Generator (managed from UI)
CREATE TABLE product_types (
    id BIGSERIAL PRIMARY KEY,
    type_key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '📦',
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock movements table (this tracks all IN/OUT transactions)
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(3) CHECK (type IN ('IN', 'OUT')) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'QR_SCAN', 'SYSTEM')),
    scan_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated labels/codes history
CREATE TABLE generated_codes (
    id BIGSERIAL PRIMARY KEY,
    product_type VARCHAR(30) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    code_type VARCHAR(10) NOT NULL CHECK (code_type IN ('barcode', 'qrcode', 'both')),
    qr_value TEXT NOT NULL,
    barcode_value VARCHAR(100) NOT NULL,
    label_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_types_key ON product_types(type_key);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(source);
CREATE INDEX IF NOT EXISTS idx_generated_codes_sku ON generated_codes(sku);
CREATE INDEX IF NOT EXISTS idx_generated_codes_created_at ON generated_codes(created_at DESC);

-- If your table already exists in production, run this migration:
-- ALTER TABLE stock_movements
--   ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
--   CHECK (source IN ('MANUAL', 'QR_SCAN', 'SYSTEM'));
-- ALTER TABLE stock_movements
--   ADD COLUMN IF NOT EXISTS scan_payload JSONB;
-- CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(source);
-- CREATE TABLE IF NOT EXISTS generated_codes (
--   id BIGSERIAL PRIMARY KEY,
--   product_type VARCHAR(30) NOT NULL,
--   sku VARCHAR(50) NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   category VARCHAR(100),
--   extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
--   code_type VARCHAR(10) NOT NULL CHECK (code_type IN ('barcode', 'qrcode', 'both')),
--   qr_value TEXT NOT NULL,
--   barcode_value VARCHAR(100) NOT NULL,
--   label_text TEXT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX IF NOT EXISTS idx_generated_codes_sku ON generated_codes(sku);
-- CREATE INDEX IF NOT EXISTS idx_generated_codes_created_at ON generated_codes(created_at DESC);

-- ============================================
-- Supabase Row Level Security (RLS) Policies
-- Must enable RLS and add policies for anon access
-- ============================================

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_codes ENABLE ROW LEVEL SECURITY;

-- Products: allow anon full access
CREATE POLICY "Allow anon read products" ON products
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert products" ON products
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update products" ON products
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete products" ON products
    FOR DELETE TO anon USING (true);

-- Product types: allow anon full access
CREATE POLICY "Allow anon read product types" ON product_types
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert product types" ON product_types
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update product types" ON product_types
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete product types" ON product_types
    FOR DELETE TO anon USING (true);

-- Stock movements: allow anon full access
CREATE POLICY "Allow anon read movements" ON stock_movements
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert movements" ON stock_movements
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update movements" ON stock_movements
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete movements" ON stock_movements
    FOR DELETE TO anon USING (true);

-- Generated codes: allow anon full access
CREATE POLICY "Allow anon read generated codes" ON generated_codes
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert generated codes" ON generated_codes
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update generated codes" ON generated_codes
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete generated codes" ON generated_codes
    FOR DELETE TO anon USING (true);

-- View to calculate current stock levels
CREATE VIEW product_stock AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.category,
    COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN sm.type = 'OUT' THEN sm.quantity ELSE 0 END), 0) AS current_stock,
    p.created_at
FROM products p
LEFT JOIN stock_movements sm ON p.id = sm.product_id
GROUP BY p.id, p.sku, p.name, p.category, p.created_at;

-- Seed default product types
INSERT INTO product_types (type_key, label, icon, fields, is_default) VALUES
('shirt', 'เสื้อ (Shirt)', '👕', '[{"key":"size","label":"ไซส์ (Size)","placeholder":"S, M, L, XL, XXL"},{"key":"length","label":"ความยาวเสื้อ (Length)","placeholder":"เช่น 70 cm"},{"key":"color","label":"สี (Color)","placeholder":"เช่น ดำ, ขาว, น้ำเงิน"}]'::jsonb, true),
('pants', 'กางเกง (Pants)', '👖', '[{"key":"waist","label":"ขนาดเอว (Waist)","placeholder":"เช่น 30, 32, 34"},{"key":"inseam","label":"ความยาวกางเกง (Inseam)","placeholder":"เช่น 30, 32"},{"key":"length","label":"ความยาวเสื้อ/ทั้งตัว (Length)","placeholder":"เช่น 100 cm"}]'::jsonb, true),
('general', 'ทั่วไป (General)', '📦', '[{"key":"spec","label":"รายละเอียด (Spec)","placeholder":"เช่น 330ml, 500g"}]'::jsonb, true);

