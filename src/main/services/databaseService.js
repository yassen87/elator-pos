import { dialog, app as electronApp } from 'electron'
import fs from 'fs'
import path from 'path'
import { closeDB } from '../db'

export const databaseService = {
  async clearDatabase(db) {
    const tables = [
      'sales', 'sale_items', 'returns', 'return_items', 
      'expenses', 'suppliers', 'supplier_purchases', 'supplier_purchase_items',
      'employees', 'attendance', 'salary_payments', 'products', 'formulas', 'formula_items',
      'biometric_settings'
    ]
    // Disable foreign keys temporarily
    db.pragma('foreign_keys = OFF')

    db.transaction(() => {
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
          db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
        } catch (e) {
          console.warn(`[DB-CLEAR] Could not clear table ${table}:`, e.message)
        }
      }
    })()

    // Re-enable foreign keys
    db.pragma('foreign_keys = ON')
    return { success: true }
  },

  async createBackup(db) {
    const dbPath = db.name
    const { filePath } = await dialog.showSaveDialog({
      title: 'حفظ نسخة احتياطية',
      defaultPath: path.join(electronApp.getPath('desktop'), `backup_${new Date().toISOString().split('T')[0]}.sqlite`),
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
    })

    if (!filePath) return { success: false }

    try {
      // Use SQLite backup API if possible, or just copy file
      // SQLite WAL mode might need checkpointing before copy
      db.pragma('wal_checkpoint(FULL)')
      fs.copyFileSync(dbPath, filePath)
      return { success: true, path: filePath }
    } catch (err) {
      console.error('Backup failed:', err)
      return { success: false, error: err.message }
    }
  },

  async createSilentBackup(db) {
    const dbPath = db.name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempPath = path.join(electronApp.getPath('temp'), `hub_backup_${timestamp}.sqlite`)

    try {
      db.pragma('wal_checkpoint(FULL)')
      fs.copyFileSync(dbPath, tempPath)
      return { success: true, path: tempPath }
    } catch (err) {
      console.error('[DB-SILENT-BACKUP] Failed:', err)
      return { success: false, error: err.message }
    }
  },

  async restoreBackup(db) {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'اختر نسخة احتياطية للاسترجاع',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      properties: ['openFile']
    })

    if (!filePaths || filePaths.length === 0) return { success: false }

    const backupPath = filePaths[0]
    const dbPath = db.name
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`

    try {
      closeDB() // Safely close and null the global connection
      
      // Wait a bit for file handles to release (Windows)
      await new Promise(resolve => setTimeout(resolve, 800))

      // CRITICAL: In WAL mode, we MUST remove existing -wal and -shm files 
      if (fs.existsSync(walPath)) {
        try {
          fs.unlinkSync(walPath)
        } catch (e) {
          console.warn('[Restore] Could not unlink WAL file:', e.message)
        }
      }
      if (fs.existsSync(shmPath)) {
        try {
          fs.unlinkSync(shmPath)
        } catch (e) {
          console.warn('[Restore] Could not unlink SHM file:', e.message)
        }
      }
      
      fs.copyFileSync(backupPath, dbPath)
      
      console.log('[Restore] Success. Relaunching...')
      electronApp.relaunch()
      electronApp.exit(0)
      return { success: true }
    } catch (err) {
      console.error('Restore failed:', err)
      // If we closed the DB but failed to copy, the app is in a bad state.
      // We should relaunch anyway to try and recover the old DB.
      return { success: false, error: 'فشل استبدال الملف: ' + (err.code === 'EBUSY' ? 'قاعدة البيانات قيد الاستخدام. يرجى إغلاق البرنامج والتحميل مرة أخرى.' : err.message) }
    }
  }
}
