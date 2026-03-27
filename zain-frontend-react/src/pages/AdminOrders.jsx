// zain-frontend-react/src/pages/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { CheckCircle, Clock, Package, XCircle } from 'lucide-react';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        api.get('/api/admin_orders.php') // Need to create this endpoint
            .then(res => setOrders(res.data.orders))
            .catch(err => console.error(err));
    }, []);

    const updateStatus = async (id, status) => {
        try {
            const res = await api.post('/api/update_order_status.php', { id, status });
            if (res.data.success) {
                setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="container" style={{ padding: '60px 0' }}>
            <h1 className="serif" style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Order Management</h1>
            
            <div style={{ display: 'grid', gap: '20px' }}>
                {orders.map(order => (
                    <div key={order.id} style={{ background: '#fff', border: '1px solid #f0f0f0', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 className="serif">Order #{order.id}</h3>
                                <p style={{ fontSize: '12px', color: '#999' }}>{order.created_at}</p>
                            </div>
                            <span style={{ 
                                padding: '5px 15px', 
                                borderRadius: '20px', 
                                fontSize: '12px', 
                                fontWeight: 600,
                                background: order.status === 'delivered' ? '#d4edda' : (order.status === 'pending' ? '#f8f9fa' : '#fff3cd'),
                                color: order.status === 'delivered' ? '#155724' : (order.status === 'pending' ? '#333' : '#856404')
                            }}>
                                {order.status.toUpperCase()}
                            </span>
                        </div>

                        <div style={{ marginBottom: '20px', fontSize: '14px' }}>
                            <p><strong>Customer ID:</strong> {order.user_id}</p>
                            <p><strong>Address:</strong> {order.shipping_address}</p>
                            <p><strong>Total:</strong> {order.final_amount} EGP</p>
                        </div>

                        {order.deposit_image && (
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontSize: '12px', marginBottom: '5px' }}>Deposit Screenshot:</p>
                                <a href={`http://localhost/zain-perfumes-php/${order.deposit_image}`} target="_blank" rel="noreferrer">
                                    <img src={`http://localhost/zain-perfumes-php/${order.deposit_image}`} alt="deposit" style={{ maxWidth: '200px', borderRadius: '4px' }} />
                                </a>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => updateStatus(order.id, 'processing')} className="btn" style={{ fontSize: '11px', padding: '8px 15px' }}>Mark Processing</button>
                            <button onClick={() => updateStatus(order.id, 'delivered')} className="btn btn-black" style={{ fontSize: '11px', padding: '8px 15px' }}>Mark Delivered</button>
                            <button onClick={() => updateStatus(order.id, 'cancelled')} className="btn" style={{ fontSize: '11px', padding: '8px 15px', borderColor: '#ff4444', color: '#ff4444' }}>Cancel</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminOrders;
