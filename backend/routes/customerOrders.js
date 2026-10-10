const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const {
  withTransaction, httpError, recalcTotals, getBill, lockOpenOrder,
} = require('../services/orders');

const router = express.Router();
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'items must be a non-empty list';
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return 'Each item must be an object';
    }
    if (!isPositiveInt(item.menu_id) || !isPositiveInt(item.quantity)) {
      return 'Each item needs a menu_id and a quantity of 1 or more';
    }
    if (item.note != null && (typeof item.note !== 'string' || item.note.length > 255)) {
      return 'note must be text of 255 characters or less';
    }
  }
  return null;
}

async function addItems(conn, orderId, items) {
  const menuIds = [...new Set(items.map((item) => item.menu_id))];
  const [menus] = await conn.query(
    'SELECT menu_id, menu_name, price, availability_status FROM menu WHERE menu_id IN (?) FOR UPDATE',
    [menuIds]
  );
  const byId = new Map(menus.map((menu) => [menu.menu_id, menu]));

  for (const item of items) {
    const menu = byId.get(item.menu_id);
    if (!menu) throw httpError(404, `Menu item ${item.menu_id} not found`);
    if (menu.availability_status === 'Sold_Out') {
      throw httpError(409, `${menu.menu_name} is sold out`);
    }
    if (menu.availability_status === 'Discontinued') {
      throw httpError(409, `${menu.menu_name} is no longer sold`);
    }
  }

  await conn.query(
    'INSERT INTO order_item (order_id, menu_id, quantity, unit_price, note) VALUES ?',
    [items.map((item) => [
      orderId, item.menu_id, item.quantity, byId.get(item.menu_id).price, item.note?.trim() || null,
    ])]
  );
  await recalcTotals(conn, orderId);
}

// GET /api/customer/menu : public menu items currently available to order
router.get('/menu', async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT m.menu_id, m.menu_name, m.price, m.category_id, c.category_name
         FROM menu m JOIN category c ON c.category_id = m.category_id
        WHERE m.availability_status = 'Available'
        ORDER BY c.category_id, m.menu_id`
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/tables : public list of tables available for a new order
router.get('/tables', async (req, res, next) => {
  try {
    const [tables] = await pool.query(
      `SELECT table_number, capacity FROM dining_table
        WHERE table_status = 'Available' ORDER BY table_number`
    );
    res.json(tables);
  } catch (err) {
    next(err);
  }
});

// POST /api/customer/orders : create a table order and return its private access token
router.post('/orders', async (req, res, next) => {
  try {
    const tableNumber = Number(req.body?.table_number);
    const items = req.body?.items;
    if (!isPositiveInt(tableNumber)) {
      return res.status(400).json({ error: 'table_number must be a positive integer' });
    }
    const validationError = validateItems(items);
    if (validationError) return res.status(400).json({ error: validationError });

    const accessToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

    const bill = await withTransaction(async (conn) => {
      const [[table]] = await conn.query(
        'SELECT table_id, table_number, table_status FROM dining_table WHERE table_number = ? FOR UPDATE',
        [tableNumber]
      );
      if (!table) throw httpError(404, `Table ${tableNumber} not found`);
      if (table.table_status !== 'Available') throw httpError(409, 'This table is not available');

      const [openOrders] = await conn.query(
        `SELECT o.order_id FROM orders o
          JOIN order_table ot ON ot.order_id = o.order_id
         WHERE ot.table_id = ? AND o.order_status = 'Open' FOR UPDATE`,
        [table.table_id]
      );
      if (openOrders.length) throw httpError(409, 'This table already has an open order');

      const [result] = await conn.query(
        'INSERT INTO orders (employee_id, customer_order_token_hash) VALUES (NULL, ?)',
        [tokenHash]
      );
      const orderId = result.insertId;
      await conn.query('INSERT INTO order_table (order_id, table_id) VALUES (?, ?)', [
        orderId, table.table_id,
      ]);
      await conn.query(
        "UPDATE dining_table SET table_status = 'Occupied' WHERE table_id = ?",
        [table.table_id]
      );
      await addItems(conn, orderId, items);
      return getBill(conn, orderId);
    });

    res.status(201).json({ ...bill, access_token: accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/customer/orders/:id/items : add items using the order's private token
router.post('/orders/:id/items', async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const accessToken = String(req.body?.access_token || '');
    const items = req.body?.items;
    if (!isPositiveInt(orderId)) {
      return res.status(400).json({ error: 'Order ID must be a positive integer' });
    }
    if (!/^[a-f0-9]{64}$/.test(accessToken)) {
      return res.status(401).json({ error: 'A valid order access token is required' });
    }
    const validationError = validateItems(items);
    if (validationError) return res.status(400).json({ error: validationError });
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

    const bill = await withTransaction(async (conn) => {
      const [[order]] = await conn.query(
        `SELECT order_id FROM orders
          WHERE order_id = ? AND customer_order_token_hash = ?`,
        [orderId, tokenHash]
      );
      if (!order) throw httpError(404, 'Customer order not found');

      await lockOpenOrder(conn, orderId);
      await addItems(conn, orderId, items);
      return getBill(conn, orderId);
    });

    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
