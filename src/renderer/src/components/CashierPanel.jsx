
import { useState, useEffect, useRef } from 'react'
import {
    ShoppingCart,
    Search,
    User,
    Printer,
    Trash2,
    Plus,
    Minus,
    LogOut,
    History,
    Tag,
    FlaskConical,
    RefreshCw,
    AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'

export default function CashierPanel({ user, onLogout, notify, ask }) {
    const [products, setProducts] = useState([])
    const [formulas, setFormulas] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [cart, setCart] = useState([])
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [salesHistory, setSalesHistory] = useState([])
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [transferType, setTransferType] = useState('vodafone_cash')

    const [settings, setSettings] = useState({})

    const [showPreview, setShowPreview] = useState(false)
    const [filter, setFilter] = useState('all')
    const [oilConfig, setOilConfig] = useState({ show: false, oils: [], price: '', discount: '', bottle: null })
    const [lastBottle, setLastBottle] = useState(null) // Remember last used bottle
    const [showReturns, setShowReturns] = useState(false)
    const [returnInvoiceId, setReturnInvoiceId] = useState('')
    const [returnSale, setReturnSale] = useState(null)
    const [selectedReturnItems, setSelectedReturnItems] = useState([])
    const [returnType, setReturnType] = useState('refund') // 'refund' or 'exchange'
    const [returnReason, setReturnReason] = useState('')
    const [searchOilTerm, setSearchOilTerm] = useState('') // New search term for formula oils
    const [customersList, setCustomersList] = useState([]) // For autocomplete
    const [printedSaleId, setPrintedSaleId] = useState(null)
    const [printedInvoiceCode, setPrintedInvoiceCode] = useState(null)
    const [sessionInvoiceCode, setSessionInvoiceCode] = useState(null)
    const [receiptData, setReceiptData] = useState({ items: [], total: 0, invoiceCode: null, saleId: null })
    const [isPrinting, setIsPrinting] = useState(false)

    const parseDetails = (details) => {
        if (!details) return '';
        try {
            const parsed = JSON.parse(details);
            if (parsed.text) return parsed.text;

            // المحاولة لاسترجاع التفاصيل من الكائنات المحفوظة (للإصدارات القديمة)
            if (parsed.oils && Array.isArray(parsed.oils)) {
                const parts = parsed.oils.map(o => {
                    const name = o.name || products.find(p => p.id === o.id)?.name || 'زيت غير معروف';
                    return `${name} (${o.quantity} جم)`;
                });

                let bottleName = '';
                if (parsed.bottle_id) {
                    bottleName = products.find(p => p.id === parsed.bottle_id)?.name || 'زجاجة';
                }

                return bottleName ? `${bottleName}-${parts.join(' + ')} ` : parts.join(' + ');
            }

            return '';
        } catch (e) {
            return details;
        }
    }
    const componentRef = useRef()

    useEffect(() => {
        if (isPrinting && receiptData.items.length > 0) {
            handlePrint()
            setIsPrinting(false)
        }
    }, [isPrinting, receiptData])

    useEffect(() => {
        loadData()

        // Real-time sync for sales and products
        const cleanup = window.api.onSalesUpdated(() => {
            console.log('[SYNC] Sales updated, refreshing records...')
            loadSalesHistory()
            loadData() // Reload products in case stock changed
        })

        return cleanup
    }, [])

    const loadData = async () => {
        const p = await window.api.getProducts()
        const f = await window.api.getFormulas()
        const s = await window.api.getSettings()
        const customers = await window.api.getCustomersList()
        setProducts(p)
        setFormulas(f)
        setSettings(s)
        setCustomersList(customers || [])
        console.log('Loader complete. Bottles found:', p.filter(x => x.category?.toLowerCase() === 'bottle' || x.category === 'زجاجة').length)
        console.log('[DEBUG] Facebook URL from settings:', s.facebook_url)
    }

    const loadSalesHistory = async () => {
        const history = await window.api.getSalesHistory({ limit: 100, cashierId: user.id })
        setSalesHistory(history)
    }

    useEffect(() => {
        if (showHistory) {
            loadSalesHistory()
        }
    }, [showHistory])

    const addToCart = (item, type = 'product') => {
        const isBottle = item.category?.toLowerCase() === 'bottle' || item.category === 'زجاجة'
        const isOil = item.category?.toLowerCase() === 'oil' || item.category === 'زيت'

        if (isOil && !isBottle) {
            // Only open mixer modal for raw oils
            setOilConfig({
                show: true,
                oils: [{ oil: item, ml: '' }],
                bottle: lastBottle,
                price: '',
                discount: ''
            })
            return
        }

        if (isBottle && Number(item.stock_quantity) <= 0) {
            console.log('Stock check triggered for bottle:', item.name, 'Stock:', item.stock_quantity)
            notify(`زجاجة ${item.name} غير متوفرة حالياً في المخزون! ❌`, 'error')
            return
        }

        // ... بقية منطق الإضافة العادي سيتم التعامل معه في دالة منفصلة للمنتجات العادية
        proceedAddToCart(item, type)
    }

    const proceedAddToCart = (item, type, customPrice = null, ml = null, bottleId = null) => {
        const finalPrice = customPrice !== null ? parseFloat(customPrice) : (item.price || item.total_price || 0)

        const cartItem = {
            ...item,
            type,
            qty: 1,
            price: finalPrice,
            // بيانات إضافية للخصم لاحقاً
            oil_id: item.category === 'oil' ? item.id : null,
            bottle_id: bottleId,
            ml: ml
        }

        const existing = cart.find(c => c.id === item.id && c.type === type && c.oil_id === cartItem.oil_id && c.bottle_id === cartItem.bottle_id)

        if (existing) {
            // منطق تحديث الكمية (بسيط للمثال)
            setCart(cart.map(c => (c.id === item.id && c.type === type && c.oil_id === cartItem.oil_id && c.bottle_id === cartItem.bottle_id) ? { ...c, qty: c.qty + 1 } : c))
        } else {
            setCart([...cart, cartItem])
        }
    }

    const updatePrice = (id, type, newPrice) => {
        const price = parseFloat(newPrice)
        if (isNaN(price) || price < 0) return

        setCart(cart.map(c => {
            if (c.id === id && c.type === type) {
                return { ...c, price: price }
            }
            return c
        }))
    }

    const updateQty = (id, type, delta) => {
        setCart(cart.map(c => {
            if (c.id === id && c.type === type) {
                const newQty = Math.max(1, c.qty + delta)

                // تحقق إضافي عند الزيادة للتركيبات
                if (delta > 0 && type === 'formula') {
                    const item = formulas.find(f => f.id === id)
                    const insufficient = item.items.find(ing => {
                        if (!ing.product_id) return false // تجاهل المكونات المخصصة
                        const p = products.find(prod => prod.id === ing.product_id)
                        return !p || p.stock_quantity < (ing.quantity * newQty)
                    })
                    if (insufficient) {
                        const p = products.find(prod => prod.id === insufficient.product_id)
                        notify(`لا يمكن زيادة الكمية لنقص في ${p?.name || 'المكونات'} `, 'error')
                        return c
                    }
                }

                if (delta > 0 && type === 'product') {
                    const p = products.find(prod => prod.id === id)
                    if (newQty > p.stock_quantity) {
                        notify(`الكمية المتاحة هي ${p.stock_quantity} فقط`, 'error')
                        return c
                    }
                }

                return { ...c, qty: newQty }
            }
            return c
        }))
    }

    const removeFromCart = (id, type) => {
        setCart(cart.filter(c => !(c.id === id && c.type === type)))
    }

    const total = cart.reduce((acc, item) => acc + ((parseFloat(item.price) || parseFloat(item.total_price) || 0) * item.qty), 0)

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    })

    const handleConfirmSale = async () => {
        if (cart.length === 0) return

        // Final Stock Check before processing
        for (const cartItem of cart) {
            if (cartItem.bottle_id) {
                const b = products.find(p => p.id === cartItem.bottle_id)
                if (b && Number(b.stock_quantity) <= 0) {
                    notify(`فشل العملية: زجاجة ${b.name} غير متوفرة حالياً! ❌`, 'error')
                    loadData() // Refresh items
                    return
                }
            }
            if (cartItem.type === 'product' && !cartItem.bottle_id) {
                const p = products.find(prod => prod.id === cartItem.id)
                if (p && Number(p.stock_quantity) < cartItem.qty) {
                    notify(`فشل العملية: الكمية غير كافية من ${p.name} ! ❌`, 'error')
                    loadData()
                    return
                }
            }
        }
        // Snapshot current cart for printing
        const snapshotItems = cart.map(c => ({
            name: c.name,
            price: c.price || c.total_price,
            quantity: c.qty,
            description: c.description || '',
            discount: c.discount || 0
        }))
        const snapshotTotal = total

        const result = await window.api.addSale({
            total,
            cashier_id: user.id,
            customer_name: customerName,
            customer_phone: customerPhone,
            invoice_code: sessionInvoiceCode,
            payment_method: paymentMethod,
            payment_details: paymentMethod === 'transfer' ? transferType : '',
            items: cart.map(c => ({
                name: c.name,
                price: c.price || c.total_price,
                quantity: c.qty,
                product_id: c.type === 'product' ? c.id : null,
                formula_id: c.type === 'formula' ? c.id : null,
                oils: c.oils, // Array of {oil_id, ml}
                bottle_id: c.bottle_id,
                description: c.description // Plain text for now, backend will JSON-ify
            }))
        })

        if (result.success) {
            setPrintedSaleId(result.id)
            setPrintedInvoiceCode(result.invoiceCode)
            setReceiptData({
                items: snapshotItems,
                total: snapshotTotal,
                invoiceCode: result.invoiceCode,
                saleId: result.id
            })
            setIsPrinting(true)
            notify(`تمت العملية بنجاح! رقم الفاتورة: ${result.invoiceCode} `, 'success')
        }

        setShowPreview(false)
        setCart([])
        setCustomerName('')
        setCustomerPhone('')
        loadData()
    }

    // Returns functions
    const handleLookupInvoice = async () => {
        let cleanId = returnInvoiceId.trim().replace('#', '')

        // Convert Arabic numbers to English if any
        const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g]
        arabicNumbers.forEach((r, i) => {
            cleanId = cleanId.replace(r, i)
        })

        if (!cleanId) {
            notify('من فضلك أدخل رقم العملية', 'error')
            return
        }

        console.log('[DEBUG] Looking up sale identifier:', cleanId)
        const sale = await window.api.findSaleById(cleanId)
        if (!sale) {
            notify(`لم يتم العثور على فاتورة رقم ${returnInvoiceId} `, 'error')
            return
        }

        setReturnSale(sale)
        setSelectedReturnItems(sale.items.map(item => ({
            ...item,
            returnQty: 0,
            selected: false,
            maxReturnQty: item.remaining_quantity || 0
        })))
    }

    const handleToggleReturnItem = (index) => {
        const newItems = [...selectedReturnItems]
        const item = newItems[index]

        // Don't allow selection if fully returned
        if (item.remaining_quantity <= 0) {
            notify('هذا المنتج تم إرجاعه بالكامل', 'error')
            return
        }

        newItems[index].selected = !newItems[index].selected
        if (newItems[index].selected) {
            newItems[index].returnQty = newItems[index].remaining_quantity || newItems[index].quantity
        } else {
            newItems[index].returnQty = 0
        }
        setSelectedReturnItems(newItems)
    }

    const handleProcessReturn = async () => {
        const itemsToReturn = selectedReturnItems.filter(i => i.selected && i.returnQty > 0)

        if (itemsToReturn.length === 0) {
            notify('من فضلك اختر على الأقل منتج واحد للإرجاع', 'error')
            return
        }



        const totalRefund = itemsToReturn.reduce((sum, item) => sum + (item.price * item.returnQty), 0)

        const returnData = {
            original_sale_id: returnSale.id,
            return_type: returnType,
            cashier_id: user.id,
            customer_name: returnSale.customer_name || '',
            customer_phone: returnSale.customer_phone || '',
            reason: returnReason,
            total_refund: totalRefund,
            notes: '',
            items: itemsToReturn.map(item => {
                const product = products.find(p => p.name === item.item_name)
                return {
                    product_id: product ? product.id : null,
                    item_name: item.item_name,
                    quantity: item.returnQty,
                    refund_amount: item.price * item.returnQty
                }
            })
        }

        const result = await window.api.addReturn(returnData)

        if (result.success) {
            notify(`تم تسجيل ${returnType === 'refund' ? 'استرجاع' : 'استبدال'} بنجاح! المبلغ: ${totalRefund.toFixed(2)} ج.م`, 'success')
            setShowReturns(false)
            setReturnInvoiceId('')
            setReturnSale(null)
            setSelectedReturnItems([])
            setReturnType('refund')
            setReturnReason('')
            loadData()
        } else {
            notify('حدث خطأ أثناء معالجة الإرجاع', 'error')
        }
    }

    const filteredItems = [
        ...(filter === 'all' || filter === 'product' ? products.map(p => ({ ...p, itemType: 'product' })) : []),
        ...(filter === 'all' || filter === 'formula' ? formulas.map(f => ({ ...f, itemType: 'formula' })) : [])
    ].filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-noto">
            {/* Sidebar / Categories & Search */}
            <div className="flex-1 flex flex-col p-8 min-w-0 bg-white/40 backdrop-blur-xl">
                <header className="flex items-center gap-6 mb-10">
                    <div className="relative flex-1 group">
                        <Search className="absolute right-5 top-4 w-6 h-6 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ابحث عن العطر المفضل أو التركيبة..."
                            className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-4 pr-14 pl-6 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-sm text-lg font-bold placeholder:text-slate-300"
                        />
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] hover:bg-slate-50 transition-all text-slate-600 shadow-sm font-black active:scale-95"
                    >
                        <History className="w-6 h-6" />
                        <span>السجل</span>
                    </button>
                    <button
                        onClick={() => setShowReturns(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-red-50 border-2 border-red-100 rounded-[1.5rem] hover:bg-red-100 transition-all text-red-600 shadow-sm font-black active:scale-95"
                    >
                        <RefreshCw className="w-6 h-6" />
                        <span>استرجاع</span>
                    </button>
                    <div className="h-10 w-[2px] bg-slate-100 mx-2"></div>
                    <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'all' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            الكل
                        </button>
                        <button
                            onClick={() => setFilter('product')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'product' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            عطور
                        </button>
                        <button
                            onClick={() => setFilter('formula')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'formula' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            تركيبات
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto pr-2 grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 content-start pb-10">
                    {filteredItems.map(item => (
                        <motion.button
                            whileHover={{ y: -4, shadow: "0 15px 30px -8px rgba(0, 0, 0, 0.08)" }}
                            whileTap={{ scale: 0.96 }}
                            key={`${item.itemType} -${item.id} `}
                            onClick={() => addToCart(item, item.itemType)}
                            className="bg-white border-2 border-slate-50 p-4 rounded-2xl text-right flex flex-col justify-between h-40 hover:border-brand-primary/20 transition-all shadow-sm group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-50 to-transparent group-hover:via-brand-primary/20 transition-all"></div>

                            <div className="flex justify-between items-start">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.itemType === 'product' ? 'bg-blue-50 text-blue-500' : 'bg-brand-primary/10 text-brand-primary'} `}>
                                    {item.itemType === 'product' ? <Tag className="w-5 h-5" /> : <FlaskConical className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-black mb-0.5 ${item.itemType === 'product' ? 'bg-blue-100/50 text-blue-600' : 'bg-brand-primary/5 text-brand-primary'} `}>
                                        {item.itemType === 'product' ? 'منتج' : 'تركيبة'}
                                    </span>
                                    {item.itemType === 'product' && (
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-black text-[8px] ${item.stock_quantity === 0
                                            ? 'bg-red-50 text-red-500'
                                            : item.stock_quantity <= item.min_stock
                                                ? 'bg-yellow-50 text-yellow-600'
                                                : 'bg-green-50 text-green-600'
                                            } `}>
                                            <div className={`w-1 h-1 rounded-full ${item.stock_quantity === 0 ? 'bg-red-500' : item.stock_quantity <= item.min_stock ? 'bg-yellow-500' : 'bg-green-500'} `}></div>
                                            {item.stock_quantity === 0 ? 'نفد' : `${item.stock_quantity} `}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2">
                                <h3 className="font-black text-slate-800 text-sm truncate mb-0.5 leading-tight group-hover:text-brand-primary transition-colors">{item.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-slate-900 leading-none">{item.price || item.total_price}</span>
                                    <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                                </div>
                            </div>

                            <div className="absolute bottom-3 left-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                <div className="w-8 h-8 bg-brand-primary text-white rounded-lg shadow-lg shadow-brand-primary/30 flex items-center justify-center">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Cart Section (The Modern Receipt) */}
            <div className="w-96 bg-white border-l-2 border-slate-100 flex flex-col shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] relative">
                <header className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20 rotate-3 group">
                                <ShoppingCart className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl text-slate-900 tracking-tight">طلب جديد</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">العناصر: {cart.length}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={() => setCart([])} className="p-2.5 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100" title="تفريغ السلة">
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-slate-900 transition-all bg-slate-50 border border-slate-100 rounded-xl active:scale-90">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border-2 border-slate-50 shadow-inner">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">البائع</div>
                            <div className="text-sm font-black truncate text-slate-800 leading-none">{user.username}</div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto px-8 py-2 space-y-4">
                    <AnimatePresence initial={false}>
                        {cart.map(item => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                key={`${item.type} -${item.id} `}
                                className="bg-white border-2 border-slate-50 p-4 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all relative group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 text-base leading-tight mb-1">{item.name}</h4>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">{item.itemType === 'product' ? 'جاهز' : 'تركيب'}</span>

                                            <div className="flex items-center gap-1 bg-slate-50 rounded-md border border-slate-100 px-1.5 py-0.5">
                                                <input
                                                    type="number"
                                                    className="w-14 bg-transparent font-bold text-slate-800 text-[11px] outline-none border-b border-transparent focus:border-brand-primary transition-colors text-center"
                                                    value={item.price || item.total_price || 0}
                                                    onChange={(e) => updatePrice(item.id, item.type, e.target.value)}
                                                    onClick={(e) => e.target.select()}
                                                />
                                                <span className="text-[9px] text-slate-400">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-brand-primary font-black text-lg leading-none block mb-1">{(item.price || item.total_price || 0) * item.qty}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">ج.م</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 bg-slate-100/50 rounded-xl p-1 border border-slate-100">
                                        <button onClick={() => updateQty(item.id, item.type, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white transition-all text-slate-500 hover:text-brand-primary rounded-lg shadow-sm"><Minus className="w-3 h-3" /></button>
                                        <span className="w-10 text-center font-black text-slate-800 text-base">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, item.type, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white transition-all text-slate-500 hover:text-brand-primary rounded-lg shadow-sm"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id, item.type)} className="w-9 h-9 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 group">
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 py-24 px-10 text-center">
                            <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                                <ShoppingCart className="w-16 h-16 opacity-20 transform -rotate-12" />
                            </div>
                            <h3 className="font-black text-2xl text-slate-300 mb-2">السلة فارغة تماماً</h3>
                            <p className="text-slate-300 text-sm font-bold">ابدأ بإضافة بعض العطور الرائعة لقائمة الطلبات</p>
                        </div>
                    )}
                </div>

                <footer className="p-6 bg-slate-50/80 backdrop-blur-md border-t-2 border-slate-100 space-y-4">
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] text-slate-400 mr-2 uppercase font-black tracking-widest">اسم العميل</label>
                                <div className="relative">
                                    <input
                                        value={customerName}
                                        list="customers-datalist"
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setCustomerName(value)
                                            const customer = customersList.find(c => c.customer_name === value)
                                            if (customer) {
                                                setCustomerPhone(customer.customer_phone || '')
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-black outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all placeholder:text-slate-200"
                                        placeholder="اسم العميل"
                                    />
                                    <datalist id="customers-datalist">
                                        {customersList.map((customer, idx) => (
                                            <option key={idx} value={customer.customer_name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] text-slate-400 mr-2 uppercase font-black tracking-widest">الموبايل</label>
                                <div className="relative">
                                    <input
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-black outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all placeholder:text-slate-200"
                                        placeholder="01xxx..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-1 border-t border-slate-50">
                            <div>
                                <span className="text-slate-400 font-black text-[10px] uppercase tracking-wider block">الإجمالي المستحق</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{total}</span>
                                    <span className="text-sm font-black text-brand-primary uppercase">ج.م</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (cart.length === 0) return
                            try {
                                const nextCode = await window.api.getNextInvoiceCode()
                                setSessionInvoiceCode(nextCode)
                                setReceiptData(prev => ({
                                    ...prev,
                                    invoiceCode: nextCode,
                                    items: cart.map(c => ({
                                        name: c.name,
                                        price: c.price || c.total_price,
                                        quantity: c.qty,
                                        description: c.description || '',
                                        discount: c.discount || 0
                                    }))
                                }))
                                setShowPreview(true)
                            } catch (error) {
                                console.error('Error fetching next code:', error)
                                setShowPreview(true)
                            }
                        }}
                        disabled={cart.length === 0}
                        className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl shadow-slate-900/40 disabled:opacity-20 disabled:shadow-none transition-all active:scale-[0.98] group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Printer className="w-5 h-5 z-10 group-hover:rotate-12 transition-transform" />
                        <span className="text-lg z-10">إصدار الفاتورة</span>
                    </button>
                </footer>
            </div>

            {/* Oil Configuration Modal */}
            <AnimatePresence>
                {oilConfig.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-black text-xl text-slate-800">تركيب عطر جديد (ميكس)</h3>
                                <button
                                    onClick={() => setOilConfig({ show: false, oils: [], price: '', discount: '', bottle: null })}
                                    className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-xl shadow-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 space-y-6">
                                {/* Bottle Selection */}
                                <div className="space-y-2">
                                    <div className="flex gap-2 mb-2">
                                        {[35, 55, 110].map(size => {
                                            const bottleForSize = products.find(p =>
                                                (p.category?.toLowerCase() === 'bottle' || p.category === 'زجاجة') &&
                                                (p.name.includes(size.toString()) || p.name.includes(size === 35 ? '٣٥' : size === 55 ? '٥٥' : '١١٠'))
                                            )

                                            const isNotFound = !bottleForSize
                                            const isOutOfStock = bottleForSize && Number(bottleForSize.stock_quantity) <= 0
                                            const isSelected = oilConfig.bottle?.id === bottleForSize?.id && bottleForSize !== undefined

                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => {
                                                        if (isNotFound) {
                                                            notify(`حجم الزجاجة ${size} مل غير مسجل في النظام! ⚠️`, 'warning')
                                                            return
                                                        }
                                                        if (isOutOfStock) {
                                                            notify(`زجاجة ${bottleForSize.name} نافدة من المخزون! ❌`, 'error')
                                                            return
                                                        }

                                                        setOilConfig({ ...oilConfig, bottle: bottleForSize })
                                                        setLastBottle(bottleForSize)
                                                    }}
                                                    className={`flex-1 py-3 rounded-2xl text-lg font-black transition-all shadow-sm border-2 flex flex-col items-center justify-center gap-0 ${isSelected && !isOutOfStock
                                                        ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/20 scale-105'
                                                        : isOutOfStock || isNotFound
                                                            ? 'bg-red-50 text-red-500 border-red-200 opacity-90'
                                                            : 'bg-white text-slate-600 border-slate-100 hover:border-brand-primary/50 hover:bg-slate-50'
                                                        } `}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        {size} مل
                                                        {isSelected && !isOutOfStock && <span>✔</span>}
                                                        {(isOutOfStock || isNotFound) && <span>❌</span>}
                                                    </span>
                                                    <span className="text-[9px] font-bold opacity-70">
                                                        {isNotFound ? 'غير مسجل' : isOutOfStock ? 'نفد' : `متاح: ${bottleForSize.stock_quantity} `}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <select
                                        value={oilConfig.bottle?.id || ''}
                                        onChange={(e) => {
                                            const bottleId = e.target.value
                                            if (!bottleId) {
                                                setOilConfig({ ...oilConfig, bottle: null })
                                                return
                                            }
                                            const latestBottle = products.find(p => p.id === parseInt(bottleId))

                                            if (latestBottle && Number(latestBottle.stock_quantity) <= 0) {
                                                notify(`زجاجة ${latestBottle.name} غير متوفرة حالياً في المخزون! ❌`, 'error')
                                                // We don't prevent selection here to let user see the error state, 
                                                // but the final validation will block it anyway.
                                            }

                                            setOilConfig({ ...oilConfig, bottle: latestBottle || null })
                                            if (latestBottle) setLastBottle(latestBottle)
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 outline-none focus:border-brand-primary transition-colors font-bold text-slate-700"
                                    >
                                        <option value="">بدون زجاجة (زيت فقط)</option>
                                        {products.filter(p => p.category?.toLowerCase() === 'bottle' || p.category === 'زجاجة').map(b => (
                                            <option key={b.id} value={b.id} className={Number(b.stock_quantity) <= 0 ? 'text-red-400' : ''}>
                                                {b.name} {Number(b.stock_quantity) <= 0 ? '(نفد ❌)' : `(متاح: ${b.stock_quantity})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Oils List */}
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-500">البحث وإضافة زيت/منتج</label>
                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                                {products.filter(p => p.category !== 'bottle' && p.name.toLowerCase().includes(searchOilTerm.toLowerCase())).length} متاح
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن زيت أو منتج..."
                                                className="w-full bg-slate-100 border-none rounded-xl py-2 pr-10 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-slate-400"
                                                value={searchOilTerm}
                                                onChange={(e) => setSearchOilTerm(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="w-full text-sm bg-brand-primary/10 text-brand-primary font-bold py-2.5 px-4 rounded-xl outline-none cursor-pointer hover:bg-brand-primary/20 transition-all border-none"
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                const oilToAdd = products.find(p => p.id === parseInt(e.target.value));
                                                // check if already exists
                                                if (oilConfig.oils.find(o => o.oil.id === oilToAdd.id)) {
                                                    notify('هذا المنتج مضاف بالفعل', 'warning')
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setOilConfig({
                                                    ...oilConfig,
                                                    oils: [...oilConfig.oils, { oil: oilToAdd, ml: '' }]
                                                })
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">+ اختر من القائمة المفلترة</option>
                                            {products
                                                .filter(p => p.category !== 'bottle')
                                                .filter(p => !searchOilTerm || p.name.toLowerCase().includes(searchOilTerm.toLowerCase()))
                                                .map(oil => (
                                                    <option key={oil.id} value={oil.id}>{oil.name} ({oil.category === 'oil' ? 'زيت' : 'منتج'})</option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        {oilConfig.oils.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <div className="flex-1 font-bold text-slate-700">{item.oil.name}</div>
                                                <div className="w-32 relative">
                                                    <input
                                                        type="number"
                                                        placeholder="الكمية"
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pl-8 text-sm font-black outline-none focus:border-brand-primary"
                                                        value={item.ml}
                                                        onChange={(e) => {
                                                            const newOils = [...oilConfig.oils];
                                                            newOils[idx].ml = e.target.value;
                                                            setOilConfig({ ...oilConfig, oils: newOils });
                                                        }}
                                                    />
                                                    <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400">مل</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newOils = oilConfig.oils.filter((_, i) => i !== idx);
                                                        setOilConfig({ ...oilConfig, oils: newOils });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {oilConfig.oils.length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-2xl border-dashed border-2 border-slate-100">
                                                لا يوجد زيوت مختارة. أضف زيت للبدء.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500">سعر البيع الافتراضي</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={oilConfig.price}
                                                onChange={(e) => setOilConfig({ ...oilConfig, price: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pr-4 pl-12 outline-none focus:border-brand-primary transition-colors font-black text-lg"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">ج.م</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-emerald-600">خصم (اختياري)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={oilConfig.discount}
                                                onChange={(e) => setOilConfig({ ...oilConfig, discount: e.target.value })}
                                                className="w-full bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl py-3 pr-4 pl-12 outline-none focus:border-emerald-500 transition-colors font-black text-lg text-emerald-700"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute left-4 top-4 text-xs font-bold text-emerald-400">ج.م</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-slate-900/10">
                                    <span className="font-bold text-slate-400">السعر النهائي بعد الخصم</span>
                                    <span className="font-black text-2xl">
                                        {Math.max(0, (parseFloat(oilConfig.price || 0) - parseFloat(oilConfig.discount || 0))).toFixed(2)} ج.م
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                                <button
                                    onClick={() => {
                                        if (oilConfig.oils.length === 0) {
                                            notify('يجب اختيار زيت واحد على الأقل', 'error')
                                            return
                                        }
                                        if (!oilConfig.price) {
                                            notify('برجاء تحديد السعر', 'error')
                                            return
                                        }

                                        // Validate Stock logic-RE-CHECK against latest products array to avoid stale state
                                        if (oilConfig.bottle && !oilConfig.bottle.isVirtual) {
                                            const latestBottle = products.find(p => p.id === oilConfig.bottle.id)
                                            if (latestBottle && Number(latestBottle.stock_quantity) <= 0) {
                                                notify(`عذراً، زجاجة ${latestBottle.name} نفدت للتو من المخزون! ❌`, 'error')
                                                // Refresh local bottle ref
                                                setOilConfig(prev => ({ ...prev, bottle: latestBottle }))
                                                return
                                            }
                                        }

                                        // Validate Oils Stock
                                        for (const item of oilConfig.oils) {
                                            if (!item.ml || parseFloat(item.ml) <= 0) {
                                                notify(`برجاء تحديد كمية للزيت: ${item.oil.name} `, 'error')
                                                return;
                                            }
                                            if (item.oil.stock_quantity < parseFloat(item.ml)) {
                                                notify(`الكمية غير كافية للزيت: ${item.oil.name} (المتاح: ${item.oil.stock_quantity})`, 'error')
                                                return;
                                            }
                                        }

                                        const finalPrice = Math.max(0, parseFloat(oilConfig.price) - parseFloat(oilConfig.discount || 0));

                                        // Construct a clean, human-readable description for the invoice
                                        const bottleText = oilConfig.bottle ? `نوع الزجاجة: ${oilConfig.bottle.name} ` : 'بدون زجاجة';
                                        const oilsText = oilConfig.oils.map(o => o.oil.name).join(' + ');
                                        const description = `${bottleText} \nالمكونات: ${oilsText} `;

                                        // Prepare cart item
                                        const cartItem = {
                                            id: Date.now(),
                                            type: 'oil_mix',
                                            name: oilConfig.bottle ? `تركيبة عطور` : `زيت خام`, // Generic Name
                                            description: description, // Complete details here
                                            price: finalPrice,
                                            discount: parseFloat(oilConfig.discount) || 0,
                                            qty: 1,
                                            itemType: 'product',
                                            // Backend Data (Keep for Stock deduction)
                                            oils: oilConfig.oils.map(o => ({ oil_id: o.oil.id, ml: parseFloat(o.ml) })),
                                            bottle_id: oilConfig.bottle ? oilConfig.bottle.id : null,
                                        }

                                        setCart([...cart, cartItem])
                                        setOilConfig({ show: false, oils: [], price: '', discount: '', bottle: null })
                                        setLastBottle(null) // Reset or keep? User implied reset flow maybe. detailed flow allows reset.
                                        notify('تم إضافة التركيبة للسلة', 'success')
                                    }}
                                    className="w-full bg-brand-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>إضافة التركيبة للسلة</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-black text-xl text-slate-800">معاينة الفاتورة قبل الطباعة</h3>
                                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-xl">
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
                                <div className="bg-white shadow-xl mx-auto p-8 rounded-xl border border-slate-100 max-w-[80mm] text-right font-mono text-[13px] text-black">
                                    {/* Mockup of the thermal receipt */}
                                    <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
                                        {settings.shop_logo && (
                                            <img
                                                src={settings.shop_logo}
                                                alt="Logo"
                                                className="w-16 h-16 mx-auto mb-2 object-contain grayscale"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        )}
                                        <h1 className="text-lg font-bold m-0">{settings.shop_name}</h1>
                                        <p className="m-1 text-xs">{settings.shop_address}</p>
                                        <p className="m-1 font-bold">هاتف: {settings.shop_phone}</p>
                                    </div>
                                    <div className="mb-4 space-y-1">
                                        <div className="flex justify-between"><span>تاريخ:</span><span>{new Date().toLocaleDateString('ar-EG')}</span></div>
                                        <div className="flex justify-between"><span>رقم الفاتورة:</span><span className="font-black text-lg">#{receiptData.invoiceCode || '---'}</span></div>
                                        <div className="flex justify-between"><span>بائع:</span><span>{user.username}</span></div>
                                        <div className="flex justify-between"><span>عميل:</span><span>{customerName || '---'}</span></div>
                                    </div>
                                    <table className="w-full mb-6 border-y border-dashed border-slate-300 py-2">
                                        <thead>
                                            <tr className="border-b border-slate-900">
                                                <th className="text-right py-1">الصنف</th>
                                                <th className="text-center py-1">ك</th>
                                                <th className="text-left py-1">ج</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.map((item, i) => (
                                                <tr key={i} className="border-b border-slate-50">
                                                    <td className="py-2 text-right">
                                                        <div className="font-bold">{item.name}</div>
                                                        {item.description && <div className="text-[10px] whitespace-pre-line text-slate-500">{item.description}</div>}
                                                        {item.discount > 0 && <div className="text-[10px] font-bold">خصم: {item.discount} ج.م</div>}
                                                    </td>
                                                    <td className="py-2 text-center align-top">{item.qty}</td>
                                                    <td className="py-2 text-left align-top">{((item.price) * item.qty).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="text-center p-3 border-2 border-slate-900 rounded-lg text-lg font-black bg-slate-50 mb-4">
                                        الإجمالي: {total} ج.م
                                    </div>
                                    <div className="text-center text-[10px] space-y-1 opacity-60">
                                        <p>*** شكراً لزيارتكم ***</p>
                                        {settings.qr_code_image && (
                                            <div className="py-2 flex flex-col items-center">
                                                <img
                                                    src={settings.qr_code_image}
                                                    alt="Store QR"
                                                    className="w-24 h-24 mb-1"
                                                />
                                                <p className="text-[8px] font-bold">يمكنكم مسح الكود للتواصل معنا</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 block text-right">طريقة الدفع</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'cash' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            كاش
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('visa')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'visa' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            فيزا
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('transfer')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            تحويل
                                        </button>
                                    </div>
                                </div>

                                {paymentMethod === 'transfer' && (
                                    <div className="space-y-2 animate-fadeIn">
                                        <label className="text-sm font-bold text-slate-700 block text-right">نوع التحويل</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'vodafone_cash', label: 'فودافون كاش' },
                                                { id: 'etisalat_cash', label: 'اتصالات كاش' },
                                                { id: 'instapay', label: 'انستا باي' },
                                                { id: 'fawry', label: 'فوري' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setTransferType(type.id)}
                                                    className={`py-2 rounded-lg font-bold text-sm transition-all ${transferType === type.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-800'} `}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-white border-t border-slate-100 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    تعديل الطلب
                                </button>
                                <button
                                    onClick={handleConfirmSale}
                                    className="px-6 py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl shadow-brand-primary/30 hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    تأكيد وطباعة
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Invoice for Printing (Thermal) */}
            <div style={{ display: 'none' }}>
                <div ref={componentRef} style={{
                    padding: '10px',
                    direction: 'rtl',
                    fontFamily: "'Inter', 'Arial', sans-serif",
                    width: '72mm', // Standard safe width for 80mm printers
                    color: '#000',
                    backgroundColor: '#fff',
                    margin: '0 auto'
                }}>
                    {/* Shop Header */}
                    {/* Shop Header */}
                    <div style={{ textAlign: 'center', marginBottom: '15px', paddingTop: '30px' }}>
                        <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '900' }}>{settings.shop_name}</h1>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}>{settings.shop_address}</p>
                        <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>هاتف: {settings.shop_phone}</p>
                    </div>

                    <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '12px', letterSpacing: '2px' }}>
                        --------------------------------------------------
                    </div>

                    {/* Transaction Info */}
                    <div style={{ marginBottom: '15px', fontSize: '15px', direction: 'rtl', padding: '0 5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', whiteSpace: 'nowrap', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>رقم الفاتورة:</span>
                            <span style={{ fontWeight: '900', fontSize: '16px' }}>#{receiptData.invoiceCode || '---'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>التاريخ:</span>
                            <span>{new Date().toLocaleDateString('ar-EG')}   {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>البائع:</span>
                            <span>{user.username}</span>
                        </div>
                    </div>

                    {/* Items Table Header */}
                    <div style={{
                        display: 'flex',
                        padding: '10px 0',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        borderBottom: '1px solid #000',
                        marginBottom: '10px'
                    }}>
                        <div style={{ flex: 1.5, textAlign: 'right' }}>الصنف</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>الكمية</div>
                        <div style={{ flex: 1.2, textAlign: 'left' }}>الإجمالي</div>
                    </div>

                    {/* Items List */}
                    <div style={{ marginBottom: '10px' }}>
                        {receiptData.items.map((item, idx) => (
                            <div key={idx} style={{
                                padding: '5px 0',
                                fontSize: '13px'
                            }}>
                                <div style={{ display: 'flex', marginBottom: '2px' }}>
                                    <div style={{ flex: 2, textAlign: 'right', fontWeight: 'bold' }}>{item.name}</div>
                                    <div style={{ flex: 0.8, textAlign: 'center' }}>{item.quantity}</div>
                                    <div style={{ flex: 1.2, textAlign: 'left', fontWeight: 'bold' }}>{((item.price) * item.quantity).toFixed(2)}</div>
                                </div>
                                {item.description && (
                                    <div style={{ fontSize: '11px', color: '#000', whiteSpace: 'pre-line', paddingRight: '5px', marginBottom: '2px' }}>
                                        {item.description}
                                    </div>
                                )}
                                {item.discount > 0 && (
                                    <div style={{ fontSize: '11px', color: '#000', fontWeight: 'bold', fontStyle: 'italic' }}>
                                        (خصم: {item.discount} ج.م)
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Total Section */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px 15px',
                        margin: '10px 0',
                        borderTop: '2px solid #000'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '18px',
                            fontWeight: '900',
                            whiteSpace: 'nowrap'
                        }}>
                            <span>الإجمالي النهائـي:</span>
                            <span>{receiptData.total} ج.م</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '20px' }}>
                        <div style={{ fontWeight: '900', fontSize: '18px', marginBottom: '8px' }}>*** شكراً لثقتكم بنا ***</div>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>يسعدنا خدمتكم دائماً</div>
                        <div style={{ marginBottom: '15px' }}>برجاء الاحتفاظ بالفاتورة</div>

                        <div style={{ marginTop: '20px', letterSpacing: '2px', fontSize: '12px' }}>
                            --------------------------------------------------
                        </div>

                        {/* Facebook QR Code */}
                        {/* Custom QR Code Image */}
                        {settings.qr_code_image && (
                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img
                                    src={settings.qr_code_image}
                                    alt="Store QR"
                                    style={{ width: '100px', height: '100px', marginBottom: '5px' }}
                                />
                                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>يمكنكم مسح الكود للتواصل معنا</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sales History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                        onClick={() => setShowHistory(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-brand-primary to-purple-600 text-white p-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <History className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black">سجل المبيعات</h2>
                                        <p className="text-white/80 text-sm font-bold mt-1">آخر {salesHistory.length} عملية بيع</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-8">
                                {salesHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <History className="w-24 h-24 mb-4 opacity-20" />
                                        <p className="text-xl font-bold">لا توجد مبيعات بعد</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {salesHistory.map((sale) => (
                                            <motion.div
                                                key={`${sale.entry_type} -${sale.id} `}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`bg-slate-50 rounded-2xl p-6 border-2 transition-all ${sale.is_return ? 'border-red-100' : 'border-slate-100 hover:border-brand-primary/20'} `}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sale.is_return ? 'bg-red-50' : 'bg-brand-primary/10'} `}>
                                                            {sale.is_return ? (
                                                                <RefreshCw className="w-6 h-6 text-red-500" />
                                                            ) : (
                                                                <ShoppingCart className="w-6 h-6 text-brand-primary" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg font-black text-slate-900">
                                                                    {sale.is_return ? 'مرتجع' : 'فاتورة'} #{sale.invoice_code || sale.id}
                                                                </span>
                                                                {sale.is_return && (
                                                                    <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                                                        عملية مرتجع
                                                                    </span>
                                                                )}
                                                                {sale.customer_name && (
                                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center gap-2">
                                                                        <User className="w-4 h-4" />
                                                                        {sale.customer_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                                <span className="font-bold">{new Date(sale.date).toLocaleString('ar-EG')}</span>
                                                                {sale.cashier_name && (
                                                                    <span className="font-bold">الكاشير: {sale.cashier_name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`text-3xl font-black ${sale.is_return ? 'text-red-500' : 'text-brand-primary'} `}>
                                                            {sale.is_return ? '-' : ''}{sale.total} ج.م
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-bold mt-1">{sale.items?.length || 0} عنصر</div>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                {sale.items && sale.items.length > 0 && (
                                                    <div className="bg-white rounded-xl p-4 space-y-2">
                                                        {sale.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                                        <Tag className="w-4 h-4 text-slate-400" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900">{item.item_name}</div>
                                                                        {item.details && (
                                                                            <div className="text-[10px] text-slate-400 font-bold whitespace-pre-line leading-relaxed">
                                                                                {parseDetails(item.details)}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-xs text-slate-400">الكمية: {item.quantity}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="font-black text-slate-700">{item.price} ج.م</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Returns Modal */}
            <AnimatePresence>
                {showReturns && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50 text-right">
                                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2 flex-row-reverse">
                                    <RefreshCw className="w-7 h-7 text-red-600" />
                                    <span>استرجاع / استبدال منتج</span>
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowReturns(false)
                                        setReturnInvoiceId('')
                                        setReturnSale(null)
                                        setSelectedReturnItems([])
                                    }}
                                    className="text-slate-400 hover:text-slate-900 transition-all"
                                >
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 space-y-6">
                                {!returnSale ? (
                                    /* Step 1: Invoice Lookup */
                                    <div className="space-y-4 text-right">
                                        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 flex flex-row-reverse items-center gap-4">
                                            <AlertCircle className="w-10 h-10 text-blue-600" />
                                            <p className="text-blue-800 font-bold">أدخل رقم العملية (رقم المعرف) للبحث عن البيعة</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={returnInvoiceId}
                                                onChange={(e) => setReturnInvoiceId(e.target.value)}
                                                placeholder="أدخل رقم العملية (مثال: #25)..."
                                                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 text-lg font-bold outline-none focus:border-red-500 transition-all text-right"
                                            />
                                            <button
                                                onClick={handleLookupInvoice}
                                                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95"
                                            >
                                                بحث
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Step 2: Select Items & Process */
                                    <div className="space-y-6 text-right" dir="rtl">
                                        {/* Sale Info */}
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <div className="grid grid-cols-2 gap-4 text-sm text-right">
                                                <div><span className="text-slate-500">كود الفاتورة:</span> <span className="font-black text-xl text-red-600">#{returnSale.invoice_code || '---'}</span></div>
                                                <div><span className="text-slate-500">التاريخ:</span> <span className="font-black">{new Date(returnSale.date).toLocaleDateString('ar-EG')}</span></div>
                                                <div><span className="text-slate-500">العميل:</span> <span className="font-black">{returnSale.customer_name || 'غير محدد'}</span></div>
                                                <div><span className="text-slate-500">الإجمالي:</span> <span className="font-black text-brand-primary">{returnSale.total} ج.م</span></div>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-3">
                                            <h4 className="font-black text-lg">اختر المنتجات المراد إرجاعها:</h4>
                                            {selectedReturnItems.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`border-2 rounded-2xl p-4 transition-all ${item.remaining_quantity <= 0
                                                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                        : item.selected
                                                            ? 'border-red-500 bg-red-50 cursor-pointer'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                                                        } `}
                                                    onClick={() => item.remaining_quantity > 0 && handleToggleReturnItem(idx)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${item.selected ? 'bg-red-600 border-red-600' : 'border-slate-300'
                                                                } `}>
                                                                {item.selected && <span className="text-white font-black text-xs">✓</span>}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-black text-slate-900">{item.item_name}</div>
                                                                    {item.remaining_quantity <= 0 && (
                                                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">تم إرجاعه بالكامل</span>
                                                                    )}
                                                                    {item.returned_quantity > 0 && item.remaining_quantity > 0 && (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg">مرتجع جزئياً</span>
                                                                    )}
                                                                </div>
                                                                {item.details && (
                                                                    <div className="text-[10px] text-slate-400 font-bold whitespace-pre-line leading-relaxed">
                                                                        {parseDetails(item.details)}
                                                                    </div>
                                                                )}
                                                                <div className="text-sm text-slate-500">
                                                                    الكمية: {item.quantity}
                                                                    {item.returned_quantity > 0 && (
                                                                        <span className="text-orange-600 font-bold"> (تم إرجاع {item.returned_quantity})</span>
                                                                    )}
                                                                    {' | '}السعر: {item.price} ج.م
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {item.selected && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400 font-bold">إرجاع كمية:</span>
                                                                <input
                                                                    type="number"
                                                                    value={item.returnQty}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation()
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        const newItems = [...selectedReturnItems]
                                                                        newItems[idx].returnQty = Math.min(val, item.remaining_quantity || item.quantity)
                                                                        setSelectedReturnItems(newItems)
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    max={item.remaining_quantity || item.quantity}
                                                                    step="0.1"
                                                                    className="w-20 bg-white border-2 border-slate-200 rounded-xl py-2 px-3 text-center font-bold"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Return Type */}
                                        <div className="space-y-2">
                                            <label className="font-black text-slate-700 block text-right">نوع العملية:</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setReturnType('refund')}
                                                    className={`flex-1 py-3 rounded-2xl font-black border-2 transition-all ${returnType === 'refund'
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                                                        } `}
                                                >
                                                    استرجاع (رد المبلغ)
                                                </button>
                                                <button
                                                    onClick={() => setReturnType('exchange')}
                                                    className={`flex-1 py-3 rounded-2xl font-black border-2 transition-all ${returnType === 'exchange'
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                        } `}
                                                >
                                                    استبدال
                                                </button>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="space-y-2">
                                            <label className="font-black text-slate-700 block text-right">سبب {returnType === 'refund' ? 'الاسترجاع' : 'الاستبدال'}:</label>
                                            <textarea
                                                value={returnReason}
                                                onChange={(e) => setReturnReason(e.target.value)}
                                                placeholder="مثال: منتج تالف، عدم رضا العميل... (اختياري)"
                                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 font-bold outline-none focus:border-red-500 transition-all resize-none text-right"
                                                rows="3"
                                            />
                                        </div>

                                        {/* Total */}
                                        {selectedReturnItems.some(i => i.selected) && (
                                            <div className="bg-brand-primary/10 border-2 border-brand-primary/20 rounded-2xl p-6 flex justify-between items-center">
                                                <span className="font-black text-3xl text-brand-primary">
                                                    {selectedReturnItems
                                                        .filter(i => i.selected)
                                                        .reduce((sum, i) => sum + (i.price * i.returnQty), 0)
                                                        .toFixed(2)
                                                    } ج.م
                                                </span>
                                                <span className="font-black text-lg">المبلغ المستحق:</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {returnSale && (
                                <div className="p-6 border-t border-slate-100 flex gap-4">
                                    <button
                                        onClick={handleProcessReturn}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black transition-all active:scale-95"
                                    >
                                        تأكيد {returnType === 'refund' ? 'الاسترجاع' : 'الاستبدال'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setReturnSale(null)
                                            setSelectedReturnItems([])
                                        }}
                                        className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
