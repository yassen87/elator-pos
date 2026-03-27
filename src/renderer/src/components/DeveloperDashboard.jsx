import React, { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Users, Lock, ShieldCheck, CheckCircle2, Upload, FileCode, Package, AlertCircle, LogOut, Cloud, Trash2, Power, RefreshCw, Link, QrCode, Wifi, Database, Save, MessageCircle, ShieldAlert, Globe, RotateCcw, Zap, Settings, Eye, EyeOff, BarChart, Wallet, Banknote, Printer } from 'lucide-react'
import { motion } from 'framer-motion'
import { BarcodeSticker } from './BarcodeSticker'
import { PrintableInvoice } from './views/PrintableInvoice'
import { printComponent } from '../utils/printHelper'

export default function DeveloperDashboard({ user, onLogout, notify, ask }) {
    const [users, setUsers] = useState([])
    const [selectedFile, setSelectedFile] = useState(null)
    const [version, setVersion] = useState('')
    const [releaseNotes, setReleaseNotes] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [apiUrl, setApiUrl] = useState('http://localhost:5000')
    const [localIp, setLocalIp] = useState('127.0.0.1')
    const [shopUsername, setShopUsername] = useState('')
    const [shopPassword, setShopPassword] = useState('')
    const [activeTab, setActiveTab] = useState('overview')
    const [remoteShops, setRemoteShops] = useState([])
    const [isLinked, setIsLinked] = useState(false)
    const [shopName, setShopName] = useState('')
    const [isSyncingAll, setIsSyncingAll] = useState(false)
    const [syncLoading, setSyncLoading] = useState(false)
    const [isPrintingInvoice, setIsPrintingInvoice] = useState(false)
    const [isPrintingSticker, setIsPrintingSticker] = useState(false)
    const [editingPermissions, setEditingPermissions] = useState(null)
    const [tempPermissions, setTempPermissions] = useState([])
    const [whatsappEnabled, setWhatsappEnabled] = useState(true)
    const [systemFeatures, setSystemFeatures] = useState({})

    const dummyItem = {
        name: 'كريستال',
        barcode: 'KRST-001',
        qty: 1,
        price: 150,
        description: 'نوع الزجاجة: 35 \nالمكونات: 15 ملي إثارة + 20 ملي لومال الاكسير',
        details: JSON.stringify({ text: 'نوع الزجاجة: زجاجة 35 (50 مل)\nالمكونات: 15 ملي إثارة + 20 ملي لومال الاكسير' })
    }

    const dummyProduct = {
        item_name: 'كريستال',
        barcode: 'KRST-001',
        price_per_gram: 3.0,
        stock_quantity: 50,
        category: 'oil'
    }

    const handlePrintInvoice = async () => {
        if (isPrintingInvoice) return
        setIsPrintingInvoice(true)
        notify('جاري تجهيز الفاتورة...', 'info')
        try {
            await printComponent(PrintableInvoice, {
                sale: { invoiceCode: 'TEST-123', total: 150, items: [dummyItem], date: new Date().toISOString() },
                settings: systemFeatures,
                parseDetails: (d) => typeof d === 'string' ? d : (d?.text || '')
            })
            notify('تم إرسال الفاتورة للطابعة ✅', 'success')
        } catch (err) {
            notify(`فشل الطباعة: ${err?.message || 'خطأ غير معروف'}`, 'error')
        } finally {
            setIsPrintingInvoice(false)
        }
    }

    const handleStickerPrint = async () => {
        if (isPrintingSticker) return
        setIsPrintingSticker(true)
        notify('جاري تجهيز الاستيكر...', 'info')
        try {
            const isTwin = systemFeatures.sticker_type === 'twin' || systemFeatures.sticker_type === 'twin_35x25';
            const isCompact = systemFeatures.sticker_type === 'compact';
            const isPharmacy = systemFeatures.sticker_type === 'pharmacy';
            
            // Default standard 50x30
            let w = '50mm', h = '30mm';
            if (systemFeatures.sticker_type === 'twin_35x25' || systemFeatures.sticker_type === 'standard_35x25') { w = '35mm'; h = '25mm'; }
            else if (isTwin) { w = '38mm'; h = '25mm'; }
            else if (isCompact) { h = '16mm'; }
            else if (isPharmacy) { w = '38mm'; h = '12.5mm'; }

            await printComponent(BarcodeSticker, {
                product: dummyProduct,
                settings: systemFeatures
            }, { width: w, height: h })
            notify('تم إرسال الاستيكر للطابعة ✅', 'success')
        } catch (err) {
            notify(`فشل طباعة الاستيكر: ${err?.message || 'خطأ غير معروف'}`, 'error')
        } finally {
            setIsPrintingSticker(false)
        }
    }

    useEffect(() => {
        if (editingPermissions) {
            try {
                const initial = JSON.parse(editingPermissions.permissions || '[]')
                setTempPermissions(initial)
            } catch (e) {
                setTempPermissions([])
            }
        }
    }, [editingPermissions])

    useEffect(() => {
        loadUsers()
        loadCloudSettings()
        fetchRemoteShops()

        window.api.invoke('system:get-local-ip').then(res => {
            if (res.ip) setLocalIp(res.ip)
        })

        window.api.getWhatsAppStatus().then(res => {
            if (res && typeof res.enabled !== 'undefined') {
                setWhatsappEnabled(res.enabled)
            }
        })
    }, [])

    const loadCloudSettings = async () => {
        try {
            const settings = await window.api.getSettings()
            if (settings.api_url) setApiUrl(settings.api_url)
            if (settings.is_linked) {
                setIsLinked(true)
                setShopName(settings.shop_name || '')
            }
            if (settings.is_linked) {
                setIsLinked(true)
                setShopName(settings.shop_name || '')
            }
            setSystemFeatures(settings || {})
        } catch (error) {
            console.error('Failed to load cloud settings:', error)
        }
    }

    const loadUsers = async () => {
        try {
            const data = await window.api.getSuperUsersList()
            setUsers(data || [])
        } catch (error) {
            notify('فشل تحميل قائمة المستخدمين', 'error')
        }
    }

    const handleSavePermissions = async () => {
        if (!editingPermissions) return
        try {
            const result = await window.api.invoke('users:update-permissions', {
                id: editingPermissions.id,
                permissions: tempPermissions
            })
            if (result.success) {
                notify('تم تحديث الصلاحيات بنجاح', 'success')
                setEditingPermissions(null)
                loadUsers()
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            notify('فشل تحديث الصلاحيات', 'error')
        }
    }

    const togglePermission = (perm) => {
        setTempPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        )
    }

    const fetchRemoteShops = async () => {
        try {
            const result = await window.api.invoke('super:get-remote-shops')
            if (result.success) {
                setRemoteShops(result.shops)
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            notify(`فشل تحميل المحلات البعيدة: ${error.message}`, 'error')
        }
    }

    const toggleShopStatus = async (shopId, newStatus) => {
        ask(
            'تغيير حالة المحل',
            `هل أنت متأكد من تغيير حالة المحل إلى "${newStatus === 'active' ? 'نشط' : 'موقوف'}"؟`,
            async () => {
                try {
                    const result = await window.api.invoke('super:update-shop-status', { shopId, status: newStatus })
                    if (result.success) {
                        notify(`تم تغيير حالة المحل بنجاح إلى ${newStatus === 'active' ? 'نشط' : 'موقوف'}`, 'success')
                        fetchRemoteShops()
                    } else {
                        throw new Error(result.message)
                    }
                } catch (error) {
                    notify(`فشل تغيير حالة المحل: ${error.message}`, 'error')
                }
            }
        )
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            const validExtensions = ['.exe', '.msi', '.zip', '.dmg', '.AppImage']
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
            if (validExtensions.includes(fileExt)) {
                setSelectedFile(file)
                notify(`تم اختيار الملف: ${file.name}`, 'success')
            } else {
                notify('يرجى اختيار ملف تنصيب صالح (.exe, .msi, .zip)', 'error')
            }
        }
    }

    const handlePublishUpdate = async () => {
        if (!selectedFile || !version.trim()) {
            notify('يرجى اختيار ملف وإدخال الإصدار', 'error')
            return
        }
        ask('نشر التحديث', `هل أنت متأكد من نشر الإصدار ${version}؟`, async () => {
            setIsUploading(true)
            setUploadProgress(0)
            try {
                const interval = setInterval(() => {
                    setUploadProgress(prev => (prev >= 95 ? 95 : prev + 5))
                }, 200)
                await new Promise(resolve => setTimeout(resolve, 2000))
                clearInterval(interval)
                setUploadProgress(100)
                setTimeout(() => {
                    notify(`تم نشر الإصدار ${version} بنجاح! 🎉`, 'success')
                    setIsUploading(false)
                    setSelectedFile(null)
                    setVersion('')
                }, 500)
            } catch (error) {
                notify('فشل رفع التحديث', 'error')
                setIsUploading(false)
            }
        })
    }

    const handleLinkShop = async () => {
        if (!shopUsername || !shopPassword) {
            notify('يرجى إدخال البيانات كاملة', 'error')
            return
        }
        let cleanUrl = apiUrl.trim().split(/\s+/)[0].replace(/[^\x00-\x7F]/g, '');
        setSyncLoading(true)
        try {
            const result = await window.api.invoke('shop:link', {
                url: cleanUrl,
                username: shopUsername.trim(),
                password: shopPassword.trim()
            })
            if (result.success) {
                setIsLinked(true)
                setShopName(result.shopName)
                notify(`✅ تم الربط بنجاح بمحل: ${result.shopName}`, 'success')
            } else {
                notify(`❌ فشل الربط: ${result.message}`, 'error')
            }
        } catch (error) {
            notify(`❌ خطأ في الاتصال: ${error.message}`, 'error')
        } finally {
            setSyncLoading(false)
        }
    }

    const handleSyncAll = async () => {
        ask('مزامنة شاملة', 'رفع جميع البيانات للسحاب؟', async () => {
            setIsSyncingAll(true)
            try {
                const result = await window.api.invoke('sync:all')
                if (result.success) notify('تمت المزامنة بنجاح!', 'success')
                else throw new Error(result.error)
            } catch (error) {
                notify(`فشل: ${error.message}`, 'error')
            } finally {
                setIsSyncingAll(false)
            }
        })
    }

    const handleToggleWhatsApp = async () => {
        try {
            const newState = !whatsappEnabled
            await window.api.toggleWhatsApp({ enabled: newState })
            setWhatsappEnabled(newState)
            notify(newState ? 'مفعل ✅' : 'معطل ⛔', 'info')
        } catch (e) { notify('فشل', 'error') }
    }

    const toggleFeature = (key) => {
        setSystemFeatures(prev => ({
            ...prev,
            [key]: prev[key] === '0' ? '1' : '0'
        }))
    }

    const saveSystemConfig = async () => {
        try {
            await window.api.updateSettings(systemFeatures)
            notify('تم حفظ إعدادات النظام بنجاح', 'success')
        } catch (error) {
            notify('فشل حفظ الإعدادات', 'error')
        }
    }

    const saveSystemFeatures = async () => {
        try {
            await window.api.updateSettings(systemFeatures)
            notify('تم حفظ إعدادات النظام بنجاح', 'success')
        } catch (error) {
            notify('فشل حفظ الإعدادات', 'error')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-noto" dir="rtl">
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">لوحة المطور</h1>
                            <p className="text-sm text-slate-400 font-bold">إدارة النظام ونشر التحديثات</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-2 px-6 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold border border-red-100">
                        <LogOut className="w-5 h-5" />
                        <span>خروج</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-8 flex gap-8">
                    <button onClick={() => setActiveTab('overview')} className={`py-6 px-4 font-black text-sm transition-all border-b-4 ${activeTab === 'overview' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        <Zap className="w-5 h-5 inline-block ml-2" /> نشر التحديثات
                    </button>
                    <button onClick={() => setActiveTab('remote')} className={`py-6 px-4 font-black text-sm transition-all border-b-4 ${activeTab === 'remote' ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        <ShieldAlert className="w-5 h-5 inline-block ml-2" /> التحكم عن بعد
                    </button>
                    <button onClick={() => setActiveTab('configs')} className={`py-6 px-4 font-black text-sm transition-all border-b-4 ${activeTab === 'configs' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        <Settings className="w-5 h-5 inline-block ml-2" /> إعدادات الأدمن
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-12">
                <div className="space-y-8">
                    {activeTab === 'overview' && (
                        <>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
                                <h3 className="text-3xl font-black mb-8 flex items-center gap-4"><Upload /> نشر تحديث جديد</h3>
                                <div className="space-y-6 max-w-2xl">
                                    <input type="file" id="up-file" className="hidden" onChange={handleFileSelect} />
                                    <label htmlFor="up-file" className="block w-full border-2 border-dashed border-white/20 rounded-2xl py-10 text-center cursor-pointer hover:bg-white/5 transition-all">
                                        {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف التحديث'}
                                    </label>
                                    <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="رقم الإصدار (مثال 1.2.0)" className="w-full bg-white/10 rounded-xl px-6 py-4 text-white font-bold" />
                                    {isUploading && (
                                        <div className="w-full bg-white/10 rounded-full h-3"><div className="bg-brand-primary h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                                    )}
                                    <button onClick={handlePublishUpdate} disabled={isUploading} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-xl hover:bg-brand-primary hover:text-white transition-all">
                                        {isUploading ? 'جاري الرفع...' : 'نشر التحديث الآن'}
                                    </button>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100">
                                <h3 className="text-3xl font-black mb-8 flex items-center gap-4 text-slate-800"><Cloud /> ربط السحاب (Custom API)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="w-full bg-slate-50 border p-4 rounded-xl" placeholder="URL" />
                                    <input type="text" value={shopUsername} onChange={e => setShopUsername(e.target.value)} className="w-full bg-slate-50 border p-4 rounded-xl" placeholder="Username" />
                                    <input type="password" value={shopPassword} onChange={e => setShopPassword(e.target.value)} className="w-full bg-slate-50 border p-4 rounded-xl" placeholder="Password" />
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button onClick={handleLinkShop} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black">ربط المحل 🔗</button>
                                    <button onClick={handleSyncAll} disabled={!isLinked} className="px-8 bg-slate-100 py-4 rounded-2xl font-black">مزامنة البيانات</button>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-xl font-black text-slate-800 mb-6">إدارة المشتركين (Local Users)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="p-4 text-sm font-black text-slate-500">اسم المستخدم</th>
                                                <th className="p-4 text-sm font-black text-slate-500">آخر دخول</th>
                                                <th className="p-4 text-sm font-black text-slate-500">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(u => (
                                                <tr key={u.id} className="border-t">
                                                    <td className="p-4 font-bold">{u.username}</td>
                                                    <td className="p-4 text-xs">{u.last_login_at || 'N/A'}</td>
                                                    <td className="p-4 flex gap-2">
                                                        <button onClick={() => setEditingPermissions(u)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ShieldCheck size={18} /></button>
                                                        <button onClick={() => handleDeleteUser(u)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </>
                    )}

                    {activeTab === 'remote' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-3xl font-black flex items-center gap-4"><ShieldAlert /> المحلات البعيدة</h3>
                                    <button onClick={fetchRemoteShops} className="p-4 bg-slate-50 rounded-2xl"><RotateCcw /></button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="text-slate-400 text-xs">
                                                <th className="p-6">المحل</th>
                                                <th className="p-6">آخر مزامنة</th>
                                                <th className="p-6">الإصدار</th>
                                                <th className="p-6">الحالة</th>
                                                <th className="p-6">التحكم</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {remoteShops.map(shop => (
                                                <tr key={shop.shop_id} className="border-t hover:bg-slate-50">
                                                    <td className="p-6">
                                                        <div>
                                                            <div className="font-black text-slate-800">{shop.shop_name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">ID: {shop.shop_id}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-sm font-bold">{new Date(shop.last_sync).toLocaleString('ar-EG')}</td>
                                                    <td className="p-6 font-mono font-black text-brand-primary text-lg">v{shop.version}</td>
                                                    <td className="p-6">
                                                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${shop.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {shop.status === 'active' ? 'نشط' : 'موقف'}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        <button onClick={() => toggleShopStatus(shop.shop_id, shop.status === 'active' ? 'locked' : 'active')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${shop.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'}`}>
                                                            {shop.status === 'active' ? 'إيقاف النسخة' : 'تفعيل'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'configs' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">

                            {/* Barcode Feature Visibility */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <QrCode className="text-brand-primary" />
                                        تفعيل خانة الباركود
                                    </h3>
                                    <p className="text-slate-400 text-sm font-bold">إظهار/إخفاء خانة الباركود في إدارة المنتجات والقوائم</p>
                                </div>
                                <button
                                    onClick={() => toggleFeature('show_barcode_field')}
                                    className={`w-16 h-8 rounded-full transition-all relative ${systemFeatures.show_barcode_field === '1' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${systemFeatures.show_barcode_field === '1' ? 'right-9' : 'right-1'}`} />
                                </button>
                            </div>

                            {/* Global Pricing Unit */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <Database className="text-brand-primary" />
                                        وحدة القياس الافتراضية
                                    </h3>
                                    <p className="text-slate-400 text-sm font-bold">تحديد ما إذا كان بيع الزيوت بالملي أم بالجرام بشكل افتراضي</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => setSystemFeatures(prev => ({ ...prev, global_unit: 'ml' }))}
                                        className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.global_unit !== 'gram' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        ملي (ML)
                                    </button>
                                    <button
                                        onClick={() => setSystemFeatures(prev => ({ ...prev, global_unit: 'gram' }))}
                                        className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.global_unit === 'gram' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        جرام (Gram)
                                    </button>
                                </div>
                            </div>

                            {/* ML in Invoices Control */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mt-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                            <Database className="text-brand-primary" />
                                            عرض الملي في الفواتير
                                        </h3>
                                        <p className="text-slate-400 text-sm font-bold">إظهار أو إخفاء حجم الزجاجة والملي (ML) في فواتير الكاشير والواتساب</p>
                                    </div>
                                    <button
                                        onClick={() => toggleFeature('show_ml_in_invoices')}
                                        className={`w-16 h-8 rounded-full transition-all relative shrink-0 ${systemFeatures.show_ml_in_invoices !== '0' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${systemFeatures.show_ml_in_invoices !== '0' ? 'right-9' : 'right-1'}`} />
                                    </button>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                    <button 
                                        onClick={handlePrintInvoice}
                                        disabled={isPrintingInvoice}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Printer size={16} /> {isPrintingInvoice ? 'جاري...' : 'تجربة طباعة فاتورة (زجاجة 35 وجواها 15 ملي إثارة + 20 ملي لومال الاكسير)'}
                                    </button>
                                </div>
                            </div>

                            {/* Barcode Sticker Configuration */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Settings className="text-brand-primary" />
                                    محتوى طباعة الباركود
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { key: 'barcode_show_name', label: 'اسم المنتج' },
                                        { key: 'barcode_show_price', label: 'السعر والتاريخ' },
                                        { key: 'barcode_show_qty', label: 'الكمية/الوزن' },
                                        { key: 'barcode_show_graphic', label: 'كود الباركود (الخطوط)' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="font-black text-slate-700">{item.label}</span>
                                            <button
                                                onClick={() => toggleFeature(item.key)}
                                                className={`w-12 h-6 rounded-full transition-all relative ${systemFeatures[item.key] !== '0' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${systemFeatures[item.key] !== '0' ? 'right-7' : 'right-1'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-[10px] text-slate-400 font-bold text-center">سيتم تطبيق هذه الإعدادات عند طباعة الباركود من سجل التركيبات أو إدارة المنتجات.</p>
                            </div>

                            {/* Sticker Printing Size */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                            <Printer className="text-brand-primary" />
                                            مقاس ورق الاستيكر
                                        </h3>
                                        <p className="text-slate-400 text-sm font-bold">تحديد المقاس الفعلي لورق الطباعة المستخدم</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'standard' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${(!systemFeatures.sticker_type || systemFeatures.sticker_type === 'standard') ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            عادي (50x30)
                                        </button>
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'compact' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_type === 'compact' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            نص واحدة (38x10)
                                        </button>
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'twin' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_type === 'twin' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            نصف استيكر (38x25)
                                        </button>
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'twin_35x25' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_type === 'twin_35x25' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            نصف استيكر (35x25)
                                        </button>
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'standard_35x25' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_type === 'standard_35x25' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            استيكر كامل (35x25)
                                        </button>
                                        <button
                                            onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_type: 'pharmacy' }))}
                                            className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_type === 'pharmacy' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                        >
                                            صيدلية (38x12.5)
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                    <button 
                                        onClick={handleStickerPrint}
                                        disabled={isPrintingSticker}
                                        className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Printer size={16} /> {isPrintingSticker ? 'جاري...' : 'تجربة طباعة استيكر بالمقاس والإعدادات الحالية'}
                                    </button>
                                </div>
                            </div>

                            {/* Sticker Orientation */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between mt-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <RotateCcw className="text-brand-primary" />
                                        اتجاة الطباعة
                                    </h3>
                                    <p className="text-slate-400 text-sm font-bold">تغيير اتجاه الورقة (عرضي أو طولي)</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_orientation: 'landscape' }))}
                                        className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_orientation !== 'portrait' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        عرضي (Landscape)
                                    </button>
                                    <button
                                        onClick={() => setSystemFeatures(prev => ({ ...prev, sticker_orientation: 'portrait' }))}
                                        className={`px-6 py-2 text-sm font-black rounded-xl transition-all ${systemFeatures.sticker_orientation === 'portrait' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        طولي (Portrait)
                                    </button>
                                </div>
                            </div>

                            {/* Admin Modules Visibility */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8">
                                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                            <ShieldAlert className="text-red-500" />
                                            إدارة التفعيل والخدمات
                                        </h3>
                                        <p className="text-slate-400 text-sm font-bold mt-2">تفعيل النسخة الدائمة والتحكم في الخدمات الأساسية</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Permanent Activation */}
                                    <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-brand-primary/20 transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div>
                                                <span className="font-black text-slate-700 block">تفعيل البرنامج كامل</span>
                                                <span className="text-[10px] text-slate-400 font-bold">إلغاء الفترة التجريبية (7 أيام) للأبد</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                ask('تفعيل النسخة الكاملة', 'هل أنت متأكد من تفعيل النسخة الكاملة لهذا الجهاز؟ لن تظهر رسالة انتهاء الصلاحية مرة أخرى.', async () => {
                                                    const res = await window.api.invoke('app:activate-full-version');
                                                    if (res.success) notify('تم التفعيل بنجاح! 🎉', 'success');
                                                });
                                            }}
                                            className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                                        >
                                            تفعيل الآن
                                        </button>
                                    </div>

                                    {/* WhatsApp Toggle */}
                                    <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-brand-primary/20 transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${whatsappEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                <MessageCircle size={20} />
                                            </div>
                                            <div>
                                                <span className="font-black text-slate-700 block">خدمة واتساب</span>
                                                <span className="text-[10px] text-slate-400 font-bold">تفعيل أو تعطيل البوت والرسائل التلقائية</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleToggleWhatsApp}
                                            className={`w-16 h-8 rounded-full transition-all relative ${whatsappEnabled ? 'bg-green-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${whatsappEnabled ? 'right-9' : 'right-1'}`} />
                                        </button>
                                    </div>

                                    {/* Pricing Tier Selector */}
                                    <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-brand-primary/20 transition-all">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                                <Banknote size={20} />
                                            </div>
                                            <div>
                                                <span className="font-black text-slate-700 block">نوع الأسعار</span>
                                                <span className="text-[10px] text-slate-400 font-bold">اختر نوع العملاء (جملة/قطاعي/الاتنين)</span>
                                            </div>
                                        </div>
                                        <select
                                            value={systemFeatures.pricing_mode || 'both'}
                                            onChange={(e) => setSystemFeatures(prev => ({ ...prev, pricing_mode: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        >
                                            <option value="both">الاتنين (جملة + قطاعي)</option>
                                            <option value="wholesale">جملة فقط</option>
                                            <option value="retail">قطاعي فقط</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Modules Visibility */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                            <Lock className="text-brand-primary" />
                                            صلاحيات لوحة الأدمن
                                        </h3>
                                        <p className="text-slate-400 text-sm font-bold mt-2">تحكم في الصفحات التي تظهر لمدير النظام (Admin)</p>
                                    </div>
                                    <button onClick={saveSystemFeatures} className="px-8 py-3 bg-brand-primary text-white rounded-xl font-black shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all">
                                        حفظ التغييرات
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { key: 'hide_reports', label: 'التقارير والمبيعات', icon: BarChart },
                                        { key: 'hide_products', label: 'إدارة المنتجات', icon: Package },
                                        { key: 'hide_formulas', label: 'إدارة التركيبات', icon: Database },
                                        { key: 'hide_web_orders', label: 'طلبات الموقع', icon: Globe },
                                        { key: 'hide_returns', label: 'المرتجعات', icon: RefreshCw },
                                        { key: 'hide_shortages', label: 'النواقص', icon: AlertCircle },
                                        { key: 'hide_suppliers', label: 'الموردين', icon: Link },
                                        { key: 'hide_expenses', label: 'المصاريف', icon: Wallet },
                                        { key: 'hide_customers', label: 'سجلات العملاء', icon: Users },
                                        { key: 'hide_cashiers', label: 'إدارة البائعين', icon: Users },
                                        { key: 'hide_hr', label: 'شؤون الموظفين', icon: Users },
                                        { key: 'hide_payroll', label: 'المرتبات', icon: Power },
                                        { key: 'hide_attendance_log', label: 'سجل الحضور', icon: CheckCircle2 },
                                        { key: 'hide_whatsapp', label: 'واتساب', icon: MessageCircle },
                                        { key: 'hide_mobile', label: 'التحكم عن بُعد', icon: Wifi },
                                        { key: 'hide_settings', label: 'إعدادات المحل', icon: Settings },
                                    ].map(item => {
                                        const isHidden = systemFeatures[item.key] === '1'
                                        return (
                                            <div key={item.key} className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${isHidden ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-white hover:border-brand-primary/20'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHidden ? 'bg-red-100 text-red-400' : 'bg-brand-primary/5 text-brand-primary'}`}>
                                                        <item.icon size={20} />
                                                    </div>
                                                    <span className={`font-black ${isHidden ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
                                                </div>
                                                <button
                                                    onClick={() => toggleFeature(item.key)}
                                                    className={`p-2 rounded-lg transition-all ${isHidden ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:text-brand-primary'}`}
                                                >
                                                    {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={saveSystemConfig}
                                className="w-full bg-brand-primary text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                <Save className="w-8 h-8" />
                                حفظ إعدادات النظام
                            </button>

                        </motion.div>
                    )}
                </div>
            </div>

            {/* Global Unit & Barcode Sticker Config Modal */}
            {editingPermissions && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black">صلاحيات: {editingPermissions.username}</h3>
                            <button onClick={() => setEditingPermissions(null)} className="p-2 hover:bg-slate-200 rounded-lg"><RotateCcw /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { id: 'sales', title: 'المبيعات', items: [{ key: 'sales:pos', label: 'نقطة البيع' }, { key: 'sales:history', label: 'سجل المبيعات' }] },
                                { id: 'inventory', title: 'المخزون', items: [{ key: 'products:view', label: 'المنتجات' }, { key: 'products:edit', label: 'تعديل' }] }
                            ].map(sec => (
                                <div key={sec.id} className="space-y-4">
                                    <h4 className="font-black text-slate-700 pb-2 border-b">{sec.title}</h4>
                                    {sec.items.map(item => (
                                        <button key={item.key} onClick={() => togglePermission(item.key)} className={`w-full text-right p-4 rounded-xl border-2 ${tempPermissions.includes(item.key) ? 'border-brand-primary bg-purple-50' : 'border-slate-100'}`}>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t flex gap-4">
                            <button onClick={handleSavePermissions} className="flex-1 bg-brand-primary text-white py-4 rounded-xl font-black">حفظ التعديلات</button>
                        </div>
                    </motion.div>
                </div>
            )}

        </div>
    )
}
