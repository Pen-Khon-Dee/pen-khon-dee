// Run once after Seed.sql: sets password123 (hashed) for every sample employee
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

(async () => {
  const hash = await bcrypt.hash('password123', 10);
  const [result] = await pool.query(
    "UPDATE employee SET password_hash = ? WHERE password_hash = 'SET_IN_STEP_3'",
    [hash]
  );
  console.log(`Passwords set for ${result.affectedRows} employees`);
  await pool.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});