// zain-frontend-react/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Package, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [orders, setOrders] = useState([]);
    const user = JSON.parse(localStorage.getItem('zain_user') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user.id) { navigate('/login'); return; }
        api.get(`/api/user_orders.php?user_id=${user.id}`)
            .then(res => setOrders(res.data.orders))
            .catch(err => console.error(err));
    }, [user.id, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('zain_user');
        navigate('/login');
    };

    return (
        <div className="container" style={{ padding: '80px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
                <div>
                    <p style={{ textTransform: 'uppercase', fontSize: '12px', color: '#999', letterSpacing: '1px', marginBottom: '8px' }}>Personal Dashboard</p>
                    <h1 style={{ fontSize: '3rem', fontWeight: 600 }}>Hello, {user.name}</h1>
                </div>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#882222', fontSize: '13px', fontWeight: 600 }}>
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '60px' }}>
                {/* Sidebar */}
                <div style={{ borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#111', fontWeight: 600, padding: '15px 0' }}>
                        <Package size={20} strokeWidth={1.5} /> Your Orders
                    </div>
                </div>

                {/* Orders Content */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: 600 }}>Order History</h2>
                    {orders.length === 0 ? (
                        <div style={{ background: '#fbfbfb', padding: '40px', textAlign: 'center' }}>
                            <p style={{ color: '#999' }}>You haven't made any purchases yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {orders.map(order => (
                                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px', border: '1px solid #f5f5f5', borderRadius: '4px' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase' }}>Order #{order.id}</p>
                                        <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '5px' }}>Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '16px', fontWeight: 700 }}>{order.final_amount} EGP</p>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            textTransform: 'uppercase', 
                                            background: '#f8f8f8', 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            marginTop: '8px', 
                                            display: 'inline-block' 
                                        }}>{order.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
