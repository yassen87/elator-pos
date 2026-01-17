import React, { useState, useEffect } from 'react'
import { Users, Lock, ShieldCheck, RefreshCw } from 'lucide-react'

export default function SuperAdminView({ notify, handleCheckUpdate, isCheckingUpdate, updateStatus, updateProgress }) {
    const [users, setUsers] = useState([])

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

    return (
        <div className="space-y-8">
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
        </div>
    )
}
