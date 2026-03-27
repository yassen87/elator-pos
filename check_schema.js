const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'yassen87-elator-pos', 'database.sqlite');
const db = new Database(dbPath);

const info = db.prepare("PRAGMA table_info(products)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
