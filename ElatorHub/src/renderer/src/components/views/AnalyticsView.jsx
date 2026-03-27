import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, PieChart, ShoppingBag, CreditCard, DollarSign } from 'lucide-react'

export default function AnalyticsView({ stats, shops }) {
    const totalSales = stats.totalRevenue || 0
    const totalOrders = shops.reduce((acc, s) => acc + s.saleCount, 0)
    const avgOrderValue = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-black">تحليلات الأسطول</h2>
                <p className="text-slate-400 font-bold mt-1">نظرة شاملة على أداء جميع الفروع ونمو المبيعات.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Performance */}
                <div className="glass p-8 rounded-[2.5rem] border border-slate-100 space-y-6 bg-white">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black flex items-center gap-3 text-slate-900">
                            <TrendingUp className="text-brand-primary" />
                            <span>أداء المبيعات</span>
                        </h3>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">مباشر</span>
                    </div>

                    <div className="space-y-4">
                        {shops.map(shop => (
                            <div key={shop.id} className="space-y-2">
                                <div className="flex justify-between text-sm font-bold text-slate-700">
                                    <span>{shop.name}</span>
                                    <span className="text-brand-primary">{shop.totalSales.toLocaleString()} ج.م</span>
                                </div>
                                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(shop.totalSales / (totalSales || 1)) * 100}%` }}
                                        className="bg-brand-primary h-full rounded-full shadow-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-6 rounded-[2rem] border border-slate-100 bg-white flex flex-col justify-between shadow-sm">
                        <DollarSign className="text-green-600 mb-4" />
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">متوسط الفاتورة</p>
                            <h4 className="text-2xl font-black text-slate-900">{avgOrderValue} ج.م</h4>
                        </div>
                    </div>
                    <div className="glass p-6 rounded-[2rem] border border-slate-100 bg-white flex flex-col justify-between shadow-sm">
                        <ShoppingBag className="text-blue-600 mb-4" />
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">إجمالي الطلبات</p>
                            <h4 className="text-2xl font-black text-slate-900">{totalOrders}</h4>
                        </div>
                    </div>
                    <div className="glass p-6 rounded-[2rem] border border-slate-100 bg-white flex flex-col justify-between shadow-sm">
                        <CreditCard className="text-purple-600 mb-4" />
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">أفضل فرع</p>
                            <h4 className="text-xl font-black truncate text-slate-900">{shops.length > 0 ? shops.sort((a, b) => b.totalSales - a.totalSales)[0].name : '---'}</h4>
                        </div>
                    </div>
                    <div className="glass p-6 rounded-[2rem] border border-slate-100 bg-white flex flex-col justify-between shadow-sm">
                        <BarChart3 className="text-orange-600 mb-4" />
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">كفاءة الأسطول</p>
                            <h4 className="text-2xl font-black text-slate-900">98.2%</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Analytics Chart */}
            <div className="glass p-8 rounded-[2.5rem] border border-slate-100 bg-white shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black flex items-center gap-3 text-slate-900">
                        <BarChart3 className="text-brand-primary" />
                        <span>تحليل مبيعات الأسطول</span>
                    </h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                            <span className="text-[10px] font-bold text-slate-500">حجم المبيعات</span>
                        </div>
                    </div>
                </div>

                <div className="h-64 w-full relative pt-10">
                    <svg viewBox="0 0 1000 200" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        {[0, 50, 100, 150].map(y => (
                            <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        ))}

                        {/* Area Fill */}
                        <motion.path
                            initial={{ d: "M 0 200 L 0 200 L 1000 200 L 1000 200 Z" }}
                            animate={{
                                d: `M 0 200 ${shops.map((s, i) => `L ${(i / (shops.length - 1 || 1)) * 1000} ${180 - (s.totalSales / (Math.max(...shops.map(sh => sh.totalSales)) || 1)) * 150}`).join(' ')} L 1000 200 Z`
                            }}
                            fill="url(#chartGradient)"
                            transition={{ duration: 1, ease: "easeOut" }}
                        />

                        {/* Line Path */}
                        <motion.path
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            d={`M ${shops.map((s, i) => `${(i / (shops.length - 1 || 1)) * 1000} ${180 - (s.totalSales / (Math.max(...shops.map(sh => sh.totalSales)) || 1)) * 150}`).join(' L ')}`}
                            fill="none"
                            stroke="var(--brand-primary)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />

                        {/* Data Points */}
                        {shops.map((s, i) => (
                            <motion.circle
                                key={s.id}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                cx={(i / (shops.length - 1 || 1)) * 1000}
                                cy={180 - (s.totalSales / (Math.max(...shops.map(sh => sh.totalSales)) || 1)) * 150}
                                r="6"
                                fill="white"
                                stroke="var(--brand-primary)"
                                strokeWidth="3"
                                transition={{ delay: 0.5 + (i * 0.1) }}
                            />
                        ))}
                    </svg>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between mt-4 px-2">
                        {shops.map(s => (
                            <span key={s.id} className="text-[9px] font-bold text-slate-400 rotate-12 origin-top-right">{s.name}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
