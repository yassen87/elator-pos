
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('--- DB INSPECTION ---');
try {
    const results = db.prepare("SELECT name, type, sql FROM sqlite_master WHERE sql LIKE '%sales_backup_v1%'").all();
    if (results.length === 0) {
        console.log('No matches for "sales_backup_v1" found in sqlite_master.');
    } else {
        console.log(`Found ${results.length} matches:`);
        results.forEach(r => {
            console.log(`- Name: ${r.name} (${r.type})`);
            console.log(`  SQL: ${r.sql}`);
        });
    }
} catch (e) {
    console.error('Inspection failed:', e.message);
}

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Current Tables:', tables.map(t => t.name).join(', '));
} catch(e) {}

db.close();
