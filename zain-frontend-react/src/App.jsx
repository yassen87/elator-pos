// zain-frontend-react/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminOffers from './pages/AdminOffers';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from './context/CartContext';
import api from './api';

function App() {
  const [offer, setOffer] = useState("");

  useEffect(() => {
    api.get('/api/offers.php')
      .then(res => setOffer(res.data.offer))
      .catch(err => console.error(err));
  }, []);

  return (
    <CartProvider>
      <Router>
        <ScrollToTop />
        {offer && (
          <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '10px 0', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
            {offer}
          </div>
        )}
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:type/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminOrders />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
