import React, { useState, useEffect } from 'react'
import { Users, Lock, ShieldCheck, Upload, FileCode, Package, AlertCircle, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DeveloperDashboard({ user, onLogout, notify, ask }) {
    const [users, setUsers] = useState([])
    const [selectedFile, setSelectedFile] = useState(null)
    const [version, setVersion] = useState('')
    const [releaseNotes, setReleaseNotes] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            const data = await window.api.getSuperUsersList()
            setUsers(data || [])
        } catch (error) {
            notify('فشل تحميل قائمة المستخدمين', 'error')
        }
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
        if (!selectedFile) {
            notify('يرجى اختيار ملف التحديث أولاً', 'error')
            return
        }
        if (!version.trim()) {
            notify('يرجى إدخال رقم الإصدار', 'error')
            return
        }

        ask(
            'نشر التحديث',
            `هل أنت متأكد من نشر الإصدار ${version}؟\nسيتم إرسال التحديث لجميع المستخدمين.`,
            async () => {
                setIsUploading(true)
                setUploadProgress(0)

                try {
                    const interval = setInterval(() => {
                        setUploadProgress(prev => {
                            if (prev >= 95) {
                                clearInterval(interval)
                                return 95
                            }
                            return prev + 5
                        })
                    }, 200)

                    // Simulate upload - replace with actual server upload
                    await new Promise(resolve => setTimeout(resolve, 3000))

                    clearInterval(interval)
                    setUploadProgress(100)

                    setTimeout(() => {
                        notify(`تم نشر الإصدار ${version} بنجاح! 🎉`, 'success')
                        setIsUploading(false)
                        setUploadProgress(0)
                        setSelectedFile(null)
                        setVersion('')
                        setReleaseNotes('')
                    }, 500)

                } catch (error) {
                    notify('فشل رفع التحديث. حاول مرة أخرى.', 'error')
                    setIsUploading(false)
                    setUploadProgress(0)
                }
            }
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-noto" dir="rtl">
            {/* Header */}
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
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-slate-400 font-bold">مرحباً،</p>
                            <p className="font-black text-slate-800">{user.username}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold border border-red-100"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>تسجيل الخروج</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 py-12">
                <div className="space-y-8">
                    {/* Update Publishing Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-primary/20 rounded-full translate-y-48 -translate-x-48 blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                                    <Upload className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black">نشر تحديث جديد</h3>
                                    <p className="text-slate-300 font-bold mt-2">رفع وتوزيع الإصدارات الجديدة على جميع المستخدمين</p>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 space-y-6">
                                {/* File Upload */}
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-300 uppercase tracking-wider">ملف التحديث</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={handleFileSelect}
                                            accept=".exe,.msi,.zip,.dmg,.AppImage"
                                            className="hidden"
                                            id="update-file"
                                            disabled={isUploading}
                                        />
                                        <label
                                            htmlFor="update-file"
                                            className={`flex items-center justify-center gap-3 w-full bg-white/10 border-2 border-dashed border-white/30 rounded-2xl py-8 cursor-pointer hover:bg-white/20 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            {selectedFile ? (
                                                <>
                                                    <FileCode className="w-6 h-6 text-green-400" />
                                                    <span className="font-bold text-lg">{selectedFile.name}</span>
                                                    <span className="text-slate-400 text-sm">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6" />
                                                    <span className="font-bold">اضغط لاختيار ملف التحديث (.exe, .msi, .zip)</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Version Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-300 uppercase tracking-wider">رقم الإصدار</label>
                                    <input
                                        type="text"
                                        value={version}
                                        onChange={(e) => setVersion(e.target.value)}
                                        placeholder="مثال: 1.2.0"
                                        disabled={isUploading}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white placeholder:text-slate-400 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                                    />
                                </div>

                                {/* Release Notes */}
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-300 uppercase tracking-wider">ملاحظات الإصدار (اختياري)</label>
                                    <textarea
                                        value={releaseNotes}
                                        onChange={(e) => setReleaseNotes(e.target.value)}
                                        placeholder="ما الجديد في هذا الإصدار؟"
                                        disabled={isUploading}
                                        rows={4}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white placeholder:text-slate-400 font-bold resize-none focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                                    />
                                </div>

                                {/* Upload Progress */}
                                {isUploading && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold">جاري الرفع...</span>
                                            <span className="font-mono">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-brand-primary to-purple-500 h-full transition-all duration-300 rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Publish Button */}
                                <button
                                    onClick={handlePublishUpdate}
                                    disabled={isUploading || !selectedFile || !version.trim()}
                                    className={`w-full flex items-center justify-center gap-4 px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-2xl ${isUploading || !selectedFile || !version.trim()
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-white text-slate-900 hover:bg-brand-primary hover:text-white scale-105 hover:scale-110 active:scale-95'
                                        }`}
                                >
                                    <Package className="w-6 h-6" />
                                    <span>{isUploading ? 'جاري النشر...' : 'نشر التحديث للمستخدمين'}</span>
                                </button>
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                                    <div className="space-y-2 text-sm text-blue-200">
                                        <p className="font-bold">ملاحظات هامة:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-300">
                                            <li>تأكد من اختبار التحديث قبل نشره</li>
                                            <li>سيتم إرسال إشعار لجميع المستخدمين بوجود تحديث جديد</li>
                                            <li>يمكن للمستخدمين تحميل التحديث وتثبيته مباشرة</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* User Passwords Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">إدارة كلمات المرور</h3>
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
                                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' :
                                                        u.role === 'admin' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-green-50 text-green-600'
                                                    }`}>
                                                    {u.role === 'super_admin' ? 'مطور النظام' : u.role === 'admin' ? 'مدير' : 'كاشير'}
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
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
