import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import getDB from './db'
import ExcelJS from 'exceljs'
import { join } from 'path'
import os from 'os'
import fs from 'fs'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { syncSale, syncProductStock, initSyncService, syncAllData } from './syncService'
import { startSyncManager } from './syncManager'
import { v4 as uuidv4 } from 'uuid'
import { generateInvoicePDF } from './services/pdfGenerator'
import { formatPhoneNumber } from './services/whatsappService'
import { whatsappBot } from './services/whatsappBot'
import { inventoryService } from './services/inventoryService'
import { orderService } from './services/orderService'
// import { setupWhatsAppHandlers } from './services/whatsappBot' // If exists, or just use bot



// Helper to notify all windows about a sales change
function notifySalesChange() {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('sales-updated')
  })
}

export function setupIpcHandlers() {
  const db = new Proxy({}, {
    get: (_, prop) => {
      const liveDB = getDB();
      const val = liveDB[prop];
      return typeof val === 'function' ? val.bind(liveDB) : val;
    }
  });

  // Helper function to clean up URLs from any accidental garbage text/UI snippets
  const sanitizeUrl = (url) => {
    if (!url) return '';
    // Take only the first word (in case UI text was appended)
    let clean = url.trim().split(/\s+/)[0];
    // Strip non-ASCII characters that might have sneaked in from translations
    clean = clean.replace(/[^\x00-\x7F]/g, '');
    return clean;
  };

  console.log('[Main] Registering Cloud Connectivity Handlers...');

  // Helper to queue synchronization tasks
  const queueSync = (tableName, recordId, action, data) => {
    try {
      db.prepare(`
        INSERT INTO sync_queue (table_name, record_id, action, data)
        VALUES (?, ?, ?, ?)
      `).run(tableName, recordId, action, JSON.stringify(data));
      console.log(`[Queue] Queued ${action} for ${tableName} (ID: ${recordId})`);
    } catch (e) {
      console.error('[Queue] Error queuing sync:', e.message);
    }
  };

  ipcMain.handle('settings:check-connection', async (_, url) => {
    try {
      const cleanUrl = sanitizeUrl(url);
      const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`;
      console.log('[IPC] Checking connection to:', fullUrl);
      const response = await fetch(fullUrl, { method: 'GET' });
      if (response.ok || response.status === 200) {
        return { success: true };
      }
      return { success: false, message: `Status: ${response.status}` };
    } catch (error) {
      console.error('[IPC] Check connection error:', error);
      return { success: false, message: error.message };
    }
  });
  console.log('[Main] Registered: settings:check-connection');

  ipcMain.handle('shop:link', async (_, { url, username, password }) => {
    console.log('[IPC] Attempting to link shop:', { url, username });
    try {
      const cleanUrl = sanitizeUrl(url);
      const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`;
      
      const response = await fetch(`${fullUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, message: `خطأ من السيرفر: ${response.status} - ${errText}` };
      }

      const result = await response.json();
      console.log('[IPC] Link response:', result);

      if (result.success) {
        db.prepare(`
          INSERT INTO cloud_config (id, api_url, api_token, shop_id, shop_name, is_linked) 
          VALUES (1, ?, ?, ?, ?, 1)
          ON CONFLICT(id) DO UPDATE SET 
            api_url = excluded.api_url,
            api_token = excluded.api_token,
            shop_id = excluded.shop_id,
            shop_name = excluded.shop_name,
            is_linked = 1
        `).run(fullUrl, result.token, result.user.id, result.user.name);

        initSyncService(fullUrl, result.token, result.user.id);
        return { success: true, shopName: result.user.name };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('[IPC] shop:link error:', error);
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  });
  ipcMain.handle('sales:whatsapp', async (_, params) => {
    try {
      let { phone, invoiceCode, customerName, total, items, sale } = params || {};
      
      // Adapt to different data structures (Direct vs Sale Object)
      if (sale) {
        phone = phone || sale.customer_phone;
        invoiceCode = invoiceCode || sale.invoice_code || sale.id;
        customerName = customerName || sale.customer_name;
        total = total || sale.total;
        items = items || sale.items;
      }

      const settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      const shopName = settings.shop_name || 'زَيْن للعطور'
      const waPhone = formatPhoneNumber(phone || '')

      const SaleDataMock = { 
        invoice_code: invoiceCode, 
        customer_name: customerName, 
        customer_phone: phone, 
        total: total, 
        items: items || [] 
      }
      
      const pdfPath = await generateInvoicePDF(SaleDataMock, settings)
      const itemsList = (items || []).map(i => `- ${i.name || i.item_name} (x${i.quantity || 0})`).join('\n')
      
      let message = `*${shopName}*\n`
      if (settings.shop_address) message += `📍 ${settings.shop_address}\n`
      if (settings.shop_whatsapp) message += `📱 ${settings.shop_whatsapp}\n`
      message += `\nمرحباً ${customerName || 'عميلنا العزيز'}, تم إصدار فاتورة جديدة لك:\n🔖 رقم الفاتورة: #${invoiceCode}\n💰 الإجمالي: ${total} ج.م\n\n*الأصناف:*\n${itemsList}\n\nشكراً لتعاملك معنا! ✨`
      
      // Bot attempt
      if (whatsappBot.status === 'CONNECTED') {
        try {
          await whatsappBot.sendInvoice(phone, pdfPath, message + `\n\n📎 مرفق: ملف الفاتورة PDF`)
          return { success: true, method: 'bot' }
        } catch (botErr) {
          console.error('[WhatsApp Bot] Automatic send failed:', botErr.message)
        }
      }
      
      // Fallback: Return a direct WhatsApp link
      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://wa.me/${waPhone}?text=${encodedMsg}`;
      
      // Also show in folder for convenience
      setTimeout(() => { try { shell.showItemInFolder(pdfPath) } catch (e) {} }, 1000)
      
      return { 
        success: true, 
        method: 'manual_needed', 
        url: waUrl,
        message: 'يرجى إرسال الفاتورة يدوياً عبر الرابط (البوت غير متصل)' 
      }
    } catch (error) {
      console.error('[WhatsApp] Error:', error)
      return { success: false, message: error.message }
    }
  });

  ipcMain.handle('shell:openExternal', async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('whatsapp:init', async () => {
    try {
      const { BrowserWindow } = require('electron')
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        await whatsappBot.initialize(win.webContents)
        return { success: true }
      }
      return { success: false, message: 'No window found' }
    } catch (e) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('whatsapp:get-status', async () => {
    return whatsappBot.getStatus()
  })

  ipcMain.handle('whatsapp:toggle', async (_, { enabled }) => {
    return await whatsappBot.toggle(enabled)
  })

  ipcMain.handle('whatsapp:logout', async () => {
    await whatsappBot.logout()
    return { success: true }
  })

  ipcMain.handle('whatsapp:delete-session', async () => {
    await whatsappBot.deleteSession()
    return { success: true }
  })

  console.log('[Main] Registered: sales:whatsapp');

  ipcMain.handle('system:get-local-ip', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let ipAddress = '127.0.0.1';

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal (i.e. 127.0.0.1) and non-ipv4
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          // Prefer Wi-Fi or Ethernet usually first one found that is not internal
          return { ip: ipAddress };
        }
      }
    }
    return { ip: ipAddress };
  });

  ipcMain.handle('system:get-machine-id', async () => {
    const { execSync } = require('child_process');
    try {
      // Get UUID via WMIC on Windows
      if (process.platform === 'win32') {
        const output = execSync('wmic csproduct get uuid').toString();
        const uuid = output.split('\n')[1]?.trim();
        return uuid || os.hostname();
      }
      return os.hostname();
    } catch (e) {
      return os.hostname();
    }
  });

  // تهيئة خدمة المزامنة مع السحاب عند التشغيل
  // تهيئة خدمة المزامنة مع السحاب عند التشغيل (Custom API)
  try {
    const cloudConfig = db.prepare('SELECT api_url, api_token, shop_id FROM cloud_config WHERE id = 1').get()
    if (cloudConfig && cloudConfig.api_url && cloudConfig.api_token) {
      console.log('[Init] Found saved cloud config, initializing sync service...')
      initSyncService(cloudConfig.api_url, cloudConfig.api_token, cloudConfig.shop_id)
      startSyncManager()
    }
  } catch (e) {
    console.warn('[Init] No cloud config found or error reading it:', e.message)
  }

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
  ipcMain.handle('auth:login', async (event, { username, password, hardware_id }) => {
    const cleanUsername = username.trim()
    const cleanPassword = password.trim()
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(cleanUsername, cleanPassword)
    if (user) {
      // Update last login and hardware ID if provided
      const now = new Date().toISOString()
      if (hardware_id) {
        db.prepare('UPDATE users SET last_login_at = ?, hardware_id = ? WHERE id = ?').run(now, hardware_id, user.id)
      } else {
        db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id)
      }
      return { success: true, user: { id: user.id, username: user.username, role: user.role, license_level: user.license_level, shop_name: user.shop_name, permissions: user.permissions } }
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
    const sell_unit = product.sell_unit || 'piece'
    const price = Number(product.price) || 0
    const price_per_ml = Number(product.price_per_ml) || 0
    const price_per_gram = Number(product.price_per_gram) || 0
    const wholesale_price = Number(product.wholesale_price) || 0
    const wholesale_price_per_ml = Number(product.wholesale_price_per_ml) || 0
    const wholesale_price_per_gram = Number(product.wholesale_price_per_gram) || 0
    
    const stock_quantity = Number(product.stock_quantity) || 0
    const total_ml = Number(product.total_ml) || (sell_unit === 'ml' ? stock_quantity : 0)
    const total_gram = Number(product.total_gram) || (sell_unit === 'gram' ? stock_quantity : 0)
    
    const alert_ml = Number(product.alert_ml) || 0
    const alert_gram = Number(product.alert_gram) || 0
    const min_stock = Number(product.min_stock) || 10
    const category = product.category || 'oil'
    const barcode = product.barcode || ''
    const is_website_visible = product.is_website_visible || 0
    const image_url = product.image_url || null

    try {
      const result = db.prepare(`
        INSERT INTO products (
          name, category, sell_unit, barcode, 
          price, price_per_ml, price_per_gram,
          wholesale_price, wholesale_price_per_ml, wholesale_price_per_gram,
          stock_quantity, total_ml, total_gram, 
          min_stock, alert_ml, alert_gram,
          is_website_visible, image_url
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, category, sell_unit, barcode,
        price, price_per_ml, price_per_gram,
        wholesale_price, wholesale_price_per_ml, wholesale_price_per_gram,
        stock_quantity, total_ml, total_gram,
        min_stock, alert_ml, alert_gram,
        is_website_visible, image_url
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
      const productBefore = db.prepare('SELECT category, sell_unit FROM products WHERE id = ?').get(id)
      
      if (productBefore?.sell_unit === 'ml') {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_ml = total_ml + ? WHERE id = ?').run(numQty, numQty, id)
      } else if (productBefore?.sell_unit === 'gram') {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_gram = total_gram + ? WHERE id = ?').run(numQty, numQty, id)
      } else if (productBefore?.category === 'oil') {
        // Fallback for oils without explicit unit (treat as ml for legacy/default)
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_ml = total_ml + ? WHERE id = ?').run(numQty, numQty, id)
      } else {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(numQty, id)
      }
      console.log(`[IPC] Stock updated successfully for ID ${id}`)
      
      // مزامنة المخزون مع السحاب
      const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(id)
      if (product) {
        queueSync('products', id, 'UPDATE_STOCK', { stock_quantity: product.stock_quantity })
        syncProductStock(id, product.stock_quantity).catch(() => {})
      }

      return { success: true }
    } catch (err) {
      console.error('[IPC] Database error during stock update:', err.message)
      return { success: false, message: 'حدث خطأ في قاعدة البيانات: ' + err.message }
    }
  })

  ipcMain.handle('products:update', async (event, product) => {
    const { 
      id, name, category, sell_unit, barcode,
      price, price_per_ml, price_per_gram,
      wholesale_price, wholesale_price_per_ml, wholesale_price_per_gram,
      stock_quantity, min_stock, is_website_visible, image_url 
    } = product

    try {
      db.prepare(`
        UPDATE products 
        SET 
          name = ?, category = ?, sell_unit = ?, barcode = ?,
          price = ?, price_per_ml = ?, price_per_gram = ?,
          wholesale_price = ?, wholesale_price_per_ml = ?, wholesale_price_per_gram = ?,
          stock_quantity = ?, min_stock = ?, 
          is_website_visible = ?, image_url = ?
        WHERE id = ?
      `).run(
        name, category, sell_unit || 'piece', barcode || '',
        Number(price) || 0, Number(price_per_ml) || 0, Number(price_per_gram) || 0,
        Number(wholesale_price) || 0, Number(wholesale_price_per_ml) || 0, Number(wholesale_price_per_gram) || 0,
        Number(stock_quantity) || 0, Number(min_stock) || 10,
        is_website_visible || 0, image_url || null, 
        id
      )
      
      // Sync unit-specific totals
      if (sell_unit === 'gram') {
        db.prepare('UPDATE products SET total_gram = stock_quantity, total_ml = 0 WHERE id = ?').run(id)
      } else if (sell_unit === 'ml' || category === 'oil') {
        db.prepare('UPDATE products SET total_ml = stock_quantity, total_gram = 0 WHERE id = ?').run(id)
      } else {
        db.prepare('UPDATE products SET total_ml = 0, total_gram = 0 WHERE id = ?').run(id)
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

  // --- Website Products Handlers ---
  ipcMain.handle('products:website-list', async () => {
    try {
      return await inventoryService.getWebsiteProducts(db)
    } catch (err) {
      console.error('[IPC] products:website-list error:', err)
      return []
    }
  })

  ipcMain.handle('products:website-add', async (event, product) => {
    try {
      console.log('[IPC] products:website-add:', product.name)
      return await inventoryService.addWebsiteProduct(db, product)
    } catch (err) {
      console.error('[IPC] products:website-add error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('products:website-update', async (event, product) => {
    try {
      console.log('[IPC] products:website-update:', product.name, 'ID:', product.id)
      return await inventoryService.updateWebsiteProduct(db, product)
    } catch (err) {
      console.error('[IPC] products:website-update error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('products:website-delete', async (event, id) => {
    try {
      return await inventoryService.deleteWebsiteProduct(db, id)
    } catch (err) {
      console.error('[IPC] products:website-delete error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('products:categories', async () => {
    try {
      // Get categories from both store products and website products for better UX
      const storeCats = await inventoryService.getCategories(db)
      const webCats = await inventoryService.getWebsiteCategories(db)
      return [...new Set([...storeCats, ...webCats])]
    } catch (err) {
      console.error('[IPC] products:categories error:', err)
      return []
    }
  })

  ipcMain.handle('sync:all', async () => {
    try {
      console.log('[IPC] Starting Full Data Sync...');
      const products = db.prepare('SELECT * FROM products').all();
      const sales = db.prepare('SELECT * FROM sales').all();
      const users = db.prepare('SELECT * FROM users').all();
      const saleItems = db.prepare('SELECT * FROM sale_items').all();
      
      const res = await syncAllData(products, sales, users, saleItems);
      return { success: true, message: res.message };
    } catch (e) {
      console.error('[IPC] sync:all error:', e.message);
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('products:update-visibility', async (event, { id, isVisible }) => {
    try {
      return await inventoryService.updateWebsiteVisibility(db, { id, isVisible })
    } catch (err) {
      console.error('[IPC] products:update-visibility error:', err)
      return { success: false, message: err.message }
    }
  })

  // إدارة التركيبات
  ipcMain.handle('formulas:add', async (event, { name, total_price, items }) => {
    // 1. Add to formulas table
    const info = db.prepare('INSERT INTO formulas (name, total_price) VALUES (?, ?)').run(name, total_price)
    const formulaId = info.lastInsertRowid

    // 2. Add to products table so it appears in the main list
    db.prepare(`
      INSERT INTO products (name, price, category, stock_quantity, min_stock)
      VALUES (?, ?, 'formula', 999, 0)
    `).run(name, total_price)

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

  ipcMain.handle('formulas:update', async (event, { id, name, oldName, total_price, items }) => {
    try {
      db.transaction(() => {
        // 1. Update formulas table
        db.prepare('UPDATE formulas SET name = ?, total_price = ? WHERE id = ?').run(name, total_price, id)
        
        // 2. Update products table entry (using oldName to find it)
        db.prepare('UPDATE products SET name = ?, price = ? WHERE name = ? AND category = "formula"').run(name, total_price, oldName, id)

        // 3. Clear and re-add formula items
        db.prepare('DELETE FROM formula_items WHERE formula_id = ?').run(id)
        const insertItem = db.prepare('INSERT INTO formula_items (formula_id, product_id, custom_name, price, quantity) VALUES (?, ?, ?, ?, ?)')
        items.forEach(item => {
          insertItem.run(id, item.product_id || null, item.custom_name || null, item.price || null, item.quantity)
        })
      })()
      return { success: true }
    } catch (err) {
      console.error('Update Formula Error:', err)
      return { success: false, message: err.message }
    }
  })

  // إدارة الكاشير
  ipcMain.handle('cashiers:list', async () => {
    return db.prepare("SELECT id, username, role FROM users WHERE is_active = 1 AND role != 'super_admin'").all()
  })

  ipcMain.handle('super:users-list', async () => {
    return db.prepare("SELECT id, username, password, role, is_active, license_level, last_login_at, hardware_id, shop_name, permissions FROM users WHERE role != 'super_admin'").all()
  })

  ipcMain.handle('super:update-user-status', async (_, { id, is_active }) => {
    try {
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('users:update-permissions', async (_, { id, permissions }) => {
    try {
      // Store permissions as JSON string
      const perms = JSON.stringify(permissions)
      db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(perms, id)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('super:get-remote-shops', async () => {
     try {
       const axios = require('axios')
       const response = await axios.get('https://elator-pos.veila.shop/api.php?action=get_shops', { timeout: 10000 })
       if (response.data.success) {
         return { success: true, shops: response.data.shops }
       }
       return { success: false, message: response.data.message || 'Failed to fetch shops' }
     } catch (e) {
       console.error('[IPC] super:get-remote-shops error:', e.message)
       return { success: false, message: e.message }
     }
  })

  ipcMain.handle('super:update-shop-status', async (_, { shopId, status }) => {
    try {
       const axios = require('axios')
       const response = await axios.post('https://elator-pos.veila.shop/api.php?action=update_shop_status', { shopId, status }, { timeout: 10000 })
       if (response.data.success) {
         return { success: true }
       }
       return { success: false, message: response.data.message || 'Failed to update shop status' }
    } catch (e) {
      console.error('[IPC] super:update-shop-status error:', e.message)
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('super:update-user-license', async (_, { id, license_level }) => {
    try {
      db.prepare('UPDATE users SET license_level = ? WHERE id = ?').run(license_level, id)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('super:delete-user', async (_, id) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('super:change-password', async (_, { id, password }) => {
    try {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
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
    
    const { total, cashier_id, customer_name, customer_phone, customer_address, items, payment_method, payment_details, discount } = saleData
    
    // Defensive values
    const safeTotal = Number(total) || 0
    const safeDiscount = Number(discount) || 0
    const netTotal = safeTotal - safeDiscount
    const safeCashierId = cashier_id || null
    const safeCustomerName = customer_name || ''
    const safeCustomerPhone = customer_phone || ''
    const safeCustomerAddress = customer_address || ''
    const safePaymentMethod = payment_method || 'cash'
    const safePaymentDetails = payment_details || ''

    try {
      const result = db.prepare('SELECT MAX(CAST(invoice_code AS NUMBER)) as maxCode FROM sales').get()
      const invoiceCode = ((result && result.maxCode ? result.maxCode : 0) + 1).toString()

      const info = db.prepare('INSERT INTO sales (total, cashier_id, customer_name, customer_phone, customer_address, invoice_code, payment_method, payment_details, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        safeTotal, 
        safeCashierId, 
        safeCustomerName, 
        safeCustomerPhone,
        safeCustomerAddress,
        invoiceCode,
        safePaymentMethod,
        safePaymentDetails,
        safeDiscount
      )
      const saleId = info.lastInsertRowid

      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, item_name, price, quantity, details) VALUES (?, ?, ?, ?, ?)')
      
      const updateStockInDB = (qty, id) => {
        try {
          const product = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(id)
          if (product?.sell_unit === 'gram') {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, total_gram = total_gram - ? WHERE id = ?').run(qty, qty, id)
          } else if (product?.sell_unit === 'ml') {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, total_ml = total_ml - ? WHERE id = ?').run(qty, qty, id)
          } else {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(qty, id)
          }
        } catch (e) {
          console.error('[Stock-Update] Error:', e.message)
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
      
      // Auto PDF generation (Using Service)
      const settings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      
      // Run async tasks (PDF & wa.me + مجلد الفاتورة) بدون Cloud API
      ;(async () => {
        let pdfPath = null
        try {
          pdfPath = await generateInvoicePDF(
            { ...saleData, invoice_code: invoiceCode, items: saleData.items || [] },
            settings
          )
          console.log('[Service] PDF Generated:', pdfPath)
        } catch (e) {
          console.error('[Background] PDF Error:', e.message)
          return
        }

        // Only open WhatsApp if enabled in settings AND customer has a valid phone
        if (settings.whatsapp_enabled !== 'true') {
          console.log('[WhatsApp] Disabled in settings, skipping.')
          return
        }

        const phoneDigits = (safeCustomerPhone || '').replace(/\D/g, '')
        if (phoneDigits.length < 10) return

        const shopName = settings.shop_name || 'Al-Areen Perfumes'
        // const waPhone = formatPhoneNumber(safeCustomerPhone)
        const itemsList = (saleData.items || []).map(i => `- ${i.name || i.item_name} (x${i.quantity || 0})`).join('\n')
        let message = `*${shopName}*\n`
        if (settings.shop_address) message += `📍 ${settings.shop_address}\n`
        if (settings.shop_whatsapp) message += `📱 WhatsApp: ${settings.shop_whatsapp}\n`
        message += `\nمرحباً ${safeCustomerName || 'عميلنا العزيز'}, تم إصدار فاتورة جديدة لك:\n🔖 رقم الفاتورة: #${invoiceCode}\n💰 الإجمالي: ${saleData.total} ج.م\n\n*الأصناف:*\n${itemsList}\n\nشكراً لتعاملك معنا! ✨\n\n📎 مرفق: ملف الفاتورة PDF`
        
        if (whatsappBot.status === 'CONNECTED') {
           try {
             await whatsappBot.sendInvoice(safeCustomerPhone, pdfPath, message)
             console.log('[WhatsApp Bot] Automatic invoice sent successfully')
             whatsappBot.scheduleFollowUp(safeCustomerPhone)
           } catch (botErr) {
             console.error('[WhatsApp Bot] Error sending automatic message:', botErr.message)
             // No browser fallback to avoid annoyance
           }
        } 
        // Always show folder for convenience? NO - User said it's annoying and wants it gone.
        // We will keep it commented or removed to satisfy "شل كل حاجة زي ما كانت" and "شلها" (remove it).
        /* 
        setTimeout(() => {
          try {
            if (pdfPath) shell.showItemInFolder(pdfPath)
          } catch (e) {
            console.error('[WhatsApp] showItemInFolder failed:', e.message)
          }
        }, 500)
        */
      })()

      notifySalesChange()

      // مزامنة المبيعة مع السحاب (عبر الطابور)
      const fullSaleData = {
        id: saleId,
        invoice_code: invoiceCode,
        total: safeTotal,
        customer_id: null,
        user_id: safeCashierId,
        payment_method: safePaymentMethod,
        created_at: new Date().toISOString()
      };
      
      queueSync('sales', saleId, 'INSERT', { sale: fullSaleData, items });
      
      // Attempt immediate sync (non-blocking)
      syncSale(fullSaleData, items).catch(() => console.log('[Sync] Offline, will retry from queue later.'));

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
                const product = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(impact.id)
                if (product?.sell_unit === 'gram') {
                  db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_gram = total_gram + ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
                } else if (product?.sell_unit === 'ml') {
                  db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, total_ml = total_ml + ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
                } else {
                  db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(impact.qty, impact.id)
                }
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
          const product = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(impact.id)
          if (product?.sell_unit === 'gram') {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, total_gram = total_gram - ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
          } else if (product?.sell_unit === 'ml') {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, total_ml = total_ml - ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
          } else {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(impact.qty, impact.id)
          }
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
    try {
      console.log('[IPC] sales:history requested', { limit, cashierId })
      
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
        .sort((a, b) => {
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          return (dateB.getTime() || 0) - (dateA.getTime() || 0)
        })
        .slice(0, limit)

      // 4. Get items for each entry
      const finalHistory = allHistory.map(entry => {
        try {
          if (entry.entry_type === 'sale') {
            const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(entry.id)
            return { ...entry, items }
          } else {
            const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(entry.id)
            return { ...entry, items, is_return: true }
          }
        } catch (itemErr) {
          console.error(`[IPC] Error fetching items for ${entry.entry_type} ID ${entry.id}:`, itemErr)
          return { ...entry, items: [], error: true }
        }
      })

      console.log(`[IPC] sales:history returning ${finalHistory.length} entries`)
      return finalHistory
    } catch (err) {
      console.error('[IPC] sales:history fatal error:', err)
      return []
    }
  })
 
  ipcMain.handle('sales:report', async (event, params) => {
    const startDate = params.startDate || params.date || 'now'
    const endDate = params.endDate || params.date || 'now'
    const cashierId = params.cashierId
    const cashier = params.cashier
    
    // DEBUG LOGGING
    const debugLogPath = join(app.getPath('userData'), 'debug_sales.log')
    const log = (msg) => {
      console.log(msg)
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${msg}\n`)
    }
    
    log(`[IPC] sales:report called with params: ${JSON.stringify(params)}`)

    let query = `
      SELECT 
        s.*, 
        IFNULL(u.username, 'غير معروف') as cashier_name,
        (s.total - IFNULL(s.discount, 0) - IFNULL(r_sum.total_refunded, 0)) as net_total
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      LEFT JOIN (
        SELECT original_sale_id, SUM(total_refund) as total_refunded
        FROM returns
        GROUP BY original_sale_id
      ) r_sum ON s.id = r_sum.original_sale_id
      WHERE date(s.date, 'localtime') BETWEEN ? AND ?
    `
    const args = [startDate, endDate]
    
    if (cashierId) {
      query += ` AND s.cashier_id = ?`
      args.push(cashierId)
    } else if (cashier) {
      query += ` AND u.username = ?`
      args.push(cashier)
    }
    
    // Filter out fully returned sales or just return the adjusted list
    query = `SELECT * FROM (${query}) WHERE net_total > 0 OR (total > 0 AND total = discount)`
    
    log(`[IPC] Executing query: ${query} with args: ${JSON.stringify(args)}`)
    
    const rawSales = db.prepare(query).all(...args) || []
    log(`[IPC] Found ${rawSales.length} raw sales`)
    
    // Get items for each sale and calculate totals
    const sales = rawSales.map(sale => {
      const items = db.prepare(`
        SELECT si.*, p.name as product_name 
        FROM sale_items si 
        LEFT JOIN products p ON si.product_id = p.id 
        WHERE si.sale_id = ?
      `).all(sale.id)
      return { ...sale, items }
    })

    const total = sales.reduce((acc, s) => acc + (s.net_total || 0), 0)

    // Calculate expenses for the same range
    const expResult = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE date(date, 'localtime') BETWEEN ? AND ?").get(startDate, endDate)
    const totalExpenses = expResult?.total || 0
    
    const result = {
      sales,
      total,
      totalExpenses,
      bestSelling: [] 
    }
    log(`[IPC] Returning result with ${sales.length} sales and total: ${total}`)
    return result
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
  // Note: Combined with ERP version at line 1550+

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
    const today = date || new Date().toISOString().split('T')[0]
    return db.prepare(`
      SELECT a.*, IFNULL(e.name, 'موظف محذوف') as employee_name 
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.date = ?
      ORDER BY a.check_in DESC
    `).all(today)
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

  // إعدادات الفاتورة والسحاب
  ipcMain.removeHandler('settings:get')
  ipcMain.handle('settings:get', async (_, key) => {
    if (key) {
      return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    }
    const rows = db.prepare('SELECT * FROM settings').all()
    const config = {}
    rows.forEach(r => { config[r.key] = r.value })
    
    // إضافة إعدادات السحاب من الجدول الجديد
    const cloud = db.prepare('SELECT * FROM cloud_config WHERE id = 1').get()
    if (cloud) {
      config.api_url = cloud.api_url
      config.is_linked = cloud.is_linked === 1
      config.cloud_shop_name = cloud.shop_name // Keep it separate to avoid confusion
      // Only set shop_name from cloud IF AND ONLY IF it is completely empty locally
      if (!config.shop_name || config.shop_name === '') {
        config.shop_name = cloud.shop_name
      }
    }
    
    return config
  })

  ipcMain.handle('settings:update', async (event, config) => {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    Object.entries(config).forEach(([key, value]) => {
      let finalValue = value
      if (value === null || value === undefined) {
        finalValue = null
      } else if (typeof value === 'object') {
        finalValue = JSON.stringify(value)
      } else if (typeof value === 'boolean') {
        finalValue = value ? 1 : 0
      } else {
        finalValue = String(value)
      }
      update.run(key, finalValue)
    })

    // تحديث خدمة المزامنة إذا تغيرت الإعدادات
    if (config.supabase_url || config.supabase_key) {
      const allSettings = db.prepare('SELECT key, value FROM settings').all().reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
      initSyncService(allSettings.supabase_url, allSettings.supabase_key)
    }

    return { success: true }
  })

  ipcMain.removeHandler('settings:set')
  ipcMain.handle('settings:set', async (_, { key, value }) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value.toString())
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
    try {
      const tables = [
        'attendance',
        'sale_items',
        'sales',
        'formula_items',
        'formulas',
        'products',
        'employees',
        'sync_queue',
        'remote_updates',
        'returns',
        'return_items'
      ]
      
      db.prepare('PRAGMA foreign_keys = OFF').run()
      
      // مسح الجداول مع الحفاظ على هيكلها
      tables.forEach(table => {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
          db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
        } catch (e) {
          console.warn(`[Clear] Could not clear table ${table}:`, e.message)
        }
      })

      // مسح المستخدمين ماعدا الأدمن والمطور
      db.prepare("DELETE FROM users WHERE role NOT IN ('admin', 'super_admin')").run()
      
      db.prepare('PRAGMA foreign_keys = ON').run()

      return { success: true }
    } catch (err) {
      console.error('[Clear] Fatal Error:', err)
      return { success: false, error: err.message }
    }
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

  // Get full purchase history for a customer (grouped by sale)
  ipcMain.handle('customers:purchase-history', async (event, { name, phone }) => {
    try {
      const searchName = (name || '').trim()
      const searchPhone = (phone || '').trim()
      
      // Build a flexible match: name+phone (if both), or name-only, or phone-only
      let whereClause, params
      if (searchName && searchPhone) {
        whereClause = `TRIM(IFNULL(s.customer_name, '')) = ? AND TRIM(IFNULL(s.customer_phone, '')) = ?`
        params = [searchName, searchPhone]
      } else if (searchName) {
        whereClause = `TRIM(IFNULL(s.customer_name, '')) = ?`
        params = [searchName]
      } else if (searchPhone) {
        whereClause = `TRIM(IFNULL(s.customer_phone, '')) = ?`
        params = [searchPhone]
      } else {
        return []
      }

      const rows = db.prepare(`
        SELECT 
          s.date as sale_date,
          s.invoice_code,
          s.id as sale_id,
          s.total as sale_total,
          si.item_name,
          si.details,
          si.price,
          si.quantity
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE ${whereClause}
        ORDER BY s.date DESC, s.id DESC
      `).all(...params)

      const salesMap = {}
      const salesList = []
      for (const row of rows) {
        if (!salesMap[row.sale_id]) {
          const saleObj = {
            sale_id: row.sale_id,
            invoice_code: row.invoice_code || `#${row.sale_id}`,
            sale_date: row.sale_date,
            total: row.sale_total || 0,
            items: []
          }
          salesMap[row.sale_id] = saleObj
          salesList.push(saleObj)
        }
        // skip auto-bottle marker items (they have is_auto_bottle in details)
        let isAutoBottle = false
        try {
          if (row.details) {
            const d = JSON.parse(row.details)
            isAutoBottle = !!d?.is_auto_bottle
          }
        } catch(e) {}
        
        if (!isAutoBottle) {
          salesMap[row.sale_id].items.push({
            item_name: row.item_name || 'منتج',
            details: row.details || '',
            price: row.price || 0,
            quantity: row.quantity || 1
          })
        }
      }
      
      // If total is 0, compute from items (backward compat for old records)
      salesList.forEach(sale => {
        if (!sale.total || sale.total === 0) {
          sale.total = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        }
      })
      return salesList
    } catch (err) {
      console.error('Error fetching customer purchase history:', err)
      return []
    }
  })

  // Find sales by customer name or phone
  ipcMain.handle('sales:find-by-customer', async (event, nameOrPhone) => {
    try {
      const query = `
        SELECT s.*, u.username as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE s.customer_name LIKE ? OR s.customer_phone LIKE ?
        ORDER BY s.date DESC
        LIMIT 50
      `
      return db.prepare(query).all(`%${nameOrPhone}%`, `%${nameOrPhone}%`)
    } catch (err) {
      console.error('Error searching sales by customer:', err)
      return []
    }
  })

  // Find sale by ID for returns
  ipcMain.handle('sales:find-by-id', async (event, saleId) => {
    console.log('[LOOKUP] Searching for sale with ID or Code:', saleId)
    const cleanLookupId = saleId.toString().trim().replace('#', '')
    
    try {
      // Priority 1: Exact invoice_code or phone match
      let sale = db.prepare(`
        SELECT s.*, u.username as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE s.invoice_code = ? OR s.customer_phone = ?
      `).get(cleanLookupId, cleanLookupId)

      // Priority 2: ID match (only if no match found AND input is short)
      if (!sale && /^\d+$/.test(cleanLookupId) && cleanLookupId.length < 8) {
        sale = db.prepare(`
          SELECT s.*, u.username as cashier_name
          FROM sales s
          LEFT JOIN users u ON s.cashier_id = u.id
          WHERE s.id = ?
        `).get(parseInt(cleanLookupId, 10))
      }
      
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
          INSERT INTO return_items (return_id, product_id, item_name, quantity, refund_amount, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(returnId, item.product_id || null, item.item_name, item.quantity, item.refund_amount, item.details || null)
        
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
                  if (product.sell_unit === 'gram') {
                    db.prepare('UPDATE products SET stock_quantity = ?, total_gram = total_gram + ? WHERE id = ?').run(newStock, restoreQty, impact.id)
                  } else if (product.sell_unit === 'ml' || product.category === 'oil') {
                    db.prepare('UPDATE products SET stock_quantity = ?, total_ml = total_ml + ? WHERE id = ?').run(newStock, restoreQty, impact.id)
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
            if (product.sell_unit === 'gram') {
              db.prepare('UPDATE products SET stock_quantity = ?, total_gram = total_gram + ? WHERE id = ?').run(newStock, item.quantity, item.product_id)
            } else if (product.sell_unit === 'ml' || product.category === 'oil') {
              db.prepare('UPDATE products SET stock_quantity = ?, total_ml = total_ml + ? WHERE id = ?').run(newStock, item.quantity, item.product_id)
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

      // Step 4: Restore stock from sale_items before deleting
      const saleItemsToRestore = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId)
      saleItemsToRestore.forEach(item => {
        if (item.details) {
          try {
            const details = JSON.parse(item.details)
            if (details.impact && Array.isArray(details.impact)) {
              details.impact.forEach(impact => {
                if (impact.id && impact.qty) {
                  // Restore gram-based products correctly
                  const product = db.prepare('SELECT sell_unit FROM products WHERE id = ?').get(impact.id)
                  if (product) {
                    if (product.sell_unit === 'gram') {
                      db.prepare('UPDATE products SET total_gram = total_gram + ?, stock_quantity = stock_quantity + ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
                    } else if (product.sell_unit === 'ml') {
                      db.prepare('UPDATE products SET total_ml = total_ml + ?, stock_quantity = stock_quantity + ? WHERE id = ?').run(impact.qty, impact.qty, impact.id)
                    } else {
                      db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(impact.qty, impact.id)
                    }
                  }
                }
              })
            }
          } catch (e) {
            console.warn('[DELETE] Could not parse item details for stock restore:', e.message)
          }
        } else {
          // Simple product (no impact JSON) — restore stock_quantity directly using sale quantity
          db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE name = ?').run(item.quantity || 1, item.item_name)
        }
      })
      console.log('[DELETE] Restored stock for', saleItemsToRestore.length, 'items')

      // Step 5: Delete sale_items
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


  // تصدير البيانات كـ SQL/JSON لإرسالها للمطور عند الطلب
  ipcMain.handle('system:export-sql', async () => {
    try {
      const data = {
        meta: {
          shop_id: db.prepare('SELECT shop_id FROM cloud_config').get()?.shop_id,
          export_date: new Date().toISOString()
        },
        products: db.prepare('SELECT * FROM products').all(),
        sales: db.prepare('SELECT * FROM sales').all(),
        sale_items: db.prepare('SELECT * FROM sale_items').all(),
        users: db.prepare('SELECT id, username, role FROM users').all(),
        returns: db.prepare('SELECT * FROM returns').all(),
        return_items: db.prepare('SELECT * FROM return_items').all()
      }

      const { filePath } = await dialog.showSaveDialog({
        title: 'تصدير قاعدة البيانات',
        defaultPath: `backup_${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })

      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
        shell.showItemInFolder(filePath)
        return { success: true, path: filePath }
      }
      return { success: false }
    } catch (error) {
      console.error('[Export] Error:', error)
      return { success: false, message: error.message }
    }
  })

  // --- ERP: Suppliers ---
  ipcMain.handle('suppliers:get', async (_, { fromDate, toDate } = {}) => {
    let query = `
      SELECT s.*, 
      (SELECT SUM(total_amount) FROM supplier_purchases WHERE supplier_id = s.id AND purchase_date BETWEEN ? AND ?) as period_volume 
      FROM suppliers s 
      ORDER BY name ASC
    `
    // Default range (very wide if not specified)
    const start = fromDate || '2000-01-01'
    const end = toDate || '2100-01-01'
    
    return db.prepare(query).all(start, end)
  })

  ipcMain.handle('suppliers:add', async (_, data) => {
    const { name, phone, address } = data
    const res = db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)').run(name, phone, address)
    return { success: true, id: res.lastInsertRowid }
  })

  ipcMain.handle('suppliers:purchase', async (_, purchaseData) => {
    const { supplier_id, items, total_amount, paid_amount, remaining_amount, record_debt } = purchaseData
    
    // Validate if items is an array
    if (!Array.isArray(items)) {
      return { success: false, message: 'Invalid items array' }
    }

    try {
      const purchaseId = db.transaction(() => {
        // 1. Record the purchase
        const res = db.prepare(`
          INSERT INTO supplier_purchases (supplier_id, total_amount, paid_amount, remaining_amount)
          VALUES (?, ?, ?, ?)
        `).run(supplier_id, total_amount, paid_amount, remaining_amount)
        
        const purchaseId = res.lastInsertRowid

        // 2. Record items, update stock AND update prices
        const insertItem = db.prepare(`
          INSERT INTO supplier_purchase_items (purchase_id, product_id, quantity, unit_price)
          VALUES (?, ?, ?, ?)
        `)
        const updateProduct = db.prepare(`
          UPDATE products 
          SET stock_quantity = stock_quantity + ?,
              price = CASE WHEN ? > 0 THEN ? ELSE price END,
              wholesale_price = CASE WHEN ? > 0 THEN ? ELSE wholesale_price END
          WHERE id = ?
        `)

        for (const item of items) {
          insertItem.run(purchaseId, item.product_id, item.quantity, item.unit_price)
          // User requested: Retail price (selling_price) and Wholesale price (set to unit_price/cost)
          updateProduct.run(item.quantity, item.selling_price || 0, item.selling_price || 0, item.unit_price || 0, item.unit_price || 0, item.product_id)
        }

        // 3. Record payment as an Expense for reports
        if (paid_amount > 0) {
          db.prepare(`
            INSERT INTO expenses (amount, category, description, status, supplier_id)
            VALUES (?, ?, ?, ?, ?)
          `).run(paid_amount, 'مشتريات موردين', `دفعة نقدية لفاتورة شراء #${purchaseId}`, 'spent', supplier_id)
        }

        // 4. Update supplier debt ONLY if requested
        if (record_debt) {
          db.prepare('UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?')
            .run(remaining_amount, supplier_id)
        }
        return purchaseId
      })()

      return { success: true, purchaseId }
    } catch (err) {
      console.error('Purchase Error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('suppliers:adjust-debt', async (_, { supplier_id, amount, description }) => {
    try {
      db.prepare('UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?')
        .run(amount, supplier_id)
      
      if (amount < 0) {
        db.prepare(`
          INSERT INTO expenses (amount, category, description, status, supplier_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(Math.abs(amount), 'دفعات للموردين', description || 'دفعة لمورد', 'spent', supplier_id)
      }
      return { success: true }
    } catch (err) {
      console.error('Adjust Debt Error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('suppliers:get-history', async (_, supplierId) => {
    try {
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
      const payments = db.prepare(paymentQuery + ` ORDER BY e.date DESC`).all(...params)

      return { success: true, history: [...purchases, ...payments].sort((a,b) => new Date(b.date) - new Date(a.date)) }
    } catch (err) {
      console.error('Get History Error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('suppliers:delete', async (event, id) => {
    try {
      db.transaction(() => {
        // 1. Delete purchase items first
        db.prepare(`
          DELETE FROM supplier_purchase_items 
          WHERE purchase_id IN (SELECT id FROM supplier_purchases WHERE supplier_id = ?)
        `).run(id)
        
        // 2. Delete purchases
        db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?').run(id)
        
        // 3. Delete expenses related to this supplier (optional, but consistent)
        db.prepare('DELETE FROM expenses WHERE supplier_id = ?').run(id)
        
        // 4. Finally delete the supplier
        db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
      })()
      return { success: true }
    } catch (err) {
      console.error('Delete Supplier Error:', err)
      return { success: false, message: err.message }
    }
  })

  // --- ERP: Expenses & Employee Financials ---
  ipcMain.handle('expenses:get', async (_, filters) => {
    const { startDate, endDate, category } = filters
    let query = 'SELECT e.*, emp.name as employee_name FROM expenses e LEFT JOIN employees emp ON e.employee_id = emp.id WHERE date(e.date) BETWEEN ? AND ?'
    let params = [startDate, endDate]
    
    if (category && category !== 'all') {
      query += ' AND category = ?'
      params.push(category)
    }
    
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('expenses:delete', async (event, id) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('expenses:add', async (_, data) => {
    const { amount, category, description, employee_id, status } = data
    const res = db.prepare(`
      INSERT INTO expenses (amount, category, description, employee_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(amount, category, description, employee_id || null, status || 'spent')
    return { success: true, id: res.lastInsertRowid }
  })

  // --- ERP: Employees & Attendance ---
  ipcMain.handle('employees:list', async () => {
    return db.prepare('SELECT * FROM employees WHERE is_active = 1').all()
  })

  ipcMain.handle('employees:add', async (_, data) => {
    const { name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, code } = data
    
    // Calculate salary per hour for reporting
    const safeWorkHours = Number(work_hours) || 8
    const safeWorkingDays = Number(working_days) || 26
    const safeSalary = Number(salary) || 0
    const salaryPerHour = (safeWorkHours > 0 && safeWorkingDays > 0) ? (safeSalary / (safeWorkingDays * safeWorkHours)) : 0

    try {
      const res = db.prepare(`
        INSERT INTO employees (name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, is_active, salary_per_hour, code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        name, 
        phone || '', 
        safeSalary, 
        role || 'employee', 
        national_id || '', 
        safeWorkHours, 
        safeWorkingDays, 
        start_time || '09:00', 
        end_time || '17:00',
        salaryPerHour,
        code || null
      )
      return { success: true, id: res.lastInsertRowid }
    } catch (err) {
      console.error('Error adding employee:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('employees:update', async (_, data) => {
    const { id, name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, code } = data
    
    // Calculate salary per hour for reporting
    const safeWorkHours = Number(work_hours) || 8
    const safeWorkingDays = Number(working_days) || 26
    const safeSalary = Number(salary) || 0
    const salaryPerHour = (safeWorkHours > 0 && safeWorkingDays > 0) ? (safeSalary / (safeWorkingDays * safeWorkHours)) : 0

    try {
      const res = db.prepare(`
        UPDATE employees 
        SET name = ?, phone = ?, salary = ?, role = ?, national_id = ?, 
            work_hours = ?, working_days = ?, start_time = ?, end_time = ?, 
            salary_per_hour = ?, code = ?
        WHERE id = ?
      `).run(
        name, 
        phone || '', 
        safeSalary, 
        role || 'employee', 
        national_id || '', 
        safeWorkHours, 
        safeWorkingDays, 
        start_time || '09:00', 
        end_time || '17:00',
        salaryPerHour,
        code || null,
        id
      )
      return { success: true }
    } catch (err) {
      console.error('Error updating employee:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('attendance:log', async (event, data) => {
    const { employee_id, type, time } = data // type: 'in' or 'out'
    const today = new Date().toISOString().split('T')[0]
    const now = time || new Date().toLocaleTimeString('ar-EG', { hour12: false }).substring(0, 5)

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, today)

    if (type === 'in') {
      if (existing) return { success: false, message: 'تم تسجيل الحضور بالفعل اليوم' }
      db.prepare('INSERT INTO attendance (employee_id, date, check_in, hours_worked) VALUES (?, ?, ?, 0.01)').run(employee_id, today, now)
    } else {
      if (!existing) return { success: false, message: 'لم يتم تسجيل الحضور اليوم' }
      
      const emp = db.prepare('SELECT work_hours FROM employees WHERE id = ?').get(employee_id)
      const defaultHours = parseFloat(emp?.work_hours) || 8
      db.prepare('UPDATE attendance SET check_out = ?, hours_worked = ? WHERE id = ?').run(now, defaultHours, existing.id)
    }
    
    // Trigger UI refresh
    event.sender.send('sales-updated')
    
    return { success: true }
  })

  ipcMain.handle('attendance:get-all', async () => {
    return db.prepare(`
      SELECT a.*, IFNULL(e.name, 'موظف محذوف') as employee_name 
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      ORDER BY a.date DESC, a.check_in DESC
    `).all()
  })

  ipcMain.handle('hr:get-attendance-summary', async (_, { month }) => {
    try {
      // month format is 'YYYY-MM'
      return db.prepare(`
        SELECT 
          employee_id, 
          COUNT(*) as days_present, 
          SUM(extra_hours) as total_extra_hours
        FROM attendance 
        WHERE date LIKE ? 
        GROUP BY employee_id
      `).all(`${month}%`)
    } catch (e) {
      console.error('Attendance Summary Error:', e)
      return []
    }
  })

  // --- Cloud Sync Handlers ---
  ipcMain.handle('cloud:sync-employees', async () => {
    try {
      const { default: cloudSync } = await import('./services/cloudSync')
      return await cloudSync.syncEmployeesToCloud(db)
    } catch (error) {
      console.error('Cloud Sync Employees Error:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('app:get-qr-config', async () => {
    try {
      const os = await import('os')
      const networkInterfaces = os.networkInterfaces()
      let ip = '127.0.0.1'
      
      // Find local IP
      for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            ip = net.address
            break
          }
        }
        if (ip !== '127.0.0.1') break
      }

      const branchIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'branch_id'").get()
      
      return {
        ip,
        port: 5001,
        branchId: branchIdSetting ? branchIdSetting.value : 'MAIN',
        tunnelUrl: global.tunnelUrl || null
      }
    } catch (e) {
      return { ip: '127.0.0.1', port: 5001, branchId: 'MAIN' }
    }
  })

  ipcMain.handle('cloud:pull-attendance', async (event) => {
    try {
      const { default: cloudSync } = await import('./services/cloudSync')
      const notify = () => event.sender.send('sales-updated')
      return await cloudSync.pullAttendanceFromCloud(db, notify)
    } catch (error) {
      console.error('Cloud Pull Attendance Error:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('printers:get', async () => {
    try {
      const { webContents } = require('electron')
      const wcs = webContents.getAllWebContents()
      if (wcs.length > 0) {
        return await wcs[0].getPrintersAsync()
      }
      return []
    } catch (e) {
      return []
    }
  })


  ipcMain.handle('hr:get-payments', async () => {
    try {
      return db.prepare(`
        SELECT sp.*, e.name as employee_name
        FROM salary_payments sp
        JOIN employees e ON sp.employee_id = e.id
        ORDER BY sp.payment_date DESC
      `).all()
    } catch (error) {
      console.error('Get Payments Error:', error)
      return []
    }
  })

  ipcMain.handle('hr:payout-salary', async (_, data) => {
    const { employee_id, month, base_salary, bonus, deduction, notes } = data
    
    // Calculate net salary
    const safeBonus = Number(bonus) || 0
    const safeDeduction = Number(deduction) || 0
    const net_salary = Number(base_salary) + safeBonus - safeDeduction

    try {
      const result = db.transaction(() => {
        // 1. Record the detailed salary payment
        const res = db.prepare(`
          INSERT INTO salary_payments (employee_id, month, base_salary, bonus, deduction, net_salary, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(employee_id, month, base_salary, safeBonus, safeDeduction, net_salary, notes)
        
        // 2. Add an expense entry for the treasury (automatically)
        // Description includes details about bonus/deduction if present
        let desc = `راتب شهر ${month}`
        if (safeBonus > 0) desc += ` (+ مكافأة: ${safeBonus})`
        if (safeDeduction > 0) desc += ` (- خصم: ${safeDeduction})`
        
        db.prepare(`
          INSERT INTO expenses (amount, category, description, employee_id, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(net_salary, 'رواتب', desc, employee_id, 'spent')
        
        return res.lastInsertRowid
      })()
      
      return { success: true, id: result }
    } catch (error) {
      console.error('Payout Error:', error)
      return { success: false, message: error.message }
    }
  })

  // --- Payroll Excel Export ---
  ipcMain.handle('hr:export-payroll-excel', async (_, month) => {
    try {
      // 1. Fetch data
      const payments = db.prepare(`
        SELECT sp.*, e.name as employee_name, e.role 
        FROM salary_payments sp
        JOIN employees e ON sp.employee_id = e.id
        WHERE sp.month = ?
        ORDER BY e.name ASC
      `).all(month)

      if (!payments || payments.length === 0) {
        return { success: false, message: 'لا توجد بيانات رواتب لهذا الشهر لتصديرها' }
      }

      // 2. Create Workbook
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet(`رواتب ${month}`, {
        views: [{ rightToLeft: true }]
      })

      // 3. Define Columns
      sheet.columns = [
        { header: 'اسم الموظف', key: 'name', width: 25 },
        { header: 'الوظيفة', key: 'role', width: 15 },
        { header: 'الراتب الأساسي', key: 'base', width: 15 },
        { header: 'مكافآت (+)', key: 'bonus', width: 15 },
        { header: 'خصومات (-)', key: 'deduction', width: 15 },
        { header: 'صافي الراتب', key: 'net', width: 20 },
        { header: 'تاريخ الصرف', key: 'date', width: 20 },
        { header: 'ملاحظات', key: 'notes', width: 30 }
      ]

      // 4. Add Rows
      let totalNet = 0
      payments.forEach(p => {
        sheet.addRow({
          name: p.employee_name,
          role: p.role === 'cashier' ? 'كاشير' : 'موظف',
          base: p.base_salary,
          bonus: p.bonus || 0,
          deduction: p.deduction || 0,
          net: p.net_salary,
          date: new Date(p.payment_date).toLocaleDateString('ar-EG'),
          notes: p.notes || ''
        })
        totalNet += p.net_salary
      })

      // 5. Styling
      sheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } } // Dark Slate
      sheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: 'middle', horizontal: 'right' }
        row.height = 20
        if (rowNumber > 1) {
            row.getCell('net').font = { bold: true }
        }
      })

      // 6. Total Row
      const totalRow = sheet.addRow({
        name: 'الإجمالي الكلي',
        net: totalNet
      })
      totalRow.font = { bold: true, size: 14 }
      totalRow.getCell('net').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } } // Light Green

      // 7. Save File
      const { filePath } = await dialog.showSaveDialog({
        title: `حفظ شيت المرتبات - ${month}`,
        defaultPath: `Payroll_${month}.xlsx`,
        filters: [{ name: 'Excel File', extensions: ['xlsx'] }]
      })

      if (filePath) {
        await workbook.xlsx.writeFile(filePath)
        shell.showItemInFolder(filePath)
        return { success: true }
      }
      return { success: false, message: 'تم إلغاء الحفظ' }

    } catch (error) {
      console.error('Excel Export Error:', error)
      return { success: false, message: error.message }
    }
  })

  // --- Statistics Handlers ---
  ipcMain.handle('suppliers:get-total-debt', async () => {
    try {
      const result = db.prepare('SELECT SUM(total_debt) as total FROM suppliers').get()
      return result.total || 0
    } catch (e) { return 0 }
  })

  // --- Website Management Handlers ---
  ipcMain.handle('orders:list', async () => {
    return orderService.getOrders(db)
  })

  ipcMain.handle('orders:update-status', async (_, orderId, status) => {
    return orderService.updateOrderStatus(db, orderId, status)
  })

  ipcMain.handle('orders:delete', async (_, orderId) => {
    return orderService.deleteOrder(db, orderId)
  })

  // --- Image Upload Handler (avoids CORS/fetch issues in Electron renderer) ---
  ipcMain.handle('products:upload-image', async (_, { buffer, filename }) => {
    try {
      const productUploadDir = join(app.getPath('userData'), 'uploads', 'products')
      if (!fs.existsSync(productUploadDir)) {
        fs.mkdirSync(productUploadDir, { recursive: true })
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      const ext = filename ? '.' + filename.split('.').pop() : '.jpg'
      const savedFilename = 'product-' + uniqueSuffix + ext
      const filePath = join(productUploadDir, savedFilename)
      fs.writeFileSync(filePath, Buffer.from(buffer))
      const imageUrl = `/uploads/products/${savedFilename}`
      console.log(`[IPC] Image uploaded via IPC: ${imageUrl}`)
      return { success: true, imageUrl }
    } catch (err) {
      console.error('[IPC] Image upload error:', err)
      return { success: false, message: err.message }
    }
  })

  // --- API Connectivity Diagnostic ---
  ipcMain.handle('api:check-connection', async () => {
    try {
      const http = await import('http')
      return await new Promise((resolve) => {
        const req = http.default.get('http://127.0.0.1:5001/api/attendance/health', (res) => {
          resolve({ success: true, status: res.statusCode })
        })
        req.on('error', (err) => resolve({ success: false, error: err.message }))
        req.setTimeout(3000, () => { req.destroy(); resolve({ success: false, error: 'timeout' }) })
      })
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  console.log('[Main] IPC Handlers Registration Complete.')
}
