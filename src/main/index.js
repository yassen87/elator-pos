import { shell, BrowserWindow, ipcMain, nativeImage, dialog, app as electronApp } from 'electron'
import { join } from 'path'
import fs from 'fs'
import 'dotenv/config'
import icon from '../../resources/icon.png?asset'
import getDB, { initDB } from './db'
import { setupIpcHandlers } from './ipcHandlers'
import { whatsappBot } from './services/whatsappBot'
import { startAPIServer, stopAPIServer } from './apiServer'

// --- EARLY LOGGING SYSTEM ---
let logPath = ''
try {
  // Use environment variables for early pathing if app.getPath isn't ready
  const userData = process.env.APPDATA ? join(process.env.APPDATA, 'ElatorPerfume') : ''
  if (userData) {
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true })
    logPath = join(userData, 'early_startup.log')
  }
} catch (e) {}

const log = (msg) => {
  const time = new Date().toISOString()
  const content = `[${time}] ${msg}\n`
  console.log(content.trim())
  if (logPath) {
    try { fs.appendFileSync(logPath, content) } catch (e) {}
  }
}

log('>>> MAIN PROCESS STARTING <<<')

// CRITICAL: Catch errors during early startup
process.on('uncaughtException', (error) => {
  log(`[CRITICAL] Uncaught Exception: ${error?.stack || error}`)
  try {
    if (electronApp && (electronApp.isReady() || electronApp.isPackaged)) {
      dialog.showErrorBox('خطأ في تشغيل البرنامج', `حدث خطأ غير متوقع:\n${error?.message || error}\n\nيرجى تصوير هذا الخطأ وإرساله للدعم.`)
    }
  } catch (e) {
    log(`[CRITICAL] Failed to show error box: ${e.message}`)
  }
})

process.on('unhandledRejection', (reason) => {
  log(`[CRITICAL] Unhandled Rejection: ${reason?.stack || reason}`)
})

function createWindow() {
  const db = getDB()
  let windowIcon = icon

  try {
    const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('shop_logo')
    if (settings && settings.value) {
      windowIcon = nativeImage.createFromDataURL(settings.value)
    }
  } catch (e) {
    log(`Failed to load shop logo: ${e.message}`)
  }

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'سيستم محل عطور',
    autoHideMenuBar: true,
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!electronApp.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

electronApp.whenReady().then(async () => {
  logPath = join(electronApp.getPath('userData'), 'debug.log')
  log(`--- App Ready (${electronApp.isPackaged ? 'Packaged' : 'Dev'}) ---`)

  electronApp.setAppUserModelId('com.perfumeshop.system')

  log('Initializing DB...')
  initDB()
  
  log('Setting up IPC Handlers...')
  setupIpcHandlers()
  
  log('Starting API Server...')
  try {
    startAPIServer()
    log('API Server Started.')
  } catch (e) {
    log(`CRITICAL: API Server failed to start: ${e.message}`)
  }

  log('Creating main window...')
  const db = getDB()
  
  // Registration and Kill Switch Check (Awaited to allow real-time UNLOCK)
  try {
    const { default: cloudSync } = await import('./services/cloudSync')
    const res = await cloudSync.registerWithHub(db)
    
    // ONLY update local database with Hub's response if registration succeeded
    if (res && res.success) {
      const newState = res.is_disabled ? 'true' : 'false'
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_system_blocked', ?)").run(newState)
      
      if (res.is_disabled) {
        log('CRITICAL: Shop is disabled via Hub.')
      } else {
        log('Hub Status: Active (Unlocked)')
      }
    } else {
      log('Hub Heartbeat: No authoritative response. Keeping last known security state.')
    }
  } catch (e) {
    log(`Registration/Heartbeat failed (Offline?): ${e.message}`)
  }

  createWindow()
  log('Main window created.')
  
  // Register an IPC to tell the renderer if it's blocked
  ipcMain.handle('cloud:get-block-status', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'is_system_blocked'").get()
    return row && row.value === 'true'
  })

  // Auto-start WhatsApp Bot if session exists
  setTimeout(() => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      log('[Main Init] Auto-starting WhatsApp Bot service...')
      whatsappBot.initialize(wins[0].webContents).then(() => {
        log('[Main Init] WhatsApp Bot initialization complete.')
      }).catch(err => {
        log(`[Main Init] WhatsApp Bot FAILURE: ${err.message}`)
      })
    }
  }, 5000)

  // Auto-updater logic
  if (electronApp.isPackaged) {
    ;(async () => {
      try {
        const { autoUpdater } = await import('electron-updater')
        const broadcast = (channel, ...args) => {
          BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) win.webContents.send(channel, ...args)
          })
        }
        autoUpdater.on('error', (err) => log(`[AutoUpdater] Error: ${err.message}`))
        autoUpdater.checkForUpdatesAndNotify().catch(e => log(`[AutoUpdater] Check failed: ${e.message}`))
      } catch (err) {
        log(`[AutoUpdater] Setup failed: ${err.message}`)
      }
    })()
  }
}).catch(err => {
  log(`[FATAL] app.whenReady failed: ${err.stack || err}`)
  dialog.showErrorBox('خطأ فادح', `فشل في بدء البرنامج:\n${err.message}`)
})

electronApp.on('window-all-closed', () => {
  stopAPIServer()
  if (process.platform !== 'darwin') {
    electronApp.quit()
  }
})

electronApp.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
