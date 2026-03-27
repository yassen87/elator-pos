const Database = require('better-sqlite3')
const { join } = require('path')
const { app } = require('electron')

let db = null

// Path to the main POS database (Development assumption)
// In production, this would be configured via settings
const POS_DB_PATH = join('C:', 'Users', 'Hp', 'Desktop', 'New folder (9)', 'database.sqlite')

function initPOSConnection() {
  try {
    db = new Database(POS_DB_PATH, { readonly: true })
    console.log('[Hub-POS] Connected to POS Database at:', POS_DB_PATH)
    return true
  } catch (error) {
    console.error('[Hub-POS] Failed to connect to POS Database:', error.message)
    return false
  }
}

function getDashboardStats() {
  if (!db) {
    const connected = initPOSConnection()
    if (!connected) return null
  }

  try {
    // 1. Total Revenue (Sales)
    const salesResult = db.prepare('SELECT SUM(total) as total FROM sales').get()
    const totalRevenue = salesResult?.total || 0

    // 2. Active Products
    const productsResult = db.prepare('SELECT COUNT(*) as count FROM products').get()
    const activeProducts = productsResult?.count || 0

    // 3. Average Daily Sales (Last 30 days)
    const avgSalesResult = db.prepare(`
      SELECT AVG(daily_total) as avg 
      FROM (
        SELECT SUM(total) as daily_total 
        FROM sales 
        WHERE date >= datetime('now', '-30 days')
        GROUP BY strftime('%Y-%m-%d', date)
      )
    `).get()
    const avgDailySales = avgSalesResult?.avg || 0

    // 4. Low Stock Alerts
    const lowStockResult = db.prepare('SELECT COUNT(*) as count FROM products WHERE total_ml <= alert_ml').get()
    const securityEvents = lowStockResult?.count || 0 // Reusing this slot for now

    return {
      totalRevenue,
      activeProducts,
      avgDailySales,
      securityEvents
    }
  } catch (error) {
    console.error('[Hub-POS] Error fetching stats:', error.message)
    return null
  }
}

function getShopsStatus() {
  // Mocked for now, but could read from a 'nodes' table if we had one
  return [
    { id: 'POS_LOCAL', name: 'الفرع الرئيسي (هذا الجهاز)', status: 'online', version: '3.0.0', activity: 'نشط الآن' }
  ]
}

module.exports = {
  initPOSConnection,
  getDashboardStats,
  getShopsStatus
}
