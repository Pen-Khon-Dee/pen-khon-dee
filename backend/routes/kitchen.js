const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/kitchen/pending : items still waiting to be served, grouped by order
// No login: the kitchen screen is view-only. Oldest orders come first.
router.get('/pending', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id,
              (SELECT GROUP_CONCAT(t.table_number ORDER BY t.table_number)
                 FROM order_table ot JOIN dining_table t ON t.table_id = ot.table_id
                WHERE ot.order_id = o.order_id) AS table_numbers,
              oi.order_item_id, m.menu_name, oi.quantity, oi.note
         FROM order_item oi
         JOIN orders o ON o.order_id = oi.order_id
         JOIN menu m   ON m.menu_id = oi.menu_id
        WHERE oi.item_status = 'Pending' AND o.order_status = 'Open'
        ORDER BY o.order_datetime, oi.order_item_id`
    );

    // Group the flat rows into one entry per order, keeping the order from SQL
    const orders = new Map();
    for (const r of rows) {
      if (!orders.has(r.order_id)) {
        orders.set(r.order_id, {
          order_id: r.order_id,
          table_numbers: r.table_numbers.split(',').map(Number),
          items: [],
        });
      }
      orders.get(r.order_id).items.push({
        order_item_id: r.order_item_id,
        menu_name: r.menu_name,
        quantity: r.quantity,
        note: r.note,
      });
    }

    res.json([...orders.values()]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;