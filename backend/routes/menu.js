const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getCustomerMenu } = require('../services/menu');

const router = express.Router();

const STATUSES = ['Available', 'Sold_Out', 'Discontinued'];

const SELECT_MENU = `
  SELECT m.menu_id, m.menu_name, m.price, m.category_id,
         c.category_name, m.availability_status
    FROM menu m
    JOIN category c ON c.category_id = m.category_id`;

async function findMenu(id) {
  const [rows] = await pool.query(`${SELECT_MENU} WHERE m.menu_id = ?`, [id]);
  return rows[0];
}

// Checks menu_name / price / category_id. Returns an error message, or null if valid.
// When partial is true, missing fields are allowed (used by PUT).
async function validateMenu(body, partial) {
  const { menu_name, price, category_id } = body;

  if (menu_name !== undefined || !partial) {
    if (!String(menu_name || '').trim()) return 'Menu name is required';
  }
  if (price !== undefined || !partial) {
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      return 'Price must be a number of 0 or more';
    }
  }
  if (category_id !== undefined || !partial) {
    const [rows] = await pool.query(
      'SELECT 1 FROM category WHERE category_id = ?', [category_id]
    );
    if (rows.length === 0) return 'Category not found';
  }
  return null;
}

// GET /api/menu/public : menu for anyone, no login (e.g. the website's menu page).
// Grouped by category, discontinued items hidden. Ordering still needs the table's QR code.
router.get('/public', async (req, res, next) => {
  try {
    res.json(await getCustomerMenu());
  } catch (err) {
    next(err);
  }
});

// GET /api/menu : menu list (Cashier and Server)
//   ?category_id=1             only that category
//   ?available=true            only items that can be ordered now
//   ?include_discontinued=true also show discontinued items
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = [];
    const params = [];

    if (req.query.category_id) {
      where.push('m.category_id = ?');
      params.push(req.query.category_id);
    }
    if (req.query.available === 'true') {
      where.push("m.availability_status = 'Available'");
    } else if (req.query.include_discontinued !== 'true') {
      where.push("m.availability_status <> 'Discontinued'");
    }

    const sql = `${SELECT_MENU}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.category_id, m.menu_id`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/menu : add a menu item, always starts as Available (Cashier)
router.post('/', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const error = await validateMenu(req.body || {}, false);
    if (error) return res.status(400).json({ error });

    const { menu_name, price, category_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO menu (menu_name, price, category_id) VALUES (?, ?, ?)',
      [menu_name.trim(), price, category_id]
    );
    res.status(201).json(await findMenu(result.insertId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/:id : edit name, price or category (Cashier)
// Changing the price does not affect old bills: order_item keeps its own unit_price.
router.put('/:id', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const fields = ['menu_name', 'price', 'category_id'].filter((f) => body[f] !== undefined);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const error = await validateMenu(body, true);
    if (error) return res.status(400).json({ error });

    if (!(await findMenu(req.params.id))) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const values = fields.map((f) => (f === 'menu_name' ? body[f].trim() : body[f]));
    await pool.query(
      `UPDATE menu SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE menu_id = ?`,
      [...values, req.params.id]
    );
    res.json(await findMenu(req.params.id));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/menu/:id/availability : Available / Sold_Out / Discontinued (Cashier, Kitchen)
// The kitchen knows first when something runs out, so it can mark items Sold_Out itself.
router.patch('/:id/availability', requireAuth, requireRole('Cashier', 'Kitchen'), async (req, res, next) => {
  try {
    const status = req.body?.availability_status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `availability_status must be one of: ${STATUSES.join(', ')}` });
    }

    const [result] = await pool.query(
      'UPDATE menu SET availability_status = ? WHERE menu_id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(await findMenu(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;