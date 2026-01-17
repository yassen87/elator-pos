import { useState } from 'react'
import { LogIn, Lock, User } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await window.api.login({ username, password })
            if (result.success) {
                onLogin(result.user)
            } else {
                setError(result.message)
            }
        } catch (err) {
            setError('حدث خطأ أثناء تسجيل الدخول')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-100/50 p-4 font-noto">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-brand-secondary"></div>

                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-brand-primary/5 shadow-inner">
                            <LogIn className="w-10 h-10 text-brand-primary" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">نظام الروائح الذكية</h1>
                        <p className="text-slate-400 mt-2 font-bold text-sm">إدارة متكاملة لمحل العطور الخاص بك</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 block mr-1 uppercase tracking-[0.2em]">اسم المستخدم</label>
                            <div className="relative">
                                <User className="absolute right-4 top-4 w-5 h-5 text-slate-300" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pr-12 pl-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 border-transparent focus:border-brand-primary/30 transition-all font-bold placeholder:text-slate-300"
                                    placeholder="أدخل بريدك أو اسمك"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 block mr-1 uppercase tracking-[0.2em]">كلمة المرور</label>
                            <div className="relative">
                                <Lock className="absolute right-4 top-4 w-5 h-5 text-slate-300" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pr-12 pl-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 border-transparent focus:border-brand-primary/30 transition-all font-bold placeholder:text-slate-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-50 text-red-500 text-xs font-bold py-3 px-4 rounded-xl text-center border border-red-100"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4.5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-brand-primary/20 active:scale-[0.98] text-lg"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>الدخول للنظام</span>
                                    <LogIn className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
