// zain-frontend-react/src/pages/Login.jsx
import React, { useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/send_code.php', { email });
            if (res.data.success) { setStep(2); alert("Code: " + res.data.code); }
            else alert(res.data.message);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/verify_code.php', { email, code });
            if (res.data.success) {
                localStorage.setItem('zain_user', JSON.stringify(res.data.user));
                navigate('/dashboard');
            } else alert(res.data.message);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc' }}>
            <div className="container" style={{ maxWidth: '450px', background: 'white', padding: '60px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>Sign In</h1>
                    <p style={{ color: '#999', fontSize: '13px', marginTop: '10px' }}>Enter your credentials to access your account.</p>
                </div>

                <AnimatePresence mode='wait'>
                    {step === 1 ? (
                        <motion.form key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                <input type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '15px 15px 15px 45px', border: '1px solid #eee', outline: 'none', background: '#fafafa' }} />
                            </div>
                            <button type="submit" disabled={loading} className="btn-premium" style={{ width: '100%', background: 'black', color: 'white' }}>{loading ? 'Sending...' : 'Get Magic Link'}</button>
                        </motion.form>
                    ) : (
                        <motion.form key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                             <div style={{ position: 'relative' }}>
                                <ShieldCheck size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                <input type="text" required placeholder="Verification Code" value={code} onChange={e => setCode(e.target.value)} style={{ width: '100%', padding: '15px 15px 15px 45px', border: '1px solid #eee', outline: 'none', background: '#fafafa' }} />
                            </div>
                            <button type="submit" disabled={loading} className="btn-premium" style={{ width: '100%', background: 'black', color: 'white' }}>{loading ? 'Verifying...' : 'Continue'}</button>
                            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px' }}>Retry with different email</button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Login;
