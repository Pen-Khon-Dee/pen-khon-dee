// Customer ordering through the permanent QR code printed on each table. No login: the secret
// token in the QR code identifies the table, and ordering only works while that table has an
// Open, Unpaid order (opened by the Cashier when the guests sit down).
const express = require('express');
const {
  pool, withTransaction, httpError, lockOpenOrder, validateItems, addItems,
} = require('../services/orders');
const { getCustomerMenu } = require('../services/menu');

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

// GET /api/qr/tables : DEMO ONLY. Lists every table with its QR token so the customer page can
// show a "Choose a table" dropdown instead of scanning a real QR code. Picking a table gives the
// page that table's token, and then it uses the same /api/qr/:token routes as a real scan.
// Turn off for real use with DEMO_TABLE_PICKER=false (otherwise anyone could order for any table).
// Must stay above '/:token' so "tables" is not read as a token.
router.get('/tables', async (req, res, next) => {
  try {
    if (process.env.DEMO_TABLE_PICKER === 'false') throw httpError(404, 'Endpoint not found');
    const [rows] = await pool.query(
      `SELECT t.table_number, t.capacity, t.qr_token,
              EXISTS (SELECT 1 FROM order_table ot JOIN orders o ON o.order_id = ot.order_id
                       WHERE ot.table_id = t.table_id
                         AND o.order_status = 'Open' AND o.payment_status = 'Unpaid') AS can_order
         FROM dining_table t
        ORDER BY t.table_number`
    );
    res.json(rows.map((r) => ({ ...r, can_order: Boolean(r.can_order) })));
  } catch (err) {
    next(err);
  }
});

// GET /api/qr/:token : the table's current order (what has been ordered and its status)
router.get('/:token', async (req, res, next) => {
  try {
    const order = await findOrderByToken(pool, req.params.token);
    res.json(await customerView(pool, order.order_id));
  } catch (err) {
    next(err);
  }
});

// GET /api/qr/:token/menu : the table number and the menu grouped by category.
// Works as soon as the QR code is scanned, even before the cashier opens the table,
// so guests can browse right away. can_order tells the page whether to show the Order button.
router.get('/:token/menu', async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!TOKEN.test(token)) throw httpError(404, 'This QR code is not valid');
    const [[table]] = await pool.query(
      `SELECT t.table_number,
              EXISTS (SELECT 1 FROM order_table ot JOIN orders o ON o.order_id = ot.order_id
                       WHERE ot.table_id = t.table_id
                         AND o.order_status = 'Open' AND o.payment_status = 'Unpaid') AS can_order
         FROM dining_table t WHERE t.qr_token = ?`,
      [token]
    );
    if (!table) throw httpError(404, 'This QR code is not valid');

    res.json({
      table_number: table.table_number,
      can_order: Boolean(table.can_order),
      categories: await getCustomerMenu(),
    });
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