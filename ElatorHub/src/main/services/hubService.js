import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

const CLOUD_API_URL = 'https://elator-pos.veila.shop/api.php'

// Hub's own database for local settings and users
const HUB_DB_PATH = join(app.getPath('userData'), 'hub.sqlite')
let db = null

function initHubDB() {
  try {
    db = new Database(HUB_DB_PATH)
    db.exec(`
      CREATE TABLE IF NOT EXISTS hub_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin'
      );
      
      -- Add default admin if not exists
      INSERT OR IGNORE INTO hub_users (username, password, role) 
      VALUES ('admin', 'admin', 'super_admin');
    `)
    console.log('[HubService] Database initialized at:', HUB_DB_PATH)
    return true
  } catch (error) {
    console.error('[HubService] Database init failed:', error.message)
    return false
  }
}

export const hubService = {
  // --- Cloud Actions ---
  async getCloudStats() {
    try {
      const response = await axios.get(`${CLOUD_API_URL}?action=get_hub_stats`, { timeout: 60000 })
      return response.data
    } catch (error) {
      console.error('[HubService] Cloud Stats Failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  async sendRemoteCommand(branchId, command) {
    try {
      const response = await axios.post(`${CLOUD_API_URL}?action=send_command`, {
        branchId,
        command
      }, { timeout: 60000 })
      return response.data
    } catch (error) {
      console.error('[HubService] Send Command Failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  // Upload Update Binary to Cloud
  async uploadUpdate(filePath, version, notes, targetBranch = 'ALL') {
    try {
      const form = new FormData()
      form.append('update_file', fs.createReadStream(filePath))
      form.append('version', version)
      form.append('notes', notes)
      form.append('target_branch', targetBranch)

      const response = await axios.post(`${CLOUD_API_URL}?action=upload_update`, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 1800000 // 30 minutes
      })
      return response.data
    } catch (error) {
      console.error('[HubService] Upload Update Failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  async getLatestUpdate() {
    try {
      const response = await axios.get(`${CLOUD_API_URL}?action=get_latest_update&branchId=HUB`, { timeout: 60000 })
      return response.data
    } catch (error) {
      console.error('[HubService] Get Latest Update Failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  // Trigger Manual Sync for a specific branch
  async triggerHubSync(branchId) {
    try {
      const response = await axios.post(`${CLOUD_API_URL}?action=send_command`, {
        branchId: branchId,
        command: 'SYNC_DATA'
      }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('[HubService] Trigger Hub Sync Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Trigger Master Sync (All branches)
  async masterSync() {
    try {
      const response = await axios.post(`${CLOUD_API_URL}?action=master_sync`, {}, { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('[HubService] Master Sync Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getBackups(branchId = 'ALL') {
    try {
      const response = await axios.get(`${CLOUD_API_URL}?action=get_backups&branchId=${branchId}`, { timeout: 30000 });
      return response.data;
    } catch (error) {
      console.error('[HubService] Get Backups Failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // --- User Management (Local Hub DB) ---
  getUsers() {
    if (!db) initHubDB()
    return db.prepare('SELECT id, username, role FROM hub_users').all()
  },

  addUser(data) {
    if (!db) initHubDB()
    try {
      const stmt = db.prepare('INSERT INTO hub_users (username, password, role) VALUES (?, ?, ?)')
      const info = stmt.run(data.username, data.password, data.role)
      return { success: true, id: info.lastInsertRowid }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateUser(data) {
    if (!db) initHubDB()
    try {
      let query = 'UPDATE hub_users SET username = ?, role = ?'
      const params = [data.username, data.role]
      
      if (data.password) {
        query += ', password = ?'
        params.push(data.password)
      }
      
      query += ' WHERE id = ?'
      params.push(data.id)
      
      db.prepare(query).run(...params)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  deleteUser(id) {
    if (!db) initHubDB()
    try {
      db.prepare('DELETE FROM hub_users WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
