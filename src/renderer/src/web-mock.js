
if (!window.api) {
  console.log('Environment: Web Standalone - Initializing Zero-Config Cloud Bridge');

  // Detect API base automatically from current origin
  // If running on localhost (dev), default to port 5001
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:5001' : window.location.origin;
  
  const getToken = () => localStorage.getItem('pos_token') || '';

  window.api = {
    // Universal Method for Cloud REST API
    request: async (method, path, body = null) => {
        try {
            const options = {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(`${API_BASE}/api${path}`, options);
            const data = await response.json();
            return data;
        } catch (err) {
            console.error(`Cloud API Error [${path}]:`, err);
            return { success: false, message: 'تعذر الاتصال بالسيرفر السحابي' };
        }
    },

    // Auth
    login: async (creds) => {
        const res = await window.api.request('POST', '/auth/login', creds);
        if (res.success && res.token) {
            localStorage.setItem('pos_token', res.token);
        }
        return res;
    },
    
    // Products
    getProducts: async () => {
        const res = await window.api.request('GET', '/pos/products');
        return res.success ? res.products : [];
    },
    addProduct: async (p) => window.api.request('POST', '/pos/products', p),
    updateProduct: async (p) => window.api.request('PUT', `/pos/products/${p.id}`, p),
    deleteProduct: async (id) => window.api.request('DELETE', `/pos/products/${id}`),

    // Sales
    addSale: async (s) => window.api.request('POST', '/pos/sales', s),
    getSalesHistory: async () => {
        const res = await window.api.request('GET', '/pos/sales');
        return res.success ? res.sales : [];
    },
    getNextInvoiceCode: async () => {
        const res = await window.api.request('GET', '/pos/sales/next-code');
        return res.invoice_code || 'INV-0001';
    },

    // Settings (Can still be partially local or bridge to cloud later)
    getSettings: async () => {
        const res = await window.api.request('GET', '/settings/get');
        return res.success ? res.settings : {};
    },
    updateSettings: async (s) => window.api.request('POST', '/settings/update', s),

    // Dummy stubs for desktop-only features
    onUpdateChecking: () => () => {},
    onUpdateAvailable: () => () => {},
    onUpdateDownloaded: () => () => {},
    getWhatsAppStatus: async () => ({ enabled: false }),
    onSalesUpdated: (cb) => {
        const interval = setInterval(() => { /* Ping for updates if needed */ }, 60000);
        return () => clearInterval(interval);
    },
    invoke: async (channel, ...args) => {
        console.warn(`[CLOUD-MODE] Universal Invoke used for: ${channel}. Redirecting...`);
        // Fallback or mapping for old code still using .invoke
        if (channel === 'products:list') return window.api.getProducts();
        if (channel === 'auth:login') return window.api.login(args[0]);
        return { success: false, message: 'Feature not yet in cloud' };
    }
  };
}
