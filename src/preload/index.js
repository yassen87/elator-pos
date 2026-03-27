import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getProducts: (options) => ipcRenderer.invoke('products:list', options),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  updateProductStock: (data) => ipcRenderer.invoke('products:update-stock', data),
  findProductByBarcode: (barcode) => ipcRenderer.invoke('products:find-by-barcode', barcode),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  importExcel: () => ipcRenderer.invoke('products:import-excel'),
  downloadExcelTemplate: () => ipcRenderer.invoke('products:download-template'),
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
  getAttendanceAll: () => ipcRenderer.invoke('attendance:get-all'),
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
  getCustomersList: () => ipcRenderer.invoke('customers:list'),
  getBestSellingProducts: () => ipcRenderer.invoke('reports:best-selling'),
  getCustomerTopProducts: () => ipcRenderer.invoke('customers:top-products'),
  findSaleById: (id) => ipcRenderer.invoke('sales:find-by-id', id),
  findSalesByCustomer: (name) => ipcRenderer.invoke('sales:find-by-customer', name),
  addReturn: (returnData) => ipcRenderer.invoke('returns:add', returnData),
  getReturns: (params) => ipcRenderer.invoke('returns:list', params || {}),
  getCustomerPurchaseHistory: (params) => ipcRenderer.invoke('customers:purchase-history', params),
  deleteSale: (id) => ipcRenderer.invoke('sales:delete', id),
  getNextInvoiceCode: () => ipcRenderer.invoke('sales:get-next-code'),
  getNextCustomerInvoiceCode: (phone) => ipcRenderer.invoke('sales:get-next-customer-code', phone),
  updateSale: (sale) => ipcRenderer.invoke('sales:update', sale),
  onSalesUpdated: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('sales-updated', listener)
    return () => ipcRenderer.removeListener('sales-updated', listener)
  },
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateChecking: (callback) => {
    const listener = (event, info) => callback(info)
    ipcRenderer.on('update-checking', listener)
    return () => ipcRenderer.removeListener('update-checking', listener)
  },
  onUpdateAvailable: (callback) => {
    const listener = (event, info) => callback(info)
    ipcRenderer.on('update-available', listener)
    return () => ipcRenderer.removeListener('update-available', listener)
  },
  onUpdateNotAvailable: (callback) => {
    const listener = (event, info) => callback(info)
    ipcRenderer.on('update-not-available', listener)
    return () => ipcRenderer.removeListener('update-not-available', listener)
  },
  onUpdateError: (callback) => {
    const listener = (event, err) => callback(err)
    ipcRenderer.on('update-error', listener)
    return () => ipcRenderer.removeListener('update-error', listener)
  },
  onUpdateProgress: (callback) => {
    const listener = (event, p) => callback(p)
    ipcRenderer.on('update-progress', listener)
    return () => ipcRenderer.removeListener('update-progress', listener)
  },
  onUpdateDownloaded: (callback) => {
    const listener = (event, info) => callback(info)
    ipcRenderer.on('update-downloaded', listener)
    return () => ipcRenderer.removeListener('update-downloaded', listener)
  },
  getSuperUsersList: () => ipcRenderer.invoke('super:users-list'),
  syncAll: () => ipcRenderer.invoke('sync:all'),
  exportSqlBackup: () => ipcRenderer.invoke('system:export-sql'),
  sendWhatsApp: (params) => ipcRenderer.invoke('sales:whatsapp', params),
  initWhatsApp: () => ipcRenderer.invoke('whatsapp:init'),
  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:get-status'),
  toggleWhatsApp: (enabled) => ipcRenderer.invoke('whatsapp:toggle', { enabled }),
  logoutWhatsApp: () => ipcRenderer.invoke('whatsapp:logout'),
  deleteWhatsAppSession: () => ipcRenderer.invoke('whatsapp:delete-session'),
  onWhatsAppStatus: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('whatsapp:status', listener)
    return () => ipcRenderer.removeListener('whatsapp:status', listener)
  },
  syncCloudAll: () => ipcRenderer.invoke('cloud:sync-all'),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
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
