// Lightweight stub implementation for sync service to avoid build/runtime errors
// Real cloud sync logic can be wired here later if needed.

/**
 * Initialize sync service.
 * Currently just logs parameters without performing any external calls.
 */
export function initSyncService(apiUrl, token, userId) {
  console.log('[SyncService] initSyncService (stub):', {
    apiUrl,
    tokenPresent: !!token,
    userId,
  })
}

/**
 * Sync a single sale to cloud.
 * Stub: logs and returns a resolved promise.
 */
export async function syncSale(sale, items) {
  console.log('[SyncService] syncSale (stub) called', {
    saleId: sale?.id,
    invoice_code: sale?.invoice_code,
    itemsCount: Array.isArray(items) ? items.length : 0,
  })
  return { success: true, message: 'Sync stubbed (no cloud sync configured).' }
}

/**
 * Sync product stock quantity to cloud.
 * Stub: logs and returns a resolved promise.
 */
export async function syncProductStock(productId, stockQuantity) {
  console.log('[SyncService] syncProductStock (stub) called', {
    productId,
    stockQuantity,
  })
  return { success: true, message: 'Product stock sync stubbed.' }
}

/**
 * Perform full data sync (products, sales, users, sale_items).
 * Stub: logs summary and returns a success result.
 */
export async function syncAllData(products, sales, users, saleItems) {
  console.log('[SyncService] syncAllData (stub) called', {
    products: Array.isArray(products) ? products.length : 0,
    sales: Array.isArray(sales) ? sales.length : 0,
    users: Array.isArray(users) ? users.length : 0,
    saleItems: Array.isArray(saleItems) ? saleItems.length : 0,
  })
  return { success: true, message: 'Full data sync stubbed.' }
}

