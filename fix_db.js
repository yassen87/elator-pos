
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to DB
const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Opening DB at:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // Check table info
    console.log('Checking sales table info...');
    const info = db.prepare("PRAGMA table_info(sales)").all();
    console.log('Columns:', info.map(c => `${c.name} (${c.type})`).join(', '));

    const mlSoldCol = info.find(c => c.name === 'ml_sold');
    
    if (mlSoldCol) {
        console.log('Found legacy column ml_sold. Attempting to drop...');
        try {
            db.exec('ALTER TABLE sales DROP COLUMN ml_sold');
            console.log('Successfully dropped column ml_sold.');
        } catch (e) {
            console.error('Direct DROP failed:', e.message);
            console.log('Attempting table recreation strategy...');
            
            // Standard SQLite table modification:
            // 1. Rename old table
            // 2. Create new table (correct schema)
            // 3. Copy data
            // 4. Drop old table
            
            db.transaction(() => {
                db.exec("ALTER TABLE sales RENAME TO sales_backup_v1");
                
                // New Schema (without ml_sold) - copied from db.js
                db.exec(`
                    CREATE TABLE sales (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      total REAL DEFAULT 0,
                      cashier_id INTEGER,
                      date DATETIME DEFAULT CURRENT_TIMESTAMP,
                      customer_name TEXT,
                      customer_phone TEXT,
                      invoice_code TEXT,
                      payment_method TEXT DEFAULT 'cash',
                      payment_details TEXT,
                      discount REAL DEFAULT 0,
                      source TEXT DEFAULT 'store',
                      remote_id INTEGER,
                      FOREIGN KEY(cashier_id) REFERENCES users(id)
                    );
                `);
                
                // Copy data
                // We map existing columns. We must match what we had.
                // We know ml_sold exists in backup, but we ignore it.
                // We need to list common columns.
                const newInfo = db.prepare("PRAGMA table_info(sales)").all();
                const newCols = newInfo.map(c => c.name);
                
                // Check which backup cols match new cols
                const backupInfo = db.prepare("PRAGMA table_info(sales_backup_v1)").all();
                const backupCols = backupInfo.map(c => c.name);
                
                const commonCols = newCols.filter(c => backupCols.includes(c));
                
                const colsStr = commonCols.join(', ');
                console.log(`Copying data via columns: ${colsStr}`);
                
                db.exec(`INSERT INTO sales (${colsStr}) SELECT ${colsStr} FROM sales_backup_v1`);
                
                // Drop backup (or keep it if paranoid, but we will drop for clean up)
                db.exec("DROP TABLE sales_backup_v1");
                
            })();
            console.log('Table recreation successful.');
        }
    } else {
        console.log('Column ml_sold does not exist. No action needed.');
    }
    
} catch (e) {
    console.error('General Error:', e);
} finally {
    db.close();
}
