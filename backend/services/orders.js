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

const MAX_LINES = 20;     // different dishes in one request
const MAX_QUANTITY = 20;  // of one dish in one request

// Checks the items list sent by a customer. Returns an error message, or null if valid.
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'items must be a non-empty list';
  if (items.length > MAX_LINES) return `You can send at most ${MAX_LINES} dishes at a time`;
  for (const item of items) {
    if (!Number.isInteger(item?.menu_id) || item.menu_id <= 0) return 'Each item needs a menu_id';
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      return `Quantity must be between 1 and ${MAX_QUANTITY}`;
    }
    if (item.note != null && (typeof item.note !== 'string' || item.note.length > 255)) {
      return 'note must be text of 255 characters or less';
    }
  }
  return null;
}

// Adds items to an order that is already locked with lockOpenOrder.
// Either every item is saved or none are. New items start as Pending and go to the kitchen.
async function addItems(conn, orderId, items) {
  const menuIds = [...new Set(items.map((i) => i.menu_id))];
  const [menus] = await conn.query(
    'SELECT menu_id, menu_name, price, availability_status FROM menu WHERE menu_id IN (?)',
    [menuIds]
  );
  const byId = new Map(menus.map((m) => [m.menu_id, m]));

  for (const item of items) {
    const menu = byId.get(item.menu_id);
    if (!menu) throw httpError(404, `Menu item ${item.menu_id} not found`);
    if (menu.availability_status === 'Sold_Out') throw httpError(409, `${menu.menu_name} is sold out`);
    if (menu.availability_status === 'Discontinued') throw httpError(409, `${menu.menu_name} is no longer sold`);
  }

  // unit_price is copied from the menu now, so later price changes do not affect this bill
  await conn.query(
    'INSERT INTO order_item (order_id, menu_id, quantity, unit_price, note) VALUES ?',
    [items.map((i) => [orderId, i.menu_id, i.quantity, byId.get(i.menu_id).price, i.note?.trim() || null])]
  );
  await recalcTotals(conn, orderId);
}

module.exports = {
  pool, withTransaction, httpError, recalcTotals, getBill, lockOpenOrder,
  validateItems, addItems,
};