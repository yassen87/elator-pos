import React, { useState, useEffect } from 'react'
import { PhoneCall, ClipboardList, Package, User, Clock, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function CustomersView({ parseDetails, products }) {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [customerTopProducts, setCustomerTopProducts] = useState([])
    const [selectedHistory, setSelectedHistory] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => { loadCustomers() }, [])

    const loadCustomers = async () => {
        try {
            const [res, topProducts] = await Promise.all([
                window.api.getCustomers(),
                window.api.getCustomerTopProducts()
            ])
            setCustomers(Array.isArray(res) ? res : [])
            setCustomerTopProducts(Array.isArray(topProducts) ? topProducts : [])
        } catch (err) {
            console.error('Failed to load customers:', err)
            setCustomers([])
            setCustomerTopProducts([])
        }
    }

    const showHistory = async (customer) => {
        if (!customer) return
        setLoadingHistory(true)
        setSelectedHistory({ ...customer, items: [] })
        try {
            const items = await window.api.getCustomerPurchaseHistory({
                name: customer.customer_name,
                phone: customer.customer_phone
            })
            setSelectedHistory({ ...customer, items: Array.isArray(items) ? items : [] })
        } catch (err) {
            console.error('Failed to load customer history:', err)
            setSelectedHistory({ ...customer, items: [] })
        } finally {
            setLoadingHistory(false)
        }
    }

    const filtered = (Array.isArray(customers) ? customers : []).filter(c =>
        (c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.customer_phone?.includes(search))
    )

    return (
        <div className="space-y-6 text-right">
            <div className="flex justify-between items-center bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="relative flex-1 max-w-xl z-10">
                    <PhoneCall className="absolute right-5 top-4 w-6 h-6 text-brand-primary/50" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ابحث عن عميل بالاسم أو رقم الموبايل..."
                        className="w-full bg-slate-50/80 border-2 border-slate-100 rounded-[2rem] py-4 pr-14 pl-6 outline-none font-bold text-lg text-slate-700 focus:border-brand-primary/50 focus:bg-white transition-all shadow-inner"
                    />
                </div>
                <div className="bg-gradient-to-br from-brand-primary to-purple-600 px-8 py-4 rounded-[2rem] shadow-lg shadow-brand-primary/20 flex items-center gap-3 relative z-10">
                    <span className="text-white/80 font-bold text-sm">إجمالي العملاء:</span>
                    <span className="text-white font-black text-3xl">{customers.length}</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-5 font-black text-slate-500 text-sm">اسم العميل</th>
                            <th className="p-5 font-black text-slate-500 text-sm">رقم الهاتف</th>
                            <th className="p-5 font-black text-slate-500 text-sm">المنتج الأكثر طلباً</th>
                            <th className="p-5 font-black text-slate-500 text-sm text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                        {filtered.map((c, i) => {
                            const topProduct = customerTopProducts.find(tp =>
                                tp.customer_name === c.customer_name &&
                                (tp.customer_phone || '') === (c.customer_phone || '')
                            )
                            return (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-primary/5 rounded-xl flex items-center justify-center border border-brand-primary/10 transition-colors group-hover:bg-brand-primary/10">
                                                <User className="w-5 h-5 text-brand-primary" />
                                            </div>
                                            <span className="text-lg font-black">{c.customer_name || 'بدون اسم'}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
                                            <PhoneCall className="w-3.5 h-3.5 opacity-50" />
                                            <span>{c.customer_phone || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        {topProduct ? (
                                            <div className="flex items-center gap-2">
                                                <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-xl text-xs font-black border border-amber-100">
                                                    {topProduct.top_product}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">{topProduct.purchase_count} مرة</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">لا توجد بيانات</span>
                                        )}
                                    </td>
                                    <td className="p-5 text-center">
                                        <button
                                            onClick={() => showHistory(c)}
                                            className="bg-slate-100 hover:bg-brand-primary text-slate-600 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 mx-auto border border-slate-200 hover:border-brand-primary active:scale-95"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            سجل المشتريات
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-20 text-center text-slate-300">
                                    <PhoneCall className="w-16 h-16 mb-4 opacity-20 mx-auto" />
                                    <p className="text-xl font-black text-slate-400">لا توجد نتائج مطابقة لبحثك</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {selectedHistory && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden text-right border-0 max-h-[90vh] flex flex-col relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                                        <ClipboardList className="w-8 h-8 text-brand-primary" />
                                        سجل المشتريات
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl w-max border border-slate-100">
                                        <User className="w-4 h-4 text-brand-primary" />
                                        {selectedHistory.customer_name}
                                        <span className="text-slate-300 mx-1">|</span>
                                        <PhoneCall className="w-4 h-4 text-brand-primary" />
                                        <span className="font-mono">{selectedHistory.customer_phone}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedHistory(null)} className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 relative z-10">
                                {loadingHistory ? (
                                    <div className="py-32 flex flex-col justify-center items-center">
                                        <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4"></div>
                                        <div className="text-slate-400 font-black tracking-widest animate-pulse">جاري تحميل السجل...</div>
                                    </div>
                                ) : selectedHistory.items.length === 0 ? (
                                    <div className="py-32 flex flex-col justify-center items-center text-slate-300">
                                        <ClipboardList className="w-24 h-24 mb-6 opacity-20" />
                                        <div className="text-2xl font-black text-slate-400">لا توجد مشتريات مسجلة</div>
                                        <p className="text-slate-400/80 mt-2 font-bold">لم يقم هذا العميل بأي عمليات شراء حتى الآن</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {selectedHistory.items.map((sale, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                                {/* Sale header */}
                                                <div className="flex justify-between items-center p-4 border-b border-slate-50 bg-slate-50/80">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-brand-primary/10 text-brand-primary font-black px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5">
                                                            <Package className="w-3.5 h-3.5" />
                                                            فاتورة #{sale.invoice_code || sale.sale_id}
                                                        </span>
                                                        <span className="text-slate-400 text-sm font-bold flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(sale.sale_date).toLocaleString('ar-EG')}
                                                        </span>
                                                    </div>
                                                    <span className="text-green-700 font-black bg-green-50 border border-green-100 px-4 py-1.5 rounded-xl text-sm">
                                                        {sale.total || 0} ج.م
                                                    </span>
                                                </div>
                                                {/* Items */}
                                                <div className="divide-y divide-slate-50">
                                                    {(() => {
                                                        const items = sale.items || [];
                                                        const unifiedItems = [];
                                                        const bottleIndices = new Set();
                                                        const oilIndices = new Set();

                                                        // Pass 1: Tag all bottles and oils/mixtures
                                                        items.forEach((item, idx) => {
                                                            const itemName = item.item_name || item.name || item.product_name || '';
                                                            const detailsRaw = typeof item.details === 'string' ? item.details : JSON.stringify(item.details || {});
                                                            let parsedDetails = null;
                                                            try {
                                                                parsedDetails = item.details ? (typeof item.details === 'string' ? JSON.parse(item.details) : item.details) : null;
                                                            } catch (e) { }

                                                            const isBottle = item.category?.toLowerCase() === 'bottle' ||
                                                                itemName.includes('زجاجة') ||
                                                                itemName.includes('زجاجه') ||
                                                                parsedDetails?.is_auto_bottle;

                                                            const isOil = item.type === 'oil_mix' ||
                                                                itemName.includes('تركيبة') ||
                                                                detailsRaw.includes('المكونات:') ||
                                                                (parsedDetails?.items && parsedDetails.items.length > 0);

                                                            if (isBottle) bottleIndices.add(idx);
                                                            else if (isOil) oilIndices.add(idx);
                                                        });

                                                        const processed = new Set();

                                                        // Pass 2: Pair oils with bottles
                                                        items.forEach((item, idx) => {
                                                            if (processed.has(idx)) return;
                                                            if (oilIndices.has(idx)) {
                                                                const itemName = item.item_name || item.name || item.product_name || '';
                                                                const iDetailsRaw = item.details ? (typeof item.details === 'string' ? item.details : JSON.stringify(item.details)) : '';
                                                                let details = null;
                                                                try {
                                                                    details = item.details ? (typeof item.details === 'string' ? JSON.parse(item.details) : item.details) : null;
                                                                } catch (e) { }

                                                                let foundBottleIdx = -1;
                                                                for (const bIdx of bottleIndices) {
                                                                    if (processed.has(bIdx)) continue;
                                                                    const bottle = items[bIdx];
                                                                    const bName = bottle.item_name || bottle.name || '';
                                                                    let bDetails = null;
                                                                    try {
                                                                        bDetails = bottle.details ? (typeof bottle.details === 'string' ? JSON.parse(bottle.details) : bottle.details) : null;
                                                                    } catch (e) { }

                                                                    const parentMatch = bDetails?.parent_name && bDetails.parent_name === itemName;
                                                                    const mixMatch = (bDetails?.mix_id && details?.mix_id && bDetails.mix_id === details.mix_id) ||
                                                                        (bDetails?.mixture_id && details?.mixture_id && bDetails.mixture_id === details.mixture_id);
                                                                    const textMatch = bName && iDetailsRaw.includes(bName);

                                                                    if (parentMatch || mixMatch || textMatch) {
                                                                        foundBottleIdx = bIdx;
                                                                        break;
                                                                    }
                                                                }

                                                                if (foundBottleIdx !== -1) {
                                                                    const bottle = items[foundBottleIdx];
                                                                    processed.add(foundBottleIdx);
                                                                    unifiedItems.push({
                                                                        ...item,
                                                                        item_name: 'تركيبة عطور',
                                                                        bottle_name: bottle.item_name || bottle.name,
                                                                        price: Number(item.price || 0) + Number(bottle.price || 0)
                                                                    });
                                                                } else {
                                                                    unifiedItems.push(item);
                                                                }
                                                                processed.add(idx);
                                                            }
                                                        });

                                                        // Pass 3: Remaining items
                                                        items.forEach((item, idx) => {
                                                            if (!processed.has(idx)) unifiedItems.push(item);
                                                        });

                                                        return unifiedItems.map((item, i) => {
                                                            const details = item.details ? parseDetails(item.details) : '';
                                                            const isUnified = item.item_name === 'تركيبة عطور';
                                                            
                                                            return (
                                                                <div key={i} className="px-4 py-3 hover:bg-slate-50/80 transition-colors">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-slate-800 text-sm">
                                                                                {isUnified && item.bottle_name ? `تركيبة عطور (${item.bottle_name})` : (item.item_name || 'منتج')}
                                                                            </p>
                                                                            {details && (
                                                                                <p className="text-[10px] text-brand-primary font-bold mt-1 whitespace-pre-line leading-relaxed">
                                                                                    {details}
                                                                                </p>
                                                                            )}
                                                                            <p className="text-[10px] text-slate-400 mt-1">{item.quantity || item.item_quantity} وحدة</p>
                                                                        </div>
                                                                        <span className="font-black text-sm text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                                                                            {Number(item.price || 0).toFixed(2)} ج.م
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

