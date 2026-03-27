try {
  const electronMain = require('electron/main');
  console.log('require("electron/main") type:', typeof electronMain);
  console.log('require("electron/main") value:', electronMain);
} catch (e) {
  console.log('require("electron/main") failed:', e.message);
}
process.exit(0);
