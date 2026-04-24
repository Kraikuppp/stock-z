const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /api/products - Get all products with stock levels
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
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
      GROUP BY p.id, p.sku, p.name, p.category, p.created_at
      ORDER BY p.sku
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:sku - Get single product by SKU
router.get('/sku/:sku', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN sm.type = 'OUT' THEN sm.quantity ELSE 0 END), 0) AS current_stock
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      WHERE p.sku = $1
      GROUP BY p.id, p.sku, p.name, p.category
    `, [req.params.sku]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
  const { sku, name, category } = req.body;

  if (!sku || !name) {
    return res.status(400).json({ error: 'SKU and name are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO products (sku, name, category) VALUES ($1, $2, $3) RETURNING *',
      [sku, name, category || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
