import React, { useState, useEffect } from 'react'
import { Users, Lock, Trash2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

export function CashiersView({ cashiers, onRefresh, notify, ask }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [pricingTier, setPricingTier] = useState('retail')
    const [searchTerm, setSearchTerm] = useState('')
    const [settings, setSettings] = useState({})

    useEffect(() => {
        window.api.getSettings().then(s => {
            setSettings(s)
            if (s.pricing_mode === 'retail') setPricingTier('retail')
            if (s.pricing_mode === 'wholesale') setPricingTier('wholesale')
        })
    }, [])

    const pricingMode = settings.pricing_mode || 'both';

    const handleUsernameChange = (val) => {
        setUsername(val)
        // Only change pricing tier if user explicitly types keywords
        if (val.includes('جملة') || val.includes('جمله')) {
            if (pricingTier !== 'wholesale') setPricingTier('wholesale')
        }
        else if (val.includes('قطاعي')) {
            if (pricingTier !== 'retail') setPricingTier('retail')
        }
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!username || !password) return notify('يرجى ملء جميع الحقول', 'error')

        console.log('[CashiersView] Adding cashier:', { username, pricing_tier: pricingTier })
        const res = await window.api.addCashier({ username, password, pricing_tier: pricingTier })
        if (res.success) {
            setUsername('')
            setPassword('')
            setUsername('')
            setPassword('')
            if (pricingMode === 'both') setPricingTier('retail') // Reset only if multiple choice
            onRefresh()
            onRefresh()
        } else {
            notify(res.message, 'error')
        }
    }

    const handleDelete = async (id) => {
        const userToDelete = cashiers.find(c => c.id === id)
        if (userToDelete?.username === 'admin') {
            notify('لا يمكن حذف حساب الأدمن الأساسي!', 'error')
            return
        }
        ask('حذف بائع', 'هل أنت متأكد من حذف هذا البائع؟', async () => {
            const res = await window.api.deleteCashier(id)
            if (res.success) {
                notify(res.message || 'تمت العملية بنجاح', 'success')
                onRefresh()
            } else {
                notify(res.message || 'حدث خطأ أثناء الحذف', 'error')
            }
        })
    }

    const handleUpdatePassword = async (id) => {
        const newPass = prompt('أدخل كلمة المرور الجديدة للبائع:')
        if (newPass && newPass.trim()) {
            await window.api.updateUserPassword({ id, password: newPass })
            notify('تم تحديث كلمة المرور بنجاح', 'success')
        }
    }

    return (
        <div className="space-y-8 text-right">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-brand-primary rounded-full"></div>
                    إضافة بائع جديد (Cashier)
                </h3>
                <form onSubmit={handleAdd} className="flex gap-6 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">اسم المستخدم</label>
                        <div className="relative">
                            <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="اسم المستخدم" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pr-12 focus:ring-4 focus:ring-brand-primary/10 transition-all text-right font-bold" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pr-12 focus:ring-4 focus:ring-brand-primary/10 transition-all text-right font-bold" />
                        </div>
                    </div>
                    {pricingMode === 'both' && (
                        <div className="flex-1 space-y-2">
                            <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">نوع التسعير</label>
                            <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setPricingTier('retail')}
                                    className={`flex-1 py-3 font-black rounded-lg transition-all ${pricingTier === 'retail' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    بائع قطاعي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPricingTier('wholesale')}
                                    className={`flex-1 py-3 font-black rounded-lg transition-all ${pricingTier === 'wholesale' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    بائع جملة
                                </button>
                            </div>
                        </div>
                    )}
                    <button type="submit" className="bg-brand-primary text-white font-black px-10 py-4 rounded-xl h-[60px] flex items-center justify-center gap-2 hover:bg-brand-secondary transition-all shadow-lg active:scale-95">
                        <Plus className="w-5 h-5" />
                        تفعيل الحساب
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {cashiers.map(c => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={c.id}
                        className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center justify-between hover:border-brand-primary/20 hover:shadow-xl hover:shadow-slate-100 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-brand-primary/5 transition-colors">
                                <Users className="w-7 h-7 text-slate-400 group-hover:text-brand-primary transition-colors" />
                            </div>
                            <div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900">{c.username}</span>
                                    <span className={`text-[10px] font-black ${c.pricing_tier === 'wholesale' ? 'text-blue-500' : 'text-slate-400'}`}>
                                        {c.pricing_tier === 'wholesale' ? 'نظام الجملة' : 'نظام القطاعي'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-black uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    حساب نشط
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => handleUpdatePassword(c.id)}
                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"
                                title="تغيير كلمة المرور"
                            >
                                <Lock className="w-5 h-5" />
                            </button>
                            {c.username !== 'admin' && (
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="حذف الحساب"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
