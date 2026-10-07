// Shared order logic used by several routes
const pool = require('../db');

// Runs fn inside a transaction. Rolls back everything if fn throws.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Creates an error that the error handler in server.js returns as { error: message }
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Recalculates discount_amount and total_amount from the order's non-cancelled items
// and the customer's member level. Call after any change to items or customer.
async function recalcTotals(conn, orderId) {
  const [[row]] = await conn.query(
    `SELECT COALESCE(SUM(CASE WHEN oi.item_status <> 'Cancelled' THEN oi.subtotal END), 0) AS items_total,
            COALESCE(ml.discount_percent, 0) AS discount_percent
       FROM orders o
       LEFT JOIN order_item oi  ON oi.order_id = o.order_id
       LEFT JOIN member m       ON m.customer_id = o.customer_id
       LEFT JOIN member_level ml ON ml.level_id = m.level_id
      WHERE o.order_id = ?
      GROUP BY o.order_id, ml.discount_percent`,
    [orderId]
  );
  const itemsTotal = Number(row.items_total);
  const discount = round2((itemsTotal * Number(row.discount_percent)) / 100);
  await conn.query(
    'UPDATE orders SET discount_amount = ?, total_amount = ? WHERE order_id = ?',
    [discount, round2(itemsTotal - discount), orderId]
  );
}

// Returns the full bill of one order in the format described in the API document
async function getBill(conn, orderId) {
  const [[order]] = await conn.query(
    `SELECT order_id, customer_id, order_datetime, order_status, payment_status,
            discount_amount, total_amount
       FROM orders WHERE order_id = ?`,
    [orderId]
  );
  if (!order) return null;

  const [tables] = await conn.query(
    `SELECT t.table_number
       FROM order_table ot JOIN dining_table t ON t.table_id = ot.table_id
      WHERE ot.order_id = ? ORDER BY t.table_number`,
    [orderId]
  );

  let customer = null;
  if (order.customer_id) {
    const [[c]] = await conn.query(
      `SELECT c.customer_id, c.name, c.phone,
              ml.level_name AS member_level, ml.discount_percent
         FROM customer c
         LEFT JOIN member m        ON m.customer_id = c.customer_id
         LEFT JOIN member_level ml ON ml.level_id = m.level_id
        WHERE c.customer_id = ?`,
      [order.customer_id]
    );
    customer = c || null;
  }

  const [items] = await conn.query(
    `SELECT oi.order_item_id, oi.menu_id, m.menu_name, oi.quantity,
            oi.unit_price, oi.subtotal, oi.item_status, oi.note
       FROM order_item oi JOIN menu m ON m.menu_id = oi.menu_id
      WHERE oi.order_id = ? ORDER BY oi.order_item_id`,
    [orderId]
  );

  const itemsTotal = round2(
    items.filter((i) => i.item_status !== 'Cancelled').reduce((sum, i) => sum + i.subtotal, 0)
  );

  return {
    order_id: order.order_id,
    table_numbers: tables.map((t) => t.table_number),
    order_datetime: order.order_datetime,
    order_status: order.order_status,
    payment_status: order.payment_status,
    customer,
    items,
    items_total: itemsTotal,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
  };
}

// Locks an order row for update and checks it can still be changed
async function lockOpenOrder(conn, orderId) {
  const [[order]] = await conn.query(
    'SELECT order_id, order_status, payment_status FROM orders WHERE order_id = ? FOR UPDATE',
    [orderId]
  );
  if (!order) throw httpError(404, 'Order not found');
  if (order.order_status !== 'Open' || order.payment_status === 'Paid') {
    throw httpError(409, 'This order is closed and cannot be changed');
  }
  return order;
}

module.exports = { pool, withTransaction, httpError, recalcTotals, getBill, lockOpenOrder };