import React from 'react'
import { motion } from 'framer-motion'
import { Monitor, MapPin, Package, Users, Clock, ArrowUpRight, RefreshCw } from 'lucide-react'

export default function ShopsView({ shops, onCommand, onTriggerSync }) {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black">إدارة النقاط البعيدة</h2>
                    <p className="text-slate-400 font-bold mt-1">عرض تفصيلي لجميع الفروع المرتبطة ونشاطها الحالي.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {shops.map(shop => (
                    <motion.div
                        key={shop.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass p-6 rounded-[2rem] border border-slate-100 hover:border-brand-primary/30 transition-all flex flex-wrap items-center gap-8 bg-white"
                    >
                        <div className="flex items-center gap-4 min-w-[250px]">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${shop.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                <Monitor size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{shop.name}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                    <MapPin size={12} />
                                    <span>ID: {shop.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المبيعات اليومية</p>
                                <p className="text-lg font-black text-brand-primary">{shop.totalSales.toLocaleString()} ج.م</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">عدد الفواتير</p>
                                <p className="text-lg font-black text-slate-900">{shop.saleCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المنتجات</p>
                                <p className="text-lg font-black text-slate-900">{shop.productCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">الموظفين الآن</p>
                                <p className="text-lg font-black text-orange-600">{shop.activeStaff}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 min-w-fit">
                            <button
                                onClick={() => onCommand(shop.id, 'TAKE_BACKUP')}
                                className="bg-slate-50 hover:bg-brand-primary/10 text-slate-600 hover:text-brand-primary p-4 rounded-2xl transition-all"
                                title="نسخة احتياطية"
                            >
                                <Package size={20} />
                            </button>
                            <button
                                onClick={() => onTriggerSync(shop.id)}
                                className="bg-slate-50 hover:bg-brand-primary/10 text-slate-600 hover:text-brand-primary p-4 rounded-2xl transition-all"
                                title="مزامنة البيانات الآن"
                            >
                                <RefreshCw size={20} />
                            </button>
                            <button
                                onClick={() => onCommand(shop.id, 'CLOSE_APP')}
                                className="bg-slate-50 hover:bg-red-50/10 text-slate-600 hover:text-red-600 p-4 rounded-2xl transition-all"
                                title="إغلاق البرنامج"
                            >
                                <Clock size={20} />
                            </button>
                            <button className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-brand-primary/20">
                                <ArrowUpRight size={18} />
                                <span>تقرير مفصل</span>
                            </button>
                        </div>
                    </motion.div>
                ))}

                {shops.length === 0 && (
                    <div className="py-20 text-center glass rounded-[3rem] opacity-30 bg-white">
                        <Monitor size={48} className="mx-auto mb-4 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-500">لا يوجد أفرع متصلة حالياً</h3>
                    </div>
                )}
            </div>
        </div>
    )
}
