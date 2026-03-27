import React, { useState } from 'react'
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Settings,
    BarChart3,
    History,
    ArrowLeftRight,
    FlaskConical,
    ShieldAlert,
    LogOut,
    MessageSquare,
    Cloud,
    RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import AdminDashboard from './AdminDashboard'
import CashierPanel from './CashierPanel'
import DeveloperDashboard from './DeveloperDashboard'

export default function SuperDashboard({ user, onLogout, notify, ask }) {
    const [view, setView] = useState('launcher')
    const [isSyncing, setIsSyncing] = useState(false)

    const handleSyncAll = async () => {
        ask('مزامنة شاملة (Hub)', 'هل تريد رفع كافة البيانات المتاحة حالياً للسحاب يدوياً؟', async () => {
            setIsSyncing(true)
            notify('جاري البدء في مزامنة البيانات...', 'info')
            try {
                const res = await window.api.syncCloudAll()
                if (res.success) {
                    notify('تمت المزامنة بنجاح! ✅', 'success')
                } else {
                    notify('فشلت المزامنة: ' + res.message, 'error')
                }
            } catch (err) {
                notify('حدث خطأ أثناء المزامنة: ' + err.message, 'error')
            } finally {
                setIsSyncing(false)
            }
        })
    }

    // Sections for the launcher
    const sections = [
        { id: 'admin', title: 'لوحة المدير العام', icon: LayoutDashboard, color: 'bg-indigo-600', description: 'إحصائيات، تقارير، إعدادات، وموظفين' },
        { id: 'cashier', title: 'كاشير المبيعات', icon: ShoppingCart, color: 'bg-green-600', description: 'نقطة البيع، فواتير، وخدمة العملاء' },
        { id: 'dev', title: 'لوحة المطور (System)', icon: ShieldAlert, color: 'bg-purple-600', description: 'إدارة السكيوير، التحديثات، والدعم التقني' },
        { id: 'products', title: 'إدارة المنتجات', icon: Package, color: 'bg-amber-600', description: 'تعديل الأسعار والكميات والأصناف' },
        { id: 'reports', title: 'التقارير المالية', icon: BarChart3, color: 'bg-blue-600', description: 'محاسبة دقيقة للمحل' },
        { id: 'sync', title: 'مزامنة السحاب (Hub)', icon: Cloud, color: 'bg-sky-500', description: 'رفع المبيعات والمنتجات يدوياً فوراً', action: handleSyncAll, loading: isSyncing },
        { id: 'returns', title: 'المرتجعات', icon: ArrowLeftRight, color: 'bg-red-600', description: 'إدارة عمليات الاسترجاع' },
        { id: 'formulas', title: 'تركيبات العطور', icon: FlaskConical, color: 'bg-pink-600', description: 'إدارة الخلطات والزيوت' }
    ]

    if (view === 'launcher') {
        return (
            <div className="min-h-screen bg-slate-50 p-8 font-noto" dir="rtl">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 mb-2">مرحباً بك في وضع المطور 🚀</h1>
                            <p className="text-slate-500 font-bold">وصول سريع لجميع أقسام النظام بدون قيود</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-red-100 text-red-500 rounded-2xl font-black hover:bg-red-50 transition-all shadow-sm"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>خروج</span>
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sections.map((s, idx) => (
                            <motion.button
                                key={s.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={s.action ? s.action : () => setView(s.id)}
                                disabled={s.loading}
                                className={`group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300 transition-all text-right relative overflow-hidden ${s.loading ? 'opacity-80 grayscale cursor-wait' : ''}`}
                            >
                                <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                                    {s.loading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <s.icon className="w-8 h-8" />}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">
                                    {s.loading ? 'جاري المزامنة...' : s.title}
                                </h3>
                                <p className="text-slate-400 font-bold text-sm">{s.description}</p>

                                <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-150 transition-transform opacity-50" />
                            </motion.button>
                        ))}
                    </div>

                    {/* Quick Access Info */}
                    <div className="mt-12 bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-indigo-900 font-black">وضع المطور نشط (yass)</p>
                            <p className="text-indigo-600 font-bold text-sm italic">تم تعطيل قيود الصلاحيات لهذا الحساب.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Navigation back to launcher
    const BackBtn = () => (
        <button
            onClick={() => setView('launcher')}
            className="fixed bottom-8 right-8 z-[9999] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2"
        >
            <LayoutDashboard className="w-6 h-6" />
            <span className="font-black">العودة للمشغل</span>
        </button>
    )

    // Render the selected section
    if (view === 'admin' || view === 'products' || view === 'reports' || view === 'returns' || view === 'formulas') {
        const forceTab = view !== 'admin' ? view : 'dashboard'
        return (
            <>
                <AdminDashboard user={user} onLogout={onLogout} notify={notify} ask={ask} initialTab={forceTab} />
                <BackBtn />
            </>
        )
    }

    if (view === 'cashier') {
        return (
            <>
                <CashierPanel user={user} onLogout={onLogout} notify={notify} ask={ask} />
                <BackBtn />
            </>
        )
    }

    if (view === 'dev') {
        return (
            <>
                <DeveloperDashboard user={user} onLogout={onLogout} notify={notify} ask={ask} />
                <BackBtn />
            </>
        )
    }

    return null
}
