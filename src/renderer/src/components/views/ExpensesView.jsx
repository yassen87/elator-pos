import React, { useState, useEffect } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ExpensesView({ employees, notify, ask }) {
    const [expenses, setExpenses] = useState([])
    const [category, setCategory] = useState('مصاريف عامة')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

    const [amount, setAmount] = useState('')
    const [desc, setDesc] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [type, setType] = useState('spent') // spent, loan, trust
    const [showAdd, setShowAdd] = useState(false)

    useEffect(() => { loadExpenses() }, [category, startDate, endDate])

    const loadExpenses = async () => {
        try {
            const res = await window.api.invoke('expenses:get', { startDate, endDate, category })
            setExpenses(Array.isArray(res) ? res : [])
        } catch (err) {
            console.error('Failed to load expenses:', err)
            notify('فشل تحميل بيانات المصاريف', 'error')
            setExpenses([])
        }
    }

    const handleAdd = async () => {
        if (!amount || !desc) return notify('يرجى إكمال البيانات', 'error')

        let finalCategory = type === 'spent' ? 'مصاريف عامة' : (type === 'loan' ? 'سلفة موظف' : 'عهدة مالية')

        try {
            await window.api.invoke('expenses:add', {
                amount: parseFloat(amount),
                category: finalCategory,
                description: desc,
                // Only send employee_id for loan or trust, not for general expenses
                employee_id: (type === 'loan' || type === 'trust') ? (selectedEmployee || null) : null,
                status: type
            })

            setAmount(''); setDesc(''); setSelectedEmployee(''); setType('spent'); setShowAdd(false)
            notify('تم تسجيل العملية بنجاح', 'success')
            loadExpenses()
        } catch (err) {
            console.error('Failed to add expense:', err)
            notify('حدث خطأ أثناء تسجيل العملية', 'error')
        }
    }

    return (
        <div className="space-y-6 text-right">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-slate-600 outline-none px-2" />
                        <span className="text-slate-300">إلى</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-slate-600 outline-none px-2" />
                    </div>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-100 p-3 rounded-2xl font-black text-slate-600 outline-none min-w-[150px]"
                    >
                        <option value="all">كل التصنيفات (بما فيها الرواتب)</option>
                        <option value="مصاريف عامة">مصاريف عامة</option>
                        <option value="رواتب">الرواتب المنصرفة</option>
                        <option value="سلفة موظف">سلف الموظفين</option>
                        <option value="عهدة مالية">العهد المالية</option>
                    </select>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-slate-900/10"
                >
                    <PlusCircle className="w-5 h-5 text-brand-primary" /> تسجيل مصروفات / عهدة
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400">
                                <th className="p-6 font-black text-xs uppercase tracking-widest">التاريخ</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest">التصنيف</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest">الموظف</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest">المبلغ</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(ex => (
                                <tr key={ex.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-6 font-bold text-slate-500 text-xs">{(ex.date && !isNaN(new Date(ex.date + 'Z'))) ? new Date(ex.date + 'Z').toLocaleString('ar-EG') : '---'}</td>
                                    <td className="p-6">
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${ex.status === 'loan' ? 'bg-amber-100 text-amber-700' :
                                            ex.status === 'trust' ? 'bg-blue-100 text-blue-700' : 'bg-brand-primary/10 text-brand-primary'
                                            }`}>
                                            {ex.category}
                                        </span>
                                    </td>
                                    <td className="p-6 font-black text-slate-700">{ex.employee_name || '--'}</td>
                                    <td className="p-6 font-black text-red-600">{ex.amount} ج.م</td>
                                    <td className="p-6 font-bold text-slate-600 text-sm max-w-[200px] truncate">{ex.description}</td>
                                    <td className="p-6 text-center">
                                        <button 
                                            onClick={() => ask('حذف مصروف', 'هل أنت متأكد من حذف هذا المصروف؟', async () => {
                                                const res = await window.api.invoke('expenses:delete', ex.id);
                                                if (res.success) {
                                                    notify('تم حذف المصروف بنجاح', 'success');
                                                    loadExpenses();
                                                } else {
                                                    notify('فشل الحذف: ' + res.message, 'error');
                                                }
                                            })}
                                            className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
                            <h3 className="text-2xl font-black text-slate-800 mb-8 pr-4 border-r-4 border-brand-primary">تسجيل عملية مالية</h3>
                            <div className="space-y-6">
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    {['spent', 'loan', 'trust'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setType(t)}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === t ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
                                        >
                                            {t === 'spent' ? 'مصاريف' : (t === 'loan' ? 'سلفة' : 'عهدة')}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2 text-right">
                                    <label className="text-sm font-black text-slate-500">المبلغ</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-2xl outline-none" placeholder="0.00" />
                                </div>
                                {(type === 'loan' || type === 'trust') && (
                                    <div className="space-y-2 text-right">
                                        <label className="text-sm font-black text-slate-500">الموظف</label>
                                        <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none">
                                            <option value="">اختر الموظف...</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2 text-right">
                                    <label className="text-sm font-black text-slate-500">البيان / ملاحظات</label>
                                    <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold min-h-[100px] outline-none" placeholder="مثلاً: فاتورة كهرباء، سلفة لمحمد..." />
                                </div>
                                <button onClick={handleAdd} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-lg">حفظ البيانات 💾</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
