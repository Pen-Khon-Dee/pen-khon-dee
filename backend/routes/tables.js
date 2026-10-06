const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { SEATING_MINUTES, WARNING_MINUTES } = require('../config');

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

module.exports = router;