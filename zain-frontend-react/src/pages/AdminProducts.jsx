// zain-frontend-react/src/pages/AdminProducts.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';

const AdminProducts = () => {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', price);
        formData.append('stock', stock);
        formData.append('image', file);

        try {
            const res = await api.post('/api/add_product.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                alert("Product added!");
                setName(""); setPrice(""); setStock("");
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="container" style={{ padding: '60px 0', maxWidth: '600px' }}>
            <h1 className="serif" style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Add New Product</h1>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input required placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd' }} />
                <input required type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd' }} />
                <input required type="number" placeholder="Stock Quantity" value={stock} onChange={e => setStock(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd' }} />
                <input type="file" onChange={e => setFile(e.target.files[0])} style={{ padding: '12px', border: '1px solid #ddd' }} />
                <button type="submit" disabled={loading} className="btn btn-black">{loading ? 'Adding...' : 'Add Product'}</button>
            </form>
            
            {/* Formula section would be similar but with item selection */}
        </div>
    );
};

export default AdminProducts;
