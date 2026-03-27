import React, { useState, useEffect } from 'react'
import { Users, Lock, ShieldCheck, RefreshCw, Database, Save, CheckCircle2, Settings2, Barcode } from 'lucide-react'

export default function SuperAdminView({ notify, handleCheckUpdate, isCheckingUpdate, updateStatus, updateProgress }) {
    const [users, setUsers] = useState([])
    const [licenseLevel, setLicenseLevel] = useState('2')
    const [sysSettings, setSysSettings] = useState({ global_unit: 'ml', barcode_show_name: '1', barcode_show_price: '1', barcode_show_qty: '1', show_sticker_button: '1' })

    useEffect(() => {
        loadUsers()
        loadLicenseLevel()
        loadSysSettings()
    }, [])

    const loadUsers = async () => {
        try {
            const data = await window.api.getSuperUsersList()
            setUsers(data || [])
        } catch (error) {
            notify('فشل تحميل قائمة المستخدمين', 'error')
        }
    }

    const loadLicenseLevel = async () => {
        try {
            const setting = await window.api.invoke('settings:get', 'license_level')
            if (setting) setLicenseLevel(setting.value)
        } catch (error) {
            console.error('Failed to load license level')
        }
    }

    const loadSysSettings = async () => {
        try {
            const keys = ['global_unit', 'barcode_show_name', 'barcode_show_price', 'barcode_show_qty', 'show_sticker_button']
            const results = await Promise.all(keys.map(k => window.api.invoke('settings:get', k)))
            const loaded = {}
            keys.forEach((k, i) => { if (results[i]) loaded[k] = results[i].value })
            setSysSettings(prev => ({ ...prev, ...loaded }))
        } catch (error) {
            console.error('Failed to load system settings')
        }
    }

    const saveSysSettings = async () => {
        try {
            const keys = Object.keys(sysSettings)
            await Promise.all(keys.map(k => window.api.invoke('settings:set', { key: k, value: sysSettings[k] })))
            notify('تم حفظ إعدادات النظام بنجاح ✅', 'success')
        } catch (error) {
            notify('فشل حفظ الإعدادات', 'error')
        }
    }

    const updateLicenseLevel = async (level) => {
        try {
            const res = await window.api.invoke('settings:set', { key: 'license_level', value: level })
            if (res.success) {
                setLicenseLevel(level)
                notify('تم تحديث مستوى الترخيص بنجاح', 'success')
            }
        } catch (error) {
            notify('فشل تحديث مستوى الترخيص', 'error')
        }
    }

    return (
        <div className="space-y-8">
            {/* System Preferences (Super Only) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">تفضيلات النظام</h3>
                            <p className="text-slate-400 font-bold text-sm">إعدادات عامة تؤثر على طريقة عرض البيانات والطباعة</p>
                        </div>
                    </div>
                    <button
                        onClick={saveSysSettings}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                    >
                        <Save className="w-4 h-4" />
                        حفظ
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Unit Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-right">
                            <span className="block font-black text-slate-800">وحدة قياس الزيوت الافتراضية</span>
                            <span className="text-xs text-slate-400 font-bold">تحدد ما إذا كانت الكميات تُعرض بالملي أم بالجرام</span>
                        </div>
                        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setSysSettings(prev => ({ ...prev, global_unit: 'ml' }))}
                                className={`px-5 py-2 text-sm font-black rounded-lg transition-all ${sysSettings.global_unit !== 'gram' ? 'bg-brand-primary text-white shadow' : 'text-slate-500'}`}
                            >
                                ملي (ML)
                            </button>
                            <button
                                onClick={() => setSysSettings(prev => ({ ...prev, global_unit: 'gram' }))}
                                className={`px-5 py-2 text-sm font-black rounded-lg transition-all ${sysSettings.global_unit === 'gram' ? 'bg-brand-primary text-white shadow' : 'text-slate-500'}`}
                            >
                                جرام (Gram)
                            </button>
                        </div>
                    </div>

                    {/* Barcode Print Config */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Barcode className="w-4 h-4 text-slate-400" />
                            <span className="font-black text-sm text-slate-700">محتوى طباعة سستيكر الباركود</span>
                        </div>

                        {[
                            { key: 'barcode_show_name', label: 'اسم المنتج', desc: 'يظهر اسم المنتج على الستيكر' },
                            { key: 'barcode_show_price', label: 'السعر والتاريخ', desc: 'يظهر السعر وتاريخ التعبئة' },
                            { key: 'barcode_show_qty', label: 'الكمية (وزن/كمية)', desc: 'يظهر الوزن أو الكمية المباعة' },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div className="text-right">
                                    <span className="block font-black text-slate-800 text-sm">{item.label}</span>
                                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                                </div>
                                <button
                                    onClick={() => setSysSettings(prev => ({ ...prev, [item.key]: prev[item.key] === '0' ? '1' : '0' }))}
                                    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${sysSettings[item.key] !== '0' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${sysSettings[item.key] !== '0' ? 'right-7' : 'right-1'}`} />
                                </button>
                            </div>
                        ))}

                        {/* Sticker Button Control */}
                        <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2 pt-2">
                            <div className="text-right">
                                <span className="block font-black text-slate-800 text-sm">عرض زر طباعة الاستيكر</span>
                                <span className="text-[10px] text-slate-400">إظهار أو إخفاء زر طباعة استيكر الفاتورة في شاشة الكاشير</span>
                            </div>
                            <button
                                onClick={() => setSysSettings(prev => ({ ...prev, show_sticker_button: prev.show_sticker_button === '0' ? '1' : '0' }))}
                                className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${sysSettings.show_sticker_button !== '0' ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${sysSettings.show_sticker_button !== '0' ? 'right-7' : 'right-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* License Level Management */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">مستوى ترخيص النظام</h3>
                        <p className="text-slate-400 font-bold text-sm">تحديد المميزات المتاحة لهذا العميل</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => updateLicenseLevel('1')}
                        className={`p-8 rounded-[2rem] border-4 transition-all text-right relative overflow-hidden group ${licenseLevel === '1' ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                    >
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-4 py-1 rounded-full text-xs font-black ${licenseLevel === '1' ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-500'}`}>المستوى الأول (أساسي)</span>
                                {licenseLevel === '1' && <CheckCircle2 className="w-6 h-6 text-brand-primary" />}
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 mb-2">النسخة الأساسية</h4>
                            <ul className="text-slate-500 font-bold space-y-2 text-sm">
                                <li className="flex items-center gap-2">✅ المبيعات والتقارير</li>
                                <li className="flex items-center gap-2">✅ إدارة المخزون</li>
                                <li className="flex items-center gap-2 text-red-400">❌ إدارة الموردين</li>
                                <li className="flex items-center gap-2 text-red-400">❌ قسم النواقص</li>
                            </ul>
                        </div>
                    </button>

                    <button
                        onClick={() => updateLicenseLevel('2')}
                        className={`p-8 rounded-[2rem] border-4 transition-all text-right relative overflow-hidden group ${licenseLevel === '2' ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                    >
                        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/10 rounded-full -translate-x-16 -translate-y-16 blur-2xl group-hover:bg-brand-primary/20 transition-all" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-4 py-1 rounded-full text-xs font-black ${licenseLevel === '2' ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-500'}`}>المستوى الثاني (كامل)</span>
                                {licenseLevel === '2' && <CheckCircle2 className="w-6 h-6 text-brand-primary" />}
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 mb-2">النسخة الكاملة (بريميوم)</h4>
                            <ul className="text-slate-500 font-bold space-y-2 text-sm">
                                <li className="flex items-center gap-2 text-green-600">✨ كل مميزات المستوى الأول</li>
                                <li className="flex items-center gap-2">✅ إدارة الموردين والمديونيات</li>
                                <li className="flex items-center gap-2">✅ نظام النواقص الذكي</li>
                                <li className="flex items-center gap-2">✅ قسم الميزات الجديدة</li>
                            </ul>
                        </div>
                    </button>
                </div>
            </div>
            {/* User Passwords Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">إدارة كلمات المرور (المطور)</h3>
                        <p className="text-slate-400 font-bold text-sm">عرض كلمات مرور جميع البائعين المضافة للنظام</p>
                    </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-3xl">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-black text-slate-500">اسم المستخدم</th>
                                <th className="px-6 py-4 text-sm font-black text-slate-500">كلمة المرور</th>
                                <th className="px-6 py-4 text-sm font-black text-slate-500">الصلاحية</th>
                                <th className="px-6 py-4 text-sm font-black text-slate-500">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-black text-slate-900">{u.username}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-slate-300" />
                                            <span className="bg-slate-100 px-3 py-1 rounded-lg font-mono font-black text-brand-primary text-lg">
                                                {u.password}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                            {u.role === 'super_admin' ? 'مطور النظام' : 'كاشير'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.is_active ? 'text-green-600' : 'text-slate-400'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                                                }`} />
                                            {u.is_active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* System Update Section */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/20 rounded-full -translate-y-32 translate-x-32 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-right">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <ShieldCheck className="w-8 h-8 text-brand-primary" />
                            <h3 className="text-3xl font-black">مركز التحديثات الآمن</h3>
                        </div>
                        <p className="text-slate-400 font-bold max-w-lg">
                            يمكنك من هنا فحص وجود تحديثات جديدة للنظام وتحميلها مباشرة.
                            تأكد من الاتصال بالإنترنت قبل البدء.
                        </p>
                    </div>

                    <button
                        onClick={handleCheckUpdate}
                        disabled={isCheckingUpdate || updateStatus === 'downloading'}
                        className={`flex items-center gap-4 px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-2xl ${isCheckingUpdate || updateStatus === 'downloading'
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-brand-primary hover:bg-white hover:text-brand-primary text-white scale-105 hover:scale-110 active:scale-95'
                            }`}
                    >
                        <RefreshCw className={`w-6 h-6 ${isCheckingUpdate || updateStatus === 'downloading' ? 'animate-spin' : ''}`} />
                        <span>
                            {updateStatus === 'downloading'
                                ? `جاري التحميل (${updateProgress}%)`
                                : isCheckingUpdate ? 'جاري الفحص...' : 'فحص التحديثات الآن'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Maintenance & Export Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">الصيانة والدعم الفني</h3>
                            <p className="text-slate-400 font-bold text-sm">تصدير بيانات النظام لإرسالها للمطور للتحديثات أو حل المشكلات</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            try {
                                const result = await window.api.exportSqlBackup();
                                if (result.success) {
                                    notify('تم تصدير البيانات بنجاح: ' + result.path, 'success')
                                }
                            } catch (e) {
                                notify('حدث خطأ أثناء التصدير', 'error')
                            }
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 rounded-2xl font-black transition-all group"
                    >
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>تصدير بيانات النظام للمطور</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
