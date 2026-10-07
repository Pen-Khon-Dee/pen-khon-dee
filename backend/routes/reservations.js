const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withTransaction, httpError } = require('../services/orders');
const { SEATING_MINUTES, LATE_LIMIT_MINUTES } = require('../config');

const router = express.Router();

// Every endpoint here is for Cashiers only
router.use(requireAuth, requireRole('Cashier'));

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

// Reads reservations in the format described in the API document
async function findReservations(conn, whereSql, params) {
  const [rows] = await conn.query(
    `SELECT r.reservation_id,
            r.reservation_datetime,
            r.reservation_datetime + INTERVAL ? MINUTE AS end_datetime,
            r.number_of_guests,
            r.reservation_status,
            GROUP_CONCAT(t.table_id ORDER BY t.table_number)     AS table_ids,
            GROUP_CONCAT(t.table_number ORDER BY t.table_number) AS table_numbers,
            c.customer_id, c.name, c.phone,
            CASE WHEN r.reservation_status = 'Confirmed' AND NOW() > r.reservation_datetime
                 THEN TIMESTAMPDIFF(MINUTE, r.reservation_datetime, NOW()) ELSE 0 END AS late_minutes
       FROM reservation r
       JOIN customer c           ON c.customer_id = r.customer_id
       JOIN reservation_table rt ON rt.reservation_id = r.reservation_id
       JOIN dining_table t       ON t.table_id = rt.table_id
      WHERE ${whereSql}
      GROUP BY r.reservation_id
      ORDER BY r.reservation_datetime`,
    [SEATING_MINUTES, ...params]
  );
  return rows.map((r) => ({
    reservation_id: r.reservation_id,
    reservation_datetime: r.reservation_datetime,
    end_datetime: r.end_datetime,
    number_of_guests: r.number_of_guests,
    reservation_status: r.reservation_status,
    table_ids: r.table_ids.split(',').map(Number),
    table_numbers: r.table_numbers.split(',').map(Number),
    customer: { customer_id: r.customer_id, name: r.name, phone: r.phone },
    late_minutes: Number(r.late_minutes),
  }));
}

// GET /api/reservations?date=2026-10-04 : reservations on that day (default today)
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must look like 2026-10-04' });
    }
    const list = date
      ? await findReservations(pool, 'DATE(r.reservation_datetime) = ?', [date])
      : await findReservations(pool, 'DATE(r.reservation_datetime) = CURDATE()', []);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations : book one or more tables for a customer
// Rejected if any table already has a Confirmed reservation within 2 hours of this time.
router.post('/', async (req, res, next) => {
  try {
    const { customer_id, reservation_datetime, number_of_guests, table_ids } = req.body || {};

    if (!isPositiveInt(customer_id)) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    if (!isPositiveInt(number_of_guests) || number_of_guests > 255) {
      return res.status(400).json({ error: 'number_of_guests must be between 1 and 255' });
    }
    if (!Array.isArray(table_ids) || table_ids.length === 0 || !table_ids.every(isPositiveInt)) {
      return res.status(400).json({ error: 'table_ids must be a non-empty list of table IDs' });
    }
    if (typeof reservation_datetime !== 'string'
        || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(reservation_datetime)) {
      return res.status(400).json({ error: 'reservation_datetime must look like 2026-10-04 18:00:00' });
    }
    const ids = [...new Set(table_ids)];

    const created = await withTransaction(async (conn) => {
      // Let MySQL check the date is real (e.g. not 2026-02-30) and not in the past
      const [[when]] = await conn.query(
        'SELECT CAST(? AS DATETIME) AS dt, CAST(? AS DATETIME) < NOW() AS is_past',
        [reservation_datetime, reservation_datetime]
      );
      if (!when.dt) throw httpError(400, 'reservation_datetime is not a valid date');
      if (when.is_past) throw httpError(400, 'Reservation time cannot be in the past');

      const [[customer]] = await conn.query(
        'SELECT customer_id FROM customer WHERE customer_id = ?', [customer_id]
      );
      if (!customer) throw httpError(404, 'Customer not found');

      // Lock the tables so two cashiers cannot book the same slot at once
      const [tables] = await conn.query(
        'SELECT table_id, table_number, capacity FROM dining_table WHERE table_id IN (?) FOR UPDATE',
        [ids]
      );
      if (tables.length !== ids.length) throw httpError(404, 'Table not found');

      const seats = tables.reduce((sum, t) => sum + t.capacity, 0);
      if (seats < number_of_guests) {
        throw httpError(400, `These tables seat ${seats} people, not enough for ${number_of_guests} guests`);
      }

      const [clashes] = await conn.query(
        `SELECT t.table_number, DATE_FORMAT(r.reservation_datetime, '%Y-%m-%d %H:%i') AS at_time
           FROM reservation r
           JOIN reservation_table rt ON rt.reservation_id = r.reservation_id
           JOIN dining_table t       ON t.table_id = rt.table_id
          WHERE rt.table_id IN (?)
            AND r.reservation_status = 'Confirmed'
            AND ABS(TIMESTAMPDIFF(MINUTE, r.reservation_datetime, ?)) < ?
          ORDER BY t.table_number`,
        [ids, when.dt, SEATING_MINUTES]
      );
      if (clashes.length) {
        const c = clashes[0];
        throw httpError(409, `Table ${c.table_number} is already reserved at ${c.at_time}`);
      }

      const [result] = await conn.query(
        `INSERT INTO reservation (customer_id, employee_id, reservation_datetime, number_of_guests)
         VALUES (?, ?, ?, ?)`,
        [customer_id, req.user.employee_id, when.dt, number_of_guests]
      );
      await conn.query(
        'INSERT INTO reservation_table (reservation_id, table_id) VALUES ?',
        [ids.map((id) => [result.insertId, id])]
      );
      const [reservation] = await findReservations(conn, 'r.reservation_id = ?', [result.insertId]);
      return reservation;
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reservations/:id : Seated / Cancelled / No-show (only from Confirmed)
// Seated does not open an order: the frontend calls POST /api/orders after it.
router.patch('/:id', async (req, res, next) => {
  try {
    const status = req.body?.reservation_status;
    if (!['Seated', 'Cancelled', 'No-show'].includes(status)) {
      return res.status(400).json({ error: 'reservation_status must be Seated, Cancelled or No-show' });
    }

    const updated = await withTransaction(async (conn) => {
      const [[r]] = await conn.query(
        `SELECT reservation_status,
                TIMESTAMPDIFF(MINUTE, reservation_datetime, NOW()) AS minutes_late
           FROM reservation WHERE reservation_id = ? FOR UPDATE`,
        [req.params.id]
      );
      if (!r) throw httpError(404, 'Reservation not found');
      if (r.reservation_status !== 'Confirmed') {
        throw httpError(409, `This reservation is already ${r.reservation_status}`);
      }
      if (status === 'No-show' && r.minutes_late < LATE_LIMIT_MINUTES) {
        throw httpError(409, `No-show can only be set ${LATE_LIMIT_MINUTES} minutes after the reservation time`);
      }

      await conn.query(
        'UPDATE reservation SET reservation_status = ? WHERE reservation_id = ?',
        [status, req.params.id]
      );
      const [reservation] = await findReservations(conn, 'r.reservation_id = ?', [req.params.id]);
      return reservation;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;