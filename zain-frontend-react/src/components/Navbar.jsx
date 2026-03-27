// zain-frontend-react/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Heart, Menu } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const { cart } = useCart();

    return (
        <header style={{ position: 'sticky', top: 0, zindex: 1000, background: 'white' }}>
            <div className="announcement-bar">
                <div className="scrolling-text">
                    ✨ Free Shipping for orders above 1500 EGP • ✨ Premium Quality Guaranteed • ✨ Find Your Signature Scent
                </div>
            </div>
            
            <nav style={{ 
                height: '85px', 
                display: 'grid', 
                gridTemplateColumns: '1fr auto 1fr', 
                alignItems: 'center', 
                padding: '0 5%',
                borderBottom: '1px solid #f5f5f5'
            }}>
                {/* Left Side: Traditional Nav */}
                <div style={{ display: 'flex', gap: '30px', fontSize: '13px', textTransform: 'capitalize', fontWeight: 500 }}>
                    <Link to="/">Home</Link>
                    <Link to="/shop">Shop</Link>
                    <Link to="/about">About us</Link>
                    <Link to="/contact">Contact us</Link>
                </div>

                {/* Center: Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#882222' }}>AF</span>
                    <div style={{ lineHeight: 1 }}>
                        <p style={{ fontSize: '14px', letterSpacing: '0.2em', fontWeight: 600 }}>ZAIN PERFUMES</p>
                        <p style={{ fontSize: '8px', letterSpacing: '0.1em', marginTop: '2px' }}>FRAGRANCES</p>
                    </div>
                </Link>

                {/* Right Side: Icons */}
                <div style={{ display: 'flex', gap: '22px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Search size={22} strokeWidth={1} style={{ cursor: 'pointer' }} />
                    <Heart size={22} strokeWidth={1} style={{ cursor: 'pointer' }} />
                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <ShoppingBag size={22} strokeWidth={1} />
                        <span style={{ 
                            position: 'absolute', 
                            top: '-8px', 
                            right: '-10px', 
                            background: 'black', 
                            color: 'white', 
                            fontSize: '9px', 
                            padding: '2px 5px', 
                            borderRadius: '10px' 
                        }}>{cart.length}</span>
                    </Link>
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
