import React, { useState, useEffect } from 'react'
import { Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import QRCode from 'react-qr-code'

export function MobileRemoteView({ notify }) {
    const [tunnelUrl, setTunnelUrl] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [localIp, setLocalIp] = useState(null)

    const loadConnectionInfo = async () => {
        setIsLoading(true)
        try {
            const [tunnel, ip] = await Promise.all([
                window.api.invoke('system:get-tunnel-url'),
                window.api.invoke('system:get-local-ip')
            ])
            setTunnelUrl(tunnel)
            setLocalIp(ip)
        } catch (err) {
            console.error('Failed to load connection info:', err)
            notify('فشل تحميل معلومات الاتصال', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadConnectionInfo()
        const interval = setInterval(loadConnectionInfo, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [])

    const qrData = `AUTH|https://elator-pos.veila.shop/api.php|admin|admin`

    return (
        <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Server Status */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">الخادم المحلي</h3>
                            <p className="text-sm text-slate-500 font-bold">نشط ويعمل</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-xs text-slate-400 font-bold mb-1">عنوان الشبكة المحلية</p>
                        <p className="text-sm font-mono font-black text-slate-700">
                            {localIp ? `http://${localIp}:5001` : 'جاري التحميل...'}
                        </p>
                    </div>
                </div>

                {/* Remote Tunnel Status */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tunnelUrl ? 'bg-blue-50' : 'bg-slate-50'}`}>
                            {tunnelUrl ? (
                                <Wifi className="w-6 h-6 text-blue-600" />
                            ) : (
                                <WifiOff className="w-6 h-6 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">الاتصال عن بُعد</h3>
                            <p className="text-sm text-slate-500 font-bold">
                                {tunnelUrl ? 'متصل بالإنترنت' : 'غير متاح'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-xs text-slate-400 font-bold mb-1">الرابط العام</p>
                        <p className="text-sm font-mono font-black text-slate-700 break-all">
                            {tunnelUrl || 'جاري الإنشاء...'}
                        </p>
                    </div>
                </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">ربط تطبيق الموبايل</h3>
                            <p className="text-sm text-slate-500 font-bold">امسح الكود للاتصال بالنظام</p>
                        </div>
                    </div>
                    <button
                        onClick={loadConnectionInfo}
                        disabled={isLoading}
                        className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* QR Code */}
                    <div className="bg-white p-6 rounded-3xl border-4 border-slate-100 shadow-lg">
                        <QRCode
                            value={qrData}
                            size={256}
                            level="H"
                            fgColor="#1e293b"
                            bgColor="#ffffff"
                        />
                    </div>

                    {/* Instructions */}
                    <div className="flex-1 space-y-4">
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <h4 className="font-black text-blue-900">خطوات الربط:</h4>
                                    <ol className="space-y-2 text-sm text-blue-800 font-bold list-decimal list-inside">
                                        <li>افتح تطبيق Elator POS على هاتفك</li>
                                        <li>اضغط على زر "مسح QR" في شاشة الدخول</li>
                                        <li>وجّه الكاميرا نحو الكود أعلاه</li>
                                        <li>سيتم الاتصال تلقائياً بالنظام</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <h4 className="font-black text-slate-800 mb-3">المميزات المتاحة:</h4>
                            <ul className="space-y-2 text-sm text-slate-600 font-bold">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>متابعة المبيعات اليومية لحظياً</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>عرض آخر 5 فواتير مع التفاصيل</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>تنبيهات المخزون المنخفض</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>الوصول من أي مكان في العالم</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
