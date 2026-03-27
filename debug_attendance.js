
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

console.log('Checking Attendance for Feb 2026...');
const month = '2026-02';
const records = db.prepare(`
    SELECT a.*, e.name, e.start_time
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.date LIKE ?
`).all(`${month}%`);

console.log('Total records found:', records.length);
if (records.length > 0) {
    console.log('Sample record:', records[0]);
    
    const summary = {};
    records.forEach(rec => {
        if (!summary[rec.employee_id]) summary[rec.employee_id] = { name: rec.name, count: 0 };
        summary[rec.employee_id].count++;
    });
    console.table(summary);
}

const totalAll = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
console.log('Total records in attendance table (all time):', totalAll.count);
