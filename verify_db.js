const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);
    const info = db.prepare("PRAGMA table_info(products)").all();
    console.log('Products Table Info:');
    console.table(info);
    
    const hasAlertMl = info.some(c => c.name === 'alert_ml');
    if (hasAlertMl) {
        console.log('SUCCESS: alert_ml column exists.');
    } else {
        console.log('FAILURE: alert_ml column missing!');
    }
    
    db.close();
} catch (err) {
    console.error('Error checking database:', err.message);
}
