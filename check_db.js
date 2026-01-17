const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'perfume-shop-app', 'database.db');
const db = new Database(dbPath);

console.log('--- Checking for ID 858 ---');
const byId = db.prepare('SELECT id, invoice_code, total, date FROM sales WHERE id = 858').get();
console.log('By ID:', byId || 'Not Found');

console.log('--- Checking for Invoice Code 858 ---');
const byCode = db.prepare('SELECT id, invoice_code, total, date FROM sales WHERE invoice_code = ?').get('858');
console.log('By Code:', byCode || 'Not Found');

console.log('--- Last 5 Sales ---');
const lastSales = db.prepare('SELECT id, invoice_code FROM sales ORDER BY id DESC LIMIT 5').all();
console.table(lastSales);
