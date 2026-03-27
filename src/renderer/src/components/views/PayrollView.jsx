import React, { useState, useEffect } from 'react'
import { Calendar, History, Banknote, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function PayrollView({ employees, notify, ask }) {
    const [loanBalances, setLoanBalances] = useState({})
    const [attendanceSummary, setAttendanceSummary] = useState({})
    const [settings, setSettings] = useState({})
    const [selectedEmp, setSelectedEmp] = useState(null)
    const [history, setHistory] = useState([])
    const [showHistory, setShowHistory] = useState(false)
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
    const [monthlyPayments, setMonthlyPayments] = useState([])
    const [bonus, setBonus] = useState('')
    const [deduction, setDeduction] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        loadFinancials()
        loadMonthlyPayments()
        loadAttendance()
        window.api.getSettings().then(setSettings)
    }, [employees, month])

    // Auto-refresh data every 3 seconds to catch mobile updates
    useEffect(() => {
        const interval = setInterval(() => {
            loadFinancials()
            loadAttendance()
        }, 3000) // 3 seconds for faster updates

        return () => clearInterval(interval)
    }, [employees])

    const loadFinancials = async () => {
        try {
            const res = await window.api.invoke('expenses:get', { startDate: '2000-01-01', endDate: '2100-01-01', category: 'سلفة موظف' })
            const balances = {}
            if (Array.isArray(res)) {
                res.forEach(ex => {
                    if (ex.status === 'loan' && ex.employee_id) {
                        balances[ex.employee_id] = (balances[ex.employee_id] || 0) + (ex.amount || 0)
                    }
                })
            }
            setLoanBalances(balances)
        } catch (err) {
            console.error('Failed to load payroll financials:', err)
        }
    }

    const loadAttendance = async () => {
        try {
            const res = await window.api.invoke('hr:get-attendance-summary', { month })
            const summary = {}
            if (Array.isArray(res)) {
                res.forEach(item => {
                    summary[item.employee_id] = {
                        days_present: item.days_present,
                        total_late_minutes: item.total_late_minutes,
                        total_extra_hours: item.total_extra_hours
                    }
                })
            }
            setAttendanceSummary(summary)
        } catch (err) {
            console.error('Failed to load attendance summary:', err)
        }
    }

    const loadMonthlyPayments = async () => {
        try {
            const res = await window.api.invoke('hr:get-payments')
            setMonthlyPayments((Array.isArray(res) ? res : []).filter(p => p.month === month))
        } catch (err) {
            console.error('Failed to load monthly payments:', err)
        }
    }

    const calculateSuggestedSalary = (emp) => {
        const stats = attendanceSummary[emp.id] || { days_present: 0 }
        const days = stats.days_present || 0
        const targetDays = emp.working_days || 26
        const dailyRate = emp.salary / targetDays

        let baseCalculated = dailyRate * days

        // Handle Overtime
        const extraHours = stats.total_extra_hours || 0
        if (extraHours > 0) {
            const hourlyRate = emp.salary / (targetDays * (emp.work_hours || 8))
            baseCalculated += (extraHours * hourlyRate * 1.5)
        }

        const loans = loanBalances[emp.id] || 0
        return Math.max(0, baseCalculated - loans)
    }

    const handlePayout = async () => {
        if (!selectedEmp) return;
        const b = parseFloat(bonus) || 0;
        const d = parseFloat(deduction) || 0;
        const net = selectedEmp.salary + b - d; // This handles the final confirmed amount

        ask('تأكيد صرف الراتب', `سيتم صرف ${net.toFixed(2)} ج.م للموظف ${selectedEmp.name}. هل أنت متأكد؟`, async () => {
            try {
                const res = await window.api.invoke('hr:payout-salary', {
                    employee_id: selectedEmp.id,
                    month,
                    base_salary: selectedEmp.salary,
                    bonus: b,
                    deduction: d,
                    notes
                })
                if (res && res.success) {
                    notify('تم صرف الراتب بنجاح', 'success')
                    setSelectedEmp(null); loadFinancials(); loadMonthlyPayments(); loadAttendance();
                } else {
                    notify('فشل عملية الصرف: ' + (res?.message || 'خطأ غير معروف'), 'error')
                }
            } catch (err) {
                console.error('Payout failed:', err)
                notify('حدث خطأ تقني أثناء محاولة صرف الراتب', 'error')
            }
        })
    }

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Banknote className="w-8 h-8 text-green-500" /> مسير الرواتب الشهرية</h3>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
                            <Calendar className="w-4 h-4 text-brand-primary" /><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent font-black text-slate-700 outline-none text-sm" />
                        </div>
                        <button onClick={async () => { const res = await window.api.invoke('hr:get-payments'); setHistory(res || []); setShowHistory(true); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center gap-2"><History className="w-5 h-5" /> سجل الرواتب</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-6 font-black text-xs">الموظف</th>
                                <th className="p-6 font-black text-xs">الراتب الأساسي</th>
                                <th className="p-6 font-black text-xs">أيام الحضور</th>
                                <th className="p-6 font-black text-xs">إضافي (ساعات)</th>
                                <th className="p-6 font-black text-xs">تأخيرات (دقيقة)</th>
                                <th className="p-6 font-black text-xs">سلف</th>
                                <th className="p-6 font-black text-xs">الراتب المستحق</th>
                                <th className="p-6 font-black text-xs">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const stats = attendanceSummary[emp.id] || { days_present: 0, total_late_minutes: 0 }
                                const days = stats.days_present
                                const suggested = calculateSuggestedSalary(emp)
                                const isPaid = monthlyPayments.some(p => p.employee_id === emp.id)

                                return (
                                    <tr key={emp.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-6 font-black text-slate-800">{emp.name}</td>
                                        <td className="p-6 font-bold text-slate-600">{emp.salary} ج.م</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-lg font-black ${days >= (emp.working_days || 26) ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {days} / {emp.working_days || 26}
                                            </span>
                                        </td>
                                        <td className="p-6 font-black text-blue-500">
                                            {stats.total_extra_hours ? stats.total_extra_hours.toFixed(1) : 0}
                                        </td>
                                        <td className="p-6 font-black text-red-400">{stats.total_late_minutes || 0}</td>
                                        <td className="p-6 font-black text-red-500">{loanBalances[emp.id] || 0} ج.م</td>
                                        <td className="p-6 font-black text-brand-primary text-lg">{suggested.toFixed(2)} ج.م</td>
                                        <td className="p-6">
                                            {isPaid ? (
                                                <div className="flex items-center gap-2 text-green-600 font-black">
                                                    <Save className="w-4 h-4" />
                                                    تم الصرف ✅
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const stats = attendanceSummary[emp.id] || { days_present: 0, total_late_minutes: 0 }
                                                        const daysPresent = stats.days_present
                                                        const lateMinutes = stats.total_late_minutes || 0
                                                        const targetDays = emp.working_days || 26

                                                        // Calculate Deductions
                                                        let absenceDeduction = (emp.salary / targetDays) * (targetDays - daysPresent)
                                                        if (daysPresent > targetDays) absenceDeduction = 0 // No negative deduction for extra work

                                                        const lateDeductionRate = parseFloat(settings.late_deduction_per_minute || 0)
                                                        const lateDeduction = lateMinutes * lateDeductionRate

                                                        const totalDeduction = absenceDeduction + lateDeduction

                                                        setSelectedEmp(emp)
                                                        // Don't include loans here - backend will handle it automatically
                                                        setDeduction(totalDeduction.toFixed(2))
                                                        setDeduction(totalDeduction.toFixed(2))

                                                        // Calculate Overtime Value
                                                        const extraHours = stats.total_extra_hours || 0
                                                        let overtimeValue = 0
                                                        if (extraHours > 0) {
                                                            const hourlyRate = emp.salary / (targetDays * (emp.work_hours || 8))
                                                            overtimeValue = extraHours * hourlyRate * 1.5
                                                        }

                                                        setBonus(overtimeValue > 0 ? overtimeValue.toFixed(2) : '')

                                                        let note = `صرف راتب شهر ${month} (حضور ${daysPresent} يوم)`
                                                        if (lateMinutes > 0) note += ` - تأخير ${lateMinutes} دقيقة`
                                                        if (extraHours > 0) note += ` - إضافي ${extraHours.toFixed(1)} ساعة`
                                                        setNotes(note)
                                                    }}
                                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:scale-105 transition-all shadow-lg active:scale-95"
                                                >
                                                    صرف الراتب
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedEmp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedEmp(null)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg relative z-10 shadow-2xl text-right">
                            <h3 className="text-2xl font-black text-slate-800 mb-6 border-r-4 border-brand-primary pr-4">صرف راتب: {selectedEmp.name}</h3>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-sm font-black text-slate-500">مكافأة (+)</label><input type="number" value={bonus} onChange={e => setBonus(e.target.value)} className="w-full bg-green-50 border p-4 rounded-2xl font-black text-green-700" placeholder="0" /></div>
                                <div className="space-y-1"><label className="text-sm font-black text-red-600">خصم (-)</label><input type="number" value={deduction} onChange={e => setDeduction(e.target.value)} className="w-full bg-red-50 border p-4 rounded-2xl font-black text-red-700" placeholder="0" /></div>
                                <div className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-2xl text-center">{(selectedEmp.salary + (parseFloat(bonus) || 0) - (parseFloat(deduction) || 0)).toFixed(2)} ج.م</div>
                                <button onClick={handlePayout} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all">تأكيد الصرف 💸</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
