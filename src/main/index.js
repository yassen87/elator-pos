import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { initDB } from './db'
import { setupIpcHandlers } from './ipcHandlers'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'سيستم محل عطور',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  app.setAppUserModelId('com.electron')

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  initDB()
  setupIpcHandlers()

  createWindow()

  // Auto-updater logic
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('checking-for-update', () => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-checking')
  })
  autoUpdater.on('update-available', (info) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', (info) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-not-available', info)
  })
  autoUpdater.on('error', (err) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-error', err)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-progress', progressObj)
  })
  autoUpdater.on('update-downloaded', (info) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('update-downloaded', info)
  })

  ipcMain.handle('update:check', () => {
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('update:download', () => {
    return autoUpdater.downloadUpdate()
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
