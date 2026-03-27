import React, { useState, useEffect } from 'react'
import { RefreshCw, MessageSquare, UserCheck, RotateCcw } from 'lucide-react'

export function WhatsAppManagement({ notify }) {
    const [status, setStatus] = useState('DISCONNECTED')
    const [qr, setQr] = useState(null)
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        window.api.getWhatsAppStatus().then(res => {
            if (res) { setStatus(res.status); setQr(res.qr); }
        })
        const cleanup = window.api.onWhatsAppStatus((data) => {
            if (data.status) setStatus(data.status)
            if (data.qr) setQr(data.qr)
            if (data.message) setMsg(data.message)
            if (data.status === 'CONNECTED') setQr(null)
        })
        return cleanup
    }, [])

    const handleInit = async () => {
        setLoading(true)
        try {
            const res = await window.api.initWhatsApp()
            if (!res.success) notify('فشل تشغيل خدمة الواتساب: ' + res.message, 'error')
        } catch (e) { notify('خطأ في الاتصال بالخدمة', 'error') }
        setLoading(false)
    }

    const handleLogout = async () => {
        if (confirm('هل أنت متأكد من تسجيل الخروج من واتساب؟')) {
            await window.api.logoutWhatsApp()
            notify('تم تسجيل الخروج بنجاح', 'info')
        }
    }

    const handleHardReset = async () => {
        if (confirm('هل ترغب في حذف بيانات الجلسة بالكامل؟')) {
            setStatus('DISCONNECTED'); setMsg('جاري تنظيف الجلسة...')
            await window.api.deleteWhatsAppSession()
            notify('تم حذف الجلسة بنجاح، حاول الربط الآن', 'success')
        }
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : status === 'QR_READY' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <h4 className="font-bold text-slate-800 text-lg">اتصال واتساب (التلقائي)</h4>
                </div>
                {status === 'CONNECTED' && <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700 underline font-bold">تسجيل الخروج</button>}
            </div>

            {status === 'DISCONNECTED' || status === 'AUTH_FAILURE' ? (
                <div className="space-y-4 text-center py-4">
                    <p className="text-sm text-slate-500">قم بربط رقم الواتساب الخاص بك لإرسال الفواتير تلقائياً للعملاء.</p>
                    <button onClick={handleInit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 mx-auto">
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                        تشغيل الخدمة وربط الحساب
                    </button>
                </div>
            ) : status === 'INITIALIZING' ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
                    <div className="text-center">
                        <p className="text-slate-600 font-bold">{msg || 'جاري ربط الخدمة...'}</p>
                        <button onClick={handleHardReset} className="mt-4 text-[10px] text-red-500 underline">هل استغرق الأمر وقتاً طويلاً؟ اضغط هنا لإعادة الضبط</button>
                    </div>
                </div>
            ) : status === 'QR_READY' ? (
                <div className="flex flex-col items-center gap-4 py-4 bg-white rounded-xl border border-slate-100 p-6 shadow-inner">
                    <p className="text-sm text-slate-600 font-bold mb-2 text-center">قم بمسح الرمز التالي من تطبيق الواتساب:</p>
                    {qr ? <div className="bg-white p-2 rounded-xl border-2 border-slate-200 shadow-sm hover:scale-105 transition-all"><img src={qr} alt="WhatsApp QR Code" className="w-56 h-56" /></div> : <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-2xl"><RefreshCw className="w-8 h-8 text-slate-300 animate-spin" /></div>}
                    <button onClick={handleInit} className="text-xs text-brand-primary hover:underline mt-2 font-bold">طلب كود جديد</button>
                </div>
            ) : status === 'CONNECTED' ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"><UserCheck className="w-6 h-6" /></div>
                    <div><p className="text-green-800 font-bold text-lg">متصل الآن!</p><p className="text-sm text-green-600">سيتم إرسال الفواتير تلقائياً من خلال هذا الحساب.</p></div>
                </div>
            ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3 text-red-700 font-bold"><RotateCcw className="w-5 h-5" />حدث خطأ في الاتصال</div>
                    <button onClick={handleInit} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">إعادة المحاولة</button>
                </div>
            )}
        </div>
    )
}
