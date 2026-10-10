const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  pool, withTransaction, httpError, recalcTotals, getBill, lockOpenOrder,
} = require('../services/orders');
const { BAHT_PER_POINT } = require('../config');

const router = express.Router();

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

// Customers add items themselves through the QR code: see routes/qr.js

// POST /api/orders : open an order for one or more tables (Cashier)
// Once the order is open, guests can order with the permanent QR code on their table.
router.post('/', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const tableIds = req.body?.table_ids;
    if (!Array.isArray(tableIds) || tableIds.length === 0 || !tableIds.every(isPositiveInt)) {
      return res.status(400).json({ error: 'table_ids must be a non-empty list of table IDs' });
    }
    const ids = [...new Set(tableIds)];

    const bill = await withTransaction(async (conn) => {
      // Lock the tables so two cashiers cannot open the same table at once
      const [tables] = await conn.query(
        'SELECT table_id, table_number, table_status FROM dining_table WHERE table_id IN (?) FOR UPDATE',
        [ids]
      );
      if (tables.length !== ids.length) throw httpError(404, 'Table not found');

      const busy = tables.filter((t) => t.table_status === 'Occupied');
      if (busy.length) {
        const numbers = busy.map((t) => t.table_number).join(', ');
        throw httpError(409, `Table ${numbers} is already occupied`);
      }

      const [result] = await conn.query(
        'INSERT INTO orders (employee_id) VALUES (?)',
        [req.user.employee_id]
      );
      const orderId = result.insertId;

      await conn.query(
        'INSERT INTO order_table (order_id, table_id) VALUES ?',
        [ids.map((id) => [orderId, id])]
      );
      await conn.query(
        "UPDATE dining_table SET table_status = 'Occupied' WHERE table_id IN (?)",
        [ids]
      );
      return getBill(conn, orderId);
    });

    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/open : every open order (any staff)
router.get('/open', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id,
              GROUP_CONCAT(t.table_number ORDER BY t.table_number) AS table_numbers,
              o.order_datetime, o.payment_status, o.total_amount,
              (SELECT COUNT(*) FROM order_item oi
                WHERE oi.order_id = o.order_id AND oi.item_status = 'Pending') AS pending_items,
              (SELECT COUNT(*) FROM order_item oi
                WHERE oi.order_id = o.order_id AND oi.item_status = 'Ready') AS ready_items
         FROM orders o
         JOIN order_table ot ON ot.order_id = o.order_id
         JOIN dining_table t ON t.table_id = ot.table_id
        WHERE o.order_status = 'Open'
        GROUP BY o.order_id
        ORDER BY o.order_datetime`
    );
    res.json(rows.map((r) => ({ ...r, table_numbers: r.table_numbers.split(',').map(Number) })));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/customer : attach a customer (and their member discount) by phone (Cashier)
router.patch('/:id/customer', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const bill = await withTransaction(async (conn) => {
      await lockOpenOrder(conn, req.params.id);

      const [[customer]] = await conn.query(
        'SELECT customer_id FROM customer WHERE phone = ?', [phone]
      );
      if (!customer) throw httpError(404, 'No customer with this phone number');

      await conn.query(
        'UPDATE orders SET customer_id = ? WHERE order_id = ?',
        [customer.customer_id, req.params.id]
      );
      await recalcTotals(conn, req.params.id);
      return getBill(conn, req.params.id);
    });

    res.json(bill);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/pay : mark the order Paid (Cashier)
// Closes the order, frees its tables, and gives the member points (and a new level if reached).
router.post('/:id/pay', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const result = await withTransaction(async (conn) => {
      const orderId = req.params.id;
      await lockOpenOrder(conn, orderId);

      const [[counts]] = await conn.query(
        `SELECT SUM(item_status IN ('Pending', 'Ready')) AS unserved,
                SUM(item_status <> 'Cancelled')         AS billable
           FROM order_item WHERE order_id = ?`,
        [orderId]
      );
      if (!Number(counts.billable)) {
        throw httpError(409, 'This order has no items to pay for. Cancel it instead');
      }
      if (Number(counts.unserved)) {
        throw httpError(409, 'Some items have not been served yet. Serve or cancel them first');
      }

      // Make sure the amounts are up to date before closing the bill
      await recalcTotals(conn, orderId);
      await conn.query(
        "UPDATE orders SET payment_status = 'Paid', order_status = 'Closed' WHERE order_id = ?",
        [orderId]
      );
      await conn.query(
        `UPDATE dining_table SET table_status = 'Available'
          WHERE table_id IN (SELECT table_id FROM order_table WHERE order_id = ?)`,
        [orderId]
      );

      const [[order]] = await conn.query(
        'SELECT order_id, customer_id, total_amount FROM orders WHERE order_id = ?', [orderId]
      );
      const response = {
        order_id: order.order_id,
        payment_status: 'Paid',
        total_amount: order.total_amount,
        points_earned: 0,
        current_points: null,
        member_level: null,
        level_up: false,
      };

      // Points only for members. Points change only through point_transaction.
      const [[member]] = order.customer_id
        ? await conn.query(
            `SELECT m.member_id, m.current_points, m.level_id, ml.min_points, ml.level_name
               FROM member m JOIN member_level ml ON ml.level_id = m.level_id
              WHERE m.customer_id = ? FOR UPDATE`,
            [order.customer_id]
          )
        : [[null]];
      if (!member) return response;

      const points = Math.floor(order.total_amount / BAHT_PER_POINT);
      const newPoints = member.current_points + points;
      if (points > 0) {
        await conn.query(
          "INSERT INTO point_transaction (member_id, order_id, points, type) VALUES (?, ?, ?, 'Earn')",
          [member.member_id, orderId, points]
        );
      }

      // Highest level the member now qualifies for. Levels never go down.
      const [[level]] = await conn.query(
        'SELECT level_id, level_name, min_points FROM member_level WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1',
        [newPoints]
      );
      const levelUp = level.min_points > member.min_points;
      await conn.query(
        'UPDATE member SET current_points = ?, level_id = ? WHERE member_id = ?',
        [newPoints, levelUp ? level.level_id : member.level_id, member.member_id]
      );

      return {
        ...response,
        points_earned: points,
        current_points: newPoints,
        member_level: levelUp ? level.level_name : member.level_name,
        level_up: levelUp,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/cancel : cancel an order whose food has not been cooked yet (Cashier)
// Allowed only while every item is still Pending or Cancelled.
router.post('/:id/cancel', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const result = await withTransaction(async (conn) => {
      const orderId = req.params.id;
      await lockOpenOrder(conn, orderId);

      const [[cooked]] = await conn.query(
        "SELECT COUNT(*) AS n FROM order_item WHERE order_id = ? AND item_status IN ('Ready', 'Served')",
        [orderId]
      );
      if (cooked.n > 0) {
        throw httpError(409, 'Cannot cancel an order with items that are ready or served');
      }

      await conn.query(
        "UPDATE order_item SET item_status = 'Cancelled' WHERE order_id = ? AND item_status = 'Pending'",
        [orderId]
      );
      await conn.query(
        "UPDATE orders SET order_status = 'Cancelled', discount_amount = 0, total_amount = 0 WHERE order_id = ?",
        [orderId]
      );
      await conn.query(
        `UPDATE dining_table SET table_status = 'Available'
          WHERE table_id IN (SELECT table_id FROM order_table WHERE order_id = ?)`,
        [orderId]
      );
      return { order_id: Number(orderId), order_status: 'Cancelled' };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;