const fs = require('fs');
const path = require('path');

// Data file path
const DATA_FILE = path.join('/tmp', 'attendance_data.json');

// Initialize data
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { employees: [], attendance: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Helper to get body (Vercel usually parses it, but let's be sure)
  const getBody = () => {
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch(e) { return {}; }
    }
    return req.body || {};
  };

  const { action } = req.query;
  const body = getBody();

  try {
    // Health Check (default)
    if (!action || action === 'health') {
      return res.status(200).json({ 
        success: true, 
        message: 'Cloud API is working! 🚀',
        timestamp: new Date().toISOString()
      });
    }

    // Sync Employees
    if (action === 'sync_employees' && req.method === 'POST') {
      const { employees = [], branchId = 'MAIN' } = body;
      const data = loadData();

      employees.forEach(emp => {
        const existing = data.employees.find(e => e.code === String(emp.code));
        if (existing) {
          existing.name = emp.name;
          existing.remote_id = emp.id;
          existing.branch_id = branchId;
        } else {
          data.employees.push({
            remote_id: emp.id,
            name: emp.name,
            code: String(emp.code),
            branch_id: branchId
          });
        }
      });

      saveData(data);
      return res.status(200).json({ 
        success: true, 
        message: 'Employees synced successfully', 
        count: employees.length 
      });
    }

    // Attendance Punch
    if (action === 'punch' && req.method === 'POST') {
      const employeeCode = String(body.employeeCode || req.query.employeeCode || '');

      if (!employeeCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Employee Code is required',
          received: body
        });
      }

      const data = loadData();
      const employee = data.employees.find(e => e.code === employeeCode);

      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          error: 'Employee not found (Sync required). Code: ' + employeeCode,
          count: data.employees.length
        });
      }

      // Determine IN/OUT
      const today = new Date().toISOString().split('T')[0];
      const lastPunch = [...data.attendance]
        .reverse()
        .find(r => r.employee_code === employeeCode && r.timestamp.startsWith(today));

      const newType = lastPunch?.type === 'IN' ? 'OUT' : 'IN';

      data.attendance.push({
        id: data.attendance.length + 1,
        employee_code: employeeCode,
        type: newType,
        timestamp: new Date().toISOString(),
        synced_to_pos: 0
      });

      saveData(data);

      return res.status(200).json({
        success: true,
        type: newType,
        name: employee.name,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      });
    }

    // Get Attendance
    if (action === 'get_attendance' && req.method === 'GET') {
      const data = loadData();
      const unsynced = data.attendance.filter(r => r.synced_to_pos === 0);

      // Mark as synced
      data.attendance.forEach(r => {
        if (r.synced_to_pos === 0) r.synced_to_pos = 1;
      });

      if (unsynced.length > 0) saveData(data);

      return res.status(200).json({ success: true, data: unsynced });
    }

    return res.status(400).json({ success: false, error: 'Invalid action: ' + action });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
};
