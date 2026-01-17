import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getProducts: () => ipcRenderer.invoke('products:list'),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  getFormulas: () => ipcRenderer.invoke('formulas:list'),
  addFormula: (formula) => ipcRenderer.invoke('formulas:add', formula),
  deleteFormula: (id) => ipcRenderer.invoke('formulas:delete', id),
  getCashiers: () => ipcRenderer.invoke('cashiers:list'),
  addCashier: (cashier) => ipcRenderer.invoke('cashiers:add', cashier),
  deleteCashier: (id) => ipcRenderer.invoke('cashiers:delete', id),
  addSale: (sale) => ipcRenderer.invoke('sales:add', sale),
  getSalesReport: (date) => ipcRenderer.invoke('sales:report', date),
  exportSalesReport: (data) => ipcRenderer.invoke('sales:export', data),
  getCustomers: () => ipcRenderer.invoke('sales:customers'),
  getEmployees: () => ipcRenderer.invoke('employees:list'),
  addEmployee: (emp) => ipcRenderer.invoke('employees:add', emp),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),
  processAttendance: () => ipcRenderer.invoke('attendance:process-excel'),
  saveAttendance: (records) => ipcRenderer.invoke('attendance:save', records),
  getAttendance: (date) => ipcRenderer.invoke('attendance:list', date),
  getBiometricSettings: () => ipcRenderer.invoke('biometric:get-settings'),
  saveBiometricSettings: (settings) => ipcRenderer.invoke('biometric:save-settings', settings),
  syncBiometric: () => ipcRenderer.invoke('biometric:sync'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (config) => ipcRenderer.invoke('settings:update', config),
  openDatabaseFolder: () => ipcRenderer.invoke('settings:open-db-folder'),
  clearAllData: () => ipcRenderer.invoke('database:clear'),
  createBackup: () => ipcRenderer.invoke('database:backup'),
  restoreBackup: () => ipcRenderer.invoke('database:restore'),
  getSalesHistory: (params) => ipcRenderer.invoke('sales:history', params || {}),
  selectLogo: () => ipcRenderer.invoke('settings:select-logo'),
  selectQrImage: () => ipcRenderer.invoke('settings:select-qr-image'),
  updateUserPassword: (data) => ipcRenderer.invoke('users:update-password', data),
  updateProductStock: (data) => ipcRenderer.invoke('products:update-stock', data),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  getCustomersList: () => ipcRenderer.invoke('customers:list'),
  getBestSellingProducts: () => ipcRenderer.invoke('reports:best-selling'),
  getCustomerTopProducts: () => ipcRenderer.invoke('customers:top-products'),
  findSaleById: (id) => ipcRenderer.invoke('sales:find-by-id', id),
  addReturn: (returnData) => ipcRenderer.invoke('returns:add', returnData),
  getReturns: (params) => ipcRenderer.invoke('returns:list', params || {}),
  getCustomerPurchaseHistory: (params) => ipcRenderer.invoke('customers:purchase-history', params),
  deleteSale: (id) => ipcRenderer.invoke('sales:delete', id),
  getNextInvoiceCode: () => ipcRenderer.invoke('sales:get-next-code'),
  updateSale: (sale) => ipcRenderer.invoke('sales:update', sale),
  onSalesUpdated: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('sales-updated', listener)
    return () => ipcRenderer.removeListener('sales-updated', listener)
  },
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (e, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (e, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (e, err) => callback(err)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (e, p) => callback(p)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (e, info) => callback(info)),
  getSuperUsersList: () => ipcRenderer.invoke('super:users-list'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
