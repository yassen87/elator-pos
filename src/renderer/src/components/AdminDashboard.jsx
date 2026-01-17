import React, { useState, useEffect } from 'react'
import {
    BarChart3,
    Package,
    Users,
    Settings,
    LogOut,
    Plus,
    Trash2,
    Save,
    PhoneCall,
    UserCheck,
    Lock,
    RotateCcw,
    Edit,
    RefreshCw,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Search,
    Eye,
    Printer,
    AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { useRef } from 'react'

export default function AdminDashboard({ user, onLogout, notify, ask }) {
    const [activeTab, setActiveTab] = useState('products')
    const [products, setProducts] = useState([])
    const [formulas, setFormulas] = useState([])
    const [cashiers, setCashiers] = useState([])
    const [settings, setSettings] = useState({})
    const [employees, setEmployees] = useState([])
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
    const [updateStatus, setUpdateStatus] = useState(null)
    const [updateProgress, setUpdateProgress] = useState(0)

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true)
        try {
            await window.api.checkUpdate()
        } catch (error) {
            console.error('Update check failed:', error)
            notify('فشل الاتصال بخادم التحديثات', 'error')
            setIsCheckingUpdate(false)
        }
    }

    const handleInstallUpdate = () => {
        window.api.installUpdate()
    }

    useEffect(() => {
        const cleanup1 = window.api.onUpdateChecking(() => {
            setIsCheckingUpdate(true)
            setUpdateStatus('checking')
        })
        const cleanup2 = window.api.onUpdateAvailable((info) => {
            setIsCheckingUpdate(false)
            setUpdateStatus('available')
            notify(`تحديث جديد متاح: ${info.version}`, 'success')
            window.api.downloadUpdate()
        })
        const cleanup3 = window.api.onUpdateNotAvailable(() => {
            setIsCheckingUpdate(false)
            setUpdateStatus(null)
            notify('السستم مُحدث لآخر إصدار', 'success')
        })
        const cleanup4 = window.api.onUpdateError((err) => {
            setIsCheckingUpdate(false)
            setUpdateStatus('error')
            notify('خطأ أثناء فحص التحديثات', 'error')
        })
        const cleanup5 = window.api.onUpdateProgress((progress) => {
            setUpdateStatus('downloading')
            setUpdateProgress(Math.floor(progress.percent))
        })
        const cleanup6 = window.api.onUpdateDownloaded(() => {
            setUpdateStatus('downloaded')
            notify('تم تحميل التحديث بنجاح، سيتم التثبيت عند إعادة التشغيل', 'success')
            ask('تم تحميل التحديث بنجاح. هل تريد إعادة تشغيل البرنامج للتثبيت الآن؟', (confirmed) => {
                if (confirmed) handleInstallUpdate()
            })
        })

        loadData()

        return () => {
            if (cleanup1 && typeof cleanup1 === 'function') cleanup1()
            if (cleanup2 && typeof cleanup2 === 'function') cleanup2()
            if (cleanup3 && typeof cleanup3 === 'function') cleanup3()
            if (cleanup4 && typeof cleanup4 === 'function') cleanup4()
            if (cleanup5 && typeof cleanup5 === 'function') cleanup5()
            if (cleanup6 && typeof cleanup6 === 'function') cleanup6()
        }
    }, [])

    const loadData = async () => {
        const p = await window.api.getProducts()
        const f = await window.api.getFormulas()
        const c = await window.api.getCashiers()
        const s = await window.api.getSettings()
        const e = await window.api.getEmployees()
        setProducts(p)
        setFormulas(f)
        setCashiers(c)
        setSettings(s)
        setEmployees(e)
    }

    const parseDetails = (details) => {
        if (!details) return '';
        try {
            const parsed = JSON.parse(details);
            let summary = parsed.text || '';

            // If we have impact data and summary is too brief, build a composition list
            if (parsed.impact && Array.isArray(parsed.impact)) {
                const composition = parsed.impact.map(imp => {
                    const p = products.find(prod => prod.id === imp.id);
                    if (!p) return null;
                    return `${p.name} (${imp.qty}${p.category === 'oil' ? 'مل' : 'ق'})`;
                }).filter(Boolean).join(' + ');

                if (composition) {
                    if (summary.includes('تركيبة')) {
                        return `${summary}\nالمكونات: ${composition}`;
                    }
                    return composition;
                }
            }
            return summary;
        } catch (e) {
            return details;
        }
    }

    const tabs = [
        { id: 'products', label: 'المنتجات', icon: Package },
        // { id: 'formulas', label: 'تركيب العطور', icon: FlaskConical }, // Removed
        { id: 'cashiers', label: 'إدارة البائعين', icon: Users },
        { id: 'customers', label: 'سجلات العملاء', icon: PhoneCall },
        { id: 'reports', label: 'التقارير والمبيعات', icon: BarChart3 },
        { id: 'returns', label: 'المرتجعات', icon: RefreshCw },
        { id: 'shortages', label: 'النواقص', icon: AlertCircle },
        { id: 'settings', label: 'إعدادات المحل', icon: Settings }
    ]

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-l border-slate-200 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent leading-none">
                                عطورنا بريميوم
                            </h1>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">المدير</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate text-slate-900">{user.username}</div>
                            <div className="text-[10px] text-green-500 font-bold">متصل الآن</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-brand-primary'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h2>
                            <button
                                onClick={handleCheckUpdate}
                                disabled={isCheckingUpdate || updateStatus === 'downloading'}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${isCheckingUpdate || updateStatus === 'downloading' ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-600 hover:text-brand-primary border border-slate-200'}`}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate || updateStatus === 'downloading' ? 'animate-spin' : ''}`} />
                                <span>
                                    {updateStatus === 'downloading'
                                        ? `جاري التحميل (${updateProgress}%)`
                                        : isCheckingUpdate ? 'جاري التحقق...' : 'التحقق من التحديثات'}
                                </span>
                            </button>
                        </div>

                        {activeTab === 'products' && (
                            <ProductsView products={products} onRefresh={loadData} notify={notify} ask={ask} />
                        )}
                        {/* Formulas View Removed */}
                        {activeTab === 'cashiers' && (
                            <CashiersView cashiers={cashiers} onRefresh={loadData} notify={notify} ask={ask} settings={settings} />
                        )}
                        {activeTab === 'customers' && (
                            <CustomersView products={products} parseDetails={parseDetails} />
                        )}
                        {activeTab === 'reports' && <ReportsView products={products} cashiers={cashiers} parseDetails={parseDetails} notify={notify} ask={ask} user={user} settings={settings} />}
                        {activeTab === 'returns' && (
                            <ReturnsView />
                        )}
                        {activeTab === 'shortages' && (
                            <ShortagesView products={products} onRefresh={loadData} notify={notify} ask={ask} />
                        )}
                        {activeTab === 'settings' && (
                            <SettingsView user={user} settings={settings} onRefresh={loadData} notify={notify} ask={ask} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    )
}

function ProductsView({ products, onRefresh, notify, ask }) {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [pricePerMl, setPricePerMl] = useState('')
    const [stockQuantity, setStockQuantity] = useState('')
    const [minStock, setMinStock] = useState('10')
    const [category, setCategory] = useState('oil') // Default to oil for all new products
    const [isBottle, setIsBottle] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    const handleAdd = async (e) => {
        e.preventDefault()
        await window.api.addProduct({
            name,
            price: isBottle ? (parseFloat(price) || 0) : 0,
            price_per_ml: !isBottle ? (parseFloat(pricePerMl) || 0) : 0,
            stock_quantity: parseFloat(stockQuantity) || 0,
            min_stock: parseInt(minStock) || 10,
            category: isBottle ? 'bottle' : 'oil'
        })
        setName('')
        setPrice('')
        setPricePerMl('')
        setStockQuantity('')
        setMinStock('10')
        notify('تم إضافة المنتج بنجاح', 'success')
        onRefresh()
    }

    const handleUpdateStock = async (id, currentQty, amount, isAbsolute = false) => {
        try {
            const product = products.find(p => p.id === id);
            if (!product) {
                console.error('[ProductsView] Product not found for id:', id);
                return;
            }

            let diff = 0;
            if (isAbsolute) {
                const newVal = parseFloat(amount);
                if (isNaN(newVal)) {
                    notify('يرجى إدخال رقم صحيح', 'error');
                    return;
                }
                diff = newVal - parseFloat(currentQty);
            } else {
                diff = parseFloat(amount);
            }

            if (diff === 0 && isAbsolute) {
                return; // Nothing to change
            }

            console.log(`[ProductsView] Updating stock: ID=${id}, current=${currentQty}, amount=${amount}, diff=${diff}`);

            const result = await window.api.updateProductStock({
                id,
                quantity: diff,
                isOil: product.category === 'oil'
            });

            if (result && result.success) {
                onRefresh();
                if (isAbsolute) notify('تم تحديث المخزون بنجاح', 'success');
            } else {
                const errorMsg = result?.message || 'فشل التحديث من الخادم';
                notify(errorMsg, 'error');
                console.error('[ProductsView] IPC Error:', errorMsg);
            }
        } catch (err) {
            console.error('[ProductsView] Exception in handleUpdateStock:', err);
            notify('حدث خطأ تقني: ' + err.message, 'error');
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const res = await window.api.updateProduct(editingProduct);
            if (res.success) {
                notify('تم تحديث المنتج بنجاح', 'success');
                setEditingProduct(null);
                onRefresh();
            } else {
                notify('فشل التحديث: ' + res.message, 'error');
            }
        } catch (err) {
            notify('حدث خطأ: ' + err.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        ask('حذف منتج', 'هل أنت متأكد من حذف هذا المنتج؟', async () => {
            await window.api.deleteProduct(id)
            notify('تم حذف المنتج بنجاح', 'success')
            onRefresh()
        })
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                <label className="text-xs font-black text-slate-400 mb-3 block uppercase tracking-widest">إضافة سريعة للزجاجات القياسية</label>
                <div className="flex flex-wrap gap-2">
                    {[35, 55, 110].map(size => {
                        const exists = products.find(p => p.category === 'bottle' && p.name.includes(size.toString()));
                        return (
                            <button
                                key={size}
                                onClick={() => {
                                    setName(`زجاجة ${size} مل`);
                                    setIsBottle(true);
                                    setPrice('');
                                    setStockQuantity('');
                                    notify(`تم تجهيز مقص الزجاجة ${size} مل، أدخل السعر والكمية واضغط إضافة`, 'info');
                                }}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${exists
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-primary hover:text-brand-primary'}`}
                            >
                                {size} مل {exists && '✓'}
                            </button>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-6 gap-4 items-end shadow-sm relative">
                <div className="absolute top-[-10px] left-4 bg-white px-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-brand-primary transition-colors">
                        <input
                            type="checkbox"
                            checked={isBottle}
                            onChange={(e) => setIsBottle(e.target.checked)}
                            className="accent-brand-primary w-4 h-4 rounded-md"
                        />
                        <span>هذه زجاجة فارغة؟</span>
                    </label>
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-sm text-slate-500 mr-1">اسم المنتج</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                        placeholder="مثال: زيت الصندل"
                        required
                    />
                </div>
                {/* Category Selection Removed - All new products are 'oil' by default */}
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 mr-1">{isBottle ? 'سعر الزجاجة' : 'سعر الـ 1 مل'}</label>
                    <input
                        type="number"
                        step="0.01"
                        value={isBottle ? price : pricePerMl}
                        onChange={(e) => isBottle ? setPrice(e.target.value) : setPricePerMl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400 font-bold"
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 mr-1">الكمية المبدئية {isBottle ? '(عدد الزجاجات)' : '(مل)'}</label>
                    <input
                        type="number"
                        step={isBottle ? "1" : "0.01"}
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400 font-bold"
                        placeholder="0"
                        required
                    />
                </div>
                <button className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2 rounded-xl h-11 flex items-center justify-center gap-2 font-bold transition-all shadow-md shadow-brand-primary/10">
                    <Plus className="w-5 h-5" />
                    إضافة
                </button>
            </form>

            {/* Search Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث عن منتج بالاسم أو الفئة..."
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-12 font-bold outline-none focus:border-brand-primary transition-all text-right"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-slate-500">الاسم</th>
                            <th className="px-6 py-4 font-medium text-slate-500">النوع</th>
                            <th className="px-6 py-4 font-medium text-slate-500">السعر</th>
                            <th className="px-6 py-4 font-medium text-slate-500">الكمية المتاحة</th>
                            <th className="px-6 py-4 font-medium text-slate-500 w-24">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {products
                            .filter(p => {
                                if (!searchQuery.trim()) return true
                                const query = searchQuery.toLowerCase()
                                return p.name.toLowerCase().includes(query) ||
                                    (p.category === 'oil' && 'زيت'.includes(query)) ||
                                    (p.category === 'bottle' && 'زجاجة'.includes(query))
                            })
                            .map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-900 font-medium">{p.name}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {p.category === 'oil' ? 'زيت خام' : p.category === 'bottle' ? 'زجاجة' : 'منتج جاهز'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-bold">
                                        {p.category === 'bottle' ? `${p.price || 0} ج.م` : `${p.price_per_ml || 0} ج.م/مل`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleUpdateStock(p.id, p.stock_quantity, -1)}
                                                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-lg transition-all"
                                            >
                                                -
                                            </button>
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold min-w-[60px] justify-center ${p.stock_quantity === 0
                                                ? 'bg-red-100 text-red-600'
                                                : p.stock_quantity <= p.min_stock
                                                    ? 'bg-yellow-100 text-yellow-600'
                                                    : 'bg-green-100 text-green-600'
                                                }`}>
                                                {p.stock_quantity}
                                            </span>
                                            <button
                                                onClick={() => handleUpdateStock(p.id, p.stock_quantity, 1)}
                                                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-green-50 text-slate-500 hover:text-green-500 rounded-lg transition-all"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="mt-1 text-[10px] text-right">
                                            {p.stock_quantity === 0 && <span className="text-red-500 font-bold"> (نفذ)</span>}
                                            {p.stock_quantity > 0 && p.stock_quantity <= p.min_stock && <span className="text-yellow-600 font-bold"> (قليل)</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setEditingProduct({ ...p })}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                            title="تعديل المنتج"
                                        >
                                            <Edit className="w-5 h-5 transition-transform active:scale-90" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Product Modal */}
            <AnimatePresence>
                {editingProduct && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Edit className="w-5 h-5 text-brand-primary" />
                                    تعديل المنتج
                                </h3>
                                <button
                                    onClick={() => setEditingProduct(null)}
                                    className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">اسم المنتج</label>
                                    <input
                                        value={editingProduct.name}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 mr-1">
                                            {editingProduct.category === 'bottle' ? 'سعر الزجاجة' : 'سعر الـ 1 مل'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.category === 'bottle' ? editingProduct.price : editingProduct.price_per_ml}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (editingProduct.category === 'bottle') {
                                                    setEditingProduct({ ...editingProduct, price: val });
                                                } else {
                                                    setEditingProduct({ ...editingProduct, price_per_ml: val });
                                                }
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 mr-1">المخزون الحالي</label>
                                        <input
                                            type="number"
                                            step={editingProduct.category === 'bottle' ? "1" : "0.01"}
                                            value={editingProduct.stock_quantity}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">الحد الأدنى للتنبيه</label>
                                    <input
                                        type="number"
                                        value={editingProduct.min_stock}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, min_stock: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
                                    >
                                        حفظ التعديلات
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >

    )
}


function CashiersView({ cashiers, onRefresh, notify, ask }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleAdd = async (e) => {
        e.preventDefault()
        const res = await window.api.addCashier({ username, password })
        if (res.success) {
            setUsername('')
            setPassword('')
            onRefresh()
        } else {
            alert(res.message)
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
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="مثلاً: احمد محمد"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-bold"
                            required
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">كلمة المرور</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-bold"
                            required
                        />
                    </div>
                    <button className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl h-[52px] font-black shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2">
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
                                <div className="font-black text-slate-800 text-lg leading-none mb-1">{c.username}</div>
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

function ReportsView({ products, cashiers: initialCashiers, parseDetails, notify, ask, user, settings }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [sales, setSales] = useState([])
    const [totalDay, setTotalDay] = useState(0)
    const [cashiers, setCashiers] = useState(initialCashiers || [])
    const [selectedCashier, setSelectedCashier] = useState('')
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all') // New State for Payment Filter
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

    const handleEditSave = async () => {
        try {
            if (!editData) {
                notify('لا يوجد بيانات للحفظ', 'error')
                return
            }
            console.log('[DEBUG] Saving editData:', editData)

            // Recalculate total
            const newTotal = editData.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0)
            console.log('[DEBUG] Calculated newTotal:', newTotal)

            const updatePayload = {
                ...editData,
                total: newTotal
            }

            const res = await window.api.updateSale(updatePayload)
            console.log('[DEBUG] updateSale response:', res)

            if (res && res.success) {
                notify('تم تحديث الفاتورة بنجاح', 'success')
                setIsEditing(false)
                setSelectedInvoice(null)
                setEditData(null)
                loadReport()
            } else {
                notify('خطأ في التحديث: ' + (res?.message || 'فشل غير معروف'), 'error')
            }
        } catch (err) {
            console.error('[DEBUG] handleEditSave Exception:', err)
            notify('حدث خطأ تقني أثناء الحفظ: ' + err.message, 'error')
        }
    }

    useEffect(() => {
        setCashiers(initialCashiers || [])
    }, [initialCashiers])

    useEffect(() => {
        loadData()

        // Listen for real-time sales changes
        const cleanup = window.api.onSalesUpdated(() => {
            console.log('[SYNC] Sales updated, refreshing reports...')
            if (typeof loadReport === 'function') loadReport()
            loadData()
        })

        return cleanup
    }, [])

    useEffect(() => {
        loadReport()
    }, [startDate, endDate, selectedCashier])

    const loadData = async () => {
        try {
            const c = await window.api.getCashiers()
            setCashiers(c || [])
            const bestSelling = await window.api.getBestSellingProducts()
            setBestSellingProducts(bestSelling || [])
        } catch (err) {
            console.error('Error loading report data:', err)
        }
    }

    const [expandedSales, setExpandedSales] = useState([])

    const toggleSale = (id) => {
        setExpandedSales(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const loadReport = async () => {
        const res = await window.api.getSalesReport({
            startDate,
            endDate,
            cashierId: selectedCashier || null
        })
        setSales(res)
        setTotalDay(res.reduce((acc, s) => acc + (s.net_total || s.total), 0))
    }

    const handleExport = async () => {
        const success = await window.api.exportSalesReport(filteredSales)
        if (success) {
            alert('تم تصدير التقرير بنجاح!')
        }
    }

    // Filter Logic
    const filteredSales = sales.filter(s => {
        if (selectedPaymentMethod === 'all') return true
        if (selectedPaymentMethod === 'cash') return s.payment_method === 'cash' || !s.payment_method
        return s.payment_method === selectedPaymentMethod
    })

    // Calculate Total for Filtered View
    const filteredTotal = filteredSales.reduce((acc, s) => acc + (s.net_total || s.total), 0)


    return (
        <div className="space-y-6 text-right">
            <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end flex-1">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">من تاريخ</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">إلى تاريخ</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">تصفية حسب البائع</label>
                        <select
                            value={selectedCashier}
                            onChange={(e) => setSelectedCashier(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        >
                            <option value="">جميع البائعين</option>
                            {(cashiers || [])
                                .filter(c => c.role !== 'admin')
                                .map(c => (
                                    <option key={c.id} value={c.id} className="text-slate-900">
                                        {c.username}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">طريقة الدفع</label>
                        <select
                            value={selectedPaymentMethod}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        >
                            <option value="all">الكل</option>
                            <option value="cash">كاش</option>
                            <option value="visa">فيزا</option>
                            <option value="transfer">تحويل</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-6 items-center mr-8">
                    <button
                        onClick={handleExport}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all"
                    >
                        <Save className="w-5 h-5" />
                        تصدير Excel
                    </button>
                    <div className="bg-brand-primary/10 p-5 rounded-2xl border border-brand-primary/20 flex flex-col items-center justify-center min-w-[180px] shadow-inner">
                        <span className="text-[10px] text-brand-primary uppercase font-black mb-1">إجمالي المبيعات</span>
                        <span className="text-3xl font-black text-brand-primary">{filteredTotal.toFixed(2)} ج.م</span>
                    </div>
                </div>
            </div>

            {/* Best Selling Products Section */}
            {bestSellingProducts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-brand-primary" />
                        المنتجات الأكثر مبيعاً 🏆
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {bestSellingProducts.map((product, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 hover:border-brand-primary/30 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl font-black text-brand-primary">#{idx + 1}</span>
                                    <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                                        <Package className="w-5 h-5 text-brand-primary" />
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm truncate mb-1">{product.product_name}</h4>
                                <div className="text-xs text-slate-500">
                                    <div>بيع: <span className="font-bold text-brand-primary">{product.total_quantity}</span> قطعة</div>
                                    <div>إيراد: <span className="font-bold">{product.total_revenue.toFixed(2)}</span> ج.م</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm"></th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">كود الفاتورة</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">الوقت</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">البائع</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">العميل</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">رقم الهاتف</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">الإجمالي</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">طريقة الدفع</th>
                            {user?.role === 'admin' && (
                                <th className="px-6 py-5 font-bold text-slate-500 text-sm w-24">إجراءات</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredSales.map(s => (
                            <React.Fragment key={s.id}>
                                <tr className="hover:bg-slate-50/50 transition-all border-t border-slate-50">
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => toggleSale(s.id)}
                                            className="p-2 hover:bg-brand-primary/10 rounded-lg text-brand-primary transition-colors"
                                        >
                                            {expandedSales.includes(s.id) ?
                                                <div className="w-5 h-5 flex items-center justify-center font-bold font-mono text-lg">-</div> :
                                                <div className="w-5 h-5 flex items-center justify-center font-bold font-mono text-lg">+</div>
                                            }
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-slate-900 font-black text-lg">#{s.invoice_code || '---'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(s.date).toLocaleTimeString('ar-EG')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary" />
                                            {s.cashier_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 italic text-sm">{s.customer_name || 'بدون اسم'}</td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">{s.customer_phone || '---'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-end">
                                            <div className="text-slate-900 font-bold">{s.total} ج.م</div>
                                            {s.net_total < s.total && (
                                                <div className="text-xs text-red-500 line-through opacity-60">
                                                    {(s.total - s.net_total).toFixed(2)} مرتجع
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${s.payment_method === 'cash' || !s.payment_method ? 'bg-green-100 text-green-700' :
                                            s.payment_method === 'visa' ? 'bg-blue-100 text-blue-700' :
                                                'bg-purple-100 text-purple-700'
                                            }`}>
                                            {s.payment_method === 'cash' || !s.payment_method ? 'كاش' :
                                                s.payment_method === 'visa' ? 'فيزا' :
                                                    `تحويل (${s.payment_details === 'vodafone_cash' ? 'فودافون كاش' :
                                                        s.payment_details === 'etisalat_cash' ? 'اتصالات كاش' :
                                                            s.payment_details === 'instapay' ? 'انستا باي' :
                                                                s.payment_details === 'fawry' ? 'فوري' : s.payment_details
                                                    })`}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedInvoice(s)}
                                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"
                                                title="عرض وتعديل"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            {user?.role === 'admin' && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟\n\nسيتم حذف جميع البيانات المرتبطة بها بما في ذلك المرتجعات.')) {
                                                            window.api.deleteSale(s.id).then(result => {
                                                                if (result.success) {
                                                                    notify('تم حذف الفاتورة بنجاح', 'success')
                                                                    loadReport()
                                                                } else {
                                                                    notify('فشل الحذف: ' + result.message, 'error')
                                                                }
                                                            })
                                                        }
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="حذف الفاتورة"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedSales.includes(s.id) && (
                                    <tr className="bg-slate-50/80">
                                        <td colSpan="7" className="px-12 py-6">
                                            <div className="border-l-4 border-brand-primary pl-6 space-y-3">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    اصناف الفاتورة:
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {s.items?.map((item, idx) => (
                                                        <div key={idx} className="flex-1">
                                                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-brand-primary font-bold">{idx + 1}</div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700">{item.item_name}</span>
                                                                        {item.details && (
                                                                            <span className="text-[10px] text-slate-400 font-bold whitespace-pre-line">{parseDetails(item.details)}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-4 text-sm">
                                                                    <span className="text-slate-400">الكمية: <span className="text-slate-900 font-bold">{item.quantity}</span></span>
                                                                    <span className="text-slate-400">السعر: <span className="text-brand-primary font-bold">{item.price} ج.م</span></span>
                                                                    <span className="text-slate-900 font-black">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {sales.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-slate-400 italic font-medium">لا توجد مبيعات مسجلة لهذا اليوم</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div >

            {/* Invoice Detail Modal */}
            <AnimatePresence>
                {selectedInvoice && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-brand-primary" />
                                        {isEditing ? 'تعديل الفاتورة' : 'تفاصيل الفاتورة'} #{selectedInvoice.invoice_code}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1">
                                        {new Date(selectedInvoice.date).toLocaleString('ar-EG')} | بواسطة: {selectedInvoice.cashier_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={handlePrint}
                                                className="bg-brand-primary text-white p-3 rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2 font-bold px-4"
                                            >
                                                <Printer className="w-5 h-5" />
                                                طباعة
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditData(JSON.parse(JSON.stringify(selectedInvoice)))
                                                    setIsEditing(true)
                                                }}
                                                className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 transition-all flex items-center gap-2 font-bold px-4"
                                            >
                                                <Edit className="w-5 h-5" />
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => setSelectedInvoice(null)}
                                                className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 font-bold px-4 bg-slate-50"
                                            >
                                                إغلاق
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleEditSave}
                                                className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 font-bold px-4"
                                            >
                                                <Save className="w-5 h-5" />
                                                حفظ التعديلات
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    setEditData(null)
                                                }}
                                                className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 font-bold px-4 bg-slate-50"
                                            >
                                                إلغاء
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Customer Info */}
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">اسم العميل</label>
                                            {isEditing ? (
                                                <input
                                                    value={editData.customer_name || ''}
                                                    onChange={e => setEditData({ ...editData, customer_name: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 font-bold text-slate-900"
                                                />
                                            ) : (
                                                <div className="font-bold text-slate-900">{selectedInvoice.customer_name || 'بدون اسم'}</div>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">رقم الهاتف</label>
                                            {isEditing ? (
                                                <input
                                                    value={editData.customer_phone || ''}
                                                    onChange={e => setEditData({ ...editData, customer_phone: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 font-bold text-slate-900 text-left"
                                                />
                                            ) : (
                                                <div className="font-bold text-slate-900 font-mono">{selectedInvoice.customer_phone || '---'}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                        <table className="w-full text-right">
                                            <thead className="bg-slate-50/50">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-5 py-3 text-xs font-black text-slate-400">المنتج</th>
                                                    <th className="px-5 py-3 text-xs font-black text-slate-400 text-center">الكمية</th>
                                                    <th className="px-5 py-3 text-xs font-black text-slate-400 text-left">السعر</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {(isEditing ? editData.items : selectedInvoice.items)?.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-slate-900">{item.item_name}</div>
                                                            {item.details && (
                                                                <div className="text-[10px] text-slate-400 font-bold leading-tight mt-1 whitespace-pre-line">
                                                                    {parseDetails(item.details)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-center font-bold text-slate-900">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={e => {
                                                                        const newItems = [...editData.items];
                                                                        newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                                                        setEditData({ ...editData, items: newItems });
                                                                    }}
                                                                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center"
                                                                />
                                                            ) : item.quantity}
                                                        </td>
                                                        <td className="px-5 py-4 text-left font-bold text-slate-900">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1 justify-end">
                                                                    <input
                                                                        type="number"
                                                                        value={item.price}
                                                                        onChange={e => {
                                                                            const newItems = [...editData.items];
                                                                            newItems[idx].price = parseFloat(e.target.value) || 0;
                                                                            setEditData({ ...editData, items: newItems });
                                                                        }}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-left"
                                                                    />
                                                                    <span className="text-xs">ج.م</span>
                                                                </div>
                                                            ) : `${item.price} ج.م`}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="space-y-2 border-t border-slate-100 pt-4">
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-slate-400 font-bold">طريقة الدفع:</span>
                                            {isEditing ? (
                                                <select
                                                    value={editData.payment_details || editData.payment_method}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === 'cash' || val === 'visa') {
                                                            setEditData({ ...editData, payment_method: val, payment_details: '' })
                                                        } else {
                                                            setEditData({ ...editData, payment_method: 'transfer', payment_details: val })
                                                        }
                                                    }}
                                                    className="bg-white border border-slate-200 rounded-lg px-4 py-1 font-bold text-brand-primary"
                                                >
                                                    <option value="cash">كاش</option>
                                                    <option value="visa">فيزا</option>
                                                    <optgroup label="تحويلات">
                                                        <option value="vodafone_cash">فودافون كاش</option>
                                                        <option value="etisalat_cash">اتصالات كاش</option>
                                                        <option value="instapay">انستا باي</option>
                                                        <option value="fawry">فوري</option>
                                                    </optgroup>
                                                </select>
                                            ) : (
                                                <span className="font-black text-brand-primary">
                                                    {selectedInvoice.payment_method === 'cash' || !selectedInvoice.payment_method ? 'كاش' :
                                                        selectedInvoice.payment_method === 'visa' ? 'فيزا' : (
                                                            selectedInvoice.payment_details === 'vodafone_cash' ? 'فودافون كاش' :
                                                                selectedInvoice.payment_details === 'etisalat_cash' ? 'اتصالات كاش' :
                                                                    selectedInvoice.payment_details === 'instapay' ? 'انستا باي' :
                                                                        selectedInvoice.payment_details === 'fawry' ? 'فوري' : 'تحويل'
                                                        )}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                                            <span className="text-lg font-bold opacity-70">
                                                {isEditing ? 'الإجمالي الجديد' : 'الإجمالي النهائي'}
                                            </span>
                                            <span className="text-3xl font-black">
                                                {(isEditing ? editData.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0) : selectedInvoice.total).toFixed(2)} ج.م
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden Printable Component */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', height: 0, overflow: 'hidden' }}>
                <PrintableInvoice ref={printRef} sale={selectedInvoice} settings={settings} parseDetails={parseDetails} />
            </div>
        </div >
    )
}

function SettingsView({ user, settings, onRefresh, notify, ask }) {
    const [items, setItems] = useState(settings)
    const [adminPassword, setAdminPassword] = useState('')

    useEffect(() => {
        setItems(settings)
    }, [settings])

    const handleSave = async () => {
        await window.api.updateSettings(items)

        if (adminPassword.trim()) {
            await window.api.updateUserPassword({ id: user.id, password: adminPassword })
            setAdminPassword('')
        }

        notify('تم حفظ الإعدادات وكلمة المرور بنجاح', 'success')
        onRefresh()
    }

    return (
        <div className="max-w-2xl bg-white border border-slate-200 p-8 rounded-2xl space-y-6 shadow-sm">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 block">اسم المحل</label>
                    <input
                        value={items.shop_name || ''}
                        onChange={(e) => setItems({ ...items, shop_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 block">العنوان</label>
                    <input
                        value={items.shop_address || ''}
                        onChange={(e) => setItems({ ...items, shop_address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 block">رقم الهاتف</label>
                    <input
                        value={items.shop_phone || ''}
                        onChange={(e) => setItems({ ...items, shop_phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-slate-500 block">شعار المحل (Logo)</label>
                    <div className="flex items-center gap-4">
                        {items.shop_logo && (
                            <img
                                src={items.shop_logo}
                                alt="Logo Preview"
                                className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-white"
                            />
                        )}
                        <button
                            onClick={async () => {
                                const base64 = await window.api.selectLogo()
                                if (base64) {
                                    setItems({ ...items, shop_logo: base64 })
                                }
                            }}
                            className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 text-slate-500 hover:text-brand-primary transition-all py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
                        >
                            <Package className="w-5 h-5" />
                            {items.shop_logo ? 'تغيير الشعار' : 'اختيار شعار من الجهاز'}
                        </button>
                    </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-500 font-bold block">صورة QR Code للفواتير</label>
                        {items.qr_code_image && (
                            <button
                                onClick={() => setItems({ ...items, qr_code_image: '' })}
                                className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                                حذف الصورة
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4 items-center">
                        {items.qr_code_image && (
                            <div className="w-20 h-20 border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1">
                                <img src={items.qr_code_image} alt="QR Code" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <button
                            onClick={async () => {
                                const base64 = await window.api.selectQrImage()
                                if (base64) {
                                    setItems({ ...items, qr_code_image: base64 })
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all font-bold text-sm"
                        >
                            <Package className="w-5 h-5" />
                            {items.qr_code_image ? 'تغيير صورة QR' : 'رفع صورة QR من الجهاز'}
                        </button>
                    </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2 text-right">إعدادات الأمان</h4>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-500 block">تغيير كلمة مرور المدير (اتركها فارغة إذا لم ترد التغيير)</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-3 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="كلمة المرور الجديدة..."
                            />
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={handleSave}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-primary/10"
            >
                <Save className="w-5 h-5" />
                حفظ كافة الإعدادات
            </button>

            <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 text-right">أدوات إدارة البيانات</h4>

                <button
                    onClick={async () => {
                        const res = await window.api.createBackup()
                        if (res.success) notify(`تم إنشاء النسخة الاحتياطية بنجاح في:\n${res.path}`, 'success')
                        else notify('فشل إنشاء النسخة الاحتياطية', 'error')
                    }}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-slate-100 transition-all active:scale-95 text-sm"
                >
                    <Save className="w-5 h-5 text-brand-primary" />
                    إنشاء نسخة احتياطية (Backup)
                </button>

                <button
                    onClick={async () => {
                        ask('استرجاع بيانات', 'تحذير: هذه العملية ستقوم باستبدال كافة البيانات الحالية بالنسخة المختارة.\nسيتم إعادة تشغيل البرنامج تلقائياً.\nهل أنت متأكد؟', async () => {
                            await window.api.restoreBackup()
                        })
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-blue-50 transition-all active:scale-95 text-sm"
                >
                    <RotateCcw className="w-5 h-5" />
                    استرجاع نسخة احتياطية (Restore)
                </button>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => window.api.openDatabaseFolder()}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-slate-100 transition-all active:scale-95 text-xs"
                    >
                        <Package className="w-5 h-5 opacity-50" />
                        مجلد الداتا
                    </button>

                    <button
                        onClick={async () => {
                            ask('تحذير شديد الخطورة', 'هل أنت متأكد من مسح كافة البيانات؟\nسيتم حذف المنتجات، المبيعات، والتركيبات نهائياً!', async () => {
                                // Timeout to allow the first modal to close properly before opening the second one
                                setTimeout(() => {
                                    ask('التأكيد النهائي', 'لا يمكن التراجع عن هذه الخطوة! هل ترغب في الاستمرار فعلاً؟', async () => {
                                        await window.api.clearAllData()
                                        notify('تم مسح كافة البيانات بنجاح. سيتم الآن إعادة تشغيل البيانات.', 'success')
                                        onRefresh()
                                    })
                                }, 300)
                            })
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-red-50 transition-all active:scale-95 text-xs"
                    >
                        <Trash2 className="w-5 h-5" />
                        مسح كافة البيانات
                    </button>
                </div>
            </div>
        </div>
    )
}



function CustomersView({ products, parseDetails }) {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [customerTopProducts, setCustomerTopProducts] = useState([])
    const [selectedHistory, setSelectedHistory] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        loadCustomers()
    }, [])

    const loadCustomers = async () => {
        const res = await window.api.getCustomers()
        const topProducts = await window.api.getCustomerTopProducts()
        setCustomers(res)
        setCustomerTopProducts(topProducts || [])
    }

    const showHistory = async (customer) => {
        setLoadingHistory(true)
        setSelectedHistory({ ...customer, items: [] })
        const items = await window.api.getCustomerPurchaseHistory({
            name: customer.customer_name,
            phone: customer.customer_phone
        })
        setSelectedHistory({ ...customer, items })
        setLoadingHistory(false)
    }

    const filtered = customers.filter(c =>
    (c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_phone?.includes(search))
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <PhoneCall className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث عن عميل بالاسم أو الهاتف..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    />
                </div>
                <div className="bg-brand-primary/10 px-6 py-3 rounded-2xl border border-brand-primary/20">
                    <span className="text-slate-500 font-bold ml-2">إجمالي العملاء:</span>
                    <span className="text-brand-primary font-black text-xl">{customers.length}</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">اسم العميل</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">رقم الهاتف</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">المنتج المفضل 🏆</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm text-center">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map((c, i) => {
                            const topProduct = customerTopProducts.find(tp => tp.customer_name === c.customer_name)
                            return (
                                <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-6 py-5 font-black text-slate-800 text-lg">{c.customer_name || 'بدون اسم'}</td>
                                    <td className="px-6 py-5 font-bold text-slate-600 font-mono tracking-wider">{c.customer_phone || '---'}</td>
                                    <td className="px-6 py-5">
                                        {topProduct ? (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-brand-primary/10 px-3 py-1 rounded-lg flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-brand-primary" />
                                                    <span className="font-bold text-brand-primary text-sm">{topProduct.top_product}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">({topProduct.purchase_count} مرات)</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-sm italic">لا يوجد</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button
                                            onClick={() => showHistory(c)}
                                            className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            سجل المشتريات
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-20 text-center text-slate-400 font-bold italic">لا يوجد عملاء مسجلين حالياً</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Customer Purchase History Modal */}
            <AnimatePresence>
                {selectedHistory && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                                        <ClipboardList className="w-6 h-6 text-brand-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">سجل مشتريات العميل</h3>
                                        <p className="text-xs text-slate-500 font-bold">{selectedHistory.customer_name} - {selectedHistory.customer_phone}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedHistory(null)}
                                    className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-auto">
                                {loadingHistory ? (
                                    <div className="py-20 text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-slate-400 font-bold">جاري تحميل السجل...</p>
                                    </div>
                                ) : selectedHistory.items.length === 0 ? (
                                    <div className="py-20 text-center text-slate-400 italic font-bold">
                                        لا توجد مشتريات مسجلة لهذا العميل حتى الآن.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedHistory.items.map((item, idx) => (
                                            <div key={idx} className={`flex justify-between items-center bg-slate-50 p-4 rounded-2xl border transition-all ${item.is_returned > 0 ? 'opacity-60 border-red-100 shadow-sm shadow-red-50' : 'border-slate-100 hover:border-brand-primary/20'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm font-black text-slate-400">
                                                        #{item.sale_id}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`font-bold ${item.is_returned > 0 ? 'text-red-500 line-through' : 'text-slate-900'}`}>{item.item_name}</div>
                                                            {item.is_returned > 0 && (
                                                                <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">مرتجع</span>
                                                            )}
                                                        </div>
                                                        {item.details && (
                                                            <div className="text-[10px] text-brand-primary font-bold whitespace-pre-line bg-brand-primary/5 p-1 rounded mt-1">
                                                                {parseDetails(item.details)}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-slate-400 font-bold mt-1">
                                                            📅 {new Date(item.sale_date).toLocaleDateString('ar-EG')} - {new Date(item.sale_date).toLocaleTimeString('ar-EG')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className={`font-black ${item.is_returned > 0 ? 'text-red-500 line-through' : 'text-brand-primary'}`}>{item.price * item.quantity} ج.م</div>
                                                    <div className="text-[10px] text-slate-400">الكمية: {item.quantity} × {item.price}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedHistory(null)}
                                    className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all"
                                >
                                    إغلاق النافذة
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}


function ShortagesView({ products, onRefresh, notify, ask }) {
    const shortages = products.filter(p => !p.category || p.category !== 'formula').filter(p => p.stock_quantity <= p.min_stock).sort((a, b) => a.stock_quantity - b.stock_quantity)

    const handleUpdateStock = async (product, amount) => {
        const val = parseFloat(amount)
        if (isNaN(val) || val === 0) return

        try {
            const res = await window.api.updateProductStock({
                id: product.id,
                quantity: val,
                isOil: product.category === 'oil'
            })
            if (res.success) {
                notify('تم تحديث المخزون بنجاح', 'success')
                onRefresh()
            }
        } catch (error) {
            notify('خطأ في تحديث المخزون', 'error')
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-sm font-black text-slate-500">المنتج</th>
                            <th className="px-6 py-4 text-sm font-black text-slate-500">القسم</th>
                            <th className="px-6 py-4 text-sm font-black text-slate-500">الكمية الحالية</th>
                            <th className="px-6 py-4 text-sm font-black text-slate-500">الحد الأدنى</th>
                            <th className="px-6 py-4 text-sm font-black text-slate-500">الحالة</th>
                            <th className="px-6 py-4 text-sm font-black text-slate-500">تحديث سريع</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {shortages.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{p.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                        {p.category === 'oil' ? 'زيوت' : p.category === 'bottle' ? 'زجاجات' : 'منتجات'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-black text-lg ${p.stock_quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                        {p.stock_quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-400">{p.min_stock}</td>
                                <td className="px-6 py-4">
                                    {p.stock_quantity === 0 ? (
                                        <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                                            <AlertCircle className="w-4 h-4" />
                                            نفد من المخزون
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-orange-500 text-xs font-bold">
                                            <AlertCircle className="w-4 h-4" />
                                            رصيد منخفض
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="أضف للرصيد"
                                            className="w-24 bg-slate-100 border-none rounded-lg py-2 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleUpdateStock(p, e.target.value)
                                                    e.target.value = ''
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousSibling
                                                handleUpdateStock(p, input.value)
                                                input.value = ''
                                            }}
                                            className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {shortages.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-slate-400 italic font-medium">
                                    لا توجد نواقص في المخزون حالياً 🎉
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ReturnsView() {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [returns, setReturns] = useState([])
    const [expandedReturns, setExpandedReturns] = useState([])

    const toggleReturn = (id) => {
        setExpandedReturns(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    useEffect(() => {
        loadReturns()
    }, [startDate, endDate])

    const loadReturns = async () => {
        const res = await window.api.getReturns({ startDate, endDate })
        setReturns(res || [])
    }

    return (
        <div className="space-y-6 text-right">
            <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end flex-1">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">من تاريخ</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 mr-1 uppercase font-black tracking-widest">إلى تاريخ</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-slate-700"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm"></th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">كود الفاتورة</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">التاريخ</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">النوع</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">العميل</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">فاتورة أصلية</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">السبب</th>
                            <th className="px-6 py-5 font-bold text-slate-500 text-sm">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {returns.map(r => (
                            <React.Fragment key={r.id}>
                                <tr className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleReturn(r.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                                        >
                                            {expandedReturns.includes(r.id) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-slate-900 font-black text-lg">#{r.invoice_code || '---'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(r.return_date).toLocaleString('ar-EG')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${r.return_type === 'refund' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {r.return_type === 'refund' ? 'استرجاع' : 'استبدال'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{r.customer_name || '---'}</div>
                                        <div className="text-xs text-slate-400">{r.customer_phone || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-500">#{r.original_sale_id}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm italic">{r.reason}</td>
                                    <td className="px-6 py-4 font-black text-slate-700">{r.total_refund} ج.م</td>
                                </tr>
                                {expandedReturns.includes(r.id) && (
                                    <tr className="bg-slate-50/80">
                                        <td colSpan="8" className="px-12 py-6">
                                            <div className="border-l-4 border-red-500 pl-6 space-y-3">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    الأصناف المرتجعة:
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {r.items?.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 font-bold">{idx + 1}</div>
                                                                <span className="font-bold text-slate-700">{item.item_name}</span>
                                                            </div>
                                                            <div className="flex gap-4 text-sm">
                                                                <span className="text-slate-400">الكمية المرتجعة: <span className="text-slate-900 font-bold">{item.quantity}</span></span>
                                                                <span className="text-red-500 font-black">{item.refund_amount} ج.م</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {returns.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-slate-400 italic font-medium">لا توجد عمليات مرتجعة في هذه الفترة</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const PrintableInvoice = React.forwardRef(({ sale, settings, parseDetails }, ref) => {
    if (!sale) return null;

    return (
        <div ref={ref} style={{
            padding: '10px',
            direction: 'rtl',
            fontFamily: "'Inter', 'Arial', sans-serif",
            width: '72mm', // Standard safe width for 80mm printers
            color: '#000',
            backgroundColor: '#fff',
            margin: '0 auto'
        }}>
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
            <div style={{ marginBottom: '15px', fontSize: '14px', direction: 'rtl', padding: '0 5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', whiteSpace: 'nowrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>رقم الفاتورة:</span>
                    <span style={{ fontWeight: '900', fontSize: '16px' }}>#{sale.invoice_code || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>التاريخ:</span>
                    <span>{new Date(sale.date).toLocaleDateString('ar-EG')}   {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>البائع:</span>
                    <span>{sale.cashier_name}</span>
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
                {sale.items?.map((item, idx) => (
                    <div key={idx} style={{
                        padding: '5px 0',
                        fontSize: '13px'
                    }}>
                        <div style={{ display: 'flex', marginBottom: '2px' }}>
                            <div style={{ flex: 2, textAlign: 'right', fontWeight: 'bold' }}>{item.item_name}</div>
                            <div style={{ flex: 0.8, textAlign: 'center' }}>{item.quantity}</div>
                            <div style={{ flex: 1.2, textAlign: 'left', fontWeight: 'bold' }}>{((item.price) * item.quantity).toFixed(2)}</div>
                        </div>
                        {item.details && (
                            <div style={{ fontSize: '11px', color: '#000', whiteSpace: 'pre-line', paddingRight: '5px', marginBottom: '2px' }}>
                                {parseDetails(item.details)}
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
                    fontWeight: '700',
                    whiteSpace: 'nowrap'
                }}>
                    <span>الإجمالي النهائـي:</span>
                    <span>{sale.total} ج.م</span>
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

                {/* QR Code */}
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
    );
});
