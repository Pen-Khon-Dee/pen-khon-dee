const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    const identifier = String(email || username || '').trim().toLowerCase();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT employee_id, name, role, status, password_hash FROM employee WHERE email = ? OR username = ?',
      [identifier, identifier]
    );
    const employee = rows[0];

    // Same message for wrong username or password, so usernames cannot be guessed
    const ok = employee && (await bcrypt.compare(password, employee.password_hash));
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (employee.status !== 'Active') {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }

    const user = { employee_id: employee.employee_id, name: employee.name, role: employee.role };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({ token, employee: user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me : checks the token is still valid and who it belongs to
router.get('/me', requireAuth, (req, res) => {
  const { employee_id, name, role } = req.user;
  res.json({ employee: { employee_id, name, role } });
});

module.exports = router;
