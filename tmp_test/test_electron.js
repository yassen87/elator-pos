console.log('--- Debugging Electron ---');
console.log('Process argv:', process.argv);
console.log('Electron version (process.versions.electron):', process.versions.electron);
const electron = require('electron');
console.log('Type of require("electron"):', typeof electron);
console.log('Value of require("electron"):', electron);
if (typeof electron === 'object' && electron !== null) {
  console.log('App object:', electron.app ? 'Found' : 'Undefined');
}
process.exit(0);
