import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import getDB from './db'
import ExcelJS from 'exceljs'
import { join } from 'path'
import os from 'os'
import fs from 'fs'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Helper to generate and save PDF invoices
async function generateInvoicePDF(saleData, settings, type = 'Normal') {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 200], // 80mm thermal paper width
    })

    // Create Invoices directory in Documents
    const docsPath = app.getPath('documents')
    const invoicesPath = join(docsPath, 'Invoices')
    const typePath = join(invoicesPath, type)

    if (!fs.existsSync(invoicesPath)) fs.mkdirSync(invoicesPath)
    if (!fs.existsSync(typePath)) fs.mkdirSync(typePath)

    // Basic Header (Note: jsPDF has limited RTL support by default, using simple alignment)
    doc.setFontSize(14)
    doc.text(settings.shop_name || 'Al-Areen Perfumes', 40, 10, { align: 'center' })
    
    doc.setFontSize(8)
    doc.text(`Invoice: #${saleData.invoice_code}`, 10, 20)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 25)
    doc.text(`Customer: ${saleData.customer_name || 'Guest'}`, 10, 30)

    // Items list
    let y = 40
    doc.text('------------------------------------------------', 10, y)
    y += 5
    saleData.items.forEach(item => {
      doc.text(`${item.name || item.item_name} x${item.quantity}`, 10, y)
      doc.text(`${(item.price * item.quantity).toFixed(2)}`, 70, y, { align: 'right' })
      y += 5
    })
    
    y += 5
    doc.text('------------------------------------------------', 10, y)
    y += 10
    doc.setFontSize(12)
    doc.text(`Total: ${saleData.total.toFixed(2)} EGP`, 10, y)

    const fileName = `Invoice_${saleData.invoice_code}_${Date.now()}.pdf`
    const filePath = join(typePath, fileName)
    
    const buffer = Buffer.from(doc.output('arraybuffer'))
    fs.writeFileSync(filePath, buffer)
    
    console.log(`[PDF] Saved invoice to: ${filePath}`)
    return filePath
  } catch (err) {
    console.error('[PDF] Generation error:', err)
  }
}

// Helper to notify all windows about a sales change
function notifySalesChange() {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('sales-updated')
  })
}

export function setupIpcHandlers() {
  const db = getDB()

  // 6. Sequential Unpadded Migration (Force check for leading zeros)
  try {
    const allSales = db.prepare('SELECT id, invoice_code FROM sales ORDER BY id ASC').all()
    const needsMigration = allSales.some((s, idx) => {
      const expected = (idx + 1).toString()
      return s.invoice_code !== expected || (s.invoice_code && s.invoice_code.startsWith('0'))
    })
    
    if (needsMigration) {
      console.log(`[MIGRATION] Standardizing ${allSales.length} sales to unpadded sequential format...`)
      const updateCode = db.prepare('UPDATE sales SET invoice_code = ? WHERE id = ?')
      db.transaction(() => {
        allSales.forEach((sale, index) => {
          updateCode.run((index + 1).toString(), sale.id)
        })
      })()
      console.log('[MIGRATION] Unpadded standardization complete.')
    }
  } catch (e) {
    console.error('[MIGRATION] Error re-numbering sales:', e.message)
  }
  // شاشة تسجيل الدخول
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    const cleanUsername = username.trim()
    const cleanPassword = password.trim()
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(cleanUsername, cleanPassword)
    if (user) {
      return { success: true, user: { id: user.id, username: user.username, role: user.role } }
    }
    return { success: false, message: 'خطأ في اسم المستخدم أو كلمة المرور' }
  })

  // إدارة المنتجات
  ipcMain.handle('products:list', async () => {
    return db.prepare('SELECT * FROM products').all()
  })

  ipcMain.handle('sales:get-next-code', async () => {
    try {
      const result = db.prepare('SELECT MAX(CAST(invoice_code AS NUMBER)) as maxCode FROM sales').get()
      const nextNum = (result && result.maxCode ? result.maxCode : 0) + 1
      return nextNum.toString()
    } catch (e) {
      return '1'
    }
  })

  ipcMain.handle('products:add', async (event, product) => {
    console.log('--- Adding Product Call ---')
    console.log('Received payload:', JSON.stringify(product, null, 2))
    
    // Defensive values to ensure NOT NULL constraints are never violated
    const name = product.name || 'منتج جديد'
    const price = Number(product.price) || 0
    const price_per_ml = Number(product.price_per_ml) || 0
    const stock_quantity = Number(product.stock_quantity) || 0
    const total_ml = Number(product.total_ml) || stock_quantity 
    const alert_ml = Number(product.alert_ml) || 0
    const min_stock = Number(product.min_stock) || 10
    const category = product.category || 'oil'

    console.log('[V3-FIX] Final SQL Params:', [name, price, price_per_ml, total_ml, stock_quantity, min_stock, alert_ml, category])

    try {
      const result = db.prepare(`
        INSERT INTO products (name, price, price_per_ml, total_ml, stock_quantity, min_stock, alert_ml, category) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, 
        price, 
        price_per_ml,
        total_ml,
        stock_quantity,
        min_stock,
        alert_ml,
        category
      )
      console.log('Success! New ID:', result.lastInsertRowid)
      return { success: true, id: result.lastInsertRowid }
    } catch (err) {
      console.error('CRITICAL SQL ERROR in products:add:', err.message)
      return { success: false, message: err.message }
    }
  })


  ipcMain.handle('products:update-stock', async (event, data) => {
    const { id, quantity, isOil } = data
    const numQty = Number(quantity)
    
    console.log(`[IPC] Request to update stock: ID=${id}, Quantity=${numQty}, isOil=${isOil}`)

    if (isNaN(numQty) || !id) {
      console.error('[IPC] Invalid stock update request data')
      return { success: false, message: 'بيانات التحديث غير صالحة' }
    }
    
    try {
      if (isOil) {
        // تحديث الكمية (عدد) والمللي في نفس الوقت للزيوت
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_ml = total_ml + ? WHERE id = ?').run(numQty, numQty, id)
      } else {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(numQty, id)
      }
      console.log(`[IPC] Stock updated successfully for ID ${id}`)
      return { success: true }
    } catch (err) {
      console.error('[IPC] Database error during stock update:', err.message)
      return { success: false, message: 'حدث خطأ في قاعدة البيانات: ' + err.message }
    }
  })

  ipcMain.handle('products:update', async (event, product) => {
    const { id, name, price, price_per_ml, stock_quantity, min_stock, category } = product
    try {
      db.prepare(`
        UPDATE products 
        SET name = ?, price = ?, price_per_ml = ?, stock_quantity = ?, min_stock = ?, category = ?
        WHERE id = ?
      `).run(name, price, price_per_ml, stock_quantity, min_stock, category, id)
      
      // مزامنة total_ml إذا كان زيت
      if (category === 'oil') {
        db.prepare('UPDATE products SET total_ml = stock_quantity WHERE id = ?').run(id)
      }

      return { success: true }
    } catch (err) {
      console.error('[IPC] Error updating product:', err.message)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('products:delete', async (event, id) => {
    // حذف العناصر المرتبطة في التركيبات أولاً
    db.prepare('DELETE FROM formula_items WHERE product_id = ?').run(id)
    // ثم حذف المنتج
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return { success: true }
  })

  // إدارة التركيبات
  ipcMain.handle('formulas:add', async (event, { name, total_price, items }) => {
    // التحقق من توفر المنتجات (فقط للمنتجات المسجلة)
    for (const item of items) {
      if (item.product_id) {
        const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id)
        if (!product || product.stock_quantity < item.quantity) {
          return { 
            success: false, 
            message: `الكمية المتاحة غير كافية للمنتج` 
          }
        }
      }
    }

    const info = db.prepare('INSERT INTO formulas (name, total_price) VALUES (?, ?)').run(name, total_price)
    const formulaId = info.lastInsertRowid

    const insertItem = db.prepare('INSERT INTO formula_items (formula_id, product_id, custom_name, price, quantity) VALUES (?, ?, ?, ?, ?)')
    
    items.forEach(item => {
      insertItem.run(formulaId, item.product_id || null, item.custom_name || null, item.price || null, item.quantity)
    })
    
    return { success: true, id: formulaId }
  })

  ipcMain.handle('formulas:list', async () => {
    const formulas = db.prepare('SELECT * FROM formulas').all()
    return formulas.map(f => {
      const items = db.prepare(`
        SELECT fi.*, p.name as product_name, p.price as product_price 
        FROM formula_items fi 
        LEFT JOIN products p ON fi.product_id = p.id 
        WHERE fi.formula_id = ?
      `).all(f.id)
      return { ...f, items }
    })
  })

  ipcMain.handle('formulas:delete', async (event, id) => {
    db.prepare('DELETE FROM formula_items WHERE formula_id = ?').run(id)
    db.prepare('DELETE FROM formulas WHERE id = ?').run(id)
    return { success: true }
  })

  // إدارة الكاشير
  ipcMain.handle('cashiers:list', async () => {
    return db.prepare('SELECT id, username, role FROM users WHERE is_active = 1').all()
  })

  ipcMain.handle('super:users-list', async () => {
    return db.prepare('SELECT id, username, password, role, is_active FROM users').all()
  })

  ipcMain.handle('cashiers:add', async (event, { username, password }) => {
    try {
      const cleanUsername = username.trim()
      const cleanPassword = password.trim()
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(cleanUsername, cleanPassword, 'cashier')
      return { success: true }
    } catch (e) {
      return { success: false, message: 'اسم المستخدم موجود مسبقاً' }
    }
  })

  ipcMain.handle('cashiers:delete', async (event, id) => {
    // Check if cashier has sales
    const hasSales = db.prepare('SELECT id FROM sales WHERE cashier_id = ? LIMIT 1').get(id)
    
    if (hasSales) {
      // Soft delete (Deactivate)
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id)
      return { success: true, message: 'تم تعطيل حساب الكاشير لوجود مبيعات سابقة له (لم يتم الحذف نهائياً)' }
    } else {
      // Hard delete
      db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, 'cashier')
      return { success: true, message: 'تم حذف الكاشير نهائياً' }
    }
  })

  ipcMain.handle('users:update-password', async (event, { id, password }) => {
    try {
      const cleanPassword = password.trim()
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(cleanPassword, id)
      return { success: true }
    } catch (e) {
      return { success: false, message: 'حدث خطأ أثناء تحديث كلمة المرور' }
    }
  })

  // المبيعات
  ipcMain.handle('sales:add', async (event, saleData) => {
    console.log('[V3-FIX] sales:add received:', JSON.stringify(saleData, null, 2))
    
    const { total, cashier_id, customer_name, customer_phone, items, payment_method, payment_details } = saleData
    
    // Defensive values
    const safeTotal = Number(total) || 0
    const safeCashierId = cashier_id || null
    const safeCustomerName = customer_name || ''
    const safeCustomerPhone = customer_phone || ''
    const safePaymentMethod = payment_method || 'cash'
    const safePaymentDetails = payment_details || ''

    try {
      const result = db.prepare('SELECT MAX(CAST(invoice_code AS NUMBER)) as maxCode FROM sales').get()
      const invoiceCode = ((result && result.maxCode ? result.maxCode : 0) + 1).toString()

      const info = db.prepare('INSERT INTO sales (total, cashier_id, customer_name, customer_phone, invoice_code, payment_method, payment_details) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        safeTotal, 
        safeCashierId, 
        safeCustomerName, 
        safeCustomerPhone,
        invoiceCode,
        safePaymentMethod,
        safePaymentDetails
      )
      const saleId = info.lastInsertRowid

      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, item_name, price, quantity, details) VALUES (?, ?, ?, ?, ?)')
      
      const updateStockInDB = (qty, id) => {
        try {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, total_ml = IFNULL(total_ml, 0) - ? WHERE id = ?').run(qty, qty, id)
        } catch (e) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(qty, id)
        }
      }
      
      const getFormulaItems = db.prepare('SELECT product_id, quantity FROM formula_items WHERE formula_id = ?')

      items.forEach(item => {
        const itemPrice = Number(item.price) || 0
        const itemQty = Number(item.quantity) || 0
        
        let detailsText = item.description || ''
        if (item.formula_id && !detailsText) {
          detailsText = `تركيبة ثابتة: ${item.name}`
        }

        const stockImpact = []
        if (item.product_id) {
          stockImpact.push({ id: item.product_id, qty: itemQty })
        } else if (item.oils && item.oils.length > 0) {
          item.oils.forEach(oil => {
            stockImpact.push({ id: oil.oil_id, qty: (Number(oil.ml) || 0) * itemQty })
          })
          if (item.bottle_id) {
            stockImpact.push({ id: item.bottle_id, qty: itemQty })
          }
        } else if (item.oil_id) {
          stockImpact.push({ id: item.oil_id, qty: (Number(item.ml) || 0) * itemQty })
          if (item.bottle_id) stockImpact.push({ id: item.bottle_id, qty: itemQty })
        } else if (item.formula_id) {
          const ingredients = getFormulaItems.all(item.formula_id)
          ingredients.forEach(ing => {
            if (ing.product_id) {
              stockImpact.push({ id: ing.product_id, qty: (Number(ing.quantity) || 0) * itemQty })
            }
          })
        }

        const detailsData = JSON.stringify({
          text: detailsText,
          impact: stockImpact
        })

        insertItem.run(saleId, item.name || 'عنصر', itemPrice, itemQty, detailsData)
        
        stockImpact.forEach(impact => {
          updateStockInDB(impact.qty, impact.id)
        })
      })
      
      console.log('[V3-FIX] Sale added successfully, ID:', saleId, 'Code:', invoiceCode)
      
      // Auto PDF generation
      const settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      generateInvoicePDF({ ...saleData, invoice_code: invoiceCode }, settings, 'Normal')

      notifySalesChange()

      return { success: true, id: saleId, invoiceCode }
    } catch (err) {
      console.error('[V3-FIX] CRITICAL ERROR in sales:add:', err.message)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('sales:update', async (event, saleData) => {
    const { id, total, customer_name, customer_phone, items, payment_method, payment_details } = saleData
    console.log('[UPDATE] Updating sale ID:', id)

    const transaction = db.transaction(() => {
      // 1. Get old items to revert stock
      const oldItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
      oldItems.forEach(item => {
        if (item.details) {
          try {
            const details = JSON.parse(item.details)
            if (details.impact) {
              details.impact.forEach(impact => {
                db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(impact.qty, impact.id)
              })
            }
          } catch (e) {
            console.error('Revert stock error:', e)
          }
        }
      })

      // 2. Update Sales record
      db.prepare(`
        UPDATE sales SET 
          total = ?, 
          customer_name = ?, 
          customer_phone = ?, 
          payment_method = ?, 
          payment_details = ? 
        WHERE id = ?
      `).run(total, customer_name, customer_phone, payment_method, payment_details, id)

      // 3. Update Sale Items and Apply New Stock
      // Note: For now we update existing items. 
      // If the user changed quantities, we need to recalculate impact based on the ratio or original impact
      const updateItem = db.prepare('UPDATE sale_items SET price = ?, quantity = ?, details = ? WHERE id = ?')

      items.forEach(item => {
        const oldItem = oldItems.find(oi => oi.id === item.id)
        if (!oldItem) return // Should not happen if only editing existing

        let newDetails = oldItem.details
        let newImpact = []
        
        if (oldItem.details) {
          try {
            const parsed = JSON.parse(oldItem.details)
            if (parsed.impact) {
              // Scale the impact by the new quantity
              // Original impact was for oldItem.quantity. 1 unit impact = impact / oldItem.quantity
              const ratio = item.quantity / oldItem.quantity
              newImpact = parsed.impact.map(imp => ({
                id: imp.id,
                qty: (imp.qty / oldItem.quantity) * item.quantity
              }))
              
              parsed.impact = newImpact
              newDetails = JSON.stringify(parsed)
            }
          } catch (e) {}
        }

        updateItem.run(item.price, item.quantity, newDetails, item.id)

        // Deduct new stock
        newImpact.forEach(impact => {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(impact.qty, impact.id)
        })
      })

      return { success: true }
    })

    try {
      const res = transaction()
      // Auto PDF generation (Edited)
      const settingsData = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      generateInvoicePDF(saleData, settingsData, 'Edited')
      
      notifySalesChange()
      return res
    } catch (err) {
      console.error('Update sale error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('sales:customers', async () => {
    return db.prepare(`
      SELECT DISTINCT customer_name, customer_phone 
      FROM sales 
      WHERE customer_name IS NOT NULL OR customer_phone IS NOT NULL
      ORDER BY customer_name ASC
    `).all()
  })

  ipcMain.handle('sales:history', async (event, { limit = 50, cashierId = null }) => {
    // 1. Fetch Sales
    let salesQuery = `
      SELECT s.*, u.username as cashier_name, 'sale' as entry_type
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
    `
    if (cashierId) salesQuery += ` WHERE s.cashier_id = ? `
    salesQuery += ` ORDER BY s.date DESC LIMIT ? `
    
    const salesParams = cashierId ? [cashierId, limit] : [limit]
    const sales = db.prepare(salesQuery).all(...salesParams)

    // 2. Fetch Returns
    let returnsQuery = `
      SELECT r.id, r.total_refund as total, r.return_date as date, r.customer_name, r.customer_phone, 
             u.username as cashier_name, 'return' as entry_type, r.original_sale_id,
             s_orig.invoice_code as invoice_code
      FROM returns r
      LEFT JOIN users u ON r.cashier_id = u.id
      LEFT JOIN sales s_orig ON r.original_sale_id = s_orig.id
    `
    if (cashierId) returnsQuery += ` WHERE r.cashier_id = ? `
    returnsQuery += ` ORDER BY r.return_date DESC LIMIT ? `
    
    const returnsParams = cashierId ? [cashierId, limit] : [limit]
    const returns = db.prepare(returnsQuery).all(...returnsParams)

    // 3. Combine and Sort
    const allHistory = [...sales, ...returns]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)

    // 4. Get items for each entry
    const finalHistory = allHistory.map(entry => {
      if (entry.entry_type === 'sale') {
        const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(entry.id)
        return { ...entry, items }
      } else {
        const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(entry.id)
        return { ...entry, items, is_return: true }
      }
    })

    return finalHistory
  })
 
  ipcMain.handle('sales:report', async (event, params) => {
    const startDate = params.startDate || params.date || 'now'
    const endDate = params.endDate || params.date || 'now'
    const cashierId = params.cashierId
    
    let query = `
      SELECT 
        s.*, 
        IFNULL(u.username, 'غير معروف') as cashier_name,
        (s.total - IFNULL(r_sum.total_refunded, 0)) as net_total
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      LEFT JOIN (
        SELECT original_sale_id, SUM(total_refund) as total_refunded
        FROM returns
        GROUP BY original_sale_id
      ) r_sum ON s.id = r_sum.original_sale_id
      WHERE date(s.date) BETWEEN date(?) AND date(?)
    `
    const args = [startDate, endDate]
    
    if (cashierId) {
      query += ` AND s.cashier_id = ?`
      args.push(cashierId)
    }
    
    // Filter out fully returned sales or just return the adjusted list
    // The user wants them "removed", so we'll filter sales where net_total <= 0
    query = `SELECT * FROM (${query}) WHERE net_total > 0`
    
    const sales = db.prepare(query).all(...args)
    
    // Get items for each sale
    return sales.map(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id)
      return { ...sale, items }
    })
  })

  ipcMain.handle('sales:export', async (event, sales) => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Sales Report')
    
    sheet.columns = [
      { header: 'رقم الفاتورة', key: 'id', width: 10 },
      { header: 'التاريخ', key: 'date', width: 25 },
      { header: 'الكاشير', key: 'cashier_name', width: 20 },
      { header: 'العميل', key: 'customer_name', width: 20 },
      { header: 'الإجمالي (صافي)', key: 'net_total', width: 15 }
    ]

    sales.forEach(s => {
      sheet.addRow({
        ...s,
        net_total: s.net_total !== undefined ? s.net_total : s.total
      })
    })

    const { filePath } = await dialog.showSaveDialog({
      title: 'حفظ تقرير المبيعات',
      defaultPath: `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (filePath) {
      await workbook.xlsx.writeFile(filePath)
      shell.showItemInFolder(filePath)
      return true
    }
    return false
  })

  // شؤون الموظفين
  ipcMain.handle('employees:list', async () => {
    return db.prepare('SELECT * FROM employees').all()
  })

  ipcMain.handle('employees:add', async (event, emp) => {
    const result = db.prepare('INSERT INTO employees (name, phone, work_hours, salary, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)').run(
      emp.name, 
      emp.phone || '', 
      emp.work_hours, 
      emp.salary, 
      emp.start_time, 
      emp.end_time
    )
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('employees:delete', async (event, id) => {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id)
    return { success: true }
  })

  // إعدادات البصمة
  ipcMain.handle('biometric:get-settings', async () => {
    const settings = db.prepare('SELECT * FROM biometric_settings WHERE id = 1').get()
    return settings || { device_ip: '', device_port: 4370, device_type: 'ZKTeco' }
  })

  ipcMain.handle('biometric:save-settings', async (event, settings) => {
    db.prepare(`
      INSERT OR REPLACE INTO biometric_settings (id, device_ip, device_port, device_type) 
      VALUES (1, ?, ?, ?)
    `).run(settings.device_ip, settings.device_port, settings.device_type)
    return { success: true }
  })

  ipcMain.handle('biometric:sync', async () => {
    const settings = db.prepare('SELECT * FROM biometric_settings WHERE id = 1').get()
    
    if (!settings || !settings.device_ip) {
      return { success: false, message: 'يرجى إعداد إعدادات جهاز البصمة أولاً' }
    }

    // وضع المحاكاة (Demo Mode)
    if (settings.device_ip === '127.0.0.1' || settings.device_ip.toLowerCase() === 'demo') {
      const employees = db.prepare('SELECT * FROM employees').all()
      if (employees.length === 0) {
        return { success: false, message: 'لا يوجد موظفين لتوليد بيانات حضور لهم. يرجى إضافة موظفين أولاً.' }
      }

      const today = new Date().toISOString().split('T')[0]
      const insertAttendance = db.prepare('INSERT INTO attendance (employee_id, date, hours_worked) VALUES (?, ?, ?)')
      
      let count = 0
      const transaction = db.transaction((emps) => {
        for (const emp of emps) {
          // التحقق إذا كان الموظف لديه سجل اليوم بالفعل
          const exists = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?').get(emp.id, today)
          if (!exists) {
            // توليد ساعات عمل عشوائية (ساعة العمل +/- ساعة واحدة)
            const baseHours = parseFloat(emp.work_hours) || 8
            const randomVariance = (Math.random() * 2) - 1 // من -1 إلى +1
            const hours = Math.max(1, Math.min(24, Math.round((baseHours + randomVariance) * 10) / 10))
            
            insertAttendance.run(emp.id, today, hours)
            count++
          }
        }
      })

      transaction(employees)
      
      return { 
        success: true, 
        message: count > 0 ? `تمت المحاكاة بنجاح: تم سحب ${count} سجل حضور لليوم.` : 'تمت المحاكاة: جميع الموظفين لديهم سجلات حضور لليوم بالفعل.',
        isMock: true
      }
    }

    // TODO: الاتصال الفعلي بجهاز البصمة عبر TCP/IP
    // في حالة لم يكن IP المحاكاة، سنحاول الاتصال الحقيقي (مستقبلاً)
    return { 
      success: false, 
      message: 'تعذر الاتصال بجهاز البصمة (تأكد من عنوان IP والمنفذ). نصيحة: استخدم 127.0.0.1 لتجربة وضع المحاكاة.'
    }
  })

  ipcMain.handle('attendance:list', async (event, date) => {
    return db.prepare(`
      SELECT a.*, e.name as emp_name 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.date = ?
    `).all(date)
  })

  ipcMain.handle('attendance:save', async (event, records) => {
    const insert = db.prepare('INSERT INTO attendance (employee_id, date, hours_worked) VALUES (?, ?, ?)')
    const transaction = db.transaction((recs) => {
      for (const rec of recs) {
        // البحث عن الموظف بالاسم
        const emp = db.prepare('SELECT id FROM employees WHERE name = ?').get(rec.empName)
        if (emp) {
          insert.run(emp.id, rec.date, rec.hours)
        }
      }
    })
    transaction(records)
    return { success: true }
  })

  ipcMain.handle('attendance:process-excel', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    })

    if (canceled) return null

    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(filePaths[0])
      const worksheet = workbook.getWorksheet(1)
      
      const results = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        
        const empName = row.getCell(1).text || row.getCell(1).value
        const dateRaw = row.getCell(2).value
        let date = dateRaw
        if (dateRaw instanceof Date) {
          date = dateRaw.toISOString().split('T')[0]
        }
        const hours = row.getCell(3).value
        
        if (empName) {
          results.push({ empName, date, hours })
        }
      })
      return results
    } catch (err) {
      console.error('Excel processing error:', err)
      return null
    }
  })

  // إعدادات الفاتورة
  ipcMain.handle('settings:get', async () => {
    const rows = db.prepare('SELECT * FROM settings').all()
    const config = {}
    rows.forEach(r => { config[r.key] = r.value })
    return config
  })

  ipcMain.handle('settings:update', async (event, config) => {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    Object.entries(config).forEach(([key, value]) => {
      update.run(key, value)
    })
    return { success: true }
  })

  ipcMain.handle('settings:open-db-folder', async () => {
    const isDev = !app.isPackaged
    const dbPath = isDev 
      ? join(process.cwd(), 'database.sqlite')
      : join(app.getPath('userData'), 'database.sqlite')
    shell.showItemInFolder(dbPath)
    return { success: true }
  })

  ipcMain.handle('settings:select-logo', async () => {
    const fs = require('fs')
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled) return null

    try {
      const data = fs.readFileSync(filePaths[0])
      const ext = filePaths[0].split('.').pop()
      const base64 = `data:image/${ext};base64,${data.toString('base64')}`
      return base64
    } catch (err) {
      console.error('Logo selection error:', err)
      return null
    }
  })

  ipcMain.handle('settings:select-qr-image', async () => {
    const fs = require('fs')
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })

    if (canceled) return null

    try {
      const data = fs.readFileSync(filePaths[0])
      const ext = filePaths[0].split('.').pop()
      const base64 = `data:image/${ext};base64,${data.toString('base64')}`
      return base64
    } catch (err) {
      console.error('QR Image selection error:', err)
      return null
    }
  })

  // مسح كافة البيانات
  ipcMain.handle('database:clear', async () => {
    const tables = [
      'attendance',
      'sale_items',
      'sales',
      'formula_items',
      'formulas',
      'products',
      'employees'
    ]
    
    // مسح الجداول مع الحفاظ على هيكلها
    tables.forEach(table => {
      db.prepare(`DELETE FROM ${table}`).run()
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table) // ريسيت للأوتو إنكرمنت
    })

    // مسح المستخدمين ماعدا الأدمن
    db.prepare("DELETE FROM users WHERE role != 'admin'").run()
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run()

    return { success: true }
  })

  // النسخ الاحتياطي
  ipcMain.handle('database:backup', async () => {
    const fs = require('fs')
    const { join } = require('path')
    
    const userDataPath = app.getPath('userData')
    const backupDir = join(userDataPath, 'data backup')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const isDev = !app.isPackaged
    const sourceDb = isDev 
      ? join(process.cwd(), 'database.sqlite')
      : join(userDataPath, 'database.sqlite')
      
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const destDb = join(backupDir, `backup-${timestamp}.sqlite`)
    
    try {
      fs.copyFileSync(sourceDb, destDb)
      shell.showItemInFolder(destDb)
      return { success: true, path: destDb }
    } catch (err) {
      console.error('Backup error:', err)
      return { success: false, message: err.message }
    }
  })

  // استرجاع نسخة احتياطية
  ipcMain.handle('database:restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
    })

    if (canceled) return { success: false }

    try {
      // إغلاق الاتصال الحالي للسماح باستبدال الملف
      db.close() 
      
      const fs = require('fs')
      const { join } = require('path')
      
      const userDataPath = app.getPath('userData')
      const isDev = !app.isPackaged
      const currentDbPath = isDev 
         ? join(process.cwd(), 'database.sqlite')
         : join(userDataPath, 'database.sqlite')

      // استبدال الملف الحالي بالملف المختار
      fs.copyFileSync(filePaths[0], currentDbPath)
       
      // إعادة تشغيل التطبيق لتطبيق التغييرات
      app.relaunch()
      app.exit()
       
      return { success: true }
    } catch (err) {
      console.error('Restore error:', err)
      return { success: false, message: err.message }
    }
  })

  // Get customers list for autocomplete
  ipcMain.handle('customers:list', async () => {
    try {
      const customers = db.prepare(`
        SELECT customer_name, customer_phone, MAX(date) as last_date
        FROM sales 
        WHERE customer_name IS NOT NULL AND customer_name != '' 
        GROUP BY customer_name, customer_phone
        ORDER BY last_date DESC 
        LIMIT 100
      `).all()
      return customers
    } catch (err) {
      console.error('Error fetching customers:', err)
      return []
    }
  })

  // Get best-selling products for reports
  ipcMain.handle('reports:best-selling', async () => {
    try {
      const products = db.prepare(`
        SELECT 
          si.item_name as product_name,
          (SUM(si.quantity) - IFNULL(ret.returned_qty, 0)) as total_quantity,
          (SUM(si.price * si.quantity) - IFNULL(ret.returned_revenue, 0)) as total_revenue,
          COUNT(DISTINCT s.id) as sales_count
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN (
          SELECT item_name, SUM(quantity) as returned_qty, SUM(refund_amount) as returned_revenue
          FROM return_items
          GROUP BY item_name
        ) ret ON si.item_name = ret.item_name
        GROUP BY si.item_name
        HAVING total_quantity > 0
        ORDER BY total_quantity DESC
        LIMIT 10
      `).all()
      return products
    } catch (err) {
      console.error('Error fetching best-selling products:', err)
      return []
    }
  })

  // Get top product for each customer
  ipcMain.handle('customers:top-products', async () => {
    try {
      // Subquery to get net quantities per customer per item
      const topProducts = db.prepare(`
        WITH NetSales AS (
          SELECT 
            s.customer_name,
            si.item_name,
            (SUM(si.quantity) - IFNULL(ret.returned_qty, 0)) as net_qty
          FROM sales s
          JOIN sale_items si ON si.sale_id = s.id
          LEFT JOIN (
            SELECT ri.item_name, r.customer_name, SUM(ri.quantity) as returned_qty
            FROM return_items ri
            JOIN returns r ON ri.return_id = r.id
            GROUP BY ri.item_name, r.customer_name
          ) ret ON si.item_name = ret.item_name AND s.customer_name = ret.customer_name
          WHERE s.customer_name IS NOT NULL AND s.customer_name != ''
          GROUP BY s.customer_name, si.item_name
        )
        SELECT 
          customer_name,
          item_name as top_product,
          net_qty as purchase_count
        FROM NetSales ns1
        WHERE net_qty > 0 AND net_qty = (
          SELECT MAX(ns2.net_qty)
          FROM NetSales ns2
          WHERE ns2.customer_name = ns1.customer_name
        )
        ORDER BY purchase_count DESC
      `).all()
      return topProducts
    } catch (err) {
      console.error('Error fetching customer top products:', err)
      return []
    }
  })

  // Get full purchase history for a customer
  ipcMain.handle('customers:purchase-history', async (event, { name, phone }) => {
    try {
      const query = `
        SELECT 
          si.*, 
          s.date as sale_date,
          s.id as sale_id,
          (SELECT COUNT(*) FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.original_sale_id = s.id AND ri.item_name = si.item_name) as is_returned
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE (s.customer_name = ? AND ? != '') OR (s.customer_phone = ? AND ? != '')
        ORDER BY s.date DESC
      `
      return db.prepare(query).all(name || '', name || '', phone || '', phone || '')
    } catch (err) {
      console.error('Error fetching customer purchase history:', err)
      return []
    }
  })

  // Find sale by ID for returns
  ipcMain.handle('sales:find-by-id', async (event, saleId) => {
    console.log('[LOOKUP] Searching for sale with ID or Code:', saleId)
    const cleanLookupId = saleId.toString().trim()
    const parsedId = parseInt(cleanLookupId, 10).toString() // Remove leading zeros if it's a number

    try {
      const sale = db.prepare(`
        SELECT s.*, u.username as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE s.id = ? 
           OR s.invoice_code = ? 
           OR s.invoice_code = ?
      `).get(cleanLookupId, cleanLookupId, parsedId)
      
      console.log('[LOOKUP] Result:', sale ? `Found (ID: ${sale.id}, Code: ${sale.invoice_code})` : 'Not Found')
      
      if (!sale) return null
      
      const items = db.prepare(`
        SELECT * FROM sale_items WHERE sale_id = ?
      `).all(sale.id)
      
      // Calculate returned quantities for each item
      const itemsWithReturnInfo = items.map(item => {
        const returnedQty = db.prepare(`
          SELECT COALESCE(SUM(ri.quantity), 0) as total_returned
          FROM return_items ri
          JOIN returns r ON ri.return_id = r.id
          WHERE r.original_sale_id = ? AND ri.item_name = ?
        `).get(sale.id, item.item_name)
        
        const returned = returnedQty?.total_returned || 0
        const remaining = item.quantity - returned
        
        return {
          ...item,
          returned_quantity: returned,
          remaining_quantity: Math.max(0, remaining)
        }
      })
      
      return { ...sale, items: itemsWithReturnInfo }
    } catch (err) {
      console.error('Error finding sale:', err)
      return null
    }
  })

  // Add return/exchange
  ipcMain.handle('returns:add', async (event, returnData) => {
    try {
      const { original_sale_id, return_type, cashier_id, customer_name, customer_phone, reason, items, total_refund, notes } = returnData
      
      // Insert return record
      const returnResult = db.prepare(`
        INSERT INTO returns (original_sale_id, return_type, cashier_id, customer_name, customer_phone, reason, total_refund, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(original_sale_id, return_type, cashier_id, customer_name, customer_phone, reason, total_refund, notes || '')
      
      const returnId = returnResult.lastInsertRowid
      
      // Insert return items and restore stock
      for (const item of items) {
        // Insert return item record
        db.prepare(`
          INSERT INTO return_items (return_id, product_id, item_name, quantity, refund_amount)
          VALUES (?, ?, ?, ?, ?)
        `).run(returnId, item.product_id || null, item.item_name, item.quantity, item.refund_amount)
        
        // --- Accurate Stock Restoration ---
        // We look for structured impact data in the original sale_item details
        const originalItem = db.prepare('SELECT details, quantity FROM sale_items WHERE sale_id = ? AND item_name = ?').get(original_sale_id, item.item_name)
        
        let impactFound = false
        if (originalItem && originalItem.details) {
          try {
            const details = JSON.parse(originalItem.details)
            if (details.impact && Array.isArray(details.impact)) {
              // Scale the restoration based on what portion of the original item is being returned
              const scale = item.quantity / (originalItem.quantity || 1)

              details.impact.forEach(impact => {
                const restoreQty = impact.qty * scale
                const product = db.prepare('SELECT category, stock_quantity, total_ml FROM products WHERE id = ?').get(impact.id)
                if (product) {
                  const newStock = (product.stock_quantity || 0) + restoreQty
                  const newTotalMl = product.category === 'oil' ? (product.total_ml || 0) + restoreQty : null
                  
                  if (newTotalMl !== null) {
                    db.prepare('UPDATE products SET stock_quantity = ?, total_ml = ? WHERE id = ?').run(newStock, newTotalMl, impact.id)
                  } else {
                    db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(newStock, impact.id)
                  }
                  console.log(`[RETURN-FIX] Restored ${restoreQty} to product ID ${impact.id} (scaled by ${scale})`)
                }
              })
              impactFound = true
            }
          } catch (e) {
            console.error('Error parsing impact for return:', e)
          }
        }

        // Fallback to simple restoration if no structured impact was found
        if (!impactFound && item.product_id) {
          const product = db.prepare('SELECT category, stock_quantity, total_ml FROM products WHERE id = ?').get(item.product_id)
          if (product) {
            const newStock = (product.stock_quantity || 0) + item.quantity
            const newTotalMl = product.category === 'oil' ? (product.total_ml || 0) + item.quantity : null
            
            if (newTotalMl !== null) {
              db.prepare('UPDATE products SET stock_quantity = ?, total_ml = ? WHERE id = ?').run(newStock, newTotalMl, item.product_id)
            } else {
              db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(newStock, item.product_id)
            }
          }
        }
      }
      
      return { success: true, returnId }
    } catch (err) {
      console.error('Error adding return:', err)
      return { success: false, message: err.message }
    }
  })

  // Delete sale (admin only) with cascading deletes
  ipcMain.handle('sales:delete', async (event, saleId) => {
    try {
      console.log('[DELETE] Attempting to delete sale ID:', saleId)
      
      // Step 1: Get all return IDs for this sale
      const returnIds = db.prepare('SELECT id FROM returns WHERE original_sale_id = ?').all(saleId)
      
      // Step 2: Delete return_items for all returns
      if (returnIds.length > 0) {
        const returnIdList = returnIds.map(r => r.id).join(',')
        db.prepare(`DELETE FROM return_items WHERE return_id IN (${returnIdList})`).run()
        console.log(`[DELETE] Removed return_items for ${returnIds.length} returns`)
      }
      
      // Step 3: Delete returns
      db.prepare('DELETE FROM returns WHERE original_sale_id = ?').run(saleId)
      console.log('[DELETE] Removed returns for sale')
      
      // Step 4: Delete sale_items
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId)
      console.log('[DELETE] Removed sale_items')
      
      // Step 5: Delete the sale itself
      const result = db.prepare('DELETE FROM sales WHERE id = ?').run(saleId)
      console.log('[DELETE] Removed sale, changes:', result.changes)
      
      if (result.changes > 0) {
        notifySalesChange()
      }
     if (result.changes === 0) {
        return { success: false, message: 'Sale not found' }
      }
      
      return { success: true }
    } catch (err) {
      console.error('[DELETE] Error deleting sale:', err)
      return { success: false, message: err.message }
    }
  })

  // Get returns list
  ipcMain.handle('returns:list', async (event, params = {}) => {
    try {
      const { startDate, endDate } = params
      
      let query = `
        SELECT 
          r.*,
          u.username as cashier_name,
          s.total as original_total,
          s.invoice_code
        FROM returns r
        LEFT JOIN users u ON r.cashier_id = u.id
        LEFT JOIN sales s ON r.original_sale_id = s.id
      `
      
      const conditions = []
      const values = []
      
      if (startDate) {
        conditions.push("date(r.return_date) >= date(?)")
        values.push(startDate)
      }
      if (endDate) {
        conditions.push("date(r.return_date) <= date(?)")
values.push(endDate)
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      
      query += ' ORDER BY r.return_date DESC'
      
      const returns = db.prepare(query).all(...values)
      
      // Get items for each return
      for (const ret of returns) {
        ret.items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(ret.id)
      }
      
      return returns
    } catch (err) {
      console.error('Error fetching returns:', err)
      return []
    }
  })
}
