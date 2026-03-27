const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(tables, null, 2));
db.close();
