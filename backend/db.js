// MySQL connection pool (connections are reused)
const mysql = require('mysql2/promise');

// Cloud databases (e.g. Aiven) require an encrypted connection: set DB_SSL=true in .env.
// If the host gives you a CA certificate, put its text in DB_SSL_CA to verify the server too.
function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  if (process.env.DB_SSL_CA) return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') };
  return { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: 5,     // free cloud databases allow few connections
  dateStrings: true,      // dates as "2026-10-04 18:30:00", as agreed with the frontend
  decimalNumbers: true,   // DECIMAL as numbers, not strings
  charset: 'utf8mb4',
});

// Cloud servers run on UTC. Use Thai time so NOW(), seating times and
// "today's reservations" match the restaurant's clock.
const TIME_ZONE = process.env.DB_TIME_ZONE || '+07:00';
// Runs once on every new connection, before any other query on it
pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${TIME_ZONE.replace(/'/g, '')}'`, (err) => {
    if (err) console.error('Could not set the database time zone:', err.message);
  });
});

module.exports = pool;