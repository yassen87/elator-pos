const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function debug() {
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  console.log('Checking DB at:', dbPath);
  
  if (!fs.existsSync(dbPath)) {
    console.error('DB file not found!');
    return;
  }

  const db = new Database(dbPath);
  
  try {
    const products = db.prepare('SELECT * FROM website_products').all();
    console.log('Total website products:', products.length);
    console.log('Active website products:', products.filter(p => p.is_active === 1).length);
    console.table(products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        is_active: p.is_active,
        image: p.image_url ? 'Yes' : 'No'
    })));

    const categories = db.prepare('SELECT DISTINCT category FROM website_products').all();
    console.log('Categories:', categories);

  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    db.close();
  }
  
  // Try to ping the API server
  const http = require('http');
  const ping = (url) => new Promise((resolve) => {
    http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => resolve({ error: err.message }));
  });

  console.log('\nPinging API server at port 5001...');
  const result = await ping('http://localhost:5001/api/store/products');
  console.log('Result:', JSON.stringify(result, null, 2));
}

debug();
