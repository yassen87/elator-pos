import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Search, ClipboardList, RotateCcw, Trash2, MessageCircle, X } from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { PrintableInvoice } from './PrintableInvoice'

export function ReportsView({ products, cashiers: initialCashiers, parseDetails, notify, ask, user, settings }) {
    const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'))
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'))
    const [sales, setSales] = useState([])
    const [totalDay, setTotalDay] = useState(0)
    const [totalExpenses, setTotalExpenses] = useState(0)
    const [cashiers, setCashiers] = useState(initialCashiers || [])
    const [selectedCashier, setSelectedCashier] = useState('')
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all')
    const [selectedSource, setSelectedSource] = useState('all')
    const [bestSellingProducts, setBestSellingProducts] = useState([])
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState(null)
    const printRef = useRef()

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => {
            notify('تمت الطباعة بنجاح', 'success')
        }
    })

    const handleWhatsApp = async (sale) => {
        console.log('[ReportsView] handleWhatsApp called for sale:', sale);
        if (!sale.customer_phone) {
            notify('لا يوجد رقم هاتف مسجل لهذا العميل', 'warning');
            return;
        }
        console.log('[ReportsView] Resolved phone:', sale.customer_phone);
        try {
            const res = await window.api.sendWhatsApp({ sale, phone: sale.customer_phone });
            console.log('[ReportsView] IPC result:', res);
            if (res.success) {
                if (res.method === 'bot') {
                    notify('تم إرسال الفاتورة آلياً بنجاح ✅', 'success');
                } else {
                    notify('البوت غير متصل. جاري فتح رابط الإرسال اليدوي...', 'warning');
                    if (res.url) window.api.openExternal(res.url);
                }
            } else {
                notify('فشل الإرسال: ' + res.message, 'error');
            }
        } catch (err) {
            console.error('[ReportsView] WhatsApp error:', err);
            notify('خطأ في إرسال واتساب: ' + err.message, 'error');
        }
    };


    const loadReports = async () => {
        try {
            const res = await window.api.getSalesReport({
                startDate,
                endDate,
                cashier: selectedCashier,
                paymentMethod: selectedPaymentMethod,
                source: selectedSource
            })
            if (res) {
                setSales(res.sales || [])
                setTotalDay(res.total || 0)
                setTotalExpenses(res.totalExpenses || 0)
                setBestSellingProducts(res.bestSelling || [])
            }
        } catch (err) {
            console.error('Failed to load reports:', err)
            notify('فشل تحميل التقارير', 'error')
        }
    }

    useEffect(() => {
        loadReports()

        // Listen for real-time sales updates
        const cleanup = window.api?.onSalesUpdated ? window.api.onSalesUpdated(() => {
            console.log('[ReportsView] Sales update detected, reloading...')
            loadReports()
        }) : null

        return () => {
            if (cleanup) cleanup()
        }
    }, [startDate, endDate, selectedCashier, selectedPaymentMethod, selectedSource])

    const handleDeleteSale = async (id) => {
        ask('حذف فاتورة', 'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة الكميات للمخزون.', async () => {
            const res = await window.api.deleteSale(id)
            if (res.success) {
                notify('تم حذف الفاتورة بنجاح', 'success')
                loadReports()
            } else {
                notify('فشل الحذف: ' + res.message, 'error')
            }
        })
    }

    const handleEditSave = async () => {
        try {
            const res = await window.api.updateSale(editData);
            if (res.success) {
                notify('تم تحديث الفاتورة بنجاح', 'success');
                setIsEditing(false);
                setSelectedInvoice(null);
                loadReports();
            } else {
                notify('فشل التحديث: ' + res.message, 'error');
            }
        } catch (err) {
            notify('خطأ تقني: ' + err.message, 'error');
        }
    };

    const filteredTotal = sales.reduce((acc, s) => acc + (s.net_total || s.total), 0)

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 mr-1">من تاريخ</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 mr-1">إلى تاريخ</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 mr-1">تصفية حسب البائع</label>
                    <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 font-bold outline-none appearance-none cursor-pointer text-sm">
                        <option value="">جميع البائعين</option>
                        {cashiers.map(c => <option key={c.id} value={c.username}>{c.username}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 font-bold outline-none text-xs">
                        <option value="all">كل طرق الدفع</option>
                        <option value="cash">كاش</option>
                        <option value="visa">فيزا</option>
                        <option value="transfer">تحويل (فودافون/انستا...)</option>
                    </select>
                    <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 font-bold outline-none text-xs">
                        <option value="all">كل المصادر</option>
                        <option value="store">المحل</option>
                        <option value="website">الموقع</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">إجمالي المبيعات (الفترة المحددة)</p>
                    <h2 className="text-5xl font-black">{filteredTotal.toLocaleString()} <span className="text-xl font-bold opacity-50">ج.م</span></h2>
                </div>
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm">
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">إجمالي المصروفات (الفترة المحددة)</p>
                    <h2 className="text-5xl font-black text-red-500">{totalExpenses.toLocaleString()} <span className="text-xl font-bold opacity-30">ج.م</span></h2>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">كود الفاتورة</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">التاريخ والوقت</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">البائع</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">العميل</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">طريقة الدفع</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">الإجمالي</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sales.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-6 py-5 font-black text-brand-primary">#{s.invoice_code || s.id}</td>
                                <td className="px-6 py-5 text-slate-600 font-bold text-xs">{new Date(s.date + 'Z').toLocaleString('ar-EG')}</td>
                                <td className="px-6 py-5 font-bold text-slate-800">{s.cashier_name}</td>
                                <td className="px-6 py-5 text-slate-500 text-xs">
                                    {s.customer_name ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{s.customer_name}</span>
                                            <span>{s.customer_phone}</span>
                                        </div>
                                    ) : '---'}
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.payment_method === 'cash' || !s.payment_method ? 'bg-green-100 text-green-700' : s.payment_method === 'visa' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {s.payment_method === 'cash' || !s.payment_method ? 'كاش' : s.payment_method === 'visa' ? 'فيزا' : (s.payment_details || 'تحويل')}
                                    </span>
                                </td>
                                <td className="px-6 py-5 font-black text-slate-900">{(s.net_total || s.total).toFixed(2)} ج.م</td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex items-center gap-2 justify-center">
                                        <button onClick={() => setSelectedInvoice(s)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-brand-primary hover:text-white transition-all"><ClipboardList className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteSale(s.id)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {selectedInvoice && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            {/* Modal Content - Similar to the one in AdminDashboard */}
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div><h3 className="text-2xl font-black text-slate-900">تفاصيل الفاتورة #{selectedInvoice.invoice_code || selectedInvoice.id}</h3><p className="text-sm text-slate-500 font-bold mt-1">بواسطة: {selectedInvoice.cashier_name} | {new Date(selectedInvoice.date + 'Z').toLocaleString('ar-EG')}</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleWhatsApp(selectedInvoice)} className="p-4 bg-green-500 text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-green-500/20 font-black flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        واتساب
                                    </button>
                                    <button onClick={handlePrint} className="p-4 bg-brand-primary text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-brand-primary/20 font-black flex items-center gap-2">طباعة الفاتورة 🖨️</button>

                                    {(user.license_level === '3' || user.role === 'admin' || user.role === 'super_admin') && !isEditing && (
                                        <button onClick={() => {
                                            // Ensure items are cloned for editing
                                            setIsEditing(true);
                                            setEditData({ ...selectedInvoice, items: selectedInvoice.items.map(i => ({ ...i })) });
                                        }} className="p-4 bg-amber-500 text-white rounded-2xl hover:scale-105 transition-all font-black">
                                            تعديل ✍️
                                        </button>
                                    )}
                                    <button onClick={() => { setSelectedInvoice(null); setIsEditing(false); }} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1">
                                {isEditing ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 mr-1 text-right block">اسم العميل</label>
                                                <input value={editData.customer_name || ''} onChange={e => setEditData({ ...editData, customer_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-right" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 mr-1 text-right block">رقم الهاتف</label>
                                                <input value={editData.customer_phone || ''} onChange={e => setEditData({ ...editData, customer_phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-right" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-black text-slate-800 text-right block">الأصناف</label>
                                            {editData.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-row-reverse">
                                                    <div className="flex-1 text-right">
                                                        <p className="text-xs font-black text-slate-400 mb-1">الصنف</p>
                                                        <p className="font-bold text-slate-700">{item.item_name}</p>
                                                    </div>
                                                    <div className="w-24">
                                                        <p className="text-xs font-black text-slate-400 mb-1">الكمية</p>
                                                        <input type="number" value={item.quantity} onChange={e => {
                                                            const newItems = [...editData.items];
                                                            newItems[idx].quantity = Number(e.target.value);
                                                            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                                            setEditData({ ...editData, items: newItems, total: newTotal });
                                                        }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-center" />
                                                    </div>
                                                    <div className="w-24">
                                                        <p className="text-xs font-black text-slate-400 mb-1">السعر</p>
                                                        <input type="number" value={item.price} onChange={e => {
                                                            const newItems = [...editData.items];
                                                            newItems[idx].price = Number(e.target.value);
                                                            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                                            setEditData({ ...editData, items: newItems, total: newTotal });
                                                        }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-center" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center flex-row-reverse">
                                            <p className="text-lg font-black text-brand-primary">الإجمالي الجديد: {editData.total?.toFixed(2)} ج.م</p>
                                            <button onClick={handleEditSave} className="px-8 py-3 bg-green-500 text-white rounded-xl font-black hover:scale-105 transition-all">حفظ التعديلات ✅</button>
                                        </div>
                                    </div>
                                ) : (
                                    <table className="w-full text-right border-collapse">
                                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                                            <tr>
                                                <th className="p-4 font-bold text-slate-500 text-sm">الصنف</th>
                                                <th className="p-4 font-bold text-slate-500 text-sm text-center">الكمية</th>
                                                <th className="p-4 font-bold text-slate-500 text-sm text-center">السعر</th>
                                                <th className="p-4 font-bold text-slate-500 text-sm text-left">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => {
                                                const unifiedItems = [];
                                                const processedIndices = new Set();
                                                const items = selectedInvoice.items || [];

                                                items.forEach((item, idx) => {
                                                    if (processedIndices.has(idx)) return;

                                                    const itemName = item.item_name || item.name || item.product_name || '';
                                                    const itemDetails = typeof item.details === 'string' ? item.details : (item.details?.text || '');

                                                    const isMixture = item.type === 'oil_mix' ||
                                                        itemName.includes('تركيبة') ||
                                                        itemDetails.includes('المكونات:');

                                                    if (isMixture) {
                                                        const unified = { ...item, item_name: 'تركيبة عطور' };
                                                        for (let j = 0; j < items.length; j++) {
                                                            if (j === idx || processedIndices.has(j)) continue;
                                                            const nextItem = items[j];
                                                            const nextItemName = nextItem.item_name || nextItem.name || nextItem.product_name || '';
                                                            const isBottle = nextItem.category?.toLowerCase() === 'bottle' ||
                                                                nextItemName.includes('زجاجة') ||
                                                                nextItemName.includes('زجاجه');

                                                            if (isBottle) {
                                                                unified.price = (parseFloat(unified.price) + parseFloat(nextItem.price));
                                                                unified.bottle_name = nextItemName; // Store it here
                                                                processedIndices.add(j);
                                                                break;
                                                            }
                                                        }
                                                        unifiedItems.push(unified);
                                                    } else {
                                                        // Standalone item (could be a bottle not linked to a mix, or a regular product)
                                                        unifiedItems.push(item);
                                                    }
                                                    processedIndices.add(idx);
                                                });

                                                return unifiedItems.map((item, idx) => {
                                                    let details = parseDetails ? parseDetails(item.details) : null;
                                                    if (details) {
                                                        details = details
                                                            .split('\n')
                                                            .filter(line => !line.includes('السعر:') && !line.includes('سعر:'))
                                                            .join('\n');
                                                    }

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-800">
                                                                        {(item.type === 'oil_mix' || item.name?.includes('تركيبة') || item.item_name?.includes('تركيبة'))
                                                                            ? (item.bottle_name ? `تركيبة عطور (${item.bottle_name})` : 'تركيبة عطور')
                                                                            : (item.item_name || item.name || item.product_name || '---')}
                                                                    </span>
                                                                    {details && <span className="text-[10px] text-slate-400 font-bold whitespace-pre-line leading-relaxed">{details}</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 font-black text-slate-900 text-center">
                                                                {(item.type === 'oil_mix' || item.item_name?.includes('تركيبة') || item.name?.includes('تركيبة')) ? '' : item.quantity}
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-500 text-center">{parseFloat(item.price).toFixed(2)}</td>
                                                            <td className="p-4 font-black text-slate-900 text-left">{(item.price * item.quantity).toFixed(2)} ج.م</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                        <tfoot className="bg-slate-50 font-black">
                                            <tr>
                                                <td colSpan="3" className="p-4 text-left text-slate-400 uppercase text-xs tracking-widest">المجموع الكلي</td>
                                                <td className="p-4 text-left text-brand-primary text-xl">{(selectedInvoice.net_total || selectedInvoice.total).toFixed(2)} ج.م</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            <div style={{ display: 'none' }}><PrintableInvoice ref={printRef} sale={selectedInvoice} settings={settings} parseDetails={parseDetails} /></div>
        </div >
    )
}
