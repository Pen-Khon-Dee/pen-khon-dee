const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { SEATING_MINUTES, WARNING_MINUTES } = require('../config');
const { getBill } = require('../services/orders');

const router = express.Router();

// GET /api/tables : every table with its current order time and upcoming reservation
router.get('/', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.table_id,
              t.table_number,
              t.capacity,
              t.table_status,
              oo.order_id,
              oo.order_datetime,
              oo.order_datetime + INTERVAL ? MINUTE        AS should_leave_at,
              TIMESTAMPDIFF(MINUTE, oo.order_datetime, NOW()) AS minutes_seated,
              (SELECT MIN(r.reservation_datetime)
                 FROM reservation r
                 JOIN reservation_table rt ON rt.reservation_id = r.reservation_id
                WHERE rt.table_id = t.table_id
                  AND r.reservation_status = 'Confirmed'
                  AND r.reservation_datetime BETWEEN NOW() AND NOW() + INTERVAL ? MINUTE
              ) AS upcoming_reservation
         FROM dining_table t
         LEFT JOIN (SELECT ot.table_id, o.order_id, o.order_datetime
                      FROM order_table ot
                      JOIN orders o ON o.order_id = ot.order_id
                     WHERE o.order_status = 'Open') oo ON oo.table_id = t.table_id
        ORDER BY t.table_number`,
      [SEATING_MINUTES, SEATING_MINUTES]
    );

    // time_alert tells the frontend which colour to show
    const tables = rows.map((t) => {
      let time_alert = null;
      if (t.order_id) {
        const remaining = SEATING_MINUTES - t.minutes_seated;
        if (remaining <= 0) time_alert = 'overdue';
        else if (remaining < WARNING_MINUTES) time_alert = 'warning';
        else time_alert = 'normal';
      }
      return { ...t, time_alert };
    });

    res.json(tables);
  } catch (err) {
    next(err);
  }
});

// GET /api/tables/:number/order : the open order (bill) of a table (Cashier and Server)
router.get('/:number/order', requireAuth, async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT o.order_id
         FROM dining_table t
         JOIN order_table ot ON ot.table_id = t.table_id
         JOIN orders o       ON o.order_id = ot.order_id
        WHERE t.table_number = ? AND o.order_status = 'Open'`,
      [req.params.number]
    );
    if (!row) {
      return res.status(404).json({ error: `Table ${req.params.number} has no open order` });
    }
    res.json(await getBill(pool, row.order_id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;