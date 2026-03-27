// zain-frontend-react/src/pages/AdminOffers.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';

const AdminOffers = () => {
    const [text, setText] = useState("");
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        api.get('/api/offers.php').then(res => {
            setText(res.data.offer || "");
            setIsActive(!!res.data.offer);
        });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/update_offer.php', { text, is_active: isActive });
            alert("Offer updated!");
            window.location.reload();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="container" style={{ padding: '60px 0', maxWidth: '600px' }}>
            <h1 className="serif" style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Banner Management</h1>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label>Offer Text</label>
                <textarea value={text} onChange={e => setText(e.target.value)} style={{ padding: '15px', border: '1px solid #ddd', minHeight: '100px' }} placeholder="e.g. Free shipping on all orders this weekend!" />
                <label>
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Active on site
                </label>
                <button type="submit" className="btn btn-black">Save Banner</button>
            </form>
        </div>
    );
};

export default AdminOffers;
