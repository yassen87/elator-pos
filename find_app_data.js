const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// This needs to be run in an electron context or we just guess
console.log('User Data Path:', process.env.APPDATA);
// List all folders in APPDATA to find the right one
const folders = fs.readdirSync(process.env.APPDATA);
const matches = folders.filter(f => f.toLowerCase().includes('elator') || f.toLowerCase().includes('perfume'));
console.log('Potential App Folders:', matches);

matches.forEach(m => {
    const p = path.join(process.env.APPDATA, m, 'uploads');
    if (fs.existsSync(p)) {
        console.log(`Found uploads in: ${p}`);
        console.log(fs.readdirSync(p));
    }
});
