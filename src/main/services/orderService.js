import fs from 'fs'
import path from 'path'
import { app as electronApp } from 'electron'

export const orderService = {
  async getOrders(db) {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
    for (const order of orders) {
      order.items = db.prepare(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id)
    }
    return orders
  },

  async updateOrderStatus(db, orderId, status) {
    const result = db.transaction(() => {
      const order = db.prepare('SELECT deposit_image FROM orders WHERE id = ?').get(orderId)
      
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId)

      // If status is delivered, delete the deposit image from disk
      if (status === 'delivered' && order && order.deposit_image) {
        const uploadDir = path.join(electronApp.getPath('userData'), 'uploads', 'deposits')
        const imagePath = path.join(uploadDir, order.deposit_image)
        
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath)
            console.log(`[OrderService] Deleted deposit image: ${order.deposit_image}`)
            // Update DB to reflect deletion
            db.prepare('UPDATE orders SET deposit_image = NULL WHERE id = ?').run(orderId)
          }
        } catch (err) {
          console.error(`[OrderService] Error deleting image ${order.deposit_image}:`, err)
        }
      }
      return { success: true }
    })()

    return result
  },

  async deleteOrder(db, orderId) {
    return db.transaction(() => {
        const order = db.prepare('SELECT deposit_image FROM orders WHERE id = ?').get(orderId)
        if (order && order.deposit_image) {
            const uploadDir = path.join(electronApp.getPath('userData'), 'uploads', 'deposits')
            const imagePath = path.join(uploadDir, order.deposit_image)
            try {
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
            } catch (e) {
                console.error('[OrderService] Delete order image error:', e)
            }
        }
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(orderId)
        return { success: true }
    })()
  }
}
