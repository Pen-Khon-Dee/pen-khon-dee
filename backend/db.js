const mysql = require('mysql2/promise');

// Configure SSL for cloud databases such as Aiven
function sslOptions() {
  if (process.env.DB_SSL !== 'true') {
    return undefined;
  }

  if (process.env.DB_SSL_CA) {
    return {
      ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
      rejectUnauthorized: true,
    };
  }

  // No CA certificate given: the connection is still encrypted,
  // but the server certificate is not checked (Aiven uses its own CA)
  return {
    rejectUnauthorized: false,
  };
}

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: 5,
  dateStrings: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
});

// Set database time zone to Thailand
const TIME_ZONE = process.env.DB_TIME_ZONE || '+07:00';

pool.on('connection', (conn) => {
  conn.query(
    `SET time_zone = '${TIME_ZONE.replace(/'/g, '')}'`,
    (err) => {
      if (err) {
        console.error('Could not set the database time zone:', err.message);
      }
    }
  );
});

module.exports = pool;