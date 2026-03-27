import React, { useState, useEffect } from 'react'
import { Plus, PlusCircle, Search, History, Banknote, Save, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function SuppliersView({ products = [], onRefresh, notify, ask }) {
    const [suppliers, setSuppliers] = useState([])
    const [search, setSearch] = useState('')
    const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 8) + '01') // Start of month
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

    const [showRegister, setShowRegister] = useState(false)
    const [showPurchase, setShowPurchase] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState(null)
    const [showPayment, setShowPayment] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [supplierHistory, setSupplierHistory] = useState([])
    const [recordDebt, setRecordDebt] = useState(true)

    // Product search in purchase
    const [productSearchTerm, setProductSearchTerm] = useState('')
    const [activeSearchIdx, setActiveSearchIdx] = useState(null)
    const [showQuickProduct, setShowQuickProduct] = useState(false)
    const [qpd, setQpd] = useState({ name: '', price: '', category: 'product', barcode: '', qty: '1' })

    // Barcode Listener for Purchase Screen
    useEffect(() => {
        if (!showPurchase) return;

        let buffer = '';
        let lastKeyTime = Date.now();

        const handleBarcodePurchase = (e) => {
            const currentTime = Date.now();
            if (currentTime - lastKeyTime > 200) buffer = ''; // Increased to 200ms for reliability
            lastKeyTime = currentTime;

            if (e.key === 'Enter') {
                if (buffer.length > 2) {
                    const safeProducts = products || [];
                    const product = safeProducts.find(p => p.barcode === buffer || p.barcode === buffer.trim());

                    if (product) {
                        // If we are in Quick Add mode, we might want to switch to this product? 
                        // But user specifically asked for "Rapid Add" of NEW products.
                        // Existing products should just be added to the list.
                        notify(`تم إضافة: ${product.name}`, 'success');
                        setPurchaseItems(prev => {
                            const lastItem = prev[prev.length - 1];
                            if (lastItem && !lastItem.product_id) {
                                const newArr = [...prev];
                                newArr[prev.length - 1] = { product_id: product.id, quantity: 1, unit_price: product.price || 0 };
                                return [...newArr, { product_id: '', quantity: '', unit_price: '' }];
                            }
                            return [...prev, { product_id: product.id, quantity: 1, unit_price: product.price || 0 }, { product_id: '', quantity: '', unit_price: '' }];
                        });
                        if (showQuickProduct) setShowQuickProduct(false);
                    } else {
                        // Rapid Workflow: If already in Quick Add and scanning a NEW barcode
                        if (showQuickProduct && qpd.barcode !== buffer) {
                            notify('تم رصد باركود جديد، يرجى إدخال بيانات المنتج الجديد', 'info');
                            setQpd({ name: '', price: '', category: 'oil', barcode: buffer });
                        } else if (!showQuickProduct) {
                            notify('منتج غير مسجل، جاري فتح إضافة المنتج السريع...', 'warning');
                            setQpd({ name: '', price: '', category: 'oil', barcode: buffer });
                            setShowQuickProduct(true);
                        }
                    }
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleBarcodePurchase);
        return () => window.removeEventListener('keydown', handleBarcodePurchase);
    }, [showPurchase, showQuickProduct, products, qpd.barcode]);

    // Form for new supplier
    const [newName, setNewName] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [newAddress, setNewAddress] = useState('')

    // Form for new purchase
    const [purchaseItems, setPurchaseItems] = useState([{ product_id: '', quantity: '', unit_price: '', selling_price: '', wholesale_price: '' }])
    const [paidAmount, setPaidAmount] = useState('')

    // Form for payment/adjustment
    const [adjustmentAmount, setAdjustmentAmount] = useState('')
    const [adjustmentNote, setAdjustmentNote] = useState('')

    useEffect(() => { loadSuppliers() }, [fromDate, toDate])

    const loadSuppliers = async () => {
        try {
            const res = await window.api.invoke('suppliers:get', { fromDate, toDate })
            setSuppliers(Array.isArray(res) ? res : [])
        } catch (err) {
            console.error('Failed to load suppliers:', err)
            notify('فشل تحميل بيانات الموردين', 'error')
            setSuppliers([])
        }
    }

    const handleAddSupplier = async () => {
        if (!newName) return notify('يرجى إدخال اسم المورد', 'error')
        try {
            await window.api.invoke('suppliers:add', { name: newName, phone: newPhone, address: newAddress })
            setNewName(''); setNewPhone(''); setNewAddress(''); setShowRegister(false)
            loadSuppliers()
            notify('تم تسجيل المورد بنجاح', 'success')
        } catch (err) {
            console.error('Failed to add supplier:', err)
            notify('حدث خطأ أثناء تسجيل المورد', 'error')
        }
    }

    const handlePurchase = async () => {
        if (!selectedSupplier) return notify('يرجى اختيار المورد', 'error')
        const items = purchaseItems.filter(i => i.product_id)
        if (items.length === 0) return notify('يرجى إضافة أصناف للمشتريات', 'error')

        const total = items.reduce((acc, i) => acc + ((parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0)), 0)
        const paid = parseFloat(paidAmount) || 0
        const remaining = total - paid

        try {
            const res = await window.api.invoke('suppliers:purchase', {
                supplier_id: selectedSupplier.id,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: parseFloat(i.quantity) || 1,
                    unit_price: parseFloat(i.unit_price) || 0,
                    selling_price: parseFloat(i.selling_price) || 0,
                    wholesale_price: parseFloat(i.wholesale_price) || 0
                })),
                total_amount: total,
                paid_amount: paid,
                remaining_amount: remaining,
                record_debt: recordDebt
            })

            if (res && res.success) {
                notify('تم تسجيل الفاتورة وتحديث المخزون والأسعار بنجاح', 'success')
                setShowPurchase(false)
                setPurchaseItems([{ product_id: '', quantity: '', unit_price: '', selling_price: '', wholesale_price: '' }])
                setPaidAmount('')
                loadSuppliers()
                if (onRefresh) onRefresh()
            } else {
                notify('فشل تسجيل الفاتورة: ' + (res?.message || 'خطأ غير معروف'), 'error')
            }
        } catch (err) {
            console.error('Purchase failed:', err)
            notify('حدث خطأ تقني أثناء تسجيل الفاتورة', 'error')
        }
    }

    const handleAdjustDebt = async (type) => {
        if (!adjustmentAmount) return notify('يرجى إدخال المبلغ', 'error')
        const amount = parseFloat(adjustmentAmount) * (type === 'pay' ? -1 : 1)

        try {
            const res = await window.api.invoke('suppliers:adjust-debt', {
                supplier_id: selectedSupplier.id,
                amount,
                description: adjustmentNote || (type === 'pay' ? 'دفعة للمورد' : 'تعديل مديونية')
            })

            if (res && res.success) {
                notify('تم تسجيل العملية بنجاح', 'success')
                setShowPayment(false)
                setAdjustmentAmount('')
                setAdjustmentNote('')
                loadSuppliers()
            } else {
                notify('فشل تنفيذ العملية: ' + (res?.message || 'خطأ غير معروف'), 'error')
            }
        } catch (err) {
            console.error('Adjust debt failed:', err)
            notify('حدث خطأ تقني أثناء تسوية الحساب', 'error')
        }
    }

    const handleQuickProductAdd = async () => {
        if (!qpd.name) return notify('يرجى إدخال اسم المنتج', 'error')
        const priceNum = parseFloat(qpd.price) || 0
        const res = await window.api.addProduct({
            name: qpd.name,
            price: qpd.category !== 'oil' ? priceNum : 0,
            price_per_ml: qpd.category === 'oil' ? priceNum : 0,
            stock_quantity: 0,
            min_stock: 10,
            category: qpd.category,
            barcode: qpd.barcode,
            wholesale_price: qpd.category !== 'oil' ? (parseFloat(qpd.wholesale_price) || 0) : 0,
            wholesale_price_per_ml: qpd.category === 'oil' ? (parseFloat(qpd.wholesale_price) || 0) : 0
        })

        if (res.success) {
            notify('تم إضافة المنتج بنجاح', 'success')
            onRefresh()

            // Add to purchase items list
            const qtyNum = parseFloat(qpd.qty) || 1
            const newItem = { product_id: res.id, quantity: qtyNum, unit_price: priceNum }

            setPurchaseItems(prev => {
                const lastItem = prev[prev.length - 1]
                if (lastItem && !lastItem.product_id) {
                    const newArr = [...prev]
                    newArr[prev.length - 1] = newItem
                    return [...newArr, { product_id: '', quantity: '', unit_price: '' }]
                }
                return [...prev, newItem, { product_id: '', quantity: '', unit_price: '' }]
            })

            setShowQuickProduct(false)
            setQpd({ name: '', price: '', wholesale_price: '', category: 'product', barcode: '', qty: '1' })
            setActiveSearchIdx(null)
        }
    }

    const handleQuickBarcodeLookup = async (code) => {
        if (!code || code.length < 3) return
        try {
            const product = await window.api.findProductByBarcode(code)
            if (product) {
                notify('هذا الباركود مسجل لمنتج بالفعل، تم جلب بياناته', 'info')
                setQpd({
                    ...qpd,
                    name: product.name,
                    category: product.category,
                    price: product.category === 'oil' ? (product.price_per_ml || '').toString() : (product.price || '').toString(),
                    barcode: product.barcode
                })
            }
        } catch (err) {
            console.error('Quick lookup error:', err)
        }
    }

    const loadHistory = async (supplierId) => {
        try {
            const res = await window.api.invoke('suppliers:get-history', supplierId)
            setSupplierHistory(Array.isArray(res?.history) ? res.history : [])
        } catch (err) {
            console.error('Failed to load history:', err)
            notify('فشل تحميل سجل المعاملات', 'error')
            setSupplierHistory([])
        }
    }

    const handleAssignBarcode = (idx, barcode) => {
        const newArr = [...purchaseItems]
        // If we want to assign barcode to an existing item, we might need a different IPC or flow
        // For now, let's focus on the user's request to ADD via scanner and assign to NEW.
    }

    const filteredSuppliers = (suppliers || []).filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    const totalDebt = (suppliers || []).reduce((acc, s) => acc + (parseFloat(s.total_debt) || 0), 0)
    const totalVolume = (suppliers || []).reduce((acc, s) => acc + (parseFloat(s.period_volume) || 0), 0)

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4 flex-1 w-full relative">
                    <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                        placeholder="بحث في الموردين..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-brand-primary outline-none font-bold"
                    />
                </div>

                <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 px-2">الفترة:</span>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none text-sm" />
                    <span className="text-slate-300">-</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none text-sm" />
                </div>

                <button onClick={() => { setSelectedSupplier(null); loadHistory(null); setShowHistory(true) }} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-200 transition-all whitespace-nowrap">
                    <History className="w-5 h-5" /> سجل المعاملات العام
                </button>

                <button onClick={() => setShowRegister(true)} className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap">
                    <PlusCircle className="w-5 h-5" /> مورد جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">إجمالي المديونية</p>
                    <p className={`text-3xl font-black ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>{(totalDebt || 0).toLocaleString()} ج.م</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">مشتريات الفترة</p>
                    <p className="text-3xl font-black text-slate-800">{totalVolume.toLocaleString()} ج.م</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">عدد الموردين</p>
                    <p className="text-3xl font-black text-brand-primary">{suppliers.length}</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5 font-black text-slate-500 text-sm">اسم المورد</th>
                            <th className="px-6 py-5 font-black text-slate-500 text-sm">الهاتف</th>
                            <th className="px-6 py-5 font-black text-slate-500 text-sm">المديونية</th>
                            <th className="px-6 py-5 font-black text-slate-500 text-sm">حجم التعامل (الفترة)</th>
                            <th className="px-6 py-5 font-black text-slate-500 text-sm text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 text-lg">{s.name}</div>
                                    <div className="text-xs text-slate-400">{s.address || 'بدون عنوان'}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600 font-mono">{s.phone || '---'}</td>
                                <td className="px-6 py-4">
                                    <span className={`font-black text-lg ${s.total_debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {(s.total_debt || 0).toLocaleString()} ج.م
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-700">{s.period_volume?.toLocaleString() || 0} ج.م</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 justify-center">
                                        <button onClick={() => { setSelectedSupplier(s); setAdjustmentAmount(''); setAdjustmentNote(''); setShowPayment(true) }} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all" title="تسديد دفعة / تعديل"><Banknote className="w-5 h-5" /></button>
                                        <button onClick={() => { setSelectedSupplier(s); setPurchaseItems([{ product_id: '', quantity: '', unit_price: '', selling_price: '', wholesale_price: '' }]); setShowPurchase(true) }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all" title="فاتورة شراء جديدة"><PlusCircle className="w-5 h-5" /></button>
                                        <button onClick={() => { setSelectedSupplier(s); loadHistory(s.id); setShowHistory(true) }} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all" title="سجل هذا المورد"><History className="w-5 h-5" /></button>
                                        <button onClick={() => ask('حذف مورد', `هل أنت متأكد من حذف المورد "${s.name}"؟`, async () => { await window.api.invoke('suppliers:delete', s.id); loadSuppliers(); notify('تم حذف المورد بنجاح', 'success'); })} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="حذف المورد"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals for Register, Purchase, Payment, History */}
            {/* ... (Implementation logic below) ... */}
            <AnimatePresence>
                {showRegister && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl">
                            <h3 className="text-2xl font-black text-slate-800 mb-8 border-r-4 border-brand-primary pr-4">تسجيل مورد جديد</h3>
                            <div className="space-y-6">
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">اسم المورد</label><input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">رقم الهاتف</label><input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">العنوان</label><input value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" /></div>
                                <button onClick={handleAddSupplier} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-lg">إتمام التسجيل</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPurchase && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPurchase(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-10 text-right">
                                <h3 className="text-3xl font-black text-slate-800 border-r-8 border-amber-500 pr-4">فاتورة شراء جديدة - {selectedSupplier?.name}</h3>
                                <button onClick={() => setShowPurchase(false)} className="p-3 bg-slate-100 rounded-2xl"><Plus className="w-6 h-6 rotate-45 text-slate-400" /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {purchaseItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl items-center">
                                        <div className="col-span-4 relative">
                                            <input
                                                type="text"
                                                placeholder="ابحث عن منتج..."
                                                value={activeSearchIdx === idx ? productSearchTerm : ((products || []).find(p => p.id === item.product_id)?.name || '')}
                                                onFocus={() => { setActiveSearchIdx(idx); setProductSearchTerm(''); }}
                                                onChange={e => setProductSearchTerm(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-right"
                                            />
                                            {activeSearchIdx === idx && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[110] max-h-60 overflow-y-auto">
                                                    <div className="p-2 border-b border-slate-50">
                                                        <button onClick={() => { setQpd({ ...qpd, name: productSearchTerm }); setShowQuickProduct(true); }} className="w-full p-3 bg-brand-primary/5 text-brand-primary rounded-xl font-black text-xs flex items-center justify-center gap-2">
                                                            <PlusCircle className="w-4 h-4" /> إضافة منتج جديد: "{productSearchTerm}"
                                                        </button>
                                                    </div>
                                                    {(products || []).filter(p => !p.category || p.category !== 'formula').filter(p => p.name.includes(productSearchTerm)).map(p => (
                                                        <div key={p.id} onClick={() => { const newArr = [...purchaseItems]; newArr[idx].product_id = p.id; setPurchaseItems(newArr); setActiveSearchIdx(null); }} className="p-3 hover:bg-slate-50 cursor-pointer text-right font-bold border-b last:border-0">{p.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" placeholder="الكمية" value={item.quantity} onChange={e => { const newArr = [...purchaseItems]; newArr[idx].quantity = e.target.value; setPurchaseItems(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-center font-bold" title="الكمية المشتراة" />
                                        </div>
                                        <div className="col-span-2.5">
                                            <input type="number" placeholder="سعر الشراء" value={item.unit_price} onChange={e => { const newArr = [...purchaseItems]; newArr[idx].unit_price = e.target.value; setPurchaseItems(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-center font-bold text-amber-600" title="سعر الشراء من المورد" />
                                        </div>
                                        <div className="col-span-2.5">
                                            <input type="number" placeholder="سعر البيع" value={item.selling_price} onChange={e => { const newArr = [...purchaseItems]; newArr[idx].selling_price = e.target.value; setPurchaseItems(newArr); }} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-center font-bold text-green-600" title="سعر البيع للجمهور" />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <button onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))} className="text-red-400 p-2 bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => setPurchaseItems([...purchaseItems, { product_id: '', quantity: '', unit_price: '', selling_price: '', wholesale_price: '' }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2"><PlusCircle className="w-5 h-5" /> إضافة صنف آخر</button>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                                        <div className="text-right">
                                            <p className="text-slate-500 font-bold mb-1">تسجيل المتبقي كمديونية؟</p>
                                        </div>
                                        <button onClick={() => setRecordDebt(!recordDebt)} className={`w-14 h-8 rounded-full transition-all relative ${recordDebt ? 'bg-brand-primary' : 'bg-slate-200'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${recordDebt ? 'right-7' : 'right-1'}`} /></button>
                                    </div>
                                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white text-right">
                                        <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-widest">إجمالي الفاتورة</p>
                                        <p className="text-3xl font-black">{purchaseItems.reduce((acc, i) => acc + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0)), 0).toFixed(2)} ج.م</p>
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <label className="text-sm font-black text-slate-500">المبلغ المدفوع كاش</label>
                                        <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full bg-green-50/50 border-2 border-green-100 rounded-[1.5rem] p-5 font-black text-2xl text-green-700 outline-none" placeholder="كم دفعت للمورد؟" />
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button onClick={handlePurchase} className="h-24 bg-brand-primary text-white rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 hover:scale-[1.02] transition-all"><Save className="w-8 h-8" /> تأكيد وحفظ الفاتورة</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPayment && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPayment(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-md relative z-10 shadow-2xl text-right">
                            <h3 className="text-2xl font-black text-slate-800 mb-8 border-r-4 border-brand-primary pr-4">تسوية حساب: {selectedSupplier?.name}</h3>
                            <div className="space-y-6">
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">المبلغ</label><input type="number" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-2xl outline-none" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">بيان / ملاحظات</label><input value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" placeholder="مثلاً: دفعة كاش، خصم عمولة..." /></div>
                                <button onClick={() => handleAdjustDebt('pay')} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-lg">تسجيل دفعة للمورد 💸</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-2xl text-right">
                            <div className="flex justify-between items-center mb-8 border-r-4 border-brand-primary pr-4">
                                <h3 className="text-2xl font-black text-slate-800">{selectedSupplier ? `سجل تعاملات: ${selectedSupplier.name}` : 'سجل تعاملات الموردين العام'}</h3>
                                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-red-500"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="overflow-y-auto flex-1 pr-2">
                                <table className="w-full text-right border-collapse">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="p-4 font-black text-slate-500">التاريخ</th>
                                            {!selectedSupplier && <th className="p-4 font-black text-slate-500">المورد</th>}
                                            <th className="p-4 font-black text-slate-500">نوع العملية</th>
                                            <th className="p-4 font-black text-slate-500">المبلغ الإجمالي</th>
                                            <th className="p-4 font-black text-slate-500">المدفوع</th>
                                            <th className="p-4 font-black text-slate-500">المتبقي / البيان</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {supplierHistory.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-bold text-slate-500 text-xs">{(item.date && !isNaN(new Date(item.date + 'Z'))) ? new Date(item.date + 'Z').toLocaleDateString('ar-EG') : '---'}</td>
                                                {!selectedSupplier && <td className="p-4 font-black text-slate-800">{item.supplier_name}</td>}
                                                <td className="p-4 text-xs font-bold">{item.type === 'purchase' ? <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg">شراء</span> : <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-lg">تسديد</span>}</td>
                                                <td className="p-4 font-black text-slate-700 text-sm">{(item.total_amount || item.amount)?.toFixed(2)} ج.م</td>
                                                <td className="p-4 font-black text-blue-600 text-sm">{(item.paid_amount || item.amount)?.toFixed(2)} ج.م</td>
                                                <td className="p-4 font-bold text-slate-400 text-xs">
                                                    {item.type === 'purchase' ? (
                                                        <div className="space-y-1">
                                                            {item.items && item.items.length > 0 && (
                                                                <div className="text-slate-600 font-black">
                                                                    {item.items.map(i => i.product_name).join(' ، ')}
                                                                </div>
                                                            )}
                                                            <div>متبقي: {item.remaining_amount?.toFixed(2)} ج.م</div>
                                                        </div>
                                                    ) : item.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showQuickProduct && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative text-right">
                            <h3 className="text-xl font-black text-slate-800 border-r-4 border-brand-primary pr-3 mb-6">إضافة منتج سريع</h3>
                            <button onClick={() => setShowQuickProduct(false)} className="absolute top-6 left-6 text-slate-400"><Plus className="w-6 h-6 rotate-45" /></button>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-xs font-black text-slate-400">اسم المنتج</label><input value={qpd.name} onChange={e => setQpd({ ...qpd, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-right" /></div>
                                <div className="space-y-1"><label className="text-xs font-black text-slate-400">النوع</label><div className="grid grid-cols-3 gap-2"><button onClick={() => setQpd({ ...qpd, category: 'oil' })} className={`py-2 rounded-xl font-bold text-sm ${qpd.category === 'oil' ? 'bg-brand-primary text-white' : 'bg-slate-50 text-slate-500'}`}>زيت</button><button onClick={() => setQpd({ ...qpd, category: 'bottle' })} className={`py-2 rounded-xl font-bold text-sm ${qpd.category === 'bottle' ? 'bg-brand-primary text-white' : 'bg-slate-50 text-slate-500'}`}>زجاجة</button><button onClick={() => setQpd({ ...qpd, category: 'product' })} className={`py-2 rounded-xl font-bold text-sm ${qpd.category === 'product' ? 'bg-brand-primary text-white' : 'bg-slate-50 text-slate-500'}`}>منتج</button></div></div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400">سعر البيع</label>
                                    <input type="number" value={qpd.price} onChange={e => setQpd({ ...qpd, price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-right text-green-600" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400">سعر الشراء</label>
                                    <input type="number" value={qpd.unit_price} onChange={e => setQpd({ ...qpd, unit_price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-right text-amber-600" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400">الكمية</label>
                                    <input type="number" value={qpd.qty} onChange={e => setQpd({ ...qpd, qty: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-right" placeholder="1" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400">الباركود</label>
                                    <input
                                        value={qpd.barcode}
                                        onChange={e => setQpd({ ...qpd, barcode: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-right font-mono"
                                        placeholder="سكانر أو كتابة يدوية..."
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                await handleQuickBarcodeLookup(qpd.barcode);
                                            }
                                        }}
                                    />
                                </div>
                                <button onClick={handleQuickProductAdd} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black mt-4 shadow-xl hover:bg-black transition-all">حفظ وإضافة للفاتورة</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
