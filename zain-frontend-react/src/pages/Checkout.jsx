// zain-frontend-react/src/pages/Checkout.jsx
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';

const Checkout = () => {
    const { cart, clearCart } = useCart();
    const [isPickup, setIsPickup] = useState(false);
    const [address, setAddress] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const total = cart.reduce((acc, item) => acc + item.selectedPrice, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please upload the deposit screenshot");
        setLoading(true);
        const formData = new FormData();
        formData.append('final_total', total);
        formData.append('address', isPickup ? "In-Store Pickup" : address);
        formData.append('is_pickup', isPickup ? '1' : '0');
        formData.append('cart_json', JSON.stringify(cart.map(i => ({ id: i.id, type: i.type, price: i.selectedPrice }))));
        formData.append('deposit_img', file);

        try {
            const res = await api.post('/api/place_order.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                alert("Order Placed! Welcome to Zain Perfumes.");
                clearCart();
                navigate('/dashboard');
            } else alert(res.data.message);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="container" style={{ padding: '80px 0', maxWidth: '1000px' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 600, marginBottom: '60px', textAlign: 'center' }}>Secure Checkout</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '100px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Delivery Mode</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setIsPickup(false)} style={{ flex: 1, padding: '15px', border: '1px solid #000', borderRadius: '4px', background: !isPickup ? '#000' : 'transparent', color: !isPickup ? '#fff' : '#000', cursor: 'pointer', fontWeight: 600 }}>Home Shipping</button>
                            <button type="button" onClick={() => setIsPickup(true)} style={{ flex: 1, padding: '15px', border: '1px solid #000', borderRadius: '4px', background: isPickup ? '#000' : 'transparent', color: isPickup ? '#fff' : '#000', cursor: 'pointer', fontWeight: 600 }}>Store Pickup</button>
                        </div>
                    </div>

                    {!isPickup && (
                        <div style={{ marginBottom: '40px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>2. Shipping Address</h3>
                            <textarea required value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '20px', border: '1.5px solid #eee', borderRadius: '4px', minHeight: '120px', outline: 'none' }} placeholder="Full address details..." />
                        </div>
                    )}

                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>3. Deposit Verification</h3>
                        <div style={{ background: '#fcf8f3', padding: '25px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #882222' }}>
                            <p style={{ fontSize: '14px', lineHeight: 1.6 }}>Transfer <strong>50 EGP</strong> to <span style={{ fontWeight: 700 }}>01012345678</span> via Vodafone Cash, then upload the receipt screenshot below.</p>
                        </div>
                        
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', border: '2px dashed #eee', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                            <UploadCloud size={32} strokeWidth={1} color="#666" style={{ marginBottom: '15px' }} />
                            <span style={{ fontSize: '13px', color: '#666' }}>{file ? file.name : "Click to upload screenshot"}</span>
                            <input type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                        </label>
                    </div>

                    <button type="submit" disabled={loading} className="btn-premium" style={{ width: '100%', background: 'black', color: 'white', height: '60px', borderRadius: 0, fontSize: '16px' }}>{loading ? 'Confirming...' : 'Place My Order'}</button>
                </form>

                {/* Right Panel: Review */}
                <div>
                    <div style={{ background: '#f9f9f9', padding: '40px', position: 'sticky', top: '150px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '30px', fontWeight: 600 }}>Order Review</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {cart.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ flex: 1 }}>{item.name} <span style={{ color: '#999' }}>({item.selectedSize})</span></span>
                                    <span style={{ fontWeight: 600 }}>{item.selectedPrice} EGP</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ height: '1px', background: '#eee', margin: '30px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 800 }}>
                            <span>Total</span>
                            <span>{total} EGP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
