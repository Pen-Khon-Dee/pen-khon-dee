const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withTransaction, httpError } = require('../services/orders');
const pool = require('../db');

const router = express.Router();

// POST /api/members : make an existing customer a member (Cashier)
// New members always start at the lowest level (Bronze) with 0 points.
router.post('/', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const customerId = req.body?.customer_id;
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    await withTransaction(async (conn) => {
      const [[customer]] = await conn.query(
        'SELECT customer_id FROM customer WHERE customer_id = ? FOR UPDATE', [customerId]
      );
      if (!customer) throw httpError(404, 'Customer not found');

      const [[existing]] = await conn.query(
        'SELECT member_id FROM member WHERE customer_id = ?', [customerId]
      );
      if (existing) throw httpError(409, 'This customer is already a member');

      const [[lowest]] = await conn.query(
        'SELECT level_id FROM member_level ORDER BY min_points LIMIT 1'
      );
      await conn.query(
        'INSERT INTO member (customer_id, level_id, current_points) VALUES (?, ?, 0)',
        [customerId, lowest.level_id]
      );
    });

    // Return the customer with their new membership, same format as GET /api/customers
    const [[row]] = await pool.query(
      `SELECT c.customer_id, c.name, c.phone, c.email,
              m.member_id, ml.level_name AS member_level, m.current_points,
              ml.discount_percent, DATE_FORMAT(m.join_date, '%Y-%m-%d') AS join_date
         FROM customer c
         JOIN member m        ON m.customer_id = c.customer_id
         JOIN member_level ml ON ml.level_id = m.level_id
        WHERE c.customer_id = ?`,
      [customerId]
    );
    res.status(201).json({
      customer_id: row.customer_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      member: {
        member_id: row.member_id,
        member_level: row.member_level,
        current_points: row.current_points,
        discount_percent: row.discount_percent,
        join_date: row.join_date,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;