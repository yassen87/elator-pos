// Simple stub for background sync manager to keep the app running
// without implementing full queue-based background synchronization.

let running = false

export function startSyncManager() {
  if (running) {
    console.log('[SyncManager] Already running (stub).')
    return
  }
  running = true
  console.log('[SyncManager] startSyncManager (stub) – no background sync is configured.')
}

