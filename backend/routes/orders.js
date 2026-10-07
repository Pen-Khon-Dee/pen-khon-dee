const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  pool, withTransaction, httpError, recalcTotals, getBill, lockOpenOrder,
} = require('../services/orders');

const router = express.Router();

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

// POST /api/orders : open an order for one or more tables (Cashier)
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

// GET /api/orders/open : every open order (Cashier and Server)
router.get('/open', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id,
              GROUP_CONCAT(t.table_number ORDER BY t.table_number) AS table_numbers,
              o.order_datetime, o.payment_status, o.total_amount,
              (SELECT COUNT(*) FROM order_item oi
                WHERE oi.order_id = o.order_id AND oi.item_status = 'Pending') AS pending_items
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

// POST /api/orders/:id/items : add items to an order (Server)
// Either every item is saved or none are.
router.post('/:id/items', requireAuth, requireRole('Server'), async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty list' });
    }
    for (const item of items) {
      if (!isPositiveInt(item.menu_id) || !isPositiveInt(item.quantity)) {
        return res.status(400).json({ error: 'Each item needs a menu_id and a quantity of 1 or more' });
      }
      if (item.note != null && (typeof item.note !== 'string' || item.note.length > 255)) {
        return res.status(400).json({ error: 'note must be text of 255 characters or less' });
      }
    }

    const bill = await withTransaction(async (conn) => {
      await lockOpenOrder(conn, req.params.id);

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
        [items.map((i) => [
          req.params.id, i.menu_id, i.quantity, byId.get(i.menu_id).price, i.note?.trim() || null,
        ])]
      );
      await recalcTotals(conn, req.params.id);
      return getBill(conn, req.params.id);
    });

    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;