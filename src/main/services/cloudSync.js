import axios from 'axios';

const CLOUD_API_URL = 'https://elator-pos.veila.shop/api.php';

const cloudSync = {
  getBranchId(db) {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get();
      return (row && row.value) ? row.value : 'MAIN_BRANCH';
    } catch (e) {
      return 'MAIN_BRANCH';
    }
  },

  getShopUuid(db) {
    try {
      let row = db.prepare("SELECT value FROM settings WHERE key = 'shop_uuid'").get();
      if (!row || !row.value) {
        const uuid = require('crypto').randomUUID();
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_uuid', ?)").run(uuid);
        return uuid;
      }
      return row.value;
    } catch (e) {
      console.error('[CloudSync] Failed to get/create Shop UUID:', e.message);
      return 'UNKNOWN_UUID';
    }
  },

  async registerWithHub(db) {
    try {
      const branchId = this.getShopUuid(db);
      const name = this.getBranchId(db);
      const response = await axios.post(`${CLOUD_API_URL}?action=register_shop`, {
        branchId,
        name
      }, { timeout: 10000 });
      
      if (response.data.success && response.data.is_disabled) {
        console.warn('[CloudSync] THIS SHOP IS DISABLED BY HUB');
        return { success: true, is_disabled: true };
      }
      return { success: true, is_disabled: false };
    } catch (error) {
      console.error('[CloudSync] Registration Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Sync Employees from Local DB -> Cloud
  async syncEmployeesToCloud(db) {
    try {
      const branchId = this.getBranchId(db);
      const employees = db.prepare("SELECT id, name, code, work_hours FROM employees").all();
      if (employees.length === 0) return { success: true, message: 'No employees to sync' };

      const response = await axios.post(`${CLOUD_API_URL}?action=sync_employees`, {
        employees: employees,
        branchId: branchId
      }, { timeout: 10000 });

      return response.data;
    } catch (error) {
      console.error('[CloudSync] Sync Employees Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Pull Attendance from Cloud -> Local DB
  async pullAttendanceFromCloud(db, notifySalesChange) {
    try {
        const branchId = this.getBranchId(db);
        const response = await axios.get(`${CLOUD_API_URL}?action=get_attendance&branchId=${encodeURIComponent(branchId)}`, { timeout: 10000 });
        
        if (response.data.success && response.data.data.length > 0) {
            const records = response.data.data;
            let addedCount = 0;

            const findEmp = db.prepare("SELECT id FROM employees WHERE code = ?");
            const insertAttendance = db.prepare("INSERT INTO attendance (employee_id, date, status, check_in, check_out, extra_hours) VALUES (?, ?, ?, ?, ?, ?)");
            const lastAttendance = db.prepare("SELECT id, check_in FROM attendance WHERE employee_id = ? AND date = ? AND check_out IS NULL ORDER BY id DESC LIMIT 1");
            const updateAttendance = db.prepare("UPDATE attendance SET check_out = ?, extra_hours = ? WHERE id = ?");
            
            // Duplication check: find any record for this employee/day with same check-in or check-out time
            const checkDuplicate = db.prepare(`
                SELECT id FROM attendance 
                WHERE employee_id = ? AND date = ? 
                AND (check_in = ? OR check_out = ?)
            `);

            for (const record of records) {
                const emp = findEmp.get(record.employee_code);
                if (!emp) continue;

                const dateObj = new Date(record.timestamp);
                const date = dateObj.toISOString().split('T')[0];
                const time = dateObj.toLocaleTimeString('en-GB', { hour12: false });

                if (record.type === 'IN') {
                    if (checkDuplicate.get(emp.id, date, time, time)) continue;
                    insertAttendance.run(emp.id, date, 'present', time, null, 0);
                    addedCount++;
                } else {
                    if (checkDuplicate.get(emp.id, date, time, time)) continue;
                    const last = lastAttendance.get(emp.id, date);
                    if (last) {
                        updateAttendance.run(time, record.extra_hours || 0, last.id);
                        addedCount++;
                    } else {
                        insertAttendance.run(emp.id, date, 'present', null, time, record.extra_hours || 0);
                        addedCount++;
                    }
                }
            }
            if (addedCount > 0 && typeof notifySalesChange === 'function') {
                notifySalesChange();
            }
            return { success: true, count: addedCount };
        }
        
        return { success: true, count: 0 };
    } catch (error) {
        console.error('[CloudSync] Pull Attendance Failed:', error.message);
        return { success: false, error: error.message };
    }
  },

  // Push Attendance Punch (Local -> Cloud)
  async pushAttendanceToCloud(db, employeeId, type) {
    try {
      const branchId = this.getBranchId(db);
      const emp = db.prepare("SELECT code FROM employees WHERE id = ?").get(employeeId);
      if (!emp || !emp.code) return { success: false, error: 'Employee code not found' };

      const response = await axios.post(`${CLOUD_API_URL}?action=punch`, {
        employeeCode: emp.code,
        type: type.toUpperCase(), // IN or OUT
        branchId: branchId
      }, { timeout: 10000 });

      return response.data;
    } catch (error) {
      console.error('[CloudSync] Push Attendance Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Sync Products (Local -> Cloud)
  async syncProductsToCloud(db) {
    try {
      const branchId = this.getBranchId(db);
      const products = db.prepare('SELECT id, name, category, barcode, stock_quantity, min_stock, price FROM products').all();
      const response = await axios.post(`${CLOUD_API_URL}?action=sync_products`, {
        products,
        branchId: branchId
      }, { timeout: 15000 });
      return response.data;
    } catch (error) {
      console.error('[CloudSync] Sync Products Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Sync Recent Sales (Local -> Cloud)
  async syncSalesToCloud(db) {
    try {
      const branchId = this.getBranchId(db);
      // Sync last 50 sales for dashboard
      const sales = db.prepare(`
        SELECT s.*, u.username as cashier_name 
        FROM sales s 
        LEFT JOIN users u ON s.cashier_id = u.id 
        ORDER BY s.date DESC LIMIT 50
      `).all();

      for (const s of sales) {
        s.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
        s.created_at = s.date; // Map date to created_at for PHP API compatibility
      }

      const response = await axios.post(`${CLOUD_API_URL}?action=sync_sales`, {
        sales,
        branchId: branchId
      }, { timeout: 20000 });
      return response.data;
    } catch (error) {
      console.error('[CloudSync] Sync Sales Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Poll for remote commands (CLOSE_APP, TAKE_BACKUP, DISABLE_APP)
  async pollCommands(db, functions) {
    try {
      const branchId = this.getShopUuid(db); // Use UUID for polling
      const response = await axios.get(`${CLOUD_API_URL}?action=get_commands&branchId=${encodeURIComponent(branchId)}`, { timeout: 10000 });
      if (response.data.success && response.data.commands.length > 0) {
        for (const cmd of response.data.commands) {
          console.log(`[CloudSync] Executing remote command for ${branchId}:`, cmd.command);
          if (cmd.command === 'CLOSE_APP') {
            if (functions && functions.quit) functions.quit();
          } else if (cmd.command === 'TAKE_BACKUP' || cmd.command === 'BACKUP') {
            if (functions && functions.backup) {
              // Remote backup: 1. Silent Backup -> 2. Upload to Cloud
              try {
                const res = await functions.backup(db);
                if (res.success && res.path) {
                  console.log('[CloudSync] Remote backup created silenty. Uploading...');
                  await this.uploadBackupToCloud(db, res.path);
                  const fs = require('fs');
                  if (fs.existsSync(res.path)) fs.unlinkSync(res.path); // Clean up temp file
                }
              } catch (e) {
                console.error('[CloudSync] Remote backup process failed:', e.message);
              }
            }
          } else if (cmd.command === 'DISABLE_APP') {
            console.error('[CloudSync] REMOTE KILL SWITCH ACTIVATED');
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_system_blocked', 'true')").run();
            if (functions && functions.disable) functions.disable();
          } else if (cmd.command === 'ENABLE_APP') {
            console.log('[CloudSync] REMOTE UNLOCK ACTIVATED');
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_system_blocked', 'false')").run();
            if (functions && functions.enable) functions.enable();
          } else if (cmd.command === 'SYNC_DATA') {
            console.log('[CloudSync] Force Sync started via Hub...');
            this.syncEmployeesToCloud(db).catch(console.error);
            this.syncProductsToCloud(db).catch(console.error);
            this.syncSalesToCloud(db).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error('[CloudSync] Poll Commands Failed:', error.message);
    }
  },

  async uploadBackupToCloud(db, filePath) {
    try {
      const fs = require('fs');
      const FormData = require('form-data');
      const branchId = this.getShopUuid(db);
      const form = new FormData();
      form.append('backup_file', fs.createReadStream(filePath));
      form.append('branchId', branchId);

      const response = await axios.post(`${CLOUD_API_URL}?action=upload_backup`, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 600000 // 10 minutes
      });
      console.log('[CloudSync] Backup uploaded to cloud:', response.data.filename);
      return response.data;
    } catch (error) {
      console.error('[CloudSync] Backup Upload Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Check for software updates from Cloud
  async checkForUpdates(currentVersion) {
    try {
      const response = await axios.get(`${CLOUD_API_URL}?action=get_latest_update`, { timeout: 5000 });
      if (response.data.success && response.data.latest) {
        const latest = response.data.latest;
        // Simple version comparison (string match or could be semver)
        if (latest.version !== currentVersion) {
            return { updateAvailable: true, ...latest };
        }
      }
      return { updateAvailable: false };
    } catch (error) {
      console.error('[CloudSync] Check Updates Failed:', error.message);
      return { updateAvailable: false, error: error.message };
    }
  }
};

export default cloudSync;
