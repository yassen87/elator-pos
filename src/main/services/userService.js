/**
 * User Service - Handles authentication and user permissions
 */
export const userService = {
  async login(db, { username, password }) {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1').get(username, password)
    if (!user) return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
    
    // Update last login
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id)
    
    // Hide password and parse permissions
    delete user.password
    if (user.permissions) {
      try { user.permissions = JSON.parse(user.permissions) } catch (e) { user.permissions = {} }
    }
    return { success: true, user }
  },

  async updatePermissions(db, { id, permissions }) {
    db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), id)
    return { success: true }
  },

  async addCashier(db, { username, password, pricing_tier }) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (exists) return { success: false, message: 'اسم المستخدم موجود بالفعل' }
    
    db.prepare('INSERT INTO users (username, password, role, pricing_tier) VALUES (?, ?, ?, ?)')
      .run(username, password, 'cashier', pricing_tier || 'retail')
    return { success: true }
  },

  async deleteCashier(db, id) {
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id)
    return { success: true }
  },

  async updateUserPassword(db, { id, password }) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id)
    return { success: true }
  },

  async getSuperUsersList(db) {
    return db.prepare("SELECT id, username, role, last_login_at FROM users WHERE role = 'super_admin'").all()
  }
}
