/**
 * Expense Service - Handles all expense tracking and employee financials
 */
export const expenseService = {
  async getExpenses(db, filters) {
    const { startDate, endDate, category } = filters
    let query = 'SELECT e.*, emp.name as employee_name FROM expenses e LEFT JOIN employees emp ON e.employee_id = emp.id WHERE date(e.date) BETWEEN ? AND ?'
    let params = [startDate, endDate]
    
    if (category && category !== 'all') {
      query += ' AND category = ?'
      params.push(category)
    }
    
    return db.prepare(query).all(...params)
  },

  async addExpense(db, data) {
    const { amount, category, description, employee_id, status, supplier_id } = data
    const res = db.prepare(`
      INSERT INTO expenses (amount, category, description, employee_id, status, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(amount, category, description, employee_id || null, status || 'spent', supplier_id || null)
    return { success: true, id: res.lastInsertRowid }
  }
}
