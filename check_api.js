
const { startAPIServer } = require('./src/main/apiServer.js');
try {
  startAPIServer();
  console.log('API Server started successfully in check script.');
  // Keep alive for a moment to test
  setTimeout(() => process.exit(0), 2000);
} catch (e) {
  console.error('Failed to start API server:', e);
  process.exit(1);
}
