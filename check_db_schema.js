const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Opening DB at:', dbPath);

try {
  const db = new Database(dbPath);
  console.log('Sales Table Schema:');
  console.table(db.prepare("PRAGMA table_info(sales)").all());
  
  console.log('Sale Items Table Schema:');
  console.table(db.prepare("PRAGMA table_info(sale_items)").all());
  
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
