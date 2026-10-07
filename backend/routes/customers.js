const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every endpoint here is for Cashiers only
router.use(requireAuth, requireRole('Cashier'));

const PHONE = /^0\d{8,9}$/;                 // Thai numbers: 9 or 10 digits starting with 0
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads one customer with their membership, in the format of the API document
async function findCustomer(conn, column, value) {
  const [[row]] = await conn.query(
    `SELECT c.customer_id, c.name, c.phone, c.email,
            m.member_id, ml.level_name AS member_level, m.current_points,
            ml.discount_percent, DATE_FORMAT(m.join_date, '%Y-%m-%d') AS join_date
       FROM customer c
       LEFT JOIN member m        ON m.customer_id = c.customer_id
       LEFT JOIN member_level ml ON ml.level_id = m.level_id
      WHERE c.${column} = ?`,
    [value]
  );
  if (!row) return null;
  return {
    customer_id: row.customer_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    member: row.member_id
      ? {
          member_id: row.member_id,
          member_level: row.member_level,
          current_points: row.current_points,
          discount_percent: row.discount_percent,
          join_date: row.join_date,
        }
      : null,
  };
}

// GET /api/customers?phone=0812345601 : find a customer by phone
router.get('/', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const customer = await findCustomer(pool, 'phone', phone);
    if (!customer) return res.status(404).json({ error: 'No customer with this phone number' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// POST /api/customers : add a new customer (name and phone required, email optional)
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = req.body?.email ? String(req.body.email).trim() : null;

    if (!name || name.length > 100) {
      return res.status(400).json({ error: 'Name is required (100 characters or less)' });
    }
    if (!PHONE.test(phone)) {
      return res.status(400).json({ error: 'Phone must be 9 or 10 digits starting with 0' });
    }
    if (email && (!EMAIL.test(email) || email.length > 100)) {
      return res.status(400).json({ error: 'Email is not valid' });
    }

    const [result] = await pool.query(
      'INSERT INTO customer (name, phone, email) VALUES (?, ?, ?)',
      [name, phone, email]
    );
    res.status(201).json(await findCustomer(pool, 'customer_id', result.insertId));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A customer with this phone number already exists' });
    }
    next(err);
  }
});

module.exports = router;