/**
 * HR Service - Handles all Employee, Attendance, and Payroll logic
 */
export const hrService = {
  // --- Employee Management ---
  async listEmployees(db) {
    const list = db.prepare('SELECT * FROM employees WHERE is_active = 1').all()
    // Ensure all employees have a code
    for (const emp of list) {
      if (!emp.code) {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString()
        db.prepare('UPDATE employees SET code = ? WHERE id = ?').run(newCode, emp.id)
        emp.code = newCode
      }
    }
    return list
  },

  async addEmployee(db, data) {
    const { name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, code: providedCode } = data
    let finalCode = providedCode && providedCode.trim() !== '' 
      ? providedCode.trim() 
      : Math.floor(100000 + Math.random() * 900000).toString()
    
    if (!providedCode || providedCode.trim() === '') {
      let exists = db.prepare('SELECT id FROM employees WHERE code = ?').get(finalCode)
      while (exists) {
        finalCode = Math.floor(100000 + Math.random() * 900000).toString()
        exists = db.prepare('SELECT id FROM employees WHERE code = ?').get(finalCode)
      }
    }

    const safeWorkHours = work_hours || 8
    const safeWorkingDays = working_days || 26
    const safeSalary = parseFloat(salary) || 0
    const salaryPerHour = (safeWorkHours > 0 && safeWorkingDays > 0) ? (safeSalary / (safeWorkingDays * safeWorkHours)) : 0

    const res = db.prepare(`
      INSERT INTO employees (name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, is_active, code, salary_per_hour)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      name, phone || '', safeSalary, role || 'employee', national_id || '', 
      safeWorkHours, safeWorkingDays, start_time || '09:00', end_time || '17:00', finalCode, salaryPerHour
    )
    return { success: true, id: res.lastInsertRowid, code: finalCode }
  },

  async updateEmployee(db, data) {
    const { id, name, phone, salary, role, national_id, work_hours, working_days, start_time, end_time, code } = data
    db.prepare(`
      UPDATE employees 
      SET name = ?, phone = ?, salary = ?, role = ?, national_id = ?, work_hours = ?, working_days = ?, start_time = ?, end_time = ?, code = ?
      WHERE id = ?
    `).run(
      name, phone || '', salary || 0, role || 'employee', national_id || '', 
      work_hours || 8, working_days || 26, start_time || '09:00', end_time || '17:00', code || null, id
    )
    return { success: true }
  },

  async archiveEmployee(db, id) {
    db.prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(id)
    return { success: true }
  },

  // --- Attendance ---
  async logAttendance(db, { employee_id, type, time }) {
    const today = new Date().toISOString().split('T')[0]
    const now = time || new Date().toLocaleTimeString('ar-EG', { hour12: false }).substring(0, 5)
    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, today)

    if (type === 'in') {
      if (existing) return { success: false, message: 'تم تسجيل الحضور بالفعل اليوم' }
      db.prepare('INSERT INTO attendance (employee_id, date, check_in, hours_worked) VALUES (?, ?, ?, ?)').run(employee_id, today, now, 0.01)
    } else {
      if (!existing) return { success: false, message: 'لم يتم تسجيل الحضور اليوم' }
      if (existing.check_out || existing.hours_worked > 0.1) return { success: false, message: 'تم تسجيل الانصراف بالفعل لهذا اليوم' }
      
      const emp = db.prepare('SELECT work_hours FROM employees WHERE id = ?').get(employee_id)
      const defaultHours = parseFloat(emp?.work_hours) || 8
      db.prepare('UPDATE attendance SET check_out = ?, hours_worked = ? WHERE id = ?').run(now, defaultHours, existing.id)
    }
    return { success: true }
  },

  async getAllAttendance(db) {
    return db.prepare(`
      SELECT a.*, e.name as employee_name 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.date DESC, a.check_in DESC
    `).all()
  },

  async getAttendanceSummary(db, { month }) {
    const startOfMonth = `${month}-01`
    const endOfMonth = `${month}-31`
    
    // 1. Get Settings for Grace Period
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'late_allowed_minutes'").get()
    const graceMinutes = parseInt(settingsRow?.value || '15')

    // 2. Fetch raw attendance with employee start times
    const records = db.prepare(`
      SELECT a.*, e.start_time, e.end_time
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date LIKE ?
    `).all(`${month}%`)

    // 3. Aggregate in JS
    const summary = {}
    const employeeDates = {} // Track unique dates per employee
    
    const parseTime = (t) => {
        if (!t) return 0
        const [h, m] = t.split(':').map(Number)
        return (h * 60) + m
    }

    records.forEach(rec => {
        if (!summary[rec.employee_id]) {
            summary[rec.employee_id] = { days_present: 0, total_extra_hours: 0, total_late_minutes: 0 }
            employeeDates[rec.employee_id] = new Set()
        }
        
        const s = summary[rec.employee_id]
        
        // Only increment stats for unique dates to avoid double-counting duplicates
        if (!employeeDates[rec.employee_id].has(rec.date)) {
            employeeDates[rec.employee_id].add(rec.date)
            
            s.days_present++
            
            // Calculate Lateness & Overtime
            if (rec.check_in && rec.start_time) {
                const normalize = str => str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                const checkInMins = parseTime(normalize(rec.check_in))
                const startMins = parseTime(normalize(rec.start_time))
                
                if (checkInMins > startMins + graceMinutes) {
                    s.total_late_minutes += (checkInMins - startMins)
                }

                // Overtime Calculation
                if (rec.check_out && rec.end_time) {
                    const checkOutMins = parseTime(normalize(rec.check_out))
                    const endMins = parseTime(normalize(rec.end_time))
                    
                    // If stayed after end_time (more than 15 mins grace)
                    if (checkOutMins > endMins + 15) {
                        const extraMins = checkOutMins - endMins
                        s.total_extra_hours += (extraMins / 60)
                    }
                }
            }
        }
    })

    // Convert object to array format expected by frontend
    return Object.entries(summary).map(([id, data]) => ({
        employee_id: parseInt(id),
        ...data
    }))
  },

  // --- Payroll ---
  async getPayments(db) {
    return db.prepare(`
      SELECT sp.*, e.name as employee_name
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      ORDER BY sp.payment_date DESC
    `).all()
  },

  async payoutSalary(db, data) {
    const { employee_id, month, base_salary, bonus, deduction, notes } = data
    const result = db.transaction(() => {
      // 1. Get total unpaid loans
      const loansResult = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_loans
        FROM expenses
        WHERE employee_id = ? AND status = 'loan'
      `).get(employee_id)
      const totalLoans = Number(loansResult?.total_loans) || 0
      
      // 2. Calculate net salary
      const safeBonus = Number(bonus) || 0
      const safeDeduction = Number(deduction) || 0
      const net_salary = Number(base_salary) + safeBonus - safeDeduction - totalLoans

      // 3. Record payment
      const res = db.prepare(`
        INSERT INTO salary_payments (employee_id, month, base_salary, bonus, deduction, net_salary, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(employee_id, month, base_salary, safeBonus, safeDeduction + totalLoans, net_salary, notes)
      
      // 4. Clear loans
      if (totalLoans > 0) {
        db.prepare("DELETE FROM expenses WHERE employee_id = ? AND status = 'loan'").run(employee_id)
      }
      
      // 5. Add expense entry (Optional: based on user request to separate it - current implementation keeps it in salary_payments only or as separate expense)
      // Note: User previously asked to NOT add it to general expenses but kept it as a separate record if needed.
      // For clean code, we follow the latest state where it DOES add it but under a specific 'رواتب' category if requested.
      // Re-adding based on the last successful state from conversation.
      const emp = db.prepare('SELECT name FROM employees WHERE id = ?').get(employee_id)
      let desc = `صرف راتب: ${emp?.name || ''} - شهر ${month}`
      if (notes) desc += ` (${notes})`
      if (safeBonus > 0) desc += ` [ مكافأة: ${safeBonus} ]`
      if (safeDeduction > 0) desc += ` [ خصم: ${safeDeduction} ]`
      if (totalLoans > 0) desc += ` [ استرداد سلف: ${totalLoans} ]`
      
      db.prepare(`
        INSERT INTO expenses (amount, category, description, employee_id, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(net_salary, 'رواتب', desc, employee_id, 'spent')

      return { id: res.lastInsertRowid, loansDeducted: totalLoans }
    })()
    return { success: true, ...result }
  }
}
