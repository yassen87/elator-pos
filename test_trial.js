
const { systemService } = require('./out/main/index.js');
const Database = require('better-sqlite3');
const path = require('path');

async function testTrial() {
    const db = new Database('database.sqlite');
    
    // Mock settings
    db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    
    // Test 1: Fresh install
    console.log('Test 1: Fresh install');
    db.prepare('DELETE FROM settings WHERE key = ?').run('installed_at');
    const status1 = await systemService.getTrialStatus(db);
    console.log(status1);
    
    // Test 2: Expired after 10 days
    console.log('\nTest 2: Expired after 10 days');
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('installed_at', tenDaysAgo.toISOString());
    const status2 = await systemService.getTrialStatus(db);
    console.log(status2);
    
    db.close();
}

testTrial().catch(console.error);
