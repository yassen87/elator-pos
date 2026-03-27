import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Clock, Package, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ReturnsView({ parseDetails, notify }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [returns, setReturns] = useState([])
    const [expandedReturns, setExpandedReturns] = useState([])

    const loadReturns = async () => {
        try {
            const res = await window.api.getReturns({ startDate, endDate })
            setReturns(Array.isArray(res) ? res : [])
        } catch (err) {
            console.error('Failed to load returns:', err)
            notify('فشل تحميل المرتجعات', 'error')
            setReturns([])
        }
    }

    useEffect(() => { loadReturns() }, [startDate, endDate])

    const toggleReturn = (id) => {
        setExpandedReturns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '---'
        try {
            // SQLite returns YYYY-MM-DD HH:MM:SS, JS prefers T separator
            const normalized = dateStr.includes(' ') && !dateStr.includes('T')
                ? dateStr.replace(' ', 'T')
                : dateStr
            const d = new Date(normalized)
            if (isNaN(d.getTime())) return dateStr
            return d.toLocaleString('ar-EG')
        } catch (e) {
            return dateStr
        }
    }

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-center">
                <Clock className="w-6 h-6 text-amber-500" />
                <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-slate-600 outline-none px-2" />
                    <span className="text-slate-300">إلى</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-slate-600 outline-none px-2" />
                </div>
                <div className="flex-1"></div>
                <div className="bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100"><span className="text-amber-600 font-bold ml-2">إجمالي المرتجعات:</span><span className="text-amber-700 font-black text-xl">{returns.length}</span></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-5 font-black text-slate-500 text-sm">كود الفاتورة الأصلية</th>
                            <th className="p-5 font-black text-slate-500 text-sm">تاريخ الارتجاع</th>
                            <th className="p-5 font-black text-slate-500 text-sm">المسؤول</th>
                            <th className="p-5 font-black text-slate-500 text-sm">قيمة المرتجع</th>
                            <th className="p-5 font-black text-slate-500 text-sm text-center">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                        {returns.map(ret => (
                            <React.Fragment key={ret.id}>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="p-5 text-brand-primary">#{ret.invoice_code || ret.original_sale_id}</td>
                                    <td className="p-5 text-xs">{formatDate(ret.return_date)}</td>
                                    <td className="p-5">{ret.cashier_name}</td>
                                    <td className="p-5 text-red-600">{ret.total_refund || 0} ج.م</td>
                                    <td className="p-5 text-center">
                                        <button onClick={() => toggleReturn(ret.id)} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                                            {expandedReturns.includes(ret.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence>
                                    {expandedReturns.includes(ret.id) && (
                                        <tr>
                                            <td colSpan="5" className="p-0 bg-slate-50/50">
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-6 overflow-hidden">
                                                    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-r-4 border-amber-500 pr-3">الأصناف المرتجعة</h4>
                                                        {(() => {
                                                            const items = ret.items || [];
                                                            const unifiedItems = [];
                                                            const bottleIndices = new Set();
                                                            const oilIndices = new Set();

                                                            // Pass 1: Tag all bottles and oils/mixtures
                                                            items.forEach((item, idx) => {
                                                                const itemName = item.item_name || item.name || item.product_name || '';
                                                                const itemDetails = typeof item.details === 'string' ? item.details : (item.details?.text || '');
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
                                                                    itemDetails.includes('المكونات:') ||
                                                                    (parsedDetails?.items && parsedDetails.items.length > 0);

                                                                if (isBottle) bottleIndices.add(idx);
                                                                else if (isOil) oilIndices.add(idx);
                                                            });

                                                            const processed = new Set();

                                                            // Pass 2: Pair oils with bottles regardless of order
                                                            items.forEach((item, idx) => {
                                                                if (processed.has(idx)) return;
                                                                if (oilIndices.has(idx)) {
                                                                    const itemName = item.item_name || item.name || item.product_name || '';
                                                                    const iDetailsRaw = item.details ? (typeof item.details === 'string' ? item.details : JSON.stringify(item.details)) : '';
                                                                    let details = null;
                                                                    try {
                                                                        details = item.details ? (typeof item.details === 'string' ? JSON.parse(item.details) : item.details) : null;
                                                                    } catch (e) { }

                                                                    // Look for a bottle that belongs to this oil
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

                                                                        // Aggressive Text Match
                                                                        const textMatch = bName && iDetailsRaw.includes(bName);

                                                                        if (parentMatch || mixMatch || textMatch) {
                                                                            foundBottleIdx = bIdx;
                                                                            break;
                                                                        }
                                                                    }

                                                                     if (foundBottleIdx !== -1) {
                                                                         const bottle = items[foundBottleIdx];
                                                                         const bottleName = bottle.item_name || bottle.name || '';
                                                                         processed.add(foundBottleIdx);
                                                                         unifiedItems.push({
                                                                             ...item,
                                                                             item_name: 'تركيبة عطور',
                                                                             bottle_name: bottleName, // Store it
                                                                             refund_amount: (parseFloat(item.refund_amount) || 0) + (parseFloat(bottle.refund_amount) || 0)
                                                                         });
                                                                     } else {
                                                                        unifiedItems.push(item);
                                                                    }
                                                                    processed.add(idx);
                                                                }
                                                            });

                                                            // Pass 3: Add remaining items (that weren't processed as oils or claimed bottles)
                                                            items.forEach((item, idx) => {
                                                                if (!processed.has(idx)) {
                                                                    unifiedItems.push(item);
                                                                }
                                                            });

                                                            return unifiedItems.map((it, i) => {
                                                                const details = it.details && parseDetails ? parseDetails(it.details) : '';
                                                                const isUnified = it.item_name === 'تركيبة عطور';

                                                                return (
                                                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                                                                                <Package className="w-4 h-4 text-slate-300" />
                                                                            </div>
                                                                            <div>
                                                                                 <p className="font-black text-sm text-slate-800">
                                                                                     {isUnified && it.bottle_name ? `تركيبة عطور (${it.bottle_name})` : it.item_name}
                                                                                 </p>
                                                                                {details && <p className="text-[10px] text-brand-primary font-bold whitespace-pre-line leading-relaxed">{details}</p>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-left font-black text-slate-400 text-sm">
                                                                            {isUnified ? '' : `${it.quantity} قطعة × `}
                                                                            {(it.quantity > 0 ? (it.refund_amount / it.quantity).toFixed(2) : it.refund_amount)} ج.م
                                                                            <p className="text-red-500 text-xs">الإجمالي: {it.refund_amount} ج.م</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                        {ret.reason && <div className="mt-4 pt-4 border-t border-slate-50"><p className="text-xs font-black text-slate-400 mb-1">سبب الارتجاع:</p><p className="text-sm font-bold text-slate-600">{ret.reason}</p></div>}
                                                    </div>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
