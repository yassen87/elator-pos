import { app as electronApp } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import fs from 'fs'

let db = null

function getDB() {
  const isDev = !electronApp.isPackaged
  const dbPath = isDev 
    ? join(process.cwd(), 'database.sqlite')
    : join(electronApp.getPath('userData'), 'database.sqlite')
  const walPath = `${dbPath}-wal`
  const shmPath = `${dbPath}-shm`

  if (!db || !db.open) {
    try {
      db = new Database(dbPath)
      db.pragma('journal_mode = WAL');
      
      // Basic check
      const check = db.pragma('integrity_check')[0]
      if (check && check.integrity_check !== 'ok') {
        throw new Error(`Integrity Check Failed: ${check.integrity_check}`)
      }
    } catch (err) {
      console.error('[DB-FATAL] Database open failed or malformed:', err.message)
      
      if (err.message.includes('malformed') || err.message.includes('integrity_check')) {
        console.warn('[DB-RECOVERY] Attempting emergency cleanup of WAL/SHM files...')
        if (db) { 
          try { db.close() } catch { /* ignore */ }
          db = null 
        }
        
        // Delete WAL and SHM files - often the cause of "malformed" when using WAL
        try {
          if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
          if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
          console.log('[DB-RECOVERY] Deleted WAL/SHM files. Retrying open...')
          
          db = new Database(dbPath)
          db.pragma('journal_mode = WAL')
          return db
        } catch (retryErr) {
          console.error('[DB-RECOVERY] Emergency recovery failed:', retryErr.message)
          // If still malformed, the main file is dead. 
          // We don't delete the main file automatically to prevent data loss, 
          // let the main process or user handle backup restore.
          throw retryErr
        }
      }
      throw err
    }
  }
  return db
}

export function closeDB() {
  if (db) {
    try {
      db.close()
    } catch (e) {
      console.error('[DB] Error during close:', e.message)
    }
    db = null
  }
}

function ensureColumnExists(database, tableName, columnName, columnDef) {
  try {
    const info = database.prepare(`PRAGMA table_info(${tableName})`).all()
    const exists = info.some(col => col.name === columnName)
    if (!exists) {
      console.log(`[V3-DB] Force adding column ${columnName} to ${tableName}...`)
      database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`)
      return true
    }
  } catch (err) {
    console.error(`[V3-DB] Error ensuring column ${columnName} in ${tableName}:`, err.message)
  }
  return false
}

// تهيئة الجداول
export function initDB() {
  const database = getDB()
  
  // -- AGGRESSIVE HARDENING: Ensure these exist BEFORE everything else --
  const criticalColumns = [
    { table: 'sale_items', col: 'cost_price', def: 'REAL DEFAULT 0' },
    { table: 'sale_items', col: 'details', def: 'TEXT' },
    { table: 'sales', col: 'discount', def: 'REAL DEFAULT 0' },
    { table: 'sales', col: 'payment_method', def: "TEXT DEFAULT 'cash'" },
    { table: 'sales', col: 'payment_details', def: 'TEXT' },
    { table: 'sales', col: 'invoice_code', def: 'TEXT' },
    { table: 'products', col: 'wholesale_price', def: 'REAL DEFAULT 0' },
    { table: 'products', col: 'wholesale_price_per_ml', def: 'REAL DEFAULT 0' },
    { table: 'users', col: 'pricing_tier', def: "TEXT DEFAULT 'retail'" },
    { table: 'users', col: 'pricing_tier', def: "TEXT DEFAULT 'retail'" },
    { table: 'attendance', col: 'date', def: 'TEXT' },
    { table: 'sales', col: 'date', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'employees', col: 'phone', def: 'TEXT' },
    { table: 'employees', col: 'code', def: 'TEXT UNIQUE' },
    { table: 'employees', col: 'start_time', def: 'TEXT' },
    { table: 'employees', col: 'end_time', def: 'TEXT' },
    { table: 'employees', col: 'salary_per_hour', def: 'REAL DEFAULT 0' },
    { table: 'sales', col: 'customer_address', def: 'TEXT' },
    { table: 'sales', col: 'customer_whatsapp', def: 'TEXT' },
    { table: 'returns', col: 'details', def: 'TEXT' },
    { table: 'returns', col: 'total_refund', def: 'REAL DEFAULT 0' },
    { table: 'returns', col: 'notes', def: 'TEXT' },
    { table: 'sale_items', col: 'product_id', def: 'INTEGER' },
    { table: 'return_items', col: 'details', def: 'TEXT' },
    { table: 'products', col: 'is_website_visible', def: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'image_url', def: 'TEXT' },
    { table: 'products', col: 'price_per_gram', def: 'REAL DEFAULT 0' },
    { table: 'products', col: 'wholesale_price_per_gram', def: 'REAL DEFAULT 0' },
    { table: 'products', col: 'total_gram', def: 'REAL DEFAULT 0' },
    { table: 'products', col: 'cost_price_per_gram', def: 'REAL DEFAULT 0' },
    { table: 'orders', col: 'website_user_id', def: 'INTEGER' },
    { table: 'order_items', col: 'size', def: 'TEXT' },
    { table: 'order_items', col: 'website_product_id', def: 'INTEGER' }
  ]

  // --- NULL SANITIZATION ---
  try {
    database.exec(`
      UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL;
      UPDATE products SET total_ml = 0 WHERE total_ml IS NULL;
      UPDATE products SET total_gram = 0 WHERE total_gram IS NULL;
    `)
    console.log('[V3-INIT] Sanitized NULL stocks to 0.')
  } catch (e) {
    console.error('[V3-INIT] Sanitization failed:', e.message)
  }

  // --- LEGACY OIL MIGRATION ---
  try {
    const changes = database.exec(`
      UPDATE products 
      SET 
        sell_unit = 'ml',
        total_ml = total_ml + stock_quantity,
        stock_quantity = 0
      WHERE category = 'oil' 
      AND (sell_unit = 'piece' OR sell_unit IS NULL) 
      AND stock_quantity > 0;
    `)
    console.log('[V3-INIT] Migrated legacy oil products to ml.')
  } catch (e) {
    console.error('[V3-INIT] Oil migration failed:', e.message)
  }

  // --- RETROACTIVE FIX: Populate return_items.details from sale_items ---
  try {
    const riInfo = database.prepare("PRAGMA table_info(return_items)").all()
    if (riInfo.some(c => c.name === 'details')) {
      const nullDetails = database.prepare(`
        SELECT ri.id, r.original_sale_id, ri.item_name
        FROM return_items ri
        JOIN returns r ON ri.return_id = r.id
        WHERE ri.details IS NULL
      `).all()
      
      if (nullDetails.length > 0) {
        console.log(`[V3-INIT] Found ${nullDetails.length} return items with missing details. Attempting repair...`)
        const updateDetail = database.prepare('UPDATE return_items SET details = ? WHERE id = ?')
        const findSourceDetail = database.prepare(`
          SELECT details FROM sale_items 
          WHERE sale_id = ? AND item_name = ? 
          LIMIT 1
        `)
        
        database.transaction(() => {
          for (const ri of nullDetails) {
            const source = findSourceDetail.get(ri.original_sale_id, ri.item_name)
            if (source && source.details) {
              updateDetail.run(source.details, ri.id)
            }
          }
        })()
        console.log('[V3-INIT] Repair of return items details finished.')
      }
    }
  } catch (e) {
    console.warn('[V3-INIT] Repair of return items failed:', e.message)
  }

  // --- SCHEMA INSPECTION & CLEANUP ---
  try {
    const master = database.prepare("SELECT name, type FROM sqlite_master").all()
    const tables = master.filter(m => m.type === 'table').map(m => m.name)
    console.log('[V3-INIT] Tables in DB:', tables.join(', '))
    
    // Nuclear Cleanup of Old/Broken stuff
    const cleanupTables = tables.filter(t => 
        t.startsWith('sales_backup') || 
        t.startsWith('sales_migrate') || 
        t.startsWith('sales_repair') ||
        t === 'admins' || // Legacy
        t === 'cashiers' // Legacy
    )
    
    if (cleanupTables.length > 0) {
        console.log('[V3-INIT] Cleaning up legacy/broken tables:', cleanupTables.join(', '))
        cleanupTables.forEach(t => database.exec(`DROP TABLE IF EXISTS ${t};`))
    }

    const triggers = master.filter(m => m.type === 'trigger').map(m => m.name)
    if (triggers.length > 0) {
        console.log('[V3-INIT] Dropping triggers:', triggers.join(', '))
        triggers.forEach(tr => database.exec(`DROP TRIGGER IF EXISTS ${tr};`))
    }
  } catch (e) {
    console.error('[V3-INIT] Pre-cleanup failed:', e.message)
  }

  // --- FULL SCHEMA REPAIR (Fixes Broken Foreign Keys like sales_backup_v1) ---
  try {
    const salesInfo = database.prepare("PRAGMA table_info(sales)").all()
    const brokenRef = database.prepare("SELECT name FROM sqlite_master WHERE sql LIKE '%sales_backup_v1%'").all()
    
    if (salesInfo.some(col => col.name === 'ml_sold') || brokenRef.length > 0) {
        console.log('[V3-REPAIR] Legacy ml_sold or broken references found. Performing Nuclear Schema Reset...')
        if (brokenRef.length > 0) {
            console.log('[V3-REPAIR] Broken references detected in:', brokenRef.map(r => r.name).join(', '))
        }
        
        database.exec('PRAGMA foreign_keys = OFF;')
        try {
            database.transaction(() => {
                // 1. Rename ALL involved tables to detach them
                database.exec('ALTER TABLE sales RENAME TO old_sales;')
                database.exec('ALTER TABLE sale_items RENAME TO old_items;')
                database.exec('ALTER TABLE returns RENAME TO old_returns;')

                // 2. Recreate them FRESH with correct constraints
                database.exec(`
                    CREATE TABLE sales (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      total REAL DEFAULT 0,
                      cashier_id INTEGER,
                      date DATETIME DEFAULT CURRENT_TIMESTAMP,
                      customer_name TEXT,
                      customer_phone TEXT,
                      customer_address TEXT,
                      customer_whatsapp TEXT,
                      invoice_code TEXT,
                      payment_method TEXT DEFAULT 'cash',
                      payment_details TEXT,
                      discount REAL DEFAULT 0,
                      source TEXT DEFAULT 'store',
                      remote_id INTEGER,
                      FOREIGN KEY(cashier_id) REFERENCES users(id)
                    );
                `)

                database.exec(`
                    CREATE TABLE sale_items (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      sale_id INTEGER,
                      item_name TEXT,
                      price REAL,
                      quantity REAL,
                      details TEXT,
                      cost_price REAL DEFAULT 0,
                      product_id INTEGER,
                      FOREIGN KEY(sale_id) REFERENCES sales(id),
                      FOREIGN KEY(product_id) REFERENCES products(id)
                    );
                `)

                database.exec(`
                    CREATE TABLE returns (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      original_sale_id INTEGER,
                      return_type TEXT,
                      cashier_id INTEGER,
                      customer_name TEXT,
                      customer_phone TEXT,
                      reason TEXT,
                      details TEXT,
                      total_refund REAL DEFAULT 0,
                      notes TEXT,
                      return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY(original_sale_id) REFERENCES sales(id),
                      FOREIGN KEY(cashier_id) REFERENCES users(id)
                    );
                `)

                // 3. Move data for sales (Dynamically)
                const s_cols = database.prepare("PRAGMA table_info(old_sales)").all()
                    .map(c => c.name).filter(c => c !== 'ml_sold' && c !== 'id')
                const s_str = s_cols.join(', ')
                console.log(`[V3-REPAIR] Migrating sales: ${s_str}`)
                database.exec(`INSERT INTO sales (${s_str}) SELECT ${s_str} FROM old_sales;`)

                // 4. Move data for items
                const i_cols = database.prepare("PRAGMA table_info(old_items)").all()
                    .map(c => c.name).filter(c => c !== 'id')
                const i_str = i_cols.join(', ')
                console.log(`[V3-REPAIR] Migrating items: ${i_str}`)
                database.exec(`INSERT INTO sale_items (${i_str}) SELECT ${i_str} FROM old_items;`)

                // 5. Move data for returns
                const r_cols = database.prepare("PRAGMA table_info(old_returns)").all()
                    .map(c => c.name).filter(c => c !== 'id')
                const r_str = r_cols.join(', ')
                console.log(`[V3-REPAIR] Migrating returns: ${r_str}`)
                database.exec(`INSERT INTO returns (${r_str}) SELECT ${r_str} FROM old_returns;`)

                // 6. Drop old tables
                database.exec('DROP TABLE old_sales;')
                database.exec('DROP TABLE old_items;')
                database.exec('DROP TABLE old_returns;')
            })()
            console.log('[V3-REPAIR] Nuclear Schema Reset Successful.')
        } finally {
            database.exec('PRAGMA foreign_keys = ON;')
        }
    }
  } catch (e) {
    console.error('[V3-REPAIR] Full Schema Repair failed:', e.message)
    database.exec('PRAGMA foreign_keys = ON;') // Ensure it's back on
  }

  // --- SPECIFIC FIX FOR EMPLOYEES TABLE (Salary Per Hour) ---
  try {
     const empInfo = database.prepare("PRAGMA table_info(employees)").all()
     // Check if column exists, if so, sanitize NULLs
     if (empInfo.some(c => c.name === 'salary_per_hour')) {
         console.log('[V3-FIX] Sanitizing employees.salary_per_hour...')
         database.exec("UPDATE employees SET salary_per_hour = 0 WHERE salary_per_hour IS NULL;")
     }
  } catch (e) {
      console.error('[V3-FIX] Failed to sanitize employees:', e.message)
  }

  criticalColumns.forEach(c => {
    try {
      const info = database.prepare(`PRAGMA table_info(${c.table})`).all()
      if (!info.some(col => col.name === c.col)) {
        console.log(`[V3-FORCE] Adding missing column ${c.col} to ${c.table}`)
        database.exec(`ALTER TABLE ${c.table} ADD COLUMN ${c.col} ${c.def};`)
      }
    } catch(e) {
      console.error(`[V3-FORCE-ERROR] Failed for ${c.table}.${c.col}:`, e.message)
    }
  })

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      license_level TEXT DEFAULT '2',
      shop_name TEXT,
      last_login_at DATETIME,
      hardware_id TEXT,
      is_active INTEGER DEFAULT 1,
      permissions TEXT,
      pricing_tier TEXT DEFAULT 'retail'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'oil',
      barcode TEXT,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10,
      cost_price REAL DEFAULT 0,
      cost_price_per_ml REAL DEFAULT 0,
      alert_ml REAL DEFAULT 0,
      price REAL DEFAULT 0,
      price_per_ml REAL DEFAULT 0,
      price_per_gram REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      wholesale_price_per_ml REAL DEFAULT 0,
      wholesale_price_per_gram REAL DEFAULT 0,
      total_ml REAL DEFAULT 0,
      total_gram REAL DEFAULT 0,
      is_website_visible INTEGER DEFAULT 0,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      total_price REAL,
      barcode TEXT
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
      total REAL DEFAULT 0,
      cashier_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_whatsapp TEXT,
      invoice_code TEXT,
      payment_method TEXT DEFAULT 'cash',
      payment_details TEXT,
      discount REAL DEFAULT 0,
      source TEXT DEFAULT 'store',
      remote_id INTEGER,
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      item_name TEXT,
      price REAL,
      quantity REAL,
      details TEXT,
      cost_price REAL DEFAULT 0,
      product_id INTEGER,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT,
       phone TEXT,
       role TEXT,
       national_id TEXT,
       work_hours INTEGER,
       working_days INTEGER,
       salary REAL,
       start_time TEXT,
       end_time TEXT,
       code TEXT UNIQUE,
       is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      date TEXT,
      hours_worked REAL,
      extra_hours REAL DEFAULT 0,
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
      details TEXT,
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
      details TEXT,
      FOREIGN KEY(return_id) REFERENCES returns(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('license_level', '2');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('top_bottle_1', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('top_bottle_2', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('top_bottle_3', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('installed_at', datetime('now'));
    INSERT OR IGNORE INTO settings (key, value) VALUES ('last_run_at', datetime('now'));
    
    -- Geofencing Settings
    INSERT OR IGNORE INTO settings (key, value) VALUES ('geofencing_enabled', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_latitude', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_longitude', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('geofencing_radius', '200'); -- meters
    INSERT OR IGNORE INTO settings (key, value) VALUES ('top_bottles_ids', '[]'); -- JSON array of product IDs

    CREATE TABLE IF NOT EXISTS biometric_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_ip TEXT,
      device_port INTEGER DEFAULT 4370,
      device_type TEXT DEFAULT 'ZKTeco',
      last_sync TEXT
    );

    CREATE TABLE IF NOT EXISTS cloud_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      api_url TEXT,
      api_token TEXT,
      shop_id TEXT,
      is_linked INTEGER DEFAULT 0
    );


    -- New ERP Tables
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      total_debt REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      total_amount REAL,
      paid_amount REAL,
      remaining_amount REAL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS supplier_purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER,
      product_id INTEGER,
      quantity REAL,
      unit_price REAL,
      FOREIGN KEY(purchase_id) REFERENCES supplier_purchases(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      description TEXT,
      employee_id INTEGER,
      status TEXT DEFAULT 'spent',
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      month TEXT,
      base_salary REAL,
      bonus REAL DEFAULT 0,
      deduction REAL DEFAULT 0,
      net_salary REAL,
      notes TEXT,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      total_amount REAL,
      deposit_image TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      website_product_id INTEGER,
      quantity REAL,
      price REAL,
      size TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS website_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT UNIQUE,
      password TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price_100ml REAL DEFAULT 0,
      price_55ml REAL DEFAULT 0,
      price_35ml REAL DEFAULT 0,
      image_url TEXT,
      is_offer INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // --- SAFE INDEX CREATION ---
  const indices = [
    { name: 'idx_sales_date', table: 'sales', column: 'date' },
    { name: 'idx_sales_invoice_code', table: 'sales', column: 'invoice_code' },
    { name: 'idx_sale_items_sale_id', table: 'sale_items', column: 'sale_id' },
    { name: 'idx_returns_date', table: 'returns', column: 'return_date' },
    { name: 'idx_returns_original_sale_id', table: 'returns', column: 'original_sale_id' },
    { name: 'idx_return_items_return_id', table: 'return_items', column: 'return_id' },
    { name: 'idx_products_barcode_unique', table: 'products', column: 'barcode', unique: true, condition: 'WHERE barcode IS NOT NULL' }
  ]

  indices.forEach(idx => {
    try {
      const info = database.prepare(`PRAGMA table_info(${idx.table})`).all()
      if (info.some(col => col.name === idx.column)) {
        const unique = idx.unique ? 'UNIQUE' : ''
        const condition = idx.condition || ''
        database.exec(`CREATE ${unique} INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column}) ${condition};`)
      }
    } catch (e) {
      console.warn(`[DB-INDEX] Failed to create index ${idx.name}:`, e.message)
    }
  })

  try {
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_code ON employees(code);")
  } catch (e) {}

  // إضافة السوبر أدمن الأول (رقم الهاتف الأول)
  const superAdmin1 = database.prepare('SELECT * FROM users WHERE username = ?').get('01141058632')
  if (!superAdmin1) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('01141058632', '01141058632', 'super_admin')
  }

  // إضافة السوبر أدمن الثاني (رقم الهاتف الثاني)
  const superAdmin2 = database.prepare('SELECT * FROM users WHERE username = ?').get('01157686224')
  if (!superAdmin2) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('01157686224', '01157686224', 'super_admin')
  }

  // إضافة كاشير افتراضي للتجربة
  const cashier = database.prepare('SELECT * FROM users WHERE username = ?').get('cashier')
  if (!cashier) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('cashier', '123', 'cashier')
  }

  // إضافة مسؤول افتراضي
  const defaultAdmin = database.prepare('SELECT * FROM users WHERE username = ?').get('admin')
  if (!defaultAdmin) {
    database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin')
  } else if (defaultAdmin.role === 'super_admin') {
    // تصحيح الرتبة إذا كانت super_admin بالخطأ
    database.prepare('UPDATE users SET role = ? WHERE username = ?').run('admin', 'admin')
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
    { table: 'sales', column: 'invoice_code', type: 'TEXT' },
    { table: 'employees', column: 'role', type: "TEXT DEFAULT 'employee'" },
    { table: 'employees', column: 'is_active', type: "INTEGER DEFAULT 1" },
    { table: 'employees', column: 'national_id', type: "TEXT" },
    { table: 'attendance', column: 'date', type: "TEXT" },
    { table: 'attendance', column: 'check_in', type: "TEXT" },
    { table: 'attendance', column: 'check_out', type: "TEXT" },
    { table: 'attendance', column: 'status', type: "TEXT DEFAULT 'present'" },
    { table: 'attendance', column: 'extra_hours', type: "REAL DEFAULT 0" },
    { table: 'expenses', column: 'supplier_id', type: "INTEGER" },
    { table: 'users', column: 'license_level', type: "TEXT DEFAULT '2'" },
    { table: 'users', column: 'shop_name', type: "TEXT" },
    { table: 'users', column: 'last_login_at', type: "DATETIME" },
    { table: 'users', column: 'hardware_id', type: "TEXT" },
    { table: 'users', column: 'permissions', type: "TEXT" },
    { table: 'employees', column: 'working_days', type: "INTEGER DEFAULT 26" },
    { table: 'employees', column: 'work_hours', type: "INTEGER DEFAULT 8" },
    { table: 'employees', column: 'start_time', type: "TEXT" },
    { table: 'employees', column: 'end_time', type: "TEXT" },
    { table: 'employees', column: 'salary', type: "REAL DEFAULT 0" },
    { table: 'sales', column: 'discount', type: 'REAL DEFAULT 0' },
    { table: 'sales', column: 'source', type: "TEXT DEFAULT 'store'" },
    { table: 'sales', column: 'remote_id', type: "INTEGER" },
    { table: 'products', column: 'barcode', type: 'TEXT' },
    { table: 'formulas', column: 'barcode', type: 'TEXT' },
    { table: 'sale_items', column: 'cost_price', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'cost_price', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'cost_price_per_ml', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'wholesale_price', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'wholesale_price_per_ml', type: 'REAL DEFAULT 0' },
    { table: 'users', column: 'pricing_tier', type: "TEXT DEFAULT 'retail'" },
    { table: 'products', column: 'price_per_gram', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'total_gram', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'cost_price_per_gram', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'alert_gram', type: 'REAL DEFAULT 0' },
    { table: 'products', column: 'sell_unit', type: "TEXT DEFAULT 'piece'" },
    { table: 'products', column: 'wholesale_price_per_gram', type: 'REAL DEFAULT 0' },
    { table: 'sale_items', column: 'product_id', type: 'INTEGER' },
    { table: 'return_items', column: 'details', type: 'TEXT' },
    { table: 'products', column: 'is_website_visible', type: 'INTEGER DEFAULT 0' },
    { table: 'products', column: 'image_url', type: 'TEXT' },
    { table: 'orders', column: 'deposit_image', type: 'TEXT' },
    { table: 'orders', column: 'status', type: "TEXT DEFAULT 'pending'" }
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
    ['facebook_url', ''],
    ['whatsapp_enabled', 'true'],
    ['show_sticker_button', '1']
  ]

  const insertSetting = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  defaultSettings.forEach(([key, value]) => insertSetting.run(key, value))

    console.log('[V3-INIT] Database initialization - products table created with all columns.')

    // Safe migrations for new columns
    const specificMigrations = [
      { table: 'sales', column: 'payment_method', type: "TEXT DEFAULT 'cash'" },
      { table: 'sales', column: 'payment_details', type: "TEXT" },
      { table: 'users', column: 'is_active', type: "INTEGER DEFAULT 1" },
      { table: 'users', column: 'license_level', type: "TEXT DEFAULT '2'" },
      { table: 'users', column: 'shop_name', type: "TEXT" },
      { table: 'users', column: 'permissions', type: "TEXT" },
      { table: 'sales', column: 'discount', type: 'REAL DEFAULT 0' },
      { table: 'sales', column: 'source', type: "TEXT DEFAULT 'store'" },
      { table: 'employees', column: 'code', type: "TEXT" }
    ]

    specificMigrations.forEach(m => {
      ensureColumnExists(database, m.table, m.column, m.type)
    })

    ensureColumnExists(database, 'returns', 'details', 'TEXT')
    ensureColumnExists(database, 'returns', 'total_refund', 'REAL DEFAULT 0')
    ensureColumnExists(database, 'returns', 'notes', 'TEXT')

    // Add unique index for employee code separately (SQLite limitation)
    try {
      database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_code ON employees(code);")
    } catch (e) {
      console.error('[DB] Failed to create employees code index:', e.message)
    }

    // FINAL HARDENING: Explicitly ensure ALL critical columns exist in both tables
    console.log('[V3-INIT] Hardening critical columns for sales/sale_items...')
    ensureColumnExists(database, 'sales', 'payment_method', "TEXT DEFAULT 'cash'")
    ensureColumnExists(database, 'sales', 'payment_details', "TEXT")
    ensureColumnExists(database, 'sales', 'discount', "REAL DEFAULT 0")
    ensureColumnExists(database, 'sales', 'source', "TEXT DEFAULT 'store'")
    ensureColumnExists(database, 'sales', 'invoice_code', "TEXT")
    ensureColumnExists(database, 'sales', 'total', "REAL DEFAULT 0")

    ensureColumnExists(database, 'sale_items', 'cost_price', "REAL DEFAULT 0")
    ensureColumnExists(database, 'sale_items', 'details', "TEXT")
    ensureColumnExists(database, 'sale_items', 'price', "REAL")
    ensureColumnExists(database, 'sale_items', 'quantity', "REAL")

    ensureColumnExists(database, 'products', 'barcode', "TEXT")

    // --- REPAIR OLD RETURNS DATA ---
    try {
        console.log('[V3-REPAIR] Checking for old returns needing total_refund calculation...')
        const oldReturns = database.prepare('SELECT id FROM returns WHERE total_refund IS NULL OR total_refund = 0').all()
        if (oldReturns.length > 0) {
            console.log(`[V3-REPAIR] Found ${oldReturns.length} old returns to repair.`)
            const updateStmt = database.prepare('UPDATE returns SET total_refund = ? WHERE id = ?')
            const sumStmt = database.prepare('SELECT SUM(refund_amount) as total FROM return_items WHERE return_id = ?')
            
            oldReturns.forEach(ret => {
                const result = sumStmt.get(ret.id)
                if (result && result.total > 0) {
                    updateStmt.run(result.total, ret.id)
                }
            })
            console.log('[V3-REPAIR] Successfully recalculated totals for old returns.')
        }
    } catch (e) {
        console.error('[V3-REPAIR] Failed to repair old returns:', e.message)
    }

    // --- REPAIR: Remove legacy 'ml_sold' column if it exists ---
    try {
        const salesInfo = database.prepare("PRAGMA table_info(sales)").all()
        if (salesInfo.some(col => col.name === 'ml_sold')) {
            console.log('[V3-REPAIR] Legacy column ml_sold found. Performing Dynamic Table Recreation...')
            
            // Disable foreign keys temporarily for table recreation
            database.exec('PRAGMA foreign_keys = OFF;')
            
            try {
                database.transaction(() => {
                    // 1. Clean up any previous failed attempts
                    database.exec('DROP TABLE IF EXISTS sales_repair_backup;')
                    
                    // 2. Rename existing table
                    database.exec('ALTER TABLE sales RENAME TO sales_repair_backup;')
                    
                    // 3. Create new table without ml_sold (Explicit Schema)
                    database.exec(`
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
                    `)
                    
                    // 4. Move data dynamically
                    const backupTableInfo = database.prepare("PRAGMA table_info(sales_repair_backup)").all()
                    const backupCols = backupTableInfo.map(c => c.name).filter(c => c !== 'ml_sold')
                    
                    const newTableInfo = database.prepare("PRAGMA table_info(sales)").all()
                    const newCols = newTableInfo.map(c => c.name)
                    
                    const commonCols = backupCols.filter(c => newCols.includes(c))
                    const colsStr = commonCols.join(', ')
                    
                    console.log(`[V3-REPAIR] Copying data for columns: ${colsStr}`)
                    database.exec(`
                        INSERT INTO sales (${colsStr})
                        SELECT ${colsStr} FROM sales_repair_backup;
                    `)
                    
                    // 5. Drop backup
                    database.exec('DROP TABLE sales_repair_backup;')
                })()
                console.log('[V3-REPAIR] Successfully recreated sales table and removed ml_sold.')
            } finally {
                database.exec('PRAGMA foreign_keys = ON;')
            }
        } else {
            console.log('[V3-REPAIR] sales table schema is already correct (no ml_sold found).')
        }
    } catch (e) {
        console.error('[V3-REPAIR] CRITICAL ERROR during sales table repair:', e.message)
    }

    // --- REPAIR DUPLICATE ATTENDANCE ---
    try {
        console.log('[V3-REPAIR] Cleaning up duplicate attendance records...')
        // Check if required columns exist before grouping
        const tableInfo = database.prepare("PRAGMA table_info(attendance)").all()
        const colNames = tableInfo.map(c => c.name)
        
        if (colNames.includes('date') && colNames.includes('employee_id')) {
            // 1. Find the earliest ID for each unique punch
            const uniquePunchIds = database.prepare(`
                SELECT MIN(id) as id
                FROM attendance 
                GROUP BY employee_id, date, check_in, check_out
            `).all().map(row => row.id)
            
            if (uniquePunchIds.length > 0) {
                // 2. Delete anything that is NOT a unique punch ID
                const placeholders = uniquePunchIds.map(() => '?').join(',')
                database.prepare(`DELETE FROM attendance WHERE id NOT IN (${placeholders})`).run(...uniquePunchIds)
                console.log(`[V3-REPAIR] Cleaned up attendance duplication. Current count: ${uniquePunchIds.length}`)
            }
        } else {
            console.warn('[V3-REPAIR] Attendance table missing critical columns for cleanup. Skipping.')
        }
    } catch (e) {
        console.error('[V3-REPAIR] Failed to clean up duplicate attendance:', e.message)
    }


    // --- ONE-TIME DATA REPAIR: Sync stock_quantity to total_ml/total_gram for legacy records ---
    try {
        console.log('[V3-REPAIR] Syncing legacy stock fields...');
        // If total_ml is 0 but stock_quantity > 0 for an 'ml' oil (or if it's an oil and unit is missing), sync it.
        database.exec(`
            UPDATE products 
            SET total_ml = stock_quantity 
            WHERE (sell_unit = 'ml' OR (category = 'oil' AND (sell_unit IS NULL OR sell_unit = ''))) 
            AND (total_ml IS NULL OR total_ml = 0) 
            AND stock_quantity > 0;
        `);
        // If total_gram is 0 but stock_quantity > 0 for a 'gram' product, sync it.
        database.exec(`
            UPDATE products 
            SET total_gram = stock_quantity 
            WHERE sell_unit = 'gram' AND (total_gram IS NULL OR total_gram = 0) AND stock_quantity > 0;
        `);
        console.log('[V3-REPAIR] Stock sync complete.');
    } catch (e) {
        console.error('[V3-REPAIR] Failed to sync legacy stock:', e.message);
    }

    console.log('[V3-INIT] Database initialization complete.')
}

export default getDB
