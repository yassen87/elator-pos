/**
 * Supplier Service - Handles all supplier-related operations
 */
export const supplierService = {
  async getSuppliers(db, { fromDate, toDate }) {
    const suppliers = db.prepare(`
      SELECT s.*, 
        (SELECT SUM(total_amount) FROM supplier_purchases WHERE supplier_id = s.id AND date(purchase_date) BETWEEN ? AND ?) as period_volume
      FROM suppliers s
    `).all(fromDate, toDate)
    return suppliers
  },

  async addSupplier(db, { name, phone, address }) {
    const res = db.prepare(`
      INSERT INTO suppliers (name, phone, address)
      VALUES (?, ?, ?)
    `).run(name, phone, address)
    return { success: true, id: res.lastInsertRowid }
  },

  async deleteSupplier(db, id) {
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return { success: true }
  },

  async addPurchase(db, { supplier_id, total_amount, paid_amount, remaining_amount, items, record_debt }) {
    const result = db.transaction(() => {
      // 1. Record purchase
      const res = db.prepare(`
        INSERT INTO supplier_purchases (supplier_id, total_amount, paid_amount, remaining_amount)
        VALUES (?, ?, ?, ?)
      `).run(supplier_id, total_amount, paid_amount, remaining_amount)
      
      const purchaseId = res.lastInsertRowid

      // 2. Record items and update stock
      const insertItem = db.prepare(`
        INSERT INTO supplier_purchase_items (purchase_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `)
      const updateStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
      const updateCost = db.prepare('UPDATE products SET cost_price = ? WHERE id = ?')
      const updateOilCost = db.prepare('UPDATE products SET cost_price_per_ml = ? WHERE id = ?')
      const updatePrices = db.prepare('UPDATE products SET price = ? WHERE id = ?')
      const updateWholesalePrices = db.prepare('UPDATE products SET wholesale_price = ? WHERE id = ?')
      const updateOilPrices = db.prepare('UPDATE products SET price_per_ml = ? WHERE id = ?')
      const updateOilWholesalePrices = db.prepare('UPDATE products SET wholesale_price_per_ml = ? WHERE id = ?')

      for (const item of items) {
        insertItem.run(purchaseId, item.product_id, item.quantity, item.unit_price)
        
        // Use inventoryService.updateStock logic or better, just do it here
        const prod = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(item.product_id)
        if (prod) {
            let field = 'stock_quantity'
            if (prod.sell_unit === 'ml') field = 'total_ml'
            else if (prod.sell_unit === 'gram') field = 'total_gram'
            db.prepare(`UPDATE products SET ${field} = ${field} + ? WHERE id = ?`).run(item.quantity, item.product_id)
        }

        // Update cost price and selling/wholesale prices
        const product = db.prepare('SELECT category FROM products WHERE id = ?').get(item.product_id)
        if (product) {
          const cost = parseFloat(item.unit_price)
          const retail = parseFloat(item.selling_price)
          const wholesale = parseFloat(item.wholesale_price)

          if (product.category === 'oil') {
            updateOilCost.run(cost, item.product_id)
            if (retail > 0) updateOilPrices.run(retail, item.product_id)
            if (wholesale > 0) updateOilWholesalePrices.run(wholesale, item.product_id)
          } else {
            updateCost.run(cost, item.product_id)
            if (retail > 0) updatePrices.run(retail, item.product_id)
            if (wholesale > 0) updateWholesalePrices.run(wholesale, item.product_id)
          }
        }
      }

      // 3. Update debt
      if (record_debt) {
        db.prepare('UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?').run(remaining_amount, supplier_id)
      }
      return purchaseId
    })()
    return { success: true, purchaseId: result }
  },

  async adjustDebt(db, { supplier_id, amount, description }) {
    db.prepare('UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?').run(amount, supplier_id)
    if (amount < 0) {
      // Record payment as expense
      db.prepare(`
        INSERT INTO expenses (amount, category, description, status, supplier_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(Math.abs(amount), 'دفعات للموردين', description || 'دفعة لمورد', 'spent', supplier_id)
    }
    return { success: true }
  },

  async getHistory(db, supplierId) {
    let purchaseQuery = `
      SELECT sp.*, sp.purchase_date as date, 'purchase' as type, s.name as supplier_name 
      FROM supplier_purchases sp
      JOIN suppliers s ON sp.supplier_id = s.id
    `
    let paymentQuery = `
      SELECT e.*, 'payment' as type, s.name as supplier_name 
      FROM expenses e
      JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.category = 'دفعات للموردين'
    `
    let params = []
    if (supplierId) {
      purchaseQuery += ` WHERE sp.supplier_id = ?`
      paymentQuery += ` AND e.supplier_id = ?`
      params.push(supplierId)
    }
    const purchases = db.prepare(purchaseQuery + ` ORDER BY sp.purchase_date DESC`).all(...params)
    
    // Fetch items for each purchase
    for (const p of purchases) {
        p.items = db.prepare(`
            SELECT spi.*, p.name as product_name
            FROM supplier_purchase_items spi
            JOIN products p ON spi.product_id = p.id
            WHERE spi.purchase_id = ?
        `).all(p.id)
    }

    const payments = db.prepare(paymentQuery + ` ORDER BY e.date DESC`).all(...params)
    return { success: true, history: [...purchases, ...payments].sort((a,b) => new Date(b.date) - new Date(a.date)) }
  }
}
