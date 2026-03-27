const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function repair() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zain_perfumes'
  });

  console.log('Connected to MySQL. Starting schema repair...');

  const queries = [
    "ALTER TABLE orders MODIFY user_id INT NULL",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) AFTER user_id",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50) AFTER customer_name",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json TEXT AFTER shipping_address"
  ];

  for (const sql of queries) {
    try {
      await connection.query(sql);
      console.log(`✓ Success: ${sql}`);
    } catch (err) {
      console.error(`✗ Error: ${err.message} (${sql})`);
    }
  }

  await connection.end();
  console.log('Repair complete.');
}

repair().catch(console.error);
