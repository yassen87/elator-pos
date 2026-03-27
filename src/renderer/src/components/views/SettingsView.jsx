import React, { useState, useEffect } from 'react'
import { Save, Lock, RotateCcw, Package, Trash2, MessageSquare, Printer, CreditCard, Plus, X, Users, Globe, Tag, Smartphone, RefreshCw } from 'lucide-react'
import QRCode from 'react-qr-code'
import { WhatsAppManagement } from './WhatsAppManagement'

export function SettingsView({ user, settings, onRefresh, notify, ask, products }) {
    const [items, setItems] = useState(settings || {})
    const [clearConfirmMode, setClearConfirmMode] = useState(false)
    const [clearConfirmText, setClearConfirmText] = useState('')

    if (!items) return null;
    const [adminPassword, setAdminPassword] = useState('')
    const [printers, setPrinters] = useState([])
    const [qrConfig, setQrConfig] = useState(null)

    useEffect(() => {
        setItems(settings || {})
        loadPrinters()
        loadQrConfig()
    }, [settings])

    const loadQrConfig = async () => {
        try {
            const config = await window.api.invoke('app:get-qr-config')
            setQrConfig(config)
        } catch (e) {
            console.error('Failed to load QR config:', e)
        }
    }

    const loadPrinters = async () => {
        const pList = await window.api.invoke('printers:get')
        setPrinters(pList || [])
    }

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
        <div className="max-w-2xl bg-white border border-slate-200 p-8 rounded-2xl space-y-6 shadow-sm text-right">
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
                    <label className="text-sm text-slate-500 block">رقم الواتساب (للفاتورة)</label>
                    <input
                        value={items.shop_whatsapp || ''}
                        onChange={(e) => setItems({ ...items, shop_whatsapp: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="مثال: 01012345678"
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

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">خدمة الواتساب التلقائي</h4>
                        </div>
                        <div
                            onClick={async () => {
                                const newVal = items.whatsapp_enabled === 'true' ? 'false' : 'true'
                                await window.api.toggleWhatsApp({ enabled: newVal === 'true' })
                                setItems({ ...items, whatsapp_enabled: newVal })
                                onRefresh()
                            }}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${items.whatsapp_enabled === 'true' ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${items.whatsapp_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>

                {items.whatsapp_enabled === 'true' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <WhatsAppManagement notify={notify} />
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-slate-400" />
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">إعدادات الطباعة والفاتورة</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-500 block">الطابعة الافتراضية للفواتير</label>
                            <select
                                value={items.default_printer || ''}
                                onChange={(e) => setItems({ ...items, default_printer: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                            >
                                <option value="">-- اختر طابعة --</option>
                                {printers.map((p, idx) => (
                                    <option key={idx} value={p.name}>{p.name} {p.isDefault ? '(الافتراضية للنظام)' : ''}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 font-bold">عند اختيار طابعة، سيتم طباعة الفواتير تلقائياً دون إظهار نافذة الاختيار.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-500 block">طابعة الباركود / الاستيكر</label>
                            <select
                                value={items.label_printer || ''}
                                onChange={(e) => setItems({ ...items, label_printer: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                            >
                                <option value="">-- اظهر نافذة الاختيار --</option>
                                {printers.map((p, idx) => (
                                    <option key={idx} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 font-bold">إذا تركتها فارغة، ستظهر نافذة اختيار الطابعة عند طباعة الاستيكر.</p>
                        </div>

                        {/* Custom Sticker Dimensions */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl border-dashed">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700 block text-right">إعدادات مقاسات ورق الاستيكر (مخصص)</span>
                                <div
                                    onClick={() => setItems({ ...items, use_custom_sticker_size: items.use_custom_sticker_size === 'true' ? 'false' : 'true' })}
                                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all flex items-center ${items.use_custom_sticker_size === 'true' ? 'bg-brand-primary' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-all ${items.use_custom_sticker_size === 'true' ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                تفعيل هذا الخيار يلغي المقاسات الافتراضية للبرنامج ويجبر الطابعة على استخدام المقاس الفعلي للورقة (بالملم) لتجنب الإزاحة والترحيل.
                            </p>

                            {items.use_custom_sticker_size === 'true' && (
                                <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold block">عرض الورقة بالكامل (ملم)</label>
                                        <input
                                            type="number"
                                            value={items.custom_sticker_width || ''}
                                            onChange={(e) => setItems({ ...items, custom_sticker_width: e.target.value })}
                                            placeholder="مثال: 50"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold block">طول الورقة بالكامل (ملم)</label>
                                        <input
                                            type="number"
                                            value={items.custom_sticker_height || ''}
                                            onChange={(e) => setItems({ ...items, custom_sticker_height: e.target.value })}
                                            placeholder="مثال: 30"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-50">
                            <label className="text-sm font-bold text-slate-700 block text-right">معلومات العميل في الفاتورة</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={items.invoice_show_phone !== 'false'}
                                        onChange={(e) => setItems({ ...items, invoice_show_phone: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                                    />
                                    <span className="text-sm text-slate-600 font-bold">إظهار رقم الموبايل</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={items.invoice_show_address !== 'false'}
                                        onChange={(e) => setItems({ ...items, invoice_show_address: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                                    />
                                    <span className="text-sm text-slate-600 font-bold">إظهار العنوان</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={items.invoice_show_whatsapp !== 'false'}
                                        onChange={(e) => setItems({ ...items, invoice_show_whatsapp: e.target.checked ? 'true' : 'false' })}
                                        className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                                    />
                                    <span className="text-sm text-slate-600 font-bold">إظهار الواتساب</span>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                            <label className="text-sm font-bold text-slate-700 block text-right">السعر المعروض على كروت المنتجات في الكاشير</label>
                            <select
                                value={items.cashier_price_display || 'both'}
                                onChange={(e) => setItems({ ...items, cashier_price_display: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                            >
                                <option value="both">ق / ج (قطاعي وجملة)</option>
                                <option value="retail">ق فقط (قطاعي)</option>
                                <option value="wholesale">ج فقط (جملة)</option>
                                <option value="none">بدون سعر</option>
                            </select>
                            <p className="text-[10px] text-slate-400 font-bold">يتحكم في السعر المعروض على كروت المنتجات في شاشة الكاشير.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">طرق الدفع المفعلة</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { id: 'cash', label: 'كاش' },
                            { id: 'visa', label: 'فيزا' },
                            { id: 'transfer', label: 'تحويل بنكي' },
                            { id: 'instapay', label: 'InstaPay' },
                            { id: 'vodafone_cash', label: 'فودافون كاش' },
                            { id: 'fawry', label: 'فوري' },
                            { id: 'orange_cash', label: 'اورنج كاش' }
                        ].map(method => {
                            const isSelected = JSON.parse(items.payment_methods || '[]').includes(method.id)
                            return (
                                <button
                                    key={method.id}
                                    onClick={() => {
                                        const current = JSON.parse(items.payment_methods || '[]')
                                        const next = isSelected
                                            ? current.filter(m => m !== method.id)
                                            : [...current, method.id]
                                        setItems({ ...items, payment_methods: JSON.stringify(next) })
                                    }}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm ${isSelected
                                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-slate-200'
                                        }`}>
                                        {isSelected && <span className="text-[10px] text-white">✓</span>}
                                    </div>
                                    {method.label}
                                </button>
                            )
                        })}
                    </div>
                    {JSON.parse(items.payment_methods || '[]').length === 0 && (
                        <p className="text-[10px] text-red-400 font-bold text-center mt-2">⚠️ يجب اختيار طريقة دفع واحدة على الأقل!</p>
                    )}
                </div>

                {(user.role === 'super_admin' || user.is_backdoor) && (
                    <div className="space-y-4 pt-4 border-t-2 border-brand-primary/20 bg-brand-primary/5 p-4 rounded-2xl">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-brand-primary" />
                            <h4 className="text-sm font-black text-brand-primary uppercase tracking-widest text-right">خيارات العرض المتقدمة (للمطور فقط)</h4>
                        </div>

                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm">
                            <div className="text-right">
                                <span className="block font-black text-slate-800">تفعيل خاصية الباركود</span>
                                <span className="text-[10px] text-slate-400 font-bold">إظهار خانة الباركود في إدارة المنتجات والبيع</span>
                            </div>
                            <button
                                onClick={() => setItems({ ...items, show_barcode_field: items.show_barcode_field === '1' ? '0' : '1' })}
                                className={`w-12 h-6 rounded-full transition-all relative ${items.show_barcode_field === '1' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${items.show_barcode_field === '1' ? 'right-7' : 'right-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm mt-2">
                            <div className="text-right">
                                <span className="block font-black text-slate-800">إخفاء سجل الموردين</span>
                                <span className="text-[10px] text-slate-400 font-bold">إخفاء قسم الموردين والمشتروات من القائمة الجانبية</span>
                            </div>
                            <button
                                onClick={() => setItems({ ...items, hide_suppliers: items.hide_suppliers === '1' ? '0' : '1' })}
                                className={`w-12 h-6 rounded-full transition-all relative ${items.hide_suppliers === '1' ? 'bg-brand-primary' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${items.hide_suppliers === '1' ? 'right-7' : 'right-1'}`}></div>
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={async () => {
                                    notify('جاري المزامنة الكاملة مع Elator Hub...', 'info')
                                    const res = await window.api.syncCloudAll()
                                    if (res.success) notify('تمت المزامنة بنجاح! ✅', 'success')
                                    else notify('فشلت المزامنة: ' + res.message, 'error')
                                }}
                                className="w-full bg-brand-primary text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all active:scale-95 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                تزامن الآن مع Elator Hub
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-purple-600" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">أكثر الزجاجات مبيعاً (عرض سريع)</h4>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-2">
                        اختر حتى 3 أنواع من الزجاجات ليتم عرضها في صفحة تركيب العطور للوصول السريع.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[0, 1, 2].map((index) => {
                            let selectedIds = []
                            try {
                                selectedIds = JSON.parse(items.top_bottles_ids || '[]')
                            } catch (e) {
                                console.error('Error parsing top_bottles_ids:', e)
                                selectedIds = []
                            }
                            if (!Array.isArray(selectedIds)) selectedIds = []

                            const currentId = selectedIds[index]
                            return (
                                <div key={index} className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold block">الزجاجة {index + 1}</label>
                                    <select
                                        value={currentId || ''}
                                        onChange={(e) => {
                                            const newIds = [...selectedIds]
                                            if (e.target.value) {
                                                newIds[index] = parseInt(e.target.value)
                                            } else {
                                                newIds.splice(index, 1)
                                            }
                                            // Unique IDs only
                                            const finalIds = [...new Set(newIds.filter(id => id !== undefined))]
                                            setItems({ ...items, top_bottles_ids: JSON.stringify(finalIds) })
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">-- اختر زجاجة --</option>
                                        {(products || []).filter(p => p && (p.category?.toLowerCase() === 'bottle' || p.category === 'زجاجة')).map(b => (
                                            <option key={b.id} value={b.id}>{b.name} ({b.price} ج.م)</option>
                                        ))}
                                    </select>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-brand-primary" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">إعدادات الموقع الجغرافي (Geofencing)</h4>
                        </div>
                        <div
                            onClick={() => setItems({ ...items, geofencing_enabled: items.geofencing_enabled === '1' ? '0' : '1' })}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${items.geofencing_enabled === '1' ? 'bg-brand-primary' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${items.geofencing_enabled === '1' ? 'translate-x-6' : 'translate-x-0'} `} />
                        </div>
                    </div>

                    {items.geofencing_enabled === '1' && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-2">
                                عند تفعيل هذه الخاصية، لن يتمكن الموظف من تبصيم الحضور/الانصراف إلا إذا كان موجوداً داخل نطاق المحل المحددة إحداثياته أدناه.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold block">خط العرض (Latitude)</label>
                                    <input
                                        type="number"
                                        value={items.shop_latitude || '0'}
                                        onChange={(e) => setItems({ ...items, shop_latitude: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold block">خط الطول (Longitude)</label>
                                    <input
                                        type="number"
                                        value={items.shop_longitude || '0'}
                                        onChange={(e) => setItems({ ...items, shop_longitude: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">نطاق السماح (بالمتر)</label>
                                <input
                                    type="number"
                                    value={items.geofencing_radius || '200'}
                                    onChange={(e) => setItems({ ...items, geofencing_radius: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        notify('جاري الحصول على موقعك الحالي...', 'info')
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                                setItems({
                                                    ...items,
                                                    shop_latitude: pos.coords.latitude.toString(),
                                                    shop_longitude: pos.coords.longitude.toString()
                                                })
                                                notify('تم تحديد الموقع بنجاح', 'success')
                                            },
                                            (err) => {
                                                notify('فشل الحصول على الموقع. يرجى إدخاله يدوياً', 'error')
                                            }
                                        )
                                    }
                                }}
                                className="w-full bg-white hover:bg-slate-50 text-brand-primary border border-brand-primary/20 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                تحديد إحداثيات موقعي الحالي
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-400" />
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest text-right">إعدادات الحضور والرواتب</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-500 block">مدة السماح للتأخير (دقيقة)</label>
                            <input
                                type="number"
                                value={items.late_allowed_minutes || '15'}
                                onChange={(e) => setItems({ ...items, late_allowed_minutes: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="مثلاً: 15"
                            />
                            <p className="text-[10px] text-slate-400 font-bold">عدد الدقائق المسموح بها قبل احتساب التأخير</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-500 block">قيمة الخصم لكل دقيقة تأخير (جنيه)</label>
                            <input
                                type="number"
                                step="0.5"
                                value={items.late_deduction_per_minute || '0'}
                                onChange={(e) => setItems({ ...items, late_deduction_per_minute: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="مثلاً: 1.0"
                            />
                            <p className="text-[10px] text-slate-400 font-bold">المبلغ الذي سيتم خصمه مقابل كل دقيقة تأخير</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
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
                <div className="space-y-4 pt-6 border-t border-slate-100 bg-blue-50/50 p-6 rounded-3xl border-2 border-dashed border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-right">
                            <h4 className="text-sm font-black text-slate-800 tracking-tight">ربط تطبيق الموبايل (سريع)</h4>
                            <p className="text-[10px] text-slate-500 font-bold">امسح الكود من الموبايل للدخول المباشر بدون كلمة مرور</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <QRCode
                                value={qrConfig ? `AUTH|${qrConfig.tunnelUrl || `http://${qrConfig.ip}:${qrConfig.port}`}|admin|admin123` : 'Loading...'}
                                size={140}
                                level="H"
                            />
                        </div>
                        <p className="text-[10px] text-blue-600 font-black text-center leading-relaxed">
                            {"افتح تطبيق الموبايل -> اضغط مسح QR -> وجه الكاميرا هنا"}
                        </p>
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
                        ask('استعادة نسخة احتياطية', 'تحذير: هذه العملية ستقوم باستبدال كافة البيانات الحالية (منتجات، مبيعات، موظفين) بالنسخة المختارة.\nهل أنت متأكد؟', async () => {
                            notify('جاري استعادة البيانات والريستارت...', 'info')
                            const res = await window.api.restoreBackup()
                            if (res && !res.success) {
                                notify(res.error, 'error')
                            }
                        })
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-blue-50 transition-all active:scale-95 text-sm"
                >
                    <RotateCcw className="w-5 h-5" />
                    استعادة نسخة احتياطية (Restore Backup)
                </button>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => window.api.openDatabaseFolder()}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-slate-100 transition-all active:scale-95 text-xs text-center"
                    >
                        <Package className="w-5 h-5 opacity-50" />
                        مجلد الداتا
                    </button>
                    {!clearConfirmMode ? (
                        <button
                            onClick={() => { setClearConfirmMode(true); setClearConfirmText('') }}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 border-red-100 transition-all active:scale-95 text-xs text-center"
                        >
                            <Trash2 className="w-5 h-5" />
                            مسح كافة البيانات
                        </button>
                    ) : (
                        <div className="col-span-2 bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-3 text-right">
                            <p className="text-red-700 font-black text-sm">⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
                            <p className="text-red-500 text-xs">اكتب <span className="font-black bg-red-200 px-2 py-0.5 rounded">مسح</span> للتأكيد</p>
                            <input
                                type="text"
                                value={clearConfirmText}
                                onChange={(e) => setClearConfirmText(e.target.value)}
                                placeholder='اكتب "مسح" هنا...'
                                className="w-full bg-white border-2 border-red-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm text-right"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setClearConfirmMode(false); setClearConfirmText('') }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    disabled={clearConfirmText !== 'مسح'}
                                    onClick={async () => {
                                        if (clearConfirmText !== 'مسح') return
                                        await window.api.clearAllData()
                                        setClearConfirmMode(false)
                                        setClearConfirmText('')
                                        notify('تم مسح كافة البيانات بنجاح.', 'success')
                                        onRefresh()
                                    }}
                                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-200 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl text-xs transition-all"
                                >
                                    مسح نهائي
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
