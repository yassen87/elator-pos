// zain-frontend-react/src/pages/Cart.jsx
import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Trash2, ArrowLeft } from 'lucide-react';

const Cart = () => {
    const { cart, removeFromCart } = useCart();
    const total = cart.reduce((acc, item) => acc + item.selectedPrice, 0);

    return (
        <div className="container" style={{ padding: '80px 0', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
                <div>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>
                        <ArrowLeft size={14} /> Back to shop
                    </Link>
                    <h1 style={{ fontSize: '3rem', fontWeight: 600 }}>Your Bag <span style={{ color: '#999', fontWeight: 300, fontSize: '1.5rem' }}>({cart.length})</span></h1>
                </div>
            </div>

            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <p style={{ color: '#888', marginBottom: '30px' }}>Your shopping bag is empty.</p>
                    <Link to="/" className="btn-premium" style={{ background: 'black', color: 'white' }}>Start Exploring</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '80px', alignItems: 'start' }}>
                    {/* Items List */}
                    <div style={{ borderTop: '1px solid #f0f0f0' }}>
                        {cart.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '25px', padding: '40px 0', borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
                                <div style={{ width: '120px', aspectRatio: '3/4', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '8px' }}>{item.brand || 'Premium Scent'}</p>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>{item.name}</h3>
                                    <p style={{ fontSize: '13px', color: '#666' }}>Size: {item.selectedSize}</p>
                                    
                                    <div style={{ marginTop: '20px', fontWeight: 700, fontSize: '16px' }}>{item.selectedPrice} EGP</div>
                                </div>
                                <button onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: 0, top: '40px' }}>
                                    <Trash2 size={18} strokeWidth={1} color="#999" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div style={{ background: '#fbfbfb', padding: '40px', borderRadius: '4px' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: 600 }}>Order Summary</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '1px solid #eee', paddingBottom: '30px', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>Subtotal</span>
                                <span>{total} EGP</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>Shipping</span>
                                <span style={{ color: '#228822' }}>FREE</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700, marginBottom: '40px' }}>
                            <span>Total</span>
                            <span>{total} EGP</span>
                        </div>
                        <Link to="/checkout" className="btn-premium" style={{ width: '100%', display: 'block', textAlign: 'center', background: 'black', color: 'white', borderRadius: 0 }}>Checkout Securely</Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
