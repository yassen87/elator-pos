/**
 * Inventory Service - Handles Products and Formulas logic
 */
export const inventoryService = {
  // --- Products ---
  async getProducts(db) {
    return db.prepare('SELECT * FROM products ORDER BY name ASC').all()
  },

  async addProduct(db, product) {
    const { name, category, barcode, price, price_per_ml, wholesale_price, wholesale_price_per_ml, stock_quantity, min_stock, cost_price, cost_price_per_ml, total_ml, alert_ml, price_per_gram, total_gram, cost_price_per_gram, alert_gram, sell_unit, wholesale_price_per_gram, is_website_visible, image_url } = product
    const res = db.prepare(`
      INSERT INTO products (name, category, barcode, price, price_per_ml, wholesale_price, wholesale_price_per_ml, stock_quantity, min_stock, cost_price, cost_price_per_ml, total_ml, alert_ml, price_per_gram, total_gram, cost_price_per_gram, alert_gram, sell_unit, wholesale_price_per_gram, is_website_visible, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category, barcode || null, price || 0, price_per_ml || 0, wholesale_price || 0, wholesale_price_per_ml || 0, stock_quantity || 0, min_stock || 10, cost_price || 0, cost_price_per_ml || 0, total_ml || 0, alert_ml || 0, price_per_gram || 0, total_gram || 0, cost_price_per_gram || 0, alert_gram || 0, sell_unit || 'piece', wholesale_price_per_gram || 0, is_website_visible || 0, image_url || null)
    return { success: true, id: res.lastInsertRowid }
  },

  async updateProduct(db, product) {
    const { id, name, category, barcode, price, price_per_ml, wholesale_price, wholesale_price_per_ml, stock_quantity, min_stock, cost_price, cost_price_per_ml, total_ml, alert_ml, price_per_gram, total_gram, cost_price_per_gram, alert_gram, sell_unit, wholesale_price_per_gram, is_website_visible, image_url } = product
    db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, barcode = ?, price = ?, price_per_ml = ?, wholesale_price = ?, wholesale_price_per_ml = ?, stock_quantity = ?, min_stock = ?, cost_price = ?, cost_price_per_ml = ?, total_ml = ?, alert_ml = ?, price_per_gram = ?, total_gram = ?, cost_price_per_gram = ?, alert_gram = ?, sell_unit = ?, wholesale_price_per_gram = ?, is_website_visible = ?, image_url = ?
      WHERE id = ?
    `).run(name, category, barcode || null, price || 0, price_per_ml || 0, wholesale_price || 0, wholesale_price_per_ml || 0, stock_quantity || 0, min_stock || 10, cost_price || 0, cost_price_per_ml || 0, total_ml || 0, alert_ml || 0, price_per_gram || 0, total_gram || 0, cost_price_per_gram || 0, alert_gram || 0, sell_unit || 'piece', wholesale_price_per_gram || 0, is_website_visible || 0, image_url || null, id)
    return { success: true }
  },

  async updateStock(db, { id, quantity, isAbsolute }) {
    const product = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(id)
    if (!product) return { success: false, error: 'Product not found' }

    let field = 'stock_quantity'
    if (product.sell_unit === 'ml') field = 'total_ml'
    else if (product.sell_unit === 'gram') field = 'total_gram'

    if (isAbsolute) {
      db.prepare(`UPDATE products SET ${field} = ? WHERE id = ?`).run(quantity, id)
    } else {
      db.prepare(`UPDATE products SET ${field} = ${field} + ? WHERE id = ?`).run(quantity, id)
    }
    return { success: true }
  },

  async deleteProduct(db, id) {
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return { success: true }
  },

  // --- Website Products ---
  async getWebsiteProducts(db) {
    return db.prepare('SELECT * FROM website_products ORDER BY name ASC').all()
  },

  async addWebsiteProduct(db, product) {
    const { name, description, category, price_100ml, price_55ml, price_35ml, image_url, is_offer, is_active } = product
    const res = db.prepare(`
      INSERT INTO website_products (name, description, category, price_100ml, price_55ml, price_35ml, image_url, is_offer, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description || null, category || null, price_100ml || 0, price_55ml || 0, price_35ml || 0, image_url || null, is_offer || 0, is_active !== undefined ? is_active : 1)
    return { success: true, id: res.lastInsertRowid }
  },

  async updateWebsiteProduct(db, product) {
    const { id, name, description, category, price_100ml, price_55ml, price_35ml, image_url, is_offer, is_active } = product
    db.prepare(`
      UPDATE website_products 
      SET name = ?, description = ?, category = ?, price_100ml = ?, price_55ml = ?, price_35ml = ?, image_url = ?, is_offer = ?, is_active = ?
      WHERE id = ?
    `).run(name, description || null, category || null, price_100ml || 0, price_55ml || 0, price_35ml || 0, image_url || null, is_offer || 0, is_active !== undefined ? is_active : 1, id)
    return { success: true }
  },

  async deleteWebsiteProduct(db, id) {
    db.prepare('DELETE FROM website_products WHERE id = ?').run(id)
    return { success: true }
  },

  async updateWebsiteVisibility(db, { id, isVisible }) {
    db.prepare('UPDATE website_products SET is_active = ? WHERE id = ?').run(isVisible ? 1 : 0, id)
    return { success: true }
  },

  async getCategories(db) {
    const rows = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL').all()
    return rows.map(r => r.category)
  },

  async getWebsiteCategories(db) {
    const rows = db.prepare('SELECT DISTINCT category FROM website_products WHERE category IS NOT NULL').all()
    return rows.map(r => r.category)
  },

  async findByBarcode(db, barcode) {
    if (!barcode) return null;
    const s = String(barcode).trim();

    // 1. Direct match (external products with their real barcode, e.g. 6221234567890)
    const direct = db.prepare('SELECT * FROM products WHERE barcode = ?').get(s);
    if (direct) return direct;

    // 2. If the scanner read an EAN-13 starting with 622 + 9 digits, try to reverse-map to the stored short ID
    // Format that BarcodeSticker uses: "622" + id.padStart(9, '0') + checkDigit => 13 digits
    if (/^\d{13}$/.test(s) && s.startsWith('622')) {
      const coreNine = s.slice(3, 12); // extract the 9-digit padded portion
      const numericId = parseInt(coreNine, 10).toString(); // remove leading zeros => original ID/barcode
      
      // Search by numeric ID (products whose barcode field is just a number like "5")
      const byShortId = db.prepare('SELECT * FROM products WHERE barcode = ? OR id = ?').get(numericId, parseInt(numericId, 10));
      if (byShortId) return byShortId;
    }

    // 3. Numeric-only fallback: if stored barcode is a substring of the scanned EAN-13
    if (/^\d{12,13}$/.test(s)) {
      const allProducts = db.prepare('SELECT * FROM products WHERE barcode IS NOT NULL').all();
      for (const p of allProducts) {
        if (p.barcode && /^\d+$/.test(p.barcode) && s.includes(p.barcode.padStart(9, '0'))) {
          return p;
        }
      }
    }

    return null;
  },

  // --- Formulas ---
  async getFormulas(db) {
    const formulas = db.prepare('SELECT * FROM formulas').all()
    for (const f of formulas) {
      f.items = db.prepare(`
        SELECT fi.*, p.name as product_name, p.category as product_category
        FROM formula_items fi
        LEFT JOIN products p ON fi.product_id = p.id
        WHERE fi.formula_id = ?
      `).all(f.id)
    }
    return formulas
  },

  async addFormula(db, { name, total_price, barcode, items }) {
    const res = db.prepare('INSERT INTO formulas (name, total_price, barcode) VALUES (?, ?, ?)').run(name, total_price, barcode || null)
    const formulaId = res.lastInsertRowid
    const insertItem = db.prepare('INSERT INTO formula_items (formula_id, product_id, custom_name, price, quantity) VALUES (?, ?, ?, ?, ?)')
    for (const item of items) {
      insertItem.run(formulaId, item.product_id || null, item.product_name, item.price, item.quantity)
    }
    return { success: true, id: formulaId }
  },

  async updateFormula(db, { id, name, total_price, barcode, items }) {
    db.prepare('UPDATE formulas SET name = ?, total_price = ?, barcode = ? WHERE id = ?').run(name, total_price, barcode || null, id)
    // Refresh items: delete and re-insert
    db.prepare('DELETE FROM formula_items WHERE formula_id = ?').run(id)
    const insertItem = db.prepare('INSERT INTO formula_items (formula_id, product_id, custom_name, price, quantity) VALUES (?, ?, ?, ?, ?)')
    for (const item of items) {
      insertItem.run(id, item.product_id || null, item.product_name || item.custom_name, item.price, item.quantity)
    }
    return { success: true }
  },

  async deleteFormula(db, id) {
    db.prepare('DELETE FROM formula_items WHERE formula_id = ?').run(id)
    db.prepare('DELETE FROM formulas WHERE id = ?').run(id)
    return { success: true }
  }
}
