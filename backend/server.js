require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Health check: confirms the backend is running and connected to the database
app.get('/api/health', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      // time_zone should be +07:00 (Thai time). If it shows SYSTEM or UTC, db.js is out of date.
      'SELECT COUNT(*) AS tables, NOW() AS db_time, @@session.time_zone AS time_zone FROM dining_table'
    );
    res.json({ status: 'ok', ...rows[0] });
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/order-items', require('./routes/orderItems'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/members', require('./routes/members'));

// Unknown path
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Uncaught errors, returned in the format agreed with the frontend
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});