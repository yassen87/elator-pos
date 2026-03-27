const electron = require('electron')
console.log('Electron module keys:', Object.keys(electron))
const { app } = electron
console.log('App object:', app)
if (app) {
  console.log('App is defined. whenReady exists:', typeof app.whenReady)
  app.whenReady().then(() => {
    console.log('Ready!')
    process.exit(0)
  })
} else {
  console.log('App is UNDEFINED')
  process.exit(1)
}
