import { useState, useEffect } from 'react'
import { 
    ShoppingBag, 
    Clock, 
    CheckCircle, 
    Truck, 
    XCircle, 
    ImageIcon,
    Trash2,
    Search,
    RefreshCw,
    Filter,
    Layers,
    Plus,
    Edit2,
    Globe,
    Eye,
    EyeOff,
    Upload,
    Save,
    Phone,
    MapPin,
    Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'

export const WebOrdersView = ({ notify, ask }) => {
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewingImage, setViewingImage] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const API_BASE_URL = 'http://127.0.0.1:5001'

    const loadOrders = async () => {
        setLoading(true)
        try {
            const data = await window.api.invoke('orders:list')
            setOrders(data || [])
        } catch (error) {
            console.error('Failed to load orders:', error)
            notify('فشل تحميل الطلبات', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadWebsiteData = async () => {
        setLoading(true)
        try {
            const [prods, cats] = await Promise.all([
                window.api.invoke('products:website-list'),
                window.api.invoke('products:categories') // Gets all unique categories from BOTH systems if needed, but website categories only uses website_products in API now
            ])
            setProducts(prods || [])
            setCategories(cats || [])
        } catch (error) {
            console.error('Failed to load website data:', error)
            notify('فشل تحميل بيانات الموقع', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'orders') loadOrders()
        else loadWebsiteData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const result = await window.api.invoke('orders:update-status', orderId, newStatus)
            if (result.success) {
                notify('تم تحديث حالة الطلب بنجاح', 'success')
                loadOrders()
            }
        } catch (error) {
            notify('فشل تحديث حالة الطلب', 'error')
        }
    }

    const handleDeleteOrder = (orderId) => {
        ask('هل أنت متأكد من حذف هذا الطلب نهائياً؟', async (confirmed) => {
            if (confirmed) {
                try {
                    const result = await window.api.invoke('orders:delete', orderId)
                    if (result.success) {
                        notify('تم حذف الطلب بنجاح', 'success')
                        loadOrders()
                    }
                } catch (error) {
                    notify('فشل حذف الطلب', 'error')
                }
            }
        })
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch = 
            order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_phone.includes(searchTerm) ||
            order.id.toString().includes(searchTerm)
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        
        return matchesSearch && matchesStatus
    })

    const handleToggleVisibility = async (product) => {
        try {
            const newVisibility = product.is_active === 1 ? 0 : 1
            const result = await window.api.invoke('products:update-visibility', { 
                id: product.id, 
                isVisible: newVisibility === 1 
            })
            if (result.success) {
                notify(`${newVisibility ? 'تم تفعيل' : 'تم إخفاء'} المنتج على الموقع`, 'success')
                loadWebsiteData()
            }
        } catch (error) {
            notify('فشل تحديث حالة المنتج', 'error')
        }
    }

    const handleDeleteProduct = (productId) => {
        ask('هل أنت متأكد من حذف هذا المنتج من الموقع؟', async (confirmed) => {
            if (confirmed) {
                try {
                    const result = await window.api.invoke('products:website-delete', productId)
                    if (result.success) {
                        notify('تم حذف المنتج بنجاح', 'success')
                        loadWebsiteData()
                    }
                } catch (error) {
                    notify('فشل حذف المنتج', 'error')
                }
            }
        })
    }

    const handleImageUpload = async (e, productId) => {
        const file = e.target.files[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Read file as ArrayBuffer and pass to main process via IPC (avoids CORS/fetch issues)
            const arrayBuffer = await file.arrayBuffer()
            const data = await window.api.invoke('products:upload-image', {
                buffer: Array.from(new Uint8Array(arrayBuffer)),
                filename: file.name
            })

            if (data.success) {
                if (productId) {
                    const product = products.find(p => p.id === productId)
                    if (product) {
                        await window.api.invoke('products:website-update', {
                            ...product,
                            image_url: data.imageUrl
                        })
                        notify('تم رفع الصورة بنجاح', 'success')
                        loadWebsiteData()
                    }
                } else if (editingProduct && editingProduct.id === null) {
                   setEditingProduct({...editingProduct, image_url: data.imageUrl})
                   notify('تم رفع الصورة بنجاح للمنتج الجديد', 'success')
                }
            } else {
                notify(`فشل رفع الصورة: ${data.message}`, 'error')
            }
        } catch (error) {
            console.error('Upload failed:', error)
            notify(`فشل رفع الصورة: ${error.message}`, 'error')
        } finally {
            setIsUploading(false)
        }
    }

    const statusMap = {
        'pending': { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-600', icon: Clock },
        'processing': { label: 'جاري التجهيز', color: 'bg-blue-100 text-blue-600', icon: Truck },
        'shipped': { label: 'تم الشحن', color: 'bg-purple-100 text-purple-600', icon: Truck },
        'delivered': { label: 'تم الاستلام', color: 'bg-green-100 text-green-600', icon: CheckCircle },
        'cancelled': { label: 'ملغي', color: 'bg-red-100 text-red-600', icon: XCircle }
    }

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-sm w-fit">
                {[
                    { id: 'orders', label: 'طلبات الموقع', icon: ShoppingBag },
                    { id: 'products', label: 'منتجات الموقع', icon: Globe },
                    { id: 'categories', label: 'الفئات', icon: Layers }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'orders' && (
                <>
                    {/* Header / Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي الطلبات</p>
                                <p className="text-2xl font-black">{orders.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">قيد الانتظار</p>
                                <p className="text-2xl font-black">{orders.filter(o => o.status === 'pending').length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تم التوصيل</p>
                                <p className="text-2xl font-black">{orders.filter(o => o.status === 'delivered').length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ملغي</p>
                                <p className="text-2xl font-black">{orders.filter(o => o.status === 'cancelled').length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="ابحث باسم العميل، الهاتف، أو رقم الطلب..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-2xl">
                            {['all', 'pending', 'processing', 'delivered', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === status ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-brand-primary'}`}
                                >
                                    {status === 'all' ? 'الكل' : statusMap[status].label}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={loadOrders}
                            className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-slate-600"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">رقم الطلب</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">العميل</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">التفاصيل</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الإجمالي</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الإيصال</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">الحالة</th>
                                    <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">التحكم</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const StatusIcon = statusMap[order.status]?.icon || Clock
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6 border-b border-slate-50 font-black text-slate-400">#{order.id}</td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700">{order.customer_name}</span>
                                                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1">
                                                        <Phone className="w-3 h-3" />
                                                        {order.customer_phone}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {order.customer_address}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-black">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(order.created_at).toLocaleString('ar-EG')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <span className="font-black text-brand-primary">{order.total_amount} <span className="text-[10px]">ج.م</span></span>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                {order.deposit_image ? (
                                                    <button 
                                                        onClick={() => setViewingImage(`${API_BASE_URL}/uploads/deposits/${order.deposit_image}`)}
                                                        className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm shadow-brand-primary/10"
                                                    >
                                                        <ImageIcon className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-400">نقداً</span>
                                                )}
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 ${statusMap[order.status].color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusMap[order.status].label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 border-b border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        className="bg-slate-50 border-none rounded-xl text-[10px] font-black px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                    >
                                                        {Object.keys(statusMap).map(s => (
                                                            <option key={s} value={s}>{statusMap[s].label}</option>
                                                        ))}
                                                    </select>
                                                    <button 
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {filteredOrders.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="7" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <ShoppingBag className="w-20 h-20 opacity-10" />
                                                <p className="font-black text-lg">لا توجد طلبات تطابق بحثك</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'products' && (
                <div className="space-y-6">
                    {/* Products Management UI */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="ابحث عن منتج في الموقع..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => {
                                setEditingProduct({ id: null, name: '', description: '', category: categories[0] || '', price_100ml: 0, price_55ml: 0, price_35ml: 0, is_offer: 0, is_active: 1, image_url: null })
                                setShowProductModal(true)
                            }}
                            className="px-6 py-3 bg-brand-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة منتج للموقع
                        </button>
                        <button 
                            onClick={loadWebsiteData}
                            className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-slate-600"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                            <motion.div 
                                layout
                                key={product.id}
                                className={`bg-white rounded-[2rem] border transition-all p-5 flex flex-col gap-4 ${product.is_active ? 'border-brand-primary shadow-md shadow-brand-primary/5' : 'border-slate-100 shadow-sm opacity-75 grayscale'}`}
                            >
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden relative group shrink-0">
                                        {product.image_url ? (
                                            <img 
                                                src={`${API_BASE_URL}${product.image_url}`} 
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label className="cursor-pointer p-2 bg-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                                                <Upload className="w-5 h-5 text-brand-primary" />
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, product.id)}
                                                    disabled={isUploading}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-black text-slate-700 truncate">{product.name}</h3>
                                            <button 
                                                onClick={() => handleToggleVisibility(product)}
                                                className={`p-2 rounded-xl transition-all ${product.is_active ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-400 hover:text-brand-primary'}`}
                                            >
                                                {product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 mt-1">{product.category}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-black text-brand-primary min-w-fit">100ml: {product.price_100ml} ج.م</span>
                                            <span className="text-xs font-black text-brand-primary min-w-fit">55ml: {product.price_55ml} ج.م</span>
                                            <span className="text-xs font-black text-brand-primary min-w-fit">35ml: {product.price_35ml} ج.م</span>
                                        </div>
                                        {product.is_offer === 1 && (
                                            <div className="mt-2 text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-600 w-fit rounded-lg">عرض خاص</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 border-t border-slate-50 pt-4">
                                    <button 
                                        onClick={() => {
                                            setEditingProduct(product)
                                            setShowProductModal(true)
                                        }}
                                        className="flex-1 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        تعديل المنتج
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-700">الفئات الحالية</h2>
                            <button className="px-5 py-2.5 bg-brand-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-brand-primary/20 flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                إضافة فئة جديدة
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="p-5 bg-slate-50 rounded-3xl flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                            <Layers className="w-5 h-5 text-brand-primary" />
                                        </div>
                                        <div>
                                            <span className="font-black text-slate-700">{cat}</span>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {products.filter(p => p.category === cat).length} منتج
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-slate-400 hover:text-brand-primary transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-500 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Edit Modal */}
            <AnimatePresence>
                {showProductModal && editingProduct && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-8">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowProductModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-slate-700">تعديل بيانات المنتج على الموقع</h2>
                                    <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                                        <XCircle className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">اسم المنتج على الموقع</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                            value={editingProduct.name}
                                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">الوصف (اختياري)</label>
                                            <textarea 
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all min-h-[100px] resize-none"
                                                value={editingProduct.description || ''}
                                                onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">الفئة</label>
                                            <input 
                                                list="category-list"
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
                                                value={editingProduct.category}
                                                onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                                                placeholder="اختر أو اكتب فئة جديدة..."
                                            />
                                            <datalist id="category-list">
                                                {categories.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </div>
                                        
                                         <div className="space-y-2">
                                            <div className="flex items-end h-full">
                                                <label className="w-full cursor-pointer py-4 px-6 bg-brand-primary/10 text-brand-primary rounded-2xl text-[10px] font-black text-center border-2 border-dashed border-brand-primary/30 hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2">
                                                    <Upload className="w-4 h-4" />
                                                    {editingProduct.image_url ? 'تغيير صورة المنتج' : 'رفع صورة للمنتج (مطلوب)'}
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(e, editingProduct.id)}
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                            </div>
                                            {editingProduct.image_url && (
                                                <div className="mt-2 h-full flex items-center gap-2 py-4 px-6 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black">
                                                    <ImageIcon className="w-4 h-4" />
                                                    {editingProduct.id === null ? 'تم رفع الصورة بنجاح للمنتج الجديد' : 'الصورة جاهزة للحفظ'}
                                                </div>
                                            )}
                                         </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">سعر 100 مل (ج.م)</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                                value={editingProduct.price_100ml}
                                                onChange={(e) => setEditingProduct({...editingProduct, price_100ml: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">سعر 55 مل (ج.م)</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                                value={editingProduct.price_55ml}
                                                onChange={(e) => setEditingProduct({...editingProduct, price_55ml: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">سعر 35 مل (ج.م)</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                                value={editingProduct.price_35ml}
                                                onChange={(e) => setEditingProduct({...editingProduct, price_35ml: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${editingProduct.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {editingProduct.is_active ? <Globe className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-slate-700">ظهور</p>
                                            </div>
                                            <button 
                                                onClick={() => setEditingProduct({...editingProduct, is_active: editingProduct.is_active ? 0 : 1})}
                                                className={`relative w-12 h-6 rounded-full transition-all ${editingProduct.is_active ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                            >
                                                <motion.div 
                                                    animate={{ x: editingProduct.is_active ? 24 : 4 }}
                                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${editingProduct.is_offer ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <div className="w-6 h-6 font-black text-center leading-none">%</div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-slate-700">عرض خاص</p>
                                            </div>
                                            <button 
                                                onClick={() => setEditingProduct({...editingProduct, is_offer: editingProduct.is_offer ? 0 : 1})}
                                                className={`relative w-12 h-6 rounded-full transition-all ${editingProduct.is_offer ? 'bg-amber-500' : 'bg-slate-200'}`}
                                            >
                                                <motion.div 
                                                    animate={{ x: editingProduct.is_offer ? 24 : 4 }}
                                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={async () => {
                                            try {
                                                if (!editingProduct.name || !editingProduct.category) {
                                                   return notify('يرجى كتابة اسم المنتج واختيار الفئة', 'error')
                                                }
                                                const channel = editingProduct.id ? 'products:website-update' : 'products:website-add'
                                                console.log('Sending to channel:', channel, editingProduct)
                                                const result = await window.api.invoke(channel, editingProduct)
                                                console.log('Save result:', result)
                                                
                                                if (result && result.success) {
                                                    notify('تم حفظ التعديلات بنجاح', 'success')
                                                    loadWebsiteData()
                                                    setShowProductModal(false)
                                                } else {
                                                    notify(result?.message || 'فشل حفظ التعديلات - راجع السجل', 'error')
                                                }
                                            } catch (err) {
                                                console.error('Save crash:', err)
                                                notify('حدث خطأ فني أثناء الحفظ', 'error')
                                            }
                                        }}
                                        className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-5 h-5" />
                                        حفظ التعديلات
                                    </button>
                                    <button 
                                        onClick={() => setShowProductModal(false)}
                                        className="px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Viewer Overlay */}
            <AnimatePresence>
                {viewingImage && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-8">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                            onClick={() => setViewingImage(null)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative z-10 max-w-4xl max-h-full"
                        >
                            <img 
                                src={viewingImage} 
                                alt="Payment Proof" 
                                className="w-full h-full object-contain rounded-3xl shadow-3xl"
                            />
                            <button 
                                onClick={() => setViewingImage(null)}
                                className="absolute -top-4 -left-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:scale-110 transition-transform"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

WebOrdersView.propTypes = {
    notify: PropTypes.func.isRequired,
    ask: PropTypes.func.isRequired
}
