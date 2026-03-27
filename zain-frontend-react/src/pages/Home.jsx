// zain-frontend-react/src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [formulas, setFormulas] = useState([]);
    const [activeTab, setActiveTab] = useState('winter');

    useEffect(() => {
        api.get('/api/products.php')
            .then(res => {
                setProducts(res.data.data.products);
                setFormulas(res.data.data.formulas);
            })
            .catch(err => console.error(err));
    }, []);

    // Local assets would be better, using the generated image path
    const heroBg = "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1920&q=80"; // Fallback
    
    return (
        <div style={{ overflow: 'hidden' }}>
            {/* Hero Section */}
            <section style={{ 
                height: '92vh', 
                background: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.1)), url(${heroBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10%',
                color: 'white'
            }}>
                <div style={{ maxWidth: '600px' }}>
                    <motion.h1 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1.1, marginBottom: '24px', fontWeight: 600 }}>
                        Just Smell, You Will Fall In Love With It
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px', letterSpacing: '0.05em' }}>
                        Discover scents that linger long after the moment.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 0.8 }}
                    >
                        <Link to="/shop" className="btn-premium">Shop Now</Link>
                    </motion.div>
                </div>
            </section>

            {/* Special Offers Banner (Optional - as seen in screenshot) */}
            <div style={{ background: '#f8f1e9', padding: '15px 0', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#882222' }}>
                Buy For 6500 and Get a 15% Discount + Free Shipping
            </div>

            {/* New Arrivals Section */}
            <section style={{ padding: '100px 0', background: 'white' }}>
                <div className="container">
                    <h2 className="section-title">NEW ARRIVAL</h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '60px' }}>
                        {['Winter', 'Summer'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    padding: '10px 0',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab.toLowerCase() ? '2px solid black' : '2px solid transparent',
                                    color: activeTab === tab.toLowerCase() ? 'black' : '#999',
                                    transition: '0.3s'
                                }}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    <motion.div 
                        layout
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
                        {formulas.map((item, idx) => (
                            <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{ textAlign: 'center' }}>
                                <Link to={`/product/formula/${item.id}`}>
                                    <div style={{ 
                                        position: 'relative', 
                                        aspectRatio: '3/4', 
                                        background: '#fcfcfc',
                                        backgroundImage: 'repeating-linear-gradient(90deg, #f9f9f9, #f9f9f9 15px, #ffffff 15px, #ffffff 30px)',
                                        border: '1px solid #f0f0f0',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <img 
                                            src={item.image || 'https://via.placeholder.com/300x400'} 
                                            alt={item.name} 
                                            style={{ width: '85%', height: '85%', objectFit: 'contain', transition: '0.5s transform cubic-bezier(0.2, 1, 0.3, 1)' }}
                                            className="product-img"
                                        />
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'white', padding: '4px 10px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>New</div>
                                    </div>
                                </Link>
                                <div style={{ padding: '20px 0' }}>
                                    <p style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', marginBottom: '5px' }}>{item.brand || 'Premium Fragrance'}</p>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase' }}>{item.name}</h3>
                                    <p style={{ marginTop: '10px', fontWeight: 700 }}>From {item.original_price || 35} EGP</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Call to Action */}
            <section style={{ height: '50vh', background: '#111', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div className="container">
                    <h2 className="serif" style={{ fontSize: '3rem', marginBottom: '20px' }}>Smell Good, Feel Good</h2>
                    <p style={{ opacity: 0.7, marginBottom: '30px' }}>Hand-crafted scents for the modern soul.</p>
                    <Link to="/shop" className="btn-premium">Explore All Scent</Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
