
const { networkInterfaces } = require('os');
const QRCode = require('qrcode');

async function testQr() {
    console.log('Testing QR generation...');
    const nets = networkInterfaces();
    let ip = 'localhost';
    const candidates = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                candidates.push({ name, address: net.address });
            }
        }
    }
    const preferred = candidates.find(c => c.address.startsWith('192.168.'));
    if (preferred) ip = preferred.address;
    else if (candidates.length > 0) ip = candidates[0].address;

    console.log('Detected IP:', ip);
    
    const qrText = JSON.stringify({
        ip,
        port: 5001,
        branchId: 'MAIN_BRANCH',
        endpoint: `http://${ip}:5001/api/attendance/punch`
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(qrText);
        console.log('QR Generated Successfully! Data URL length:', qrDataUrl.length);
        console.log('Starts with:', qrDataUrl.substring(0, 50));
    } catch (err) {
        console.error('QR Generation Failed:', err);
    }
}

testQr();
