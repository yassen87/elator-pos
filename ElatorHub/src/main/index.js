import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { hubService } from './services/hubService'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
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

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Cloud & Hub Stats
ipcMain.handle('hub:get-stats', () => hubService.getCloudStats())
ipcMain.handle('hub:get-shops', () => hubService.getCloudStats())
ipcMain.handle('hub:send-command', (_, { branchId, command }) => hubService.sendRemoteCommand(branchId, command))
ipcMain.handle('hub:master-sync', () => hubService.masterSync())

// User Management
ipcMain.handle('hub:get-users', () => hubService.getUsers())
ipcMain.handle('hub:add-user', (_, data) => hubService.addUser(data))
ipcMain.handle('hub:update-user', (_, data) => hubService.updateUser(data))
ipcMain.handle('hub:delete-user', (_, id) => hubService.deleteUser(id))

// Updates & Versioning
ipcMain.handle('hub:upload-update', (_, data) => hubService.uploadUpdate(data.filePath, data.version, data.notes, data.targetBranch))
ipcMain.handle('hub:get-latest-update', () => hubService.getLatestUpdate())
ipcMain.handle('hub:get-backups', (_, { branchId }) => hubService.getBackups(branchId))
ipcMain.handle('hub:trigger-sync', (_, { branchId }) => hubService.triggerHubSync(branchId))
ipcMain.handle('hub:master-sync-all', () => hubService.masterSync()) // New handler for master sync
ipcMain.handle('hub:select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Application Packages', extensions: ['exe', 'zip', 'rar', 'msi'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
