import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db = null

function getDB() {
  if (!db) {
    const isDev = !app.isPackaged
    const dbPath = isDev 
      ? join(process.cwd(), 'database.sqlite')
      : join(app.getPath('userData'), 'database.sqlite')
    db = new Database(dbPath)
  }
  return db
}

// تهيئة الجداول
export function initDB() {
  const database = getDB()
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      price_per_ml REAL DEFAULT 0,
      total_ml REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10,
      category TEXT DEFAULT 'product'
    );

    CREATE TABLE IF NOT EXISTS formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      total_price REAL
    );

    CREATE TABLE IF NOT EXISTS formula_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      formula_id INTEGER,
      product_id INTEGER,
      custom_name TEXT,
      price REAL,
      quantity REAL,
      FOREIGN KEY(formula_id) REFERENCES formulas(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL,
      cashier_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      customer_name TEXT,
      customer_phone TEXT,
      invoice_code TEXT,
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      item_name TEXT,
      price REAL,
      quantity REAL,
      details TEXT,
      FOREIGN KEY(sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      work_hours INTEGER,
      salary REAL,
      start_time TEXT,
      end_time TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      date TEXT,
      hours_worked REAL,
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_sale_id INTEGER,
      return_date TEXT DEFAULT (datetime('now', 'localtime')),
      return_type TEXT,
      cashier_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      reason TEXT,
      total_refund REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(original_sale_id) REFERENCES sales(id),
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER,
      product_id INTEGER,
      item_name TEXT,
      quantity REAL,
      refund_amount REAL,
      FOREIGN KEY(return_id) REFERENCES returns(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS biometric_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_ip TEXT,
      device_port INTEGER DEFAULT 4370,
      device_type TEXT DEFAULT 'ZKTeco',
      last_sync TEXT
    );
  `)

  // إضافة الأدمن الافتراضي إذا لم يكن موجوداً
  const admin = database.prepare('SELECT * FROM users WHERE username = ?').get('admin')
  if (!admin) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin')
  } else if (admin.role === 'super_admin') {
    // إرجاع الأدمن العادي إذا كان super_admin
    database.prepare('UPDATE users SET role = ? WHERE username = ?').run('admin', 'admin')
  }

  // إضافة السوبر أدمن (المطور) إذا لم يكن موجوداً
  const superAdmin = database.prepare('SELECT * FROM users WHERE username = ?').get('super')
  if (!superAdmin) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('super', 'super123', 'super_admin')
  }

  // إضافة كاشير افتراضي للتجربة
  const cashier = database.prepare('SELECT * FROM users WHERE username = ?').get('cashier')
  if (!cashier) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('cashier', '123', 'cashier')
  }

  const migrations = [
    { table: 'products', column: 'stock_quantity', type: 'INTEGER DEFAULT 0' },
    { table: 'products', column: 'min_stock', type: 'INTEGER DEFAULT 10' },
    { table: 'sales', column: 'payment_method', type: "TEXT DEFAULT 'cash'" },
    { table: 'sales', column: 'payment_details', type: "TEXT" },
    { table: 'users', column: 'is_active', type: "INTEGER DEFAULT 1" },
    { table: 'products', column: 'category', type: "TEXT DEFAULT 'oil'" },
    { table: 'products', column: 'price', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'price_per_ml', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'total_ml', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'alert_ml', type: 'REAL DEFAULT 0' },
    { table: 'sales', column: 'total', type: 'REAL DEFAULT 0' },
    { table: 'sales', column: 'cashier_id', type: 'INTEGER' },
    { table: 'sales', column: 'customer_name', type: 'TEXT' },
    { table: 'sales', column: 'customer_phone', type: 'TEXT' },
    { table: 'formula_items', column: 'custom_name', type: 'TEXT' },
    { table: 'formula_items', column: 'price', type: 'REAL' },
    { table: 'sale_items', column: 'details', type: 'TEXT' },
    { table: 'sales', column: 'invoice_code', type: 'TEXT' }
  ]

  migrations.forEach(m => {
    try {
      database.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type};`)
      console.log(`Migration: Added ${m.column} to ${m.table}`)
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`Migration error on ${m.table}.${m.column}:`, e.message)
      }
    }
  })

  // التحقق النهائي من بنية الجداول لغايات التصحيح
  const tablesToLog = ['products', 'sales', 'sale_items', 'users']
  tablesToLog.forEach(tableName => {
    try {
      const info = database.prepare(`PRAGMA table_info(${tableName})`).all()
      console.log(`[V3-INIT] --- Current ${tableName} Schema ---`)
      console.table(info)
    } catch (e) {
      console.error(`Schema check failed for ${tableName}:`, e)
    }
  })

  try {
    database.exec(`
      ALTER TABLE formula_items ADD COLUMN custom_name TEXT;
    `)
  } catch (e) {}

  try {
    database.exec(`
      ALTER TABLE formula_items ADD COLUMN price REAL;
    `)
  } catch (e) {}

  // إعدادات المتجر الافتراضية
  const defaultSettings = [
    ['shop_name', 'محل عطورنا'],
    ['shop_address', 'العنوان هنا'],
    ['shop_phone', '0123456789'],
    ['shop_logo', ''],
    ['facebook_url', '']
  ]

  const insertSetting = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  defaultSettings.forEach(([key, value]) => insertSetting.run(key, value))

  // Sequential invoice migration is now handled in setupIpcHandlers
  console.log('[V3-INIT] Database initialization complete.')
}

export default getDB
