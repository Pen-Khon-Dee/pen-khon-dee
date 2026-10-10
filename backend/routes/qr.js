// Customer ordering through the permanent QR code printed on each table. No login: the secret
// token in the QR code identifies the table, and ordering only works while that table has an
// Open, Unpaid order (opened by the Cashier when the guests sit down).
const express = require('express');
const {
  pool, withTransaction, httpError, lockOpenOrder, validateItems, addItems,
} = require('../services/orders');

const router = express.Router();

const TOKEN = /^[0-9a-z]{32}$/i;

// Finds the table's current open order, or throws 404 / 409. Pass lock = true inside a transaction.
async function findOrderByToken(conn, token, lock = false) {
  if (!TOKEN.test(token)) throw httpError(404, 'This QR code is not valid');
  const [[table]] = await conn.query('SELECT table_id FROM dining_table WHERE qr_token = ?', [token]);
  if (!table) throw httpError(404, 'This QR code is not valid');

  const [[order]] = await conn.query(
    `SELECT o.order_id
       FROM order_table ot JOIN orders o ON o.order_id = ot.order_id
      WHERE ot.table_id = ? AND o.order_status = 'Open' AND o.payment_status = 'Unpaid'
      LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [table.table_id]
  );
  if (!order) throw httpError(409, 'This table is not open for ordering. Please ask our staff to seat you');
  return order;
}

// What the customer sees of their own order: no order ID, no customer details
async function customerView(conn, orderId) {
  const [tables] = await conn.query(
    `SELECT t.table_number
       FROM order_table ot JOIN dining_table t ON t.table_id = ot.table_id
      WHERE ot.order_id = ? ORDER BY t.table_number`,
    [orderId]
  );
  const [items] = await conn.query(
    `SELECT m.menu_name, oi.quantity, oi.unit_price, oi.subtotal, oi.item_status, oi.note
       FROM order_item oi JOIN menu m ON m.menu_id = oi.menu_id
      WHERE oi.order_id = ? ORDER BY oi.order_item_id`,
    [orderId]
  );
  const [[totals]] = await conn.query(
    'SELECT discount_amount, total_amount FROM orders WHERE order_id = ?', [orderId]
  );
  return {
    table_numbers: tables.map((t) => t.table_number),
    items,
    discount_amount: totals.discount_amount,
    total_amount: totals.total_amount,
  };
}

// GET /api/qr/:token : the table's current order (what has been ordered and its status)
router.get('/:token', async (req, res, next) => {
  try {
    const order = await findOrderByToken(pool, req.params.token);
    res.json(await customerView(pool, order.order_id));
  } catch (err) {
    next(err);
  }
});

// GET /api/qr/:token/menu : menu grouped by category. Discontinued items are hidden,
// sold-out items are shown so the page can grey them out.
router.get('/:token/menu', async (req, res, next) => {
  try {
    await findOrderByToken(pool, req.params.token);
    const [rows] = await pool.query(
      `SELECT c.category_id, c.category_name, m.menu_id, m.menu_name, m.price, m.availability_status
         FROM menu m JOIN category c ON c.category_id = m.category_id
        WHERE m.availability_status <> 'Discontinued'
        ORDER BY c.category_id, m.menu_id`
    );

    const categories = new Map();
    for (const r of rows) {
      if (!categories.has(r.category_id)) {
        categories.set(r.category_id, { category_id: r.category_id, category_name: r.category_name, items: [] });
      }
      categories.get(r.category_id).items.push({
        menu_id: r.menu_id,
        menu_name: r.menu_name,
        price: r.price,
        availability_status: r.availability_status,
      });
    }
    res.json([...categories.values()]);
  } catch (err) {
    next(err);
  }
});

// POST /api/qr/:token/items : the customer sends their cart. Items go to the kitchen as Pending.
router.post('/:token/items', async (req, res, next) => {
  try {
    const items = req.body?.items;
    const error = validateItems(items);
    if (error) return res.status(400).json({ error });

    const view = await withTransaction(async (conn) => {
      const order = await findOrderByToken(conn, req.params.token, true);
      await lockOpenOrder(conn, order.order_id);
      await addItems(conn, order.order_id, items);
      return customerView(conn, order.order_id);
    });

    res.status(201).json(view);
  } catch (err) {
    next(err);
  }
});

module.exports = router;