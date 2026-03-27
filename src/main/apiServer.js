import { app as electronApp } from 'electron'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import getDB from './db'
import { inventoryService } from './services/inventoryService'
import { salesService } from './services/salesService'
import { hrService } from './services/hrService'
import { systemService } from './services/systemService'
import { userService } from './services/userService'
import { expenseService } from './services/expenseService'
import { supplierService } from './services/supplierService'
import { databaseService } from './services/databaseService'
import { orderService } from './services/orderService'
import multer from 'multer'

let server = null
const port = 5001

export function startAPIServer() {
  if (server) return

  const apiApp = express()
  apiApp.use(cors())
  apiApp.use(express.json())

  // Request Logging
  apiApp.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`)
    next()
  })

  const db = getDB()

  // --- Multer Configuration for Orders ---
  const uploadDir = path.join(electronApp.getPath('userData'), 'uploads', 'deposits')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname))
    }
  })
  const upload = multer({ storage })

  // --- Multer Configuration for Products ---
  const productUploadDir = path.join(electronApp.getPath('userData'), 'uploads', 'products')
  if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true })
  }

  const productStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, productUploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname))
    }
  })
  const productUpload = multer({ storage: productStorage })

  // Serve images
  apiApp.use('/uploads/deposits', express.static(uploadDir))
  apiApp.use('/uploads/products', express.static(productUploadDir))

  // Product Image Upload Endpoint
  apiApp.post('/api/products/upload', productUpload.single('image'), (req, res) => {
    try {
      console.log('[API] Processing product image upload...')
      if (!req.file) {
        console.warn('[API] No file received in upload request')
        return res.status(400).json({ success: false, message: 'No file uploaded' })
      }
      const imageUrl = `/uploads/products/${req.file.filename}`
      console.log(`[API] Image uploaded successfully: ${imageUrl}`)
      res.json({ success: true, imageUrl })
    } catch (err) {
      console.error('[API] Upload processing error:', err.message)
      res.status(500).json({ success: false, message: err.message })
    }
  })

  // 1. Universal Proxy Endpoint
  // This allows the web version to call any "IPC" channel via HTTP
  apiApp.post('/api/invoke', async (req, res) => {
    const { channel, args = [] } = req.body
    console.log(`[API-PROXY] Channel: ${channel}`)

    try {
      let result = { success: false, message: 'Channel handler not found' }

      // Map channels to service functions (matching ipcHandlers.js)
      switch (channel) {
        case 'auth:login': result = await userService.login(db, args[0]); break
        case 'products:list': result = await inventoryService.getProducts(db); break
        case 'products:add': result = await inventoryService.addProduct(db, args[0]); break
        case 'products:update': result = await inventoryService.updateProduct(db, args[0]); break
        case 'products:update-stock': result = await inventoryService.updateStock(db, args[0]); break
        case 'products:delete': result = await inventoryService.deleteProduct(db, args[0]); break
        case 'products:find-by-barcode': result = await inventoryService.findByBarcode(db, args[0]); break
        
        case 'formulas:list': result = await inventoryService.getFormulas(db); break
        case 'formulas:add': result = await inventoryService.addFormula(db, args[0]); break
        case 'formulas:delete': result = await inventoryService.deleteFormula(db, args[0]); break

        case 'cashiers:list': 
          result = db.prepare("SELECT id, username, role, is_active, pricing_tier FROM users WHERE role = 'cashier' AND is_active = 1").all(); 
          break
        case 'cashiers:add': result = await userService.addCashier(db, args[0]); break
        case 'cashiers:delete': result = await userService.deleteCashier(db, args[0]); break

        case 'sales:add': result = await salesService.addSale(db, args[0]); break
        case 'sales:history': result = await salesService.getSalesHistory(db); break
        case 'sales:get-next-code': result = await salesService.getNextInvoiceCode(db); break
        case 'sales:get-by-invoice-code': result = await salesService.getSalesByInvoiceCode(db, args[0]); break
        case 'sales:find-by-id': result = await salesService.getSaleById(db, args[0]); break
        
        case 'returns:add': result = await salesService.addReturn(db, args[0]); break
        case 'returns:list': result = await salesService.getReturns(db, args[0]); break
        
        case 'customers:list': result = await salesService.getCustomersList(db); break
        
        case 'employees:list': result = await hrService.listEmployees(db); break
        case 'attendance:list': result = await hrService.getAllAttendance(db); break
        case 'attendance:log': result = await hrService.logAttendance(db, args[0]); break
        case 'hr:get-attendance-summary': result = await hrService.getAttendanceSummary(db, args[0]); break
        case 'hr:get-payments': result = await hrService.getPayments(db); break
        case 'hr:payout-salary': result = await hrService.payoutSalary(db, args[0]); break
        
        case 'settings:get': result = await systemService.getSettings(db); break
        case 'settings:update': result = await systemService.updateSettings(db, args[0]); break
        case 'system:get-machine-id': result = await systemService.getMachineId(); break
        case 'app:get-trial-status': result = await systemService.getTrialStatus(db); break
        
        case 'expenses:get': result = await expenseService.getExpenses(db, args[0]); break
        case 'expenses:add': result = await expenseService.addExpense(db, args[0]); break
        
        case 'suppliers:get': result = await supplierService.getSuppliers(db, args[0]); break
        case 'suppliers:add': result = await supplierService.addSupplier(db, args[0]); break
        case 'suppliers:purchase': result = await supplierService.addPurchase(db, args[0]); break
        case 'suppliers:get-history': result = await supplierService.getHistory(db, args[0]); break
        
        case 'orders:list': result = await orderService.getOrders(db); break
        case 'orders:update-status': result = await orderService.updateOrderStatus(db, args[0], args[1]); break
        case 'orders:delete': result = await orderService.deleteOrder(db, args[0]); break
        
        case 'products:website-list': result = await inventoryService.getWebsiteProducts(db); break
        case 'products:website-add': result = await inventoryService.addWebsiteProduct(db, args[0]); break
        case 'products:website-update': result = await inventoryService.updateWebsiteProduct(db, args[0]); break
        case 'products:website-delete': result = await inventoryService.deleteWebsiteProduct(db, args[0]); break
        case 'products:categories': 
          const storeCats = await inventoryService.getCategories(db);
          const webCats = await inventoryService.getWebsiteCategories(db);
          result = [...new Set([...storeCats, ...webCats])];
          break
        case 'products:update-visibility': result = await inventoryService.updateWebsiteVisibility(db, args[0]); break
        
        default:
          console.warn(`[API-PROXY] Unhandled channel: ${channel}`)
      }

      res.json(result)
    } catch (err) {
      console.error(`[API-PROXY] Error calling ${channel}:`, err)
      res.status(500).json({ success: false, message: err.message })
    }
  })

  // Helper: Haversine distance in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // metres
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Attendance Punch Endpoint (First scan = In, Second = Out)
  apiApp.post('/api/attendance/punch', (req, res) => {
    const { employeeCode, branchId, latitude, longitude, type } = req.body

    if (!employeeCode || !branchId) {
      return res.status(400).json({ success: false, error: 'Missing data' })
    }

    try {
      const settings = {}
      db.prepare("SELECT key, value FROM settings WHERE key LIKE 'geofencing_%' OR key LIKE 'shop_%'").all()
        .forEach(s => { settings[s.key] = s.value })

      // Geofencing Check
      if (settings.geofencing_enabled === '1') {
        if (!latitude || !longitude) {
           return res.status(403).json({ success: false, error: 'يجب تفعيل تحديد الموقع (GPS) للبصمة' })
        }
        
        const shopLat = parseFloat(settings.shop_latitude)
        const shopLon = parseFloat(settings.shop_longitude)
        const radius = parseFloat(settings.geofencing_radius) || 200

        if (shopLat !== 0 && shopLon !== 0) {
          const distance = calculateDistance(latitude, longitude, shopLat, shopLon)
          console.log(`[API] Punch distance: ${distance.toFixed(2)}m (Max: ${radius}m)`)
          
          if (distance > radius) {
            return res.status(403).json({ 
                success: false, 
                error: `أنت خارج نطاق المحل (${Math.round(distance)} متر بعيد)`,
                distance: Math.round(distance)
            })
          }
        }
      }

      // 1. Verify Branch
      const shopIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'branch_id'").get()
      if (shopIdSetting && shopIdSetting.value && shopIdSetting.value !== branchId) {
        return res.status(403).json({ success: false, error: 'Wrong branch' })
      }

      // 2. Find Employee
      const employee = db.prepare('SELECT id, name, work_hours FROM employees WHERE code = ? AND is_active = 1').get(employeeCode)
      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found' })
      }

      const today = new Date().toLocaleDateString('en-CA')
      const now = new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5)

      // 3. Check for existing attendance today
      const existing = db.prepare('SELECT id, check_in, check_out, hours_worked FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today)

      // 4. Decision Logic (Use provided type if available)
      const forcedType = type ? type.toUpperCase() : null
      const isCheckingIn = forcedType ? (forcedType === 'IN') : !existing

      console.log(`[Punch] Employee: ${employee.name}, Action: ${forcedType || 'Toggle'}, isCheckingIn: ${isCheckingIn}, Existing: ${!!existing}`)

      if (isCheckingIn) {
        if (existing) {
           // If they are already checked in, but the QR says "IN", we just return success with current time
           // to avoid confusing the user with an error, but don't record anything new.
           return res.json({ success: true, type: 'IN', name: employee.name, time: existing.check_in, alreadyRecorded: true })
        }
        // Check-in
        db.prepare('INSERT INTO attendance (employee_id, date, check_in, hours_worked) VALUES (?, ?, ?, ?)').run(employee.id, today, now, 0.01)
        return res.json({ success: true, type: 'IN', name: employee.name, time: now })
      } else {
        // Check-out
        if (!existing) {
           return res.status(400).json({ success: false, error: 'لم يتم تسجيل الحضور اليوم' })
        }
        if (existing.check_out || existing.hours_worked > 0.1) {
           return res.json({ success: true, type: 'OUT', name: employee.name, time: existing.check_out, alreadyRecorded: true })
        }

        const defaultHours = parseFloat(employee.work_hours) || 8
        db.prepare('UPDATE attendance SET check_out = ?, hours_worked = ? WHERE id = ?').run(now, defaultHours, existing.id)
        return res.json({ success: true, type: 'OUT', name: employee.name, time: now })
      }
    } catch (err) {
      console.error('[API] Punch Error:', err)
      return res.status(500).json({ success: false, error: 'Server error' })
    }
  })

  // Mobile App Auth
  apiApp.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    try {
      const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ? AND is_active = 1').get(username, password)
      if (user) {
        return res.json({ success: true, user, token: 'session_' + Date.now() })
      }
      res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Website User Auth
  apiApp.post('/api/store/auth/login', (req, res) => {
    const { phone, password } = req.body
    try {
      const user = db.prepare('SELECT id, name, phone, address FROM website_users WHERE phone = ? AND password = ?').get(phone, password)
      if (user) {
        return res.json({ success: true, user })
      }
      res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  apiApp.post('/api/store/auth/register', (req, res) => {
    const { name, phone, password, address } = req.body
    try {
      const existing = db.prepare('SELECT id FROM website_users WHERE phone = ?').get(phone)
      if (existing) {
        return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل بالفعل' })
      }
      const result = db.prepare('INSERT INTO website_users (name, phone, password, address) VALUES (?, ?, ?, ?)').run(name, phone, password, address)
      res.json({ success: true, user: { id: result.lastInsertRowid, name, phone, address } })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Mobile Dashboard Data
  apiApp.get('/api/mobile/dashboard', (req, res) => {
    try {
      const today = new Date().toLocaleDateString('en-CA')
      
      // 1. Total Sales Today
      const salesToday = db.prepare("SELECT SUM(total) as total, COUNT(id) as count FROM sales WHERE date(date, 'localtime') = ?").get(today)
      
      // 2. Recent Sales with limited items for optimization
      const recentSales = db.prepare(`
        SELECT s.*, GROUP_CONCAT(i.item_name || ' (' || i.quantity || ')') as items_summary
        FROM sales s
        LEFT JOIN sale_items i ON s.id = i.sale_id
        WHERE date(s.date, 'localtime') = ?
        GROUP BY s.id
        ORDER BY s.date DESC
        LIMIT 5
      `).all(today)

      // 3. Low Stock Alerts
      const lowStock = db.prepare("SELECT name, stock_quantity, category FROM products WHERE stock_quantity <= min_stock OR stock_quantity <= 10 LIMIT 10").all()

      res.json({
        success: true,
        data: {
          totalSales: salesToday.total || 0,
          salesCount: salesToday.count || 0,
          recentSales: recentSales.map(s => ({
            ...s,
            items: s.items_summary ? s.items_summary.split(',').map(name => ({ product_name: name })) : []
          })),
          lowStock: lowStock
        }
      })
    } catch (err) {
        console.error('[API] Mobile Dashboard Error:', err)
        res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // Website API: products (public-ish)
  apiApp.get('/api/store/products', (req, res) => {
    try {
      const visibleOnly = req.query.visible_only !== 'false' // Default true
      let query = 'SELECT * FROM website_products'
      if (visibleOnly) {
        query += ' WHERE is_active = 1'
      }
      query += ' ORDER BY name ASC'
      
      const products = db.prepare(query).all()
      res.json({ success: true, products })
    } catch (err) {
      console.error('[API] Store Products Error:', err)
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Website API: categories (public-ish)
  apiApp.get('/api/store/categories', (req, res) => {
    try {
      const categories = db.prepare('SELECT DISTINCT category FROM website_products WHERE is_active = 1 AND category IS NOT NULL').all()
      res.json({ success: true, categories: categories.map(c => c.category) })
    } catch (err) {
      console.error('[API] Store Categories Error:', err)
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // Website API: Create Order
  apiApp.post('/api/store/orders', upload.single('deposit_image'), (req, res) => {
    try {
      const { customerName, customerPhone, customerAddress, items, totalAmount, websiteUserId } = req.body
      const depositImage = req.file ? req.file.filename : null

      // items comes as a JSON string in multipart form-data
      const orderItems = typeof items === 'string' ? JSON.parse(items) : items

      const result = db.transaction(() => {
        const orderStmt = db.prepare(`
          INSERT INTO orders (customer_name, customer_phone, customer_address, total_amount, deposit_image, status, website_user_id)
          VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `)
        const orderResult = orderStmt.run(customerName, customerPhone, customerAddress, totalAmount, depositImage, websiteUserId || null)
        const orderId = orderResult.lastInsertRowid

        const itemStmt = db.prepare(`
          INSERT INTO order_items (order_id, website_product_id, quantity, price, size)
          VALUES (?, ?, ?, ?, ?)
        `)

        for (const item of orderItems) {
          itemStmt.run(orderId, item.website_product_id || item.id, item.quantity, item.price, item.size || null)
        }

        return orderId
      })()

      res.json({ success: true, orderId: result })
    } catch (err) {
      console.error('[API] Store Order Error:', err)
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // --- REMOTE MANAGEMENT ENDPOINTS ---
  const ADMIN_KEY = 'yassen-elator-admin-2026'

  const authMiddleware = (req, res, next) => {
    const key = req.headers['x-admin-key']
    if (key === ADMIN_KEY) {
      next()
    } else {
      console.warn(`[API-REMOTE] Unauthorized access attempt from ${req.ip}`)
      res.status(401).json({ success: false, message: 'Unauthorized' })
    }
  }

  apiApp.get('/api/remote/status', authMiddleware, (req, res) => {
    res.json({
      success: true,
      app: 'Elator POS',
      version: electronApp.getVersion(),
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime()
    })
  })

  apiApp.get('/api/remote/backup', authMiddleware, (req, res) => {
    const dbPath = path.join(electronApp.getPath('userData'), 'perfume_shop.db')
    if (fs.existsSync(dbPath)) {
      console.log(`[API-REMOTE] Streaming DB backup to admin...`)
      res.download(dbPath, `backup_${new Date().getTime()}.db`)
    } else {
      res.status(404).json({ success: false, message: 'Database file not found' })
    }
  })

  apiApp.post('/api/remote/kill', authMiddleware, (req, res) => {
    console.log('[API-REMOTE] !!! REMOTE KILL COMMAND RECEIVED !!!')
    res.json({ success: true, message: 'App shutting down...' })
    setTimeout(() => {
      electronApp.quit()
    }, 2000)
  })

  // Health check for mobile debugging & Tunnel Provider
  apiApp.get('/api/attendance/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'ok', 
        time: new Date().toISOString(),
        tunnelUrl: global.tunnelUrl || null
    })
  })

  // 2. Serve Static POS Web Version
  let distPath = path.join(process.cwd(), 'dist-web')
  if (!fs.existsSync(distPath)) {
      // In production EXE, dist-web might be inside resources or app.getAppPath()
      distPath = path.join(electronApp.getAppPath(), 'dist-web')
  }

  if (fs.existsSync(distPath)) {
    console.log(`[API] Serving Web POS from: ${distPath}`)
    apiApp.use(express.static(distPath))
    
    // Explicitly serve index.html for SPA paths
    const sendIndex = (req, res) => res.sendFile(path.join(distPath, 'index.html'))
    apiApp.get('/', sendIndex)
    apiApp.get('/dashboard', sendIndex)
    apiApp.get('/pos', sendIndex)
    apiApp.get('/inventory', sendIndex)
    apiApp.get('/sales', sendIndex)
    apiApp.get('/settings', sendIndex)
  } else {
    console.warn(`[API] Web POS directory not found.`)
  }

  // Global Error Handler
  apiApp.use((err, req, res, _next) => {
    console.error('[API] Global Error:', err.stack)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  })

  // Start Server
  try {
    server = apiApp.listen(port, '0.0.0.0', () => {
        console.log(`[API] Attendance Server running on http://0.0.0.0:${port}`)
        
        // Dynamic LocalTunnel with Retry Logic
        const startTunnel = async () => {
            try {
                if (!require.resolve('localtunnel')) return
                const localtunnel = require('localtunnel')
                
                console.log('[API] Attempting to start remote tunnel...')
                const tunnel = await localtunnel({ port: port, subdomain: 'yassen-elator-pos' })
                
                global.tunnelUrl = tunnel.url
                console.log(`[API] 🚀 Remote Tunnel Active: ${tunnel.url}`)
                
                tunnel.on('close', () => {
                    console.warn('[API] Remote Tunnel Closed. Reconnecting in 10s...')
                    global.tunnelUrl = null
                    setTimeout(startTunnel, 10000)
                })

                tunnel.on('error', (err) => {
                    console.error('[API] Tunnel Error:', err.message)
                })
            } catch (e) {
                console.warn(`[API] Tunnel startup failed: ${e.message}. Retrying in 10s...`)
                setTimeout(startTunnel, 10000)
            }
        }
        
        startTunnel()
    })
  } catch (err) {
    console.error('[API] Server listen error:', err.message)
  }
}

export function stopAPIServer() {
  if (server) {
    console.trace('[API] stopAPIServer called from:')
    server.close()
    server = null
    console.log('[API] Attendance Server stopped')
  }
}
