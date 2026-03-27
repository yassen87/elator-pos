import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UsersView from './components/views/UsersView'
import ShopsView from './components/views/ShopsView'
import AnalyticsView from './components/views/AnalyticsView'
import {
    BarChart3,
    LayoutDashboard,
    Package,
    Settings,
    ShieldCheck,
    Activity,
    Plus,
    Upload,
    Monitor,
    Users,
    RefreshCw,
    History,
    Download,
    Lock,
    MoreVertical,
    ArrowUpRight,
    MessageCircle,
    Search,
    Wifi
} from 'lucide-react'

// Sidebar Item Component
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${active
            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
            : 'text-slate-500 hover:bg-slate-100'
            }`}
    >
        <Icon size={20} />
        <span className="font-bold text-sm">{label}</span>
    </button>
)

// Stat Card Component
const StatCard = ({ label, value, trend, icon: Icon }) => (
    <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-primary">
                <Icon size={24} />
            </div>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${trend > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                {trend > 0 ? '+' : ''}{trend}%
            </div>
        </div>
        <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-3xl font-black mt-1">{value}</h3>
        </div>
    </div>
)

// Shop Card Component
const ShopCard = ({ name, id, status, version, activity, onCommand, onTriggerSync, shop }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-6 rounded-[2.5rem] group hover:border-brand-primary/30 transition-all duration-500 bg-white"
    >
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <div>
                    <h4 className="font-black text-lg text-slate-900">{name}</h4>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 font-mono">ID: {id}</p>
                        {shop.is_disabled && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Lock size={8} /> محظور
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <MoreVertical size={18} className="text-slate-400" />
            </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">المبيعات</p>
                <p className="text-sm font-black text-brand-primary">{version.toLocaleString()} ج.م</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">المنتجات</p>
                <p className="text-sm font-black text-slate-900">{activity}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">الموظفين</p>
                <p className="text-sm font-black text-orange-600">{onCommand ? shop.activeStaff : 0}</p>
            </div>
        </div>

        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <button
                    onClick={() => onCommand(id, 'TAKE_BACKUP')}
                    className="flex-1 bg-brand-primary/10 text-brand-primary py-3 rounded-2xl font-black text-xs hover:bg-brand-primary hover:text-white transition-all">
                    عمل نسخة احتياطية
                </button>
                <button
                    onClick={() => onCommand(id, shop.is_disabled ? 'ENABLE_APP' : 'DISABLE_APP')}
                    className={`px-4 py-3 rounded-2xl font-black text-xs hover:text-white transition-all flex-1 ${shop.is_disabled
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500'
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500'
                        }`}>
                    {shop.is_disabled ? 'تفعيل البرنامج' : 'إيقاف البرنامج (قفل)'}
                </button>
            </div>
            <button className="w-full bg-slate-50 text-slate-700 py-3 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                <ArrowUpRight size={16} />
                <span>عرض التفاصيل الكاملة</span>
            </button>
            <button
                onClick={() => onTriggerSync(id)}
                className="w-full mt-2 bg-brand-primary/10 text-brand-primary py-3 rounded-2xl font-black text-xs hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2"
            >
                <RefreshCw size={16} />
                <span>مزامنة البيانات الآن</span>
            </button>
        </div>
    </motion.div>
)

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [shops, setShops] = useState([])
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeProducts: 0,
        avgDailySales: 0,
        securityEvents: 0
    })

    // Updates Center State
    const [selectedFile, setSelectedFile] = useState(null)
    const [updateVersion, setUpdateVersion] = useState('')
    const [updateNotes, setUpdateNotes] = useState('')
    const [targetBranch, setTargetBranch] = useState('ALL')
    const [uploading, setUploading] = useState(false)
    const [latestUpdate, setLatestUpdate] = useState(null)

    // Fetch Real Data
    const fetchData = async () => {
        try {
            const result = await window.api.invoke('hub:get-stats')
            if (result.success) {
                setShops(result.shops || [])
                // Calculate aggregated stats
                const totalRev = result.shops.reduce((acc, s) => acc + s.totalSales, 0)
                const totalProds = result.shops.reduce((acc, s) => acc + s.productCount, 0)
                const totalStaff = result.shops.reduce((acc, s) => acc + (s.activeStaff || 0), 0)
                setStats({
                    totalRevenue: totalRev,
                    activeProducts: totalProds,
                    avgDailySales: totalRev / (result.shops.length || 1),
                    securityEvents: totalStaff
                })
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        }
    }
    const handleCommand = async (branchId, command) => {
        let confirmMsg = ''
        if (command === 'CLOSE_APP') confirmMsg = 'هل أنت متأكد من إغلاق البرنامج عن بعد في هذا الفرع؟'
        else if (command === 'DISABLE_APP') confirmMsg = '⚠️ تنبيه: سيتم إغلاق البرنامج تماماً في هذا الفرع ولن يفتح إلا بتفعيلك له مجدداً. هل تود الإيقاف؟'
        else if (command === 'ENABLE_APP') confirmMsg = 'هل تود تفعيل البرنامج لهذا الفرع مجدداً؟'
        else confirmMsg = 'هل تريد طلب نسخة احتياطية من هذا الفرع؟'

        if (confirm(confirmMsg)) {
            try {
                const res = await window.api.invoke('hub:send-command', { branchId, command })
                if (res.success) {
                    alert('تم إرسال الأمر بنجاح ✅ (سيقوم الفرع بالتنفيذ خلال 60 ثانية)')
                }
            } catch (err) {
                alert('فشل إرسال الأمر: ' + err.message)
            }
        }
    }

    const handleTriggerSync = async (branchId) => {
        try {
            const res = await window.api.invoke('hub:trigger-sync', { branchId })
            if (res.success) {
                alert('تم إرسال طلب المزامنة ✅ (سيقوم الفرع بالتحديث فوراً)')
            }
        } catch (err) {
            alert('فشل طلب المزامنة: ' + err.message)
        }
    }

    const handleMasterSync = async () => {
        if (!confirm('هل أنت متأكد من رغبتك في مزامنة جميع الفروع في وقت واحد؟ قد يستغرق هذا بعض الوقت.')) return
        try {
            const res = await window.api.invoke('hub:master-sync-all')
            if (res.success) {
                alert('تم إرسال طلب المزامنة الشامل لجميع الفروع بنجاح 🚀')
            }
        } catch (err) {
            alert('فشل المزامنة الشاملة: ' + err.message)
        }
    }

    const selectFile = async () => {
        const path = await window.api.invoke('hub:select-file')
        if (path) setSelectedFile(path)
    }

    const handleUploadUpdate = async () => {
        if (!selectedFile || !updateVersion) {
            alert('يرجى اختيار ملف وإدخال رقم الإصدار')
            return
        }

        setUploading(true)
        try {
            const res = await window.api.invoke('hub:upload-update', {
                filePath: selectedFile,
                version: updateVersion,
                notes: updateNotes,
                targetBranch: targetBranch
            })
            if (res.success) {
                alert('تم رفع التحديث بنجاح! 🎉')
                setSelectedFile(null)
                setUpdateVersion('')
                setUpdateNotes('')
                fetchLatestUpdate()
            } else {
                alert('فشل الرفع: ' + res.error)
            }
        } catch (err) {
            alert('خطأ أثناء الرفع: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    const fetchLatestUpdate = async () => {
        try {
            const res = await window.api.invoke('hub:get-latest-update')
            if (res.success) setLatestUpdate(res.latest)
        } catch (err) {
            console.error('Failed to get latest update:', err)
        }
    }

    const [backups, setBackups] = useState([])

    const fetchBackups = async () => {
        try {
            const res = await window.api.invoke('hub:get-backups', { branchId: 'ALL' })
            if (res.success) setBackups(res.backups)
        } catch (err) {
            console.error('Failed to fetch backups:', err)
        }
    }

    React.useEffect(() => {
        fetchData()
        fetchLatestUpdate()
        fetchBackups()
        const interval = setInterval(() => {
            fetchData()
            fetchLatestUpdate()
            fetchBackups()
        }, 15000) // Poll every 15s
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex min-h-screen bg-brand-bg text-slate-900 selection:bg-brand-primary selection:text-white font-sans" dir="rtl">
            {/* Sidebar */}
            <aside className="w-72 border-l border-slate-200 bg-white p-6 flex flex-col gap-8 shadow-sm">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                        <ShieldCheck className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-slate-900">ELATOR<span className="text-brand-primary">HUB</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">مركز التحكم</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-2">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="لوحة القيادة"
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                    />
                    <SidebarItem
                        icon={Users}
                        label="المستخدمين"
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                    />
                    <SidebarItem
                        icon={Monitor}
                        label="المتاجر المرتبطة"
                        active={activeTab === 'shops'}
                        onClick={() => setActiveTab('shops')}
                    />
                    <SidebarItem
                        icon={Upload}
                        label="مركز التحديثات"
                        active={activeTab === 'updates'}
                        onClick={() => setActiveTab('updates')}
                    />
                    <SidebarItem
                        icon={Activity}
                        label="تحليلات الأسطول"
                        active={activeTab === 'analytics'}
                        onClick={() => setActiveTab('analytics')}
                    />
                    <SidebarItem
                        icon={History}
                        label="سجل النسخ الاحتياطي"
                        active={activeTab === 'backups'}
                        onClick={() => setActiveTab('backups')}
                    />
                </nav>

                <div className="mt-auto space-y-4">
                    <div className="bg-slate-50 p-4 rounded-3xl relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 left-0 p-2 opacity-5">
                            <Plus size={48} />
                        </div>
                        <p className="text-xs font-bold text-slate-500">إجمالي الإيرادات</p>
                        <h4 className="text-xl font-black mt-1 text-slate-900">{stats.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'} ج.م</h4>
                        <div className="w-full bg-slate-200 rounded-full h-1 mt-3 overflow-hidden">
                            <div className="bg-brand-primary h-full w-2/3" />
                        </div>
                    </div>
                    <button className="w-full flex items-center justify-between p-4 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">م</div>
                            <span className="text-sm font-bold">مدير النظام</span>
                        </div>
                        <Settings size={16} className="text-slate-400" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-10 overflow-y-auto">
                {/* Header - Only Show on Dashboard */}
                {activeTab === 'dashboard' && (
                    <header className="flex justify-between items-center mb-12">
                        <div>
                            <h2 className="text-4xl font-black">مرحباً، المدير العام</h2>
                            <p className="text-slate-400 font-bold mt-1">تعمل الأنظمة بكفاءة عبر {shops.length} نقاط بيع نشطة.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="بحث عن متجر أو معرف..."
                                    className="bg-white border border-slate-200 rounded-2xl py-3 pr-12 pl-6 w-96 font-bold text-sm focus:border-brand-primary outline-none transition-all shadow-sm"
                                />
                            </div>
                            <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all relative">
                                <MessageCircle size={22} className="text-slate-600" />
                                <div className="absolute top-2 left-2 w-2 h-2 bg-brand-primary rounded-full border-2 border-white" />
                            </button>
                        </div>
                    </header>
                )}

                {activeTab === 'dashboard' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard label="المتاجر النشطة" value={shops.length} trend={shops.length > 0 ? 100 : 0} icon={Monitor} />
                            <StatCard label="المبيعات الإجمالية" value={stats.totalRevenue.toLocaleString() + ' ج.م'} trend={0} icon={BarChart3} />
                            <StatCard label="المنتجات المسجلة" value={stats.activeProducts} trend={0} icon={Package} />
                            <StatCard label="الموظفين الآن" value={stats.securityEvents} trend={0} icon={Users} />
                        </div>

                        <section>
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h3 className="text-2xl font-black">إدارة النقاط البعيدة</h3>
                                    <p className="text-slate-500 text-sm font-bold">مقارنة حية للمتاجر والتحكم عن بعد.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={fetchData} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2">
                                        <RefreshCw size={14} />
                                        تحديث يدوي
                                    </button>
                                    <button onClick={handleMasterSync} className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-primary/20 flex items-center gap-2">
                                        <Activity size={14} />
                                        مزامنة شاملة (Master Sync)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {shops.map(shop => <ShopCard
                                    key={shop.id}
                                    name={shop.name}
                                    id={shop.id}
                                    status={shop.status}
                                    version={shop.totalSales}
                                    activity={shop.productCount}
                                    onCommand={handleCommand}
                                    onTriggerSync={handleTriggerSync}
                                    shop={shop}
                                />
                                )}
                                {shops.length === 0 && (
                                    <div className="col-span-full py-20 text-center opacity-30">
                                        <Wifi size={48} className="mx-auto mb-4 text-slate-400" />
                                        <p className="font-bold text-slate-500">لا توجد أفرع مرتبطة حالياً بالسيرفر</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'users' && <UsersView />}
                {activeTab === 'shops' && <ShopsView shops={shops} onCommand={handleCommand} onTriggerSync={handleTriggerSync} />}
                {activeTab === 'analytics' && <AnalyticsView stats={stats} shops={shops} />}

                {activeTab === 'backups' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-black">سجل النسخ الاحتياطي السحابي</h2>
                            <p className="text-slate-400 font-bold mt-1">عرض وتحميل قواعد البيانات المرفوعة من الفروع المختلفة.</p>
                        </div>

                        <div className="glass p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">الفرع</th>
                                        <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">التاريخ</th>
                                        <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">الحجم</th>
                                        <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">الإجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((b, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all rounded-2xl">
                                            <td className="py-4 font-black text-slate-900">{shops.find(s => s.id === b.branchId)?.name || b.branchId}</td>
                                            <td className="py-4 text-slate-500 font-bold">{b.timestamp}</td>
                                            <td className="py-4 text-slate-500 font-mono text-xs">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                                            <td className="py-4">
                                                <a
                                                    href={b.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all"
                                                >
                                                    <Download size={14} />
                                                    تحميل النسخة
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    {backups.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center opacity-30 text-slate-500 font-bold">لا يوجد نسخ احتياطية مسجلة حالياً</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'updates' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Upload Section */}
                        <div className="glass p-8 rounded-[2.5rem] bg-white border border-slate-100 space-y-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">رفع تحديث جديد</h3>
                                <p className="text-slate-500 font-bold mt-1">قم برفع نسخة برمجية جديدة ليتم سحبها تلقائياً من الفروع.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500">ملف التحديث (.exe, .zip)</label>
                                    <div
                                        onClick={selectFile}
                                        className="group cursor-pointer border-2 border-dashed border-slate-200 hover:border-brand-primary rounded-[2rem] p-8 text-center transition-all bg-slate-50/50 hover:bg-white"
                                    >
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                            <Upload className="text-brand-primary" size={32} />
                                        </div>
                                        <p className="font-bold text-slate-700">
                                            {selectedFile ? selectedFile.split('\\').pop() : 'اسحب الملف هنا أو اضغط للاختيار'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2 font-mono">
                                            {selectedFile || 'لم يتم اختيار ملف بعد'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500">رقم الإصدار</label>
                                        <input
                                            type="text"
                                            value={updateVersion}
                                            onChange={e => setUpdateVersion(e.target.value)}
                                            placeholder="مثال: 2.1.0"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 focus:border-brand-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500">ملاحظات الإصدار</label>
                                        <input
                                            type="text"
                                            value={updateNotes}
                                            onChange={e => setUpdateNotes(e.target.value)}
                                            placeholder="اختياري..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 focus:border-brand-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-sm font-bold text-slate-500">استهداف الفروع</label>
                                        <select
                                            value={targetBranch}
                                            onChange={e => setTargetBranch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 focus:border-brand-primary outline-none transition-all"
                                        >
                                            <option value="ALL">جميع الفروع (الكل)</option>
                                            {shops.map(shop => (
                                                <option key={shop.id} value={shop.id}>{shop.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUploadUpdate}
                                    disabled={uploading}
                                    className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${uploading
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-brand-primary text-white hover:scale-[1.02] shadow-brand-primary/20'
                                        }`}
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-slate-300 border-t-brand-primary rounded-full animate-spin" />
                                            <span>جاري الرفع...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={24} />
                                            <span>نشر التحديث الآن</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Recent History / Latest Section */}
                        <div className="space-y-6">
                            <div className="glass p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl shadow-indigo-200">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="text-indigo-100 font-bold uppercase text-xs tracking-widest">الإصدار الحالي في السحابة</h4>
                                        <h3 className="text-4xl font-black mt-2">{latestUpdate ? latestUpdate.version : '---'}</h3>
                                    </div>
                                    <div className="bg-white/20 p-3 rounded-2xl">
                                        <Plus className="animate-spin-slow" />
                                    </div>
                                </div>
                                <div className="space-y-2 bg-white/10 p-4 rounded-2xl border border-white/10">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="opacity-70">تاريخ النشر:</span>
                                        <span>{latestUpdate ? latestUpdate.timestamp : '---'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="opacity-70">حجم الملف:</span>
                                        <span>{latestUpdate ? (latestUpdate.size / (1024 * 1024)).toFixed(2) + ' MB' : '---'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-8 rounded-[2.5rem] bg-white border border-slate-100">
                                <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3">
                                    <Settings className="text-slate-400" size={20} />
                                    <span>مزامنة الفروع</span>
                                </h4>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500 font-bold">يمكنك إجبار جميع الفروع على المزامنة الكاملة للبيانات (المنتجات، الموظفين) يدوياً.</p>
                                    <button
                                        onClick={fetchData}
                                        className="w-full bg-slate-50 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all border border-slate-200"
                                    >
                                        مزامنة البيانات الآن
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
