/**
 * System Service - Handles settings, machine info, and general app state
 */;
import { networkInterfaces } from 'os'
import QRCode from 'qrcode'

export const systemService = {
  async getSettings(db) {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    rows.forEach(row => { settings[row.key] = row.value })
    return settings
  },
  
  async getTrialStatus(db) {
    const settings = await this.getSettings(db)
    
    // Check if permanently activated
    if (settings.is_activated === 'true') {
      return { isTrial: false, expired: false, activated: true }
    }

    const installedAt = settings.installed_at
    const lastRunAt = settings.last_run_at
    const currentDate = new Date()
    
    // Anti-Tamper Check: If user winds back the clock
    if (lastRunAt && currentDate < new Date(lastRunAt)) {
      return { 
        isTrial: true, 
        expired: true, 
        tampered: true, 
        message: '🚨 تم اكتشاف تلاعب في تاريخ النظام. يرجى ضبط الساعة.' 
      }
    }

    // Update last run at only if it's progressing forward
    if (!lastRunAt || currentDate > new Date(lastRunAt)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('last_run_at', currentDate.toISOString())
    }
    
    if (!installedAt) {
      const now = currentDate.toISOString()
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('installed_at', now)
      return { isTrial: true, daysRemaining: 7, expired: false }
    }
    
    const installDate = new Date(installedAt)
    const diffTime = Math.abs(currentDate - installDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.max(0, 7 - diffDays)
    
    return {
      isTrial: true,
      daysRemaining,
      expired: diffDays > 7,
      installDate: installedAt,
      activated: false,
      tampered: false
    }
  },

  async activateFullVersion(db) {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    update.run('is_activated', 'true')
    return { success: true }
  },

  async updateSettings(db, config) {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    Object.entries(config).forEach(([key, value]) => {
      update.run(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    })
    return { success: true }
  },

  async getMachineId() {
    // Simple implementation, in a real app would use something like 'node-machine-id'
    // or a persistent file. For now, using a combination of hostname and MAC.
    const nets = networkInterfaces()
    let mac = ''
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (!net.internal) {
          mac = net.mac; break
        }
      }
      if (mac) break
    }
    return mac || 'fallback-id-123'
  },

  async getQrConfig() {
    const nets = networkInterfaces()
    let ip = 'localhost'
    
    // Priority: 1. WiFi/Ethernet (192.168.x.x)  2. Any IPv4  3. localhost
    const candidates = []

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          candidates.push({ name, address: net.address })
        }
      }
    }

    // Try to find a standard local IP (192.168...)
    const preferred = candidates.find(c => c.address.startsWith('192.168.'))
    if (preferred) ip = preferred.address
    else if (candidates.length > 0) ip = candidates[0].address

    const port = 5001
    const branchId = 'MAIN_BRANCH'
    const tunnelUrl = global.tunnelUrl || null
    
    // Generate the QR data
    // We encode the local server address so the mobile app knows where to send the punch
    const qrText = JSON.stringify({
      action: 'punch',
      ip,
      port,
      branchId,
      endpoint: tunnelUrl ? `${tunnelUrl}/api/attendance/punch` : `http://${ip}:${port}/api/attendance/punch`
    })

    try {
      const qrDataUrl = await QRCode.toDataURL(qrText)
      return { ip, port, branchId, qrDataUrl, tunnelUrl }
    } catch (err) {
      console.error('QR Generation Failed:', err)
      return { ip, port, branchId, qrDataUrl: null, error: true, tunnelUrl }
    }
  }
}
