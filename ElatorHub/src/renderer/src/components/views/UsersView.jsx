import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit, Trash2, Shield, User, Save, X, Key } from 'lucide-react'

export default function UsersView() {
    const [users, setUsers] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier' })

    const fetchUsers = async () => {
        try {
            const data = await window.api.invoke('hub:get-users')
            if (Array.isArray(data)) setUsers(data)
        } catch (err) {
            console.error('Failed to fetch users:', err)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user)
            setFormData({ username: user.username, password: '', role: user.role })
        } else {
            setEditingUser(null)
            setFormData({ username: '', password: '', role: 'cashier' })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingUser) {
                await window.api.invoke('hub:update-user', { ...formData, id: editingUser.id })
            } else {
                await window.api.invoke('hub:add-user', formData)
            }
            setIsModalOpen(false)
            fetchUsers()
        } catch (err) {
            console.error('Failed to save user:', err)
        }
    }

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            try {
                await window.api.invoke('hub:delete-user', id)
                fetchUsers()
            } catch (err) {
                console.error('Failed to delete user:', err)
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">إدارة المستخدمين</h2>
                    <p className="text-slate-500 font-bold mt-1">التحكم في صلاحيات وحسابات طاقم العمل.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
                >
                    <Plus size={20} />
                    <span>مستخدم جديد</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {users.map(user => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="glass p-6 rounded-[2rem] border border-slate-100 hover:border-brand-primary/30 transition-all group bg-white shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                    {user.role === 'admin' || user.role === 'super_admin' ? <Shield size={24} className="text-orange-600" /> : <User size={24} className="text-indigo-600" />}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(user)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black mb-1 text-slate-900">{user.username}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${user.role === 'admin' ? 'bg-orange-50 text-orange-600' :
                                    user.role === 'super_admin' ? 'bg-red-50 text-red-600' :
                                        'bg-indigo-50 text-indigo-600'
                                    }`}>
                                    {user.role === 'admin' ? 'مدير' : user.role === 'super_admin' ? 'مطور' : 'كاشير'}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">ID: {user.id}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-white border border-slate-200 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute left-6 top-6 p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-2xl font-black mb-8 text-slate-900">
                                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500">اسم المستخدم</label>
                                    <div className="relative">
                                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 font-bold focus:border-brand-primary outline-none transition-all text-slate-900"
                                            placeholder="اسم الدخول"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500">
                                        {editingUser ? 'كلمة المرور (اتركها فارغة للإبقاء)' : 'كلمة المرور'}
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="password"
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 font-bold focus:border-brand-primary outline-none transition-all text-slate-900"
                                            placeholder="*******"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500">الصلاحية</label>
                                    <div className="flex gap-2">
                                        {['cashier', 'admin', 'super_admin'].map(role => (
                                            <button
                                                type="button"
                                                key={role}
                                                onClick={() => setFormData({ ...formData, role })}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${formData.role === role
                                                    ? 'bg-brand-primary text-white border-brand-primary'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {role === 'admin' ? 'مدير' : role === 'super_admin' ? 'مطور' : 'كاشير'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 mt-4 flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    <span>حفظ البيانات</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
