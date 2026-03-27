// zain-frontend-react/src/pages/ProductDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, Truck } from 'lucide-react';

const ProductDetails = () => {
    const { type, id } = useParams();
    const [item, setItem] = useState(null);
    const [selectedPrice, setSelectedPrice] = useState(0);
    const [selectedSize, setSelectedSize] = useState('35ml');
    const { addToCart } = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/api/products.php?type=${type}`)
            .then(res => {
                const list = type === 'formula' ? res.data.data.formulas : res.data.data.products;
                const found = list.find(i => i.id == id);
                setItem(found);
                if (type === 'formula') setSelectedPrice(35);
                else setSelectedPrice(found.price);
            })
            .catch(err => console.error(err));
    }, [id, type]);

    if (!item) return <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Scent...</div>;

    return (
        <div className="container" style={{ padding: '60px 0' }}>
            {/* Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#999', textTransform: 'uppercase', marginBottom: '40px' }}>
                <a href="/">Home</a> <ChevronRight size={12} />
                <a href="/shop">Shop</a> <ChevronRight size={12} />
                <span style={{ color: '#111' }}>{item.name}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '80px' }}>
                {/* Image Gallery Mockup */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ background: '#fcfcfc', borderRadius: '8px', overflow: 'hidden', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={item.image || 'https://via.placeholder.com/600x800'} alt={item.name} style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }} />
                </motion.div>

                {/* Info Section */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '2px', color: '#888', marginBottom: '15px', fontWeight: 600 }}>
                        {item.brand || (type === 'formula' ? 'Signature Formula' : 'Retail Collection')}
                    </p>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', marginBottom: '15px', fontWeight: 600, textTransform: 'uppercase' }}>{item.name}</h1>
                    <p style={{ fontSize: '1.8rem', color: '#882222', marginBottom: '40px', fontWeight: 500 }}>{selectedPrice} EGP</p>

                    <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '40px' }} />

                    <p style={{ color: '#555', fontSize: '16px', lineHeight: 1.8, marginBottom: '40px' }}>
                        {item.description || "An olfactory masterpiece designed to captivate the senses. This fragrance combines rare essences with modern artistry, resulting in a scent that is both timeless and provocative. Perfect for those who demand excellence."}
                    </p>

                    {type === 'formula' && (
                        <div style={{ marginBottom: '40px' }}>
                            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', fontWeight: 700 }}>Choose Volume</p>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                {[35, 55, 110].map(size => (
                                    <button 
                                        key={size}
                                        onClick={() => { setSelectedPrice(size); setSelectedSize(size + 'ml'); }}
                                        style={{ 
                                            flex: 1,
                                            padding: '12px', 
                                            border: '1px solid #000', 
                                            background: (selectedPrice === size || (size === 35 && selectedPrice === 35)) ? '#000' : 'transparent',
                                            color: (selectedPrice === size || (size === 35 && selectedPrice === 35)) ? '#fff' : '#000',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            transition: '0.3s'
                                        }}>
                                        {size}ML
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => { addToCart({...item, selectedPrice, selectedSize, type}); navigate('/cart'); }} 
                        className="btn-premium" 
                        style={{ background: 'black', color: 'white', height: '60px', width: '100%', marginBottom: '40px', fontSize: '16px', borderRadius: 0 }}>
                        Add To Bag
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid #f5f5f5', paddingTop: '40px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <Truck size={20} strokeWidth={1} />
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 600 }}>Fast Shipping</p>
                                <p style={{ fontSize: '10px', color: '#999' }}>Delivered within 2-3 business days</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <ShieldCheck size={20} strokeWidth={1} />
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 600 }}>Authentic Only</p>
                                <p style={{ fontSize: '10px', color: '#999' }}>100% Original ingredients guaranteed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
