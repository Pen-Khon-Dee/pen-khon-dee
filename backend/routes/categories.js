const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories : all categories (Cashier and Server)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT category_id, category_name FROM category ORDER BY category_id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories : add a category (Cashier)
router.post('/', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const name = String(req.body?.category_name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO category (category_name) VALUES (?)',
      [name]
    );
    res.status(201).json({ category_id: result.insertId, category_name: name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This category already exists' });
    }
    next(err);
  }
});

// PUT /api/categories/:id : rename a category (Cashier)
router.put('/:id', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const name = String(req.body?.category_name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [result] = await pool.query(
      'UPDATE category SET category_name = ? WHERE category_id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ category_id: Number(req.params.id), category_name: name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This category already exists' });
    }
    next(err);
  }
});

module.exports = router;