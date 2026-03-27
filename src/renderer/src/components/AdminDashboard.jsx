import React, { useState, useEffect, useRef } from 'react'
import {
    BarChart,
    Package,
    Users,
    Settings,
    LogOut,
    Truck,
    Wallet,
    User,
    Globe,
    Wifi,
    TrendingUp,
    RefreshCw,
    Download,
    ClipboardList,
    CircleAlert,
    Phone,
    Banknote,
    MessageSquare,
    Smartphone
} from 'lucide-react'
import { FormulasManager } from './FormulasManager'
import { ProductsView } from './views/ProductsView'
import { CashiersView } from './views/CashiersView'
import { SuppliersView } from './views/SuppliersView'
import { ReportsView } from './views/ReportsView'
import { ExpensesView } from './views/ExpensesView'
import HRView from './views/HRView'
import { PayrollView } from './views/PayrollView'
import { ReturnsView } from './views/ReturnsView'
import { CustomersView } from './views/CustomersView'
import { ShortagesView } from './views/ShortagesView'
import { SettingsView } from './views/SettingsView'
import { AttendanceLogView } from './views/AttendanceLogView'
import { WhatsAppManagement } from './views/WhatsAppManagement'
import { MobileRemoteView } from './views/MobileRemoteView'
import { WebOrdersView } from './views/WebOrdersView'
import { UpdateNotificationModal } from './UpdateNotificationModal'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminDashboard({ user, onLogout, notify, ask, initialTab = 'products' }) {
    const [activeTab, setActiveTab] = useState(initialTab)
    const [products, setProducts] = useState([])
    const [formulas, setFormulas] = useState([])
    const [cashiers, setCashiers] = useState([])
    const [settings, setSettings] = useState({})
    const [employees, setEmployees] = useState([])
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
    const [updateStatus, setUpdateStatus] = useState(null)
    const [updateProgress, setUpdateProgress] = useState(0)
    const [licenseLevel, setLicenseLevel] = useState(user.license_level || '2')
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [updateInfo, setUpdateInfo] = useState(null)

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true)
        setUpdateStatus('checking')

        // Safety timeout to reset state if events never fire
        const safetyTimeout = setTimeout(() => {
            if (isCheckingUpdate) {
                setIsCheckingUpdate(false)
                setUpdateStatus(null)
                notify('انتهى الوقت المحدد للتحقق، يرجى المحاولة لاحقاً', 'warning')
            }
        }, 30000)

        try {
            const result = await window.api.checkUpdate()
            clearTimeout(safetyTimeout)

            if (result && result.message === 'Dev mode') {
                notify('وضع التطوير: التحديثات تعمل فقط في نسخة الـ exe المسجلة', 'info')
            } else if (!result || result.success === false) {
                notify('فشل بدء عملية التحقق من التحديثات', 'error')
            }

            setIsCheckingUpdate(false)
            setUpdateStatus(null)
        } catch (error) {
            clearTimeout(safetyTimeout)
            console.error('Update check failed:', error)
            notify('فشل الاتصال بخادم التحديثات', 'error')
            setIsCheckingUpdate(false)
            setUpdateStatus(null)
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
            setUpdateInfo({
                version: info.version,
                releaseNotes: info.releaseNotes || 'تحسينات عامة وإصلاحات',
                downloadedSize: null,
                totalSize: null
            })
            setShowUpdateModal(true)
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
            notify(`خطأ في التحديث: ${err}`, 'error')
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

        // Centralized update listener from Backend
        const cleanupUpdate = window.api.onSalesUpdated(() => {
            console.log('[Dashboard] Data change detected, refreshing...')
            loadData()
        })

        loadData()

        return () => {
            if (cleanup1) cleanup1()
            if (cleanup2) cleanup2()
            if (cleanup3) cleanup3()
            if (cleanup4) cleanup4()
            if (cleanup5) cleanup5()
            if (cleanup6) cleanup6()
            if (cleanupUpdate) cleanupUpdate()
        }
    }, [])

    const loadData = async () => {
        try {
            const [p, f, c, s, e] = await Promise.all([
                window.api.getProducts(),
                window.api.getFormulas(),
                window.api.getCashiers(),
                window.api.getSettings(),
                window.api.getEmployees()
            ])
            setProducts(p || [])
            setFormulas(f || [])
            setCashiers(c || [])
            setSettings(s || {})
            setEmployees(e || [])
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
        }
    }

    const parseDetails = (details) => {
        if (!details) return '';
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            
            // Priority 1: Direct text field
            let text = parsed.text || '';

            // Priority 2: Extract from items array if text is empty
            if (!text && parsed.items && Array.isArray(parsed.items)) {
                text = parsed.items
                    .map(i => {
                        const amount = i.amount || i.qty || i.quantity;
                        const unit = i.unit || (i.is_ml ? 'مل' : i.is_gram ? 'جرام' : '');
                        return `${i.name}${amount ? ` (${amount}${unit})` : ''}`;
                    })
                    .join(' + ');
            }

            // Priority 3: Use the raw string if it's not valid JSON but exists
            if (!text && typeof details === 'string' && !details.startsWith('{')) {
                text = details;
            }

            // Clean up: strip prices and redundant info
            if (text) {
                return text
                    .split('\n')
                    .filter(line => line.trim() !== '' && !line.includes('السعر:') && !line.includes('سعر:'))
                    .join('\n');
            }

            return '';
        } catch (e) {
            // If it's a plain string, return it filtered
            if (typeof details === 'string') {
                return details
                    .split('\n')
                    .filter(line => line.trim() !== '' && !line.includes('السعر:') && !line.includes('سعر:'))
                    .join('\n');
            }
            return '';
        }
    }

    const menuGroups = [
        {
            title: 'المبيعات والمخزن',
            tabs: [
                { id: 'reports', label: 'التقارير والمبيعات', icon: BarChart },
                { id: 'products', label: 'إدارة المنتجات', icon: Package },
                { id: 'formulas', label: 'إدارة التركيبات', icon: Download },
                { id: 'web_orders', label: 'طلبات الموقع', icon: Globe },
                { id: 'returns', label: 'المرتجعات', icon: RefreshCw },
                { id: 'shortages', label: 'النواقص', icon: CircleAlert, level: 2 }
            ].filter(t => {
                if (settings && settings['hide_' + t.id] === '1') return false;
                if (user.role === 'super_admin') return true;
                let perms = [];
                try { perms = JSON.parse(user.permissions || '[]'); } catch (e) { }
                if (perms.length > 0) {
                    const map = {
                        'products': ['products', 'products:view'],
                        'formulas': ['products', 'formulas'],
                        'reports': ['reports', 'reports:view'],
                        'returns': ['returns', 'sales:returns'],
                        'shortages': ['inventory', 'products:view'],
                        'suppliers': ['inventory', 'suppliers'],
                        'expenses': ['reports', 'reports:financial'],
                        'customers': ['sales', 'sales:customers'],
                        'cashiers': ['settings', 'cashiers'],
                        'hr': ['hr', 'hr:view'],
                        'payroll': ['hr', 'hr:payroll'],
                        'attendance_log': ['hr', 'hr:attendance'],
                        'settings': ['settings', 'settings:view']
                    };
                    const keys = map[t.id] || [t.id];
                    return perms.some(p => keys.includes(p));
                }
                return !t.level || parseInt(licenseLevel) >= t.level;
            })
        },
        {
            title: 'قسم الحسابات',
            tabs: [
                { id: 'suppliers', label: 'الموردين', icon: Truck, level: 2 },
                { id: 'expenses', label: 'المصاريف', icon: Wallet },
                { id: 'customers', label: 'سجلات العملاء', icon: Phone },
                { id: 'cashiers', label: 'إدارة البائعين', icon: Users }
            ].filter(t => {
                if (settings && settings['hide_' + t.id] === '1') return false;
                if (user.role === 'super_admin') return true;
                let perms = [];
                try { perms = JSON.parse(user.permissions || '[]'); } catch (e) { }
                if (perms.length > 0) {
                    const map = {
                        'products': ['products', 'products:view'],
                        'formulas': ['products', 'formulas'],
                        'reports': ['reports', 'reports:view'],
                        'returns': ['returns', 'sales:returns'],
                        'shortages': ['inventory', 'products:view'],
                        'suppliers': ['inventory', 'suppliers'],
                        'expenses': ['reports', 'reports:financial'],
                        'customers': ['sales', 'sales:customers'],
                        'cashiers': ['settings', 'cashiers'],
                        'hr': ['hr', 'hr:view'],
                        'payroll': ['hr', 'hr:payroll'],
                        'attendance_log': ['hr', 'hr:attendance'],
                        'settings': ['settings', 'settings:view']
                    };
                    const keys = map[t.id] || [t.id];
                    return perms.some(p => keys.includes(p));
                }
                return !t.level || parseInt(licenseLevel) >= t.level;
            })
        },
        {
            title: 'شؤون الموظفين',
            tabs: [
                { id: 'hr', label: 'الموظفين', icon: User },
                { id: 'attendance_log', label: 'سجل الحضور', icon: ClipboardList },
                { id: 'payroll', label: 'المرتبات', icon: Banknote }
            ].filter(t => {
                if (settings && settings['hide_' + t.id] === '1') return false;
                if (user.role === 'super_admin') return true;
                let perms = [];
                try { perms = JSON.parse(user.permissions || '[]'); } catch (e) { }
                if (perms.length > 0) {
                    const map = {
                        'hr': ['hr', 'hr:view'],
                        'payroll': ['hr', 'hr:payroll'],
                        'attendance_log': ['hr', 'hr:attendance'],
                        'settings': ['settings', 'settings:view']
                    };
                    const keys = map[t.id] || [t.id];
                    return perms.some(p => keys.includes(p));
                }
                return true;
            })
        },
        {
            title: 'أدوات النظام',
            tabs: [
                { id: 'mobile', label: 'التحكم عن بُعد', icon: Smartphone },
                { id: 'whatsapp', label: 'واتساب', icon: MessageSquare },
                { id: 'settings', label: 'إعدادات المحل', icon: Settings }
            ].filter(t => {
                if (settings && settings['hide_' + t.id] === '1') return false;
                if (user.role === 'super_admin') return true;
                let perms = [];
                try { perms = JSON.parse(user.permissions || '[]'); } catch (e) { }
                if (perms.length > 0) {
                    const map = {
                        'mobile': ['settings', 'settings:view'],
                        'whatsapp': ['settings', 'settings:view'],
                        'settings': ['settings', 'settings:view']
                    };
                    const keys = map[t.id] || [t.id];
                    return perms.some(p => keys.includes(p));
                }
                return true;
            })
        }
    ].filter(group => group.tabs.length > 0)

    const allTabs = menuGroups.flatMap(g => g.tabs)

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <div className="w-60 bg-white border-l border-slate-200 flex flex-col shadow-sm">
                <div className="p-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden">
                            <Users className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent leading-none">
                                {settings.shop_name || 'عطورنا بريميوم'}
                            </h1>
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black">المدير</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-0.5">
                            <h3 className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3 mb-1.5 opacity-60">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.tabs.map((tab) => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${activeTab === tab.id
                                                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/10'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-brand-primary'
                                                }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-brand-primary'}`} />
                                            <span className="font-bold text-[12px]">{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all font-black text-[12px]"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>

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
                                {allTabs.find(t => t.id === activeTab)?.label}
                            </h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={loadData}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-brand-primary text-white hover:bg-brand-secondary border border-transparent"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>تحديث بيانات لوحة التحكم</span>
                                </button>
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
                        </div>

                        {activeTab === 'mobile' && (
                            <MobileRemoteView notify={notify} />
                        )}

                        {activeTab === 'web_orders' && (
                            <WebOrdersView notify={notify} ask={ask} />
                        )}

                        {activeTab === 'whatsapp' && (
                            <div className="max-w-2xl mx-auto">
                                <WhatsAppManagement notify={notify} />
                            </div>
                        )}

                        {activeTab === 'products' && (
                            <ProductsView
                                products={products}
                                onRefresh={loadData}
                                notify={notify}
                                ask={ask}
                                user={user}
                                settings={settings}
                            />
                        )}
                        {activeTab === 'formulas' && (
                            <FormulasManager products={products} formulas={formulas} onRefresh={loadData} notify={notify} ask={ask} user={user} settings={settings} />
                        )}
                        {activeTab === 'cashiers' && (
                            <CashiersView cashiers={cashiers} onRefresh={loadData} notify={notify} ask={ask} settings={settings} user={user} />
                        )}
                        {activeTab === 'customers' && (
                            <CustomersView products={products} parseDetails={parseDetails} user={user} />
                        )}
                        {activeTab === 'reports' && <ReportsView products={products} cashiers={cashiers} parseDetails={parseDetails} notify={notify} ask={ask} user={user} settings={settings} />}
                        {activeTab === 'returns' && <ReturnsView user={user} parseDetails={parseDetails} notify={notify} />}
                        {activeTab === 'shortages' && <ShortagesView products={products} onRefresh={loadData} notify={notify} ask={ask} user={user} />}
                        {activeTab === 'suppliers' && <SuppliersView products={products} onRefresh={loadData} notify={notify} ask={ask} user={user} />}
                        {activeTab === 'expenses' && (
                            <ExpensesView employees={employees} notify={notify} ask={ask} user={user} />
                        )}
                        {activeTab === 'hr' && (
                            <HRView employees={employees} onRefresh={loadData} notify={notify} ask={ask} user={user} />
                        )}
                        {activeTab === 'attendance_log' && (
                            <AttendanceLogView notify={notify} user={user} />
                        )}
                        {activeTab === 'payroll' && (
                            <PayrollView employees={employees} notify={notify} ask={ask} user={user} />
                        )}
                        {activeTab === 'settings' && <SettingsView user={user} settings={settings} onRefresh={loadData} notify={notify} ask={ask} products={products} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Update Notification Modal */}
            <UpdateNotificationModal
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                updateInfo={updateInfo}
                onInstall={handleInstallUpdate}
                downloadProgress={updateProgress}
            />
        </div>
    )
}
