const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Helper to get current stock for a product
async function getCurrentStock(productId) {
  const result = await db.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) AS stock
    FROM stock_movements
    WHERE product_id = $1
  `, [productId]);
  return parseInt(result.rows[0].stock) || 0;
}

// POST /api/stock/in - Receive stock (IN)
router.post('/in', async (req, res) => {
  const { sku, quantity } = req.body;

  if (!sku || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'SKU and positive quantity are required' });
  }

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Find product by SKU
    const productResult = await client.query(
      'SELECT id FROM products WHERE sku = $1',
      [sku]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Create stock movement (IN)
    const movementResult = await client.query(
      'INSERT INTO stock_movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *',
      [productId, 'IN', quantity]
    );

    // Get updated stock level
    const stockResult = await client.query(`
      SELECT 
        p.sku,
        p.name,
        COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN sm.type = 'OUT' THEN sm.quantity ELSE 0 END), 0) AS current_stock
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      WHERE p.id = $1
      GROUP BY p.id, p.sku, p.name
    `, [productId]);

    await client.query('COMMIT');

    res.status(201).json({
      movement: movementResult.rows[0],
      product: stockResult.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error receiving stock:', err);
    res.status(500).json({ error: 'Failed to receive stock' });
  } finally {
    client.release();
  }
});

// POST /api/stock/out - Sell/Remove stock (OUT)
router.post('/out', async (req, res) => {
  const { sku, quantity = 1 } = req.body;

  if (!sku || quantity <= 0) {
    return res.status(400).json({ error: 'SKU and positive quantity are required' });
  }

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Find product by SKU
    const productResult = await client.query(
      'SELECT id FROM products WHERE sku = $1',
      [sku]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Check current stock
    const currentStock = await getCurrentStock(productId);

    if (currentStock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient stock',
        currentStock,
        requested: quantity
      });
    }

    // Create stock movement (OUT)
    const movementResult = await client.query(
      'INSERT INTO stock_movements (product_id, type, quantity) VALUES ($1, $2, $3) RETURNING *',
      [productId, 'OUT', quantity]
    );

    // Get updated stock level
    const newStock = currentStock - quantity;

    const productInfo = await client.query(
      'SELECT sku, name FROM products WHERE id = $1',
      [productId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      movement: movementResult.rows[0],
      product: {
        ...productInfo.rows[0],
        previous_stock: currentStock,
        current_stock: newStock
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing stock:', err);
    res.status(500).json({ error: 'Failed to remove stock' });
  } finally {
    client.release();
  }
});

// GET /api/stock - Get all stock levels
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
        MAX(sm.created_at) as last_movement
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY p.sku
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock:', err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// GET /api/stock/movements - Get recent stock movements
router.get('/movements', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sm.id,
        sm.type,
        sm.quantity,
        sm.created_at,
        p.sku,
        p.name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching movements:', err);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

module.exports = router;
