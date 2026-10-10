// Runs SQL files against the database in .env (local MySQL or Aiven).
// Usage: node scripts/run-sql.js ../database/Schema.sql ../database/Seed.sql
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  if (process.env.DB_SSL_CA) return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') };
  return { rejectUnauthorized: false };
}

(async () => {
  const files = process.argv.slice(2);
  if (files.length === 0) throw new Error('Give at least one .sql file');

  // No database here: Schema.sql creates it
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslOptions(),
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  // Same Thai time as the backend, so NOW() in Seed.sql matches
  const tz = (process.env.DB_TIME_ZONE || '+07:00').replace(/'/g, '');
  await conn.query(`SET time_zone = '${tz}'`);

  for (const file of files) {
    const sql = fs.readFileSync(path.resolve(file), 'utf8');
    await conn.query(sql);
    console.log(`Ran ${file}`);
  }
  await conn.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});