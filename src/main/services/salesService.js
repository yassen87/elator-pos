/**
 * Sales Service - Handles Sales and Returns logic
 */
export const salesService = {
  async addSale(db, sale) {
    const { total, items, customer_name, customer_phone, customer_address, customer_whatsapp, cashier_id, payment_method, payment_details, discount, invoice_code, source, remote_id } = sale
    
    // Use transaction for data integrity
    const result = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO sales (total, cashier_id, customer_name, customer_phone, customer_address, customer_whatsapp, invoice_code, payment_method, payment_details, discount, source, remote_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(total, cashier_id, customer_name, customer_phone, customer_address, customer_whatsapp, invoice_code, payment_method, payment_details, discount, source, remote_id || null)
      
      const saleId = res.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, item_name, price, quantity, details, cost_price, product_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      
      const updateStock = db.prepare('UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) - ? WHERE id = ?')
      const updateML = db.prepare('UPDATE products SET total_ml = COALESCE(total_ml, 0) - ? WHERE id = ?')
      const updateGram = db.prepare('UPDATE products SET total_gram = COALESCE(total_gram, 0) - ? WHERE id = ?')

      for (const item of items) {
        console.log(`[V3-SALE] Processing item: ${item.item_name}, Qty: ${item.quantity}, ProductID: ${item.product_id}`);
        insertItem.run(saleId, item.item_name, item.price, item.quantity, item.details ? JSON.stringify(item.details) : null, item.cost_price || 0, item.product_id || null)
        
        // Deduct stock if it's a known product
        if (item.product_id) {
            let deductType = 'stock'
            if (item.is_gram) deductType = 'gram'
            else if (item.is_ml) deductType = 'ml'
            else {
                // Fallback: lookup in DB for safety if flags are missing
                const p = db.prepare('SELECT sell_unit, category FROM products WHERE id = ?').get(item.product_id)
                if (p?.sell_unit === 'gram') deductType = 'gram'
                else if (p?.sell_unit === 'ml' || p?.category === 'oil') deductType = 'ml'
            }

            console.log(`[V3-SALE] Deducting ${item.quantity} from ${deductType} for Product ${item.product_id}`);
            if (deductType === 'gram') updateGram.run(item.quantity, item.product_id)
            else if (deductType === 'ml') updateML.run(item.quantity, item.product_id)
            else updateStock.run(item.quantity, item.product_id)
        }

        // Handle bottles in mixes (deduct stock & track for reports)
        if (item.bottle_id) {
            console.log(`[V3-SALE] Deducting ${item.quantity} bottles (ID: ${item.bottle_id})`);
            updateStock.run(item.quantity, item.bottle_id)
            // Insert a pseudo-item for the bottle to track it in best-seller reports without adding to total revenue 
            const bottle = db.prepare('SELECT name, price FROM products WHERE id = ?').get(item.bottle_id)
            if (bottle) {
                insertItem.run(saleId, bottle.name, 0, item.quantity, JSON.stringify({ is_auto_bottle: true, parent_item: item.item_name }), 0, item.bottle_id)
            }
        }

        // Handle formulas / mixed items (Ingredients)
        if (item.details && item.details.items) {
          console.log(`[V3-SALE] Found formula ingredients: ${item.details.items.length} items for ${item.item_name}`);
          for (const sub of item.details.items) {
            if (sub.product_id) {
              const subProduct = db.prepare('SELECT name, sell_unit, category FROM products WHERE id = ?').get(sub.product_id)
              const qtyToDeduct = (sub.ml || sub.quantity || 0) * item.quantity
              
              if (!subProduct) {
                  console.warn(`[V3-SALE] Ingredient product ID ${sub.product_id} not found in database! Skipping deduction.`);
                  continue;
              }

              console.log(`[V3-SALE] Ingredient: ${subProduct.name} (ID: ${sub.product_id}), Qty to deduct: ${qtyToDeduct}`);
              console.log(`[V3-SALE] SubProduct Unit: ${subProduct.sell_unit}, Category: ${subProduct.category}`);

              if (subProduct.sell_unit === 'gram') {
                  console.log(`[V3-SALE] Result: Deducting from total_gram`);
                  updateGram.run(qtyToDeduct, sub.product_id)
              } else if (subProduct.sell_unit === 'ml' || subProduct.category === 'oil' || subProduct.category === 'زيت') {
                  console.log(`[V3-SALE] Result: Deducting from total_ml`);
                  updateML.run(qtyToDeduct, sub.product_id)
              } else {
                  console.log(`[V3-SALE] Result: Deducting from stock_quantity`);
                  updateStock.run(qtyToDeduct, sub.product_id)
              }
            }
          }
        }
      }
      return saleId
    })()

    return { success: true, id: result, invoiceCode: invoice_code }
  },

  async getSalesReport(db, filters) {
    const { startDate, endDate, cashier, paymentMethod, source } = filters
    let query = `
      SELECT s.*, u.username as cashier_name 
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE date(s.date, 'localtime') BETWEEN ? AND ?
    `
    let params = [startDate, endDate]
    
    if (cashier) {
      query += ' AND u.username = ?'
      params.push(cashier)
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query += ' AND s.payment_method = ?'
      params.push(paymentMethod)
    }
    if (source && source !== 'all') {
      query += ' AND s.source = ?'
      params.push(source)
    }
    
    query += ' ORDER BY s.date DESC'
    const sales = db.prepare(query).all(...params)
    
    // Calculate total day and total expenses
    const total = sales.reduce((acc, s) => acc + (s.total || 0), 0)
    
    const expResult = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE date(date, 'localtime') BETWEEN ? AND ?").get(startDate, endDate)
    const totalExpenses = expResult?.total || 0
    
    // Fetch items for each sale
    for (const s of sales) {
      s.items = db.prepare(`
        SELECT si.*, p.name as product_name
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(s.id)
      
      // Fallback for item_name if it was null in old records
      for (const item of s.items) {
          if (!item.item_name && item.product_name) item.item_name = item.product_name;
      }
    }
    
    return { sales, total, totalExpenses }
  },

  async deleteSale(db, id) {
    return db.transaction(() => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
      const updateStock = db.prepare('UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ?')
      const updateML = db.prepare('UPDATE products SET total_ml = COALESCE(total_ml, 0) + ? WHERE id = ?')
      const updateGram = db.prepare('UPDATE products SET total_gram = COALESCE(total_gram, 0) + ? WHERE id = ?')
      
      for (const item of items) {
        // Find product by name if product_id is missing (fallback)
        let productId = item.product_id
        if (!productId) {
          const p = db.prepare('SELECT id FROM products WHERE name = ?').get(item.item_name)
          if (p) productId = p.id
        }
        
        if (productId) {
          // If it's a mix/formula (details present), restock its components
          if (item.details) {
            try {
                const details = JSON.parse(item.details)
                if (details.items && Array.isArray(details.items)) {
                    for (const sub of details.items) {
                        if (sub.product_id) {
                            const subP = db.prepare('SELECT sell_unit, category FROM products WHERE id = ?').get(sub.product_id)
                            const qtyToRestock = (sub.ml || sub.quantity || 0) * item.quantity
                            if (subP?.sell_unit === 'gram') {
                                updateGram.run(qtyToRestock, sub.product_id)
                            } else if (subP?.sell_unit === 'ml' || subP?.category === 'oil') {
                                updateML.run(qtyToRestock, sub.product_id)
                            } else {
                                updateStock.run(qtyToRestock, sub.product_id)
                            }
                        }
                    }
                }
                if (details.bottle_id) {
                    updateStock.run(item.quantity, details.bottle_id)
                }
            } catch (e) {
                console.error("[deleteSale] Error parsing item details:", e)
            }
          } else {
             // Regular product: look up unit to restock correctly
             const product = db.prepare('SELECT category, sell_unit FROM products WHERE id = ?').get(productId)
             if (product) {
                if (product.sell_unit === 'ml' || product.category === 'oil') updateML.run(item.quantity, productId)
                else if (product.sell_unit === 'gram') updateGram.run(item.quantity, productId)
                else updateStock.run(item.quantity, productId)
             } else {
                updateStock.run(item.quantity, productId)
             }
          }
        }
      }
      
      // Delete related returns first (FK constraint fix)
      const linkedReturns = db.prepare('SELECT id FROM returns WHERE original_sale_id = ?').all(id)
      for (const ret of linkedReturns) {
        db.prepare('DELETE FROM return_items WHERE return_id = ?').run(ret.id)
      }
      if (linkedReturns.length > 0) {
        db.prepare('DELETE FROM returns WHERE original_sale_id = ?').run(id)
      }

      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id)
      db.prepare('DELETE FROM sales WHERE id = ?').run(id)
      return { success: true }
    })()
  },

  async updateSale(db, data) {
    const { id, customer_name, customer_phone, customer_address, customer_whatsapp, items, total } = data
    return db.transaction(() => {
      db.prepare('UPDATE sales SET customer_name = ?, customer_phone = ?, customer_address = ?, customer_whatsapp = ?, total = ? WHERE id = ?')
        .run(customer_name, customer_phone, customer_address, customer_whatsapp, total, id)
      
      // For simplicity in this logic, we assume quantity/price changes are handled.
      // Re-updating stock would be complex here, usually we just update the metadata.
      // If the user changed quantities, we'd need to diff them.
      
      for (const item of items) {
        db.prepare('UPDATE sale_items SET quantity = ?, price = ? WHERE id = ? AND sale_id = ?')
          .run(item.quantity, item.price, item.id, id)
      }
      return { success: true }
    })()
  },

  async getReturns(db, params) {
    const { startDate, endDate } = params || {}
    let query = `
      SELECT r.*, u.username as cashier_name, s.invoice_code as original_invoice_code
      FROM returns r
      LEFT JOIN users u ON r.cashier_id = u.id
      LEFT JOIN sales s ON r.original_sale_id = s.id
    `
    let args = []
    if (startDate && endDate) {
      query += " WHERE date(r.return_date, 'localtime') BETWEEN ? AND ?"
      args.push(startDate, endDate)
    }
    query += ' ORDER BY r.return_date DESC'
    
    const returns = db.prepare(query).all(...args)
    for (const r of returns) {
      r.items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(r.id)
    }
    return returns
  },

  async getNextInvoiceCode(db) {
    const last = db.prepare('SELECT MAX(id) as id FROM sales').get()
    const nextId = (last?.id || 0) + 1
    return String(nextId)
  },

  async getNextCustomerInvoiceCode(db, customerPhone) {
    if (!customerPhone) {
        // Fallback to global sequence if no customer
        return this.getNextInvoiceCode(db)
    }
    
    // Get last numerical invoice code for this specific customer
    const sales = db.prepare('SELECT invoice_code FROM sales WHERE customer_phone = ?').all(customerPhone)
    
    let maxCode = 0
    for (const s of sales) {
        const code = parseInt(s.invoice_code)
        if (!isNaN(code) && code > maxCode) {
            maxCode = code
        }
    }
    
    return String(maxCode + 1)
  },

  async getSalesHistory(db) {
    const sales = db.prepare(`
      SELECT s.*, u.username as cashier_name 
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      ORDER BY s.date DESC
    `).all()
    
    for (const s of sales) {
      s.items = db.prepare(`
        SELECT si.*, p.category, p.sell_unit 
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(s.id)
    }
    return sales
  },

  async getSaleById(db, id) {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ? OR invoice_code = ?').get(id, id)
    if (sale) {
      this._attachItemsWithReturns(db, sale)
    }
    return sale
  },

  async getSalesByInvoiceCode(db, invoiceCode) {
    const sales = db.prepare(`
        SELECT s.*, u.username as cashier_name 
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE s.invoice_code = ?
        ORDER BY s.date DESC
    `).all(invoiceCode)
    
    for (const s of sales) {
         this._attachItemsWithReturns(db, s)
    }
    return sales
  },

  // Helper to calculate returned quantities
  _attachItemsWithReturns(db, sale) {
      sale.items = db.prepare(`
        SELECT si.*, p.name as product_name
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(sale.id)
      
      for (const item of sale.items) {
          if (!item.item_name && item.product_name) item.item_name = item.product_name;
      }
      
      // Fetch all returns for this sale
      const returns = db.prepare('SELECT id FROM returns WHERE original_sale_id = ?').all(sale.id)
      const returnIds = returns.map(r => r.id)
      
      let returnItems = []
      if (returnIds.length > 0) {
          const placeholders = returnIds.map(() => '?').join(',')
          returnItems = db.prepare(`SELECT * FROM return_items WHERE return_id IN (${placeholders})`).all(...returnIds)
      }

      // Calculate logic
      for (const item of sale.items) {
          // Find matching return items (by name)
          // Note: This matches by name since sale_items usually matches return_items by name.
          // If multiple same-name items exist in sale, this logic distributes return qty simply.
          // Ideally we should match by more specific ID but schema limitations apply.
          const returned = returnItems.filter(ri => ri.item_name === item.item_name)
          const totalReturned = returned.reduce((sum, ri) => sum + (ri.quantity || 0), 0)
          
          item.returned_quantity = totalReturned
          item.remaining_quantity = Math.max(0, item.quantity - totalReturned)
      }
  },

  async addReturn(db, data) {
    const { 
        original_sale_id, 
        return_type, 
        cashier_id, 
        customer_name = '', 
        customer_phone = '', 
        reason = '', 
        details = '', 
        total_refund = 0, 
        items = [], 
        notes = '' 
    } = data
    
    const result = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO returns (original_sale_id, return_type, cashier_id, customer_name, customer_phone, reason, details, total_refund, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(original_sale_id, return_type, cashier_id, customer_name, customer_phone, reason, details, total_refund, notes)
      
      const returnId = res.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO return_items (return_id, product_id, item_name, quantity, refund_amount, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const updateStock = db.prepare('UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ?')
      const updateML = db.prepare('UPDATE products SET total_ml = COALESCE(total_ml, 0) + ? WHERE id = ?')
      const updateGram = db.prepare('UPDATE products SET total_gram = COALESCE(total_gram, 0) + ? WHERE id = ?')

      for (const item of items) {
        insertItem.run(returnId, item.product_id, item.item_name, item.quantity, item.refund_amount, item.details ? (typeof item.details === 'string' ? item.details : JSON.stringify(item.details)) : null)

        // Restock regular products
        if (item.product_id && !item.details) {
          const product = db.prepare('SELECT category, sell_unit FROM products WHERE id = ?').get(item.product_id)
          if (product) {
            if (product.sell_unit === 'ml' || product.category === 'oil') {
              updateML.run(item.quantity, item.product_id)
            } else if (product.sell_unit === 'gram') {
              updateGram.run(item.quantity, item.product_id)
            } else {
              updateStock.run(item.quantity, item.product_id)
            }
          } else {
             // Fallback if product logic depends on flags passed from frontend
             if (item.is_ml) updateML.run(item.quantity, item.product_id)
             else if (item.is_gram) updateGram.run(item.quantity, item.product_id)
             else updateStock.run(item.quantity, item.product_id)
          }
        }

        // Restock formula ingredients on return (oils + bottle)
        if (item.details) {
          const formulaDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details

          // Restock each oil ingredient
          if (formulaDetails.items && Array.isArray(formulaDetails.items)) {
            for (const sub of formulaDetails.items) {
              if (sub.product_id) {
                const subP = db.prepare('SELECT sell_unit, category FROM products WHERE id = ?').get(sub.product_id)
                const qtyToRestock = (sub.ml || sub.quantity || 0) * item.quantity
                
                if (subP?.sell_unit === 'gram') {
                    updateGram.run(qtyToRestock, sub.product_id)
                } else if (subP?.sell_unit === 'ml' || subP?.category === 'oil') {
                    updateML.run(qtyToRestock, sub.product_id)
                } else {
                    updateStock.run(qtyToRestock, sub.product_id)
                }
              }
            }
          }

          // Restock the bottle
          if (formulaDetails.bottle_id) {
            updateStock.run(item.quantity, formulaDetails.bottle_id)
          }
        }
      }
      return returnId
    })()
    
    return { success: true, returnId: result }
  },

  async getCustomersList(db) {
    return db.prepare('SELECT DISTINCT customer_name, customer_phone, customer_address, customer_whatsapp FROM sales WHERE customer_name IS NOT NULL').all()
  },

  async getBestSellingProducts(db) {
    return db.prepare(`
      SELECT item_name as name, SUM(quantity) as total_sold, SUM(price * quantity) as total_revenue
      FROM sale_items
      GROUP BY item_name
      ORDER BY total_sold DESC
      LIMIT 10
    `).all()
  },

  async getCustomerTopProducts(db, name, phone) {
    return db.prepare(`
      SELECT si.item_name as name, SUM(si.quantity) as total_bought
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.customer_name = ? AND IFNULL(s.customer_phone, '') = IFNULL(?, '')
      GROUP BY si.item_name
      ORDER BY total_bought DESC
      LIMIT 5
    `).all(name, phone)
  },

  async getAllCustomersTopProducts(db) {
    return db.prepare(`
      WITH CustomerItems AS (
          SELECT 
              s.customer_name,
              s.customer_phone,
              si.item_name as top_product,
              SUM(si.quantity) as total_qty,
              COUNT(*) as purchase_count
          FROM sales s
          JOIN sale_items si ON s.id = si.sale_id
          WHERE s.customer_name IS NOT NULL
          GROUP BY s.customer_name, s.customer_phone, si.item_name
      ),
      RankedItems AS (
          SELECT 
              *,
              ROW_NUMBER() OVER (PARTITION BY customer_name, customer_phone ORDER BY total_qty DESC) as rank
          FROM CustomerItems
      )
      SELECT 
          customer_name,
          customer_phone,
          top_product,
          purchase_count
      FROM RankedItems
      WHERE rank = 1
    `).all()
  },

  async getCustomerPurchaseHistory(db, name, phone) {
    const searchName = (name || '').trim()
    const searchPhone = (phone || '').trim()
    
    // Diagnostic log for the terminal
    console.log(`[CustomerHistory] Searching for: Name="${searchName}", Phone="${searchPhone}"`)

    const rows = db.prepare(`
      SELECT 
        s.date as sale_date,
        s.invoice_code,
        s.id as sale_id,
        s.total,
        si.item_name,
        si.details,
        si.price,
        si.quantity,
        si.product_id,
        p.category,
        p.sell_unit
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE TRIM(IFNULL(s.customer_name, '')) = ? 
        AND TRIM(IFNULL(s.customer_phone, '')) = ?
      ORDER BY s.date DESC
    `).all(searchName, searchPhone)

    console.log(`[CustomerHistory] Found ${rows.length} item rows for this customer.`)

    const salesList = []
    const salesMap = {}

    for (const row of rows) {
      const saleId = row.sale_id
      if (!salesMap[saleId]) {
        const saleObj = {
          sale_id: saleId,
          invoice_code: row.invoice_code || `ID-${saleId}`,
          sale_date: row.sale_date,
          total: row.total || 0,
          items: []
        }
        salesMap[saleId] = saleObj
        salesList.push(saleObj)
      }
      
      salesMap[saleId].items.push({
        item_name: row.item_name || 'منتج غير محدد',
        details: row.details || '',
        price: row.price || 0,
        quantity: row.quantity || 0,
        category: row.category,
        sell_unit: row.sell_unit
      })
    }

    return salesList
  }
}
