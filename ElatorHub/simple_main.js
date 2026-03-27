const { app } = require('electron')
console.log('Type of electron:', typeof require('electron'))
console.log('App:', app)
if (app) {
  console.log('SUCCESS: App is defined')
  app.quit()
} else {
  console.log('FAILURE: App is undefined')
  process.exit(1)
}
