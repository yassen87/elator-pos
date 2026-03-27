import React, { useState, useEffect, useRef } from 'react'
import { PlusCircle, Edit, Trash2, User, PhoneCall, LogOut, Banknote, QrCode, Printer, Cloud, RefreshCw } from 'lucide-react'
import QRCodeComponent from 'react-qr-code'
import { useReactToPrint } from 'react-to-print'
import { motion, AnimatePresence } from 'framer-motion'

export default function HRView({ employees, onRefresh, notify, ask, user }) {
    const [showAdd, setShowAdd] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [salary, setSalary] = useState('')
    const [role, setRole] = useState('employee')
    const [nationalId, setNationalId] = useState('')
    const [code, setCode] = useState('')
    const [workingDays, setWorkingDays] = useState('26')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('17:00')
    const [workHours, setWorkHours] = useState('8')
    const [hasHours, setHasHours] = useState(true)
    const [editingEmp, setEditingEmp] = useState(null)
    const [activeTab, setActiveTab] = useState('list') // 'list' or 'qr'
    const [qrConfig, setQrConfig] = useState(null)
    const qrPrintRef = useRef()
    const [attendanceSummary, setAttendanceSummary] = useState({})
    const [timeModal, setTimeModal] = useState({ show: false, empId: null, type: null, time: '' })
    const [payoutModal, setPayoutModal] = useState({ show: false, emp: null, bonus: '', deduction: '', notes: '', extraHours: 0 })

    const handlePrint = useReactToPrint({
        contentRef: qrPrintRef,
    })

    useEffect(() => {
        loadAttendanceSummary()
    }, [employees])

    useEffect(() => {
        if (activeTab === 'qr') {
            window.api.invoke('app:get-qr-config').then(setQrConfig).catch(err => {
                console.error('Failed to load QR config:', err)
                setQrConfig({ error: true })
            })
        }
    }, [activeTab])

    const loadAttendanceSummary = async () => {
        try {
            const month = new Date().toISOString().slice(0, 7)
            const summary = await window.api.invoke('hr:get-attendance-summary', { month })
            if (!summary || !Array.isArray(summary)) return
            const map = {}
            summary.forEach(s => {
                map[s.employee_id] = {
                    days: s.days_present,
                    extra: s.total_extra_hours || 0
                }
            })
            setAttendanceSummary(map)
        } catch (err) {
            console.error('Failed to load attendance summary:', err)
        }
    }

    const handleSyncEmployees = async () => {
        const res = await window.api.invoke('cloud:sync-employees')
        if (res.success) notify('تم مزامنة الموظفين مع السحابة ✅', 'success')
        else notify('فشل المزامنة: ' + (res.error || 'خطأ غير معروف'), 'error')
    }

    const handlePullAttendance = async () => {
        const res = await window.api.invoke('cloud:pull-attendance')
        if (res.success) {
            notify(`تم سحب ${res.count} سجل حضور جديد ✅`, 'success')
            onRefresh()
        } else notify('فشل السحب: ' + (res.error || 'خطأ غير معروف'), 'error')
    }

    const resetForm = () => {
        setName(''); setPhone(''); setSalary(''); setNationalId(''); setCode('');
        setWorkingDays('26'); setStartTime('09:00'); setEndTime('17:00');
        setWorkHours('8'); setHasHours(true); setEditingEmp(null)
    }

    const openAddModal = () => { resetForm(); setShowAdd(true); }

    const openEditModal = (emp) => {
        setEditingEmp(emp)
        setName(emp.name); setPhone(emp.phone); setSalary(emp.salary); setRole(emp.role);
        setNationalId(emp.national_id); setWorkingDays(emp.working_days);
        setStartTime(emp.start_time || '09:00'); setEndTime(emp.end_time || '17:00');
        setWorkHours(emp.work_hours || '8');
        setCode(emp.code || '');
        setHasHours(!!emp.start_time);
        setShowAdd(true)
    }

    const handleSubmit = async () => {
        if (!name || !salary) return notify('يرجى إكمال البيانات الأساسية', 'error')

        // Use manual work hours input, or auto-calculate from times if available
        let finalWorkHours = parseInt(workHours) || 8
        if (hasHours && startTime && endTime) {
            const [startHour, startMin] = startTime.split(':').map(Number)
            const [endHour, endMin] = endTime.split(':').map(Number)
            const startMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin
            finalWorkHours = Math.round((endMinutes - startMinutes) / 60)
        }

        const payload = {
            name, phone, salary: parseFloat(salary), role, national_id: nationalId,
            working_days: parseInt(workingDays),
            start_time: hasHours ? startTime : '',
            end_time: hasHours ? endTime : '',
            work_hours: finalWorkHours,
            code: code
        }
        let res;
        if (editingEmp) res = await window.api.invoke('employees:update', { ...payload, id: editingEmp.id })
        else res = await window.api.invoke('employees:add', payload)

        if (res && res.success) {
            notify(editingEmp ? 'تم تحديث بيانات الموظف بنجاح ✅' : 'تم إضافة الموظف بنجاح ✅', 'success')
            resetForm(); setShowAdd(false); onRefresh()
        } else {
            notify('حدث خطأ أثناء الحفظ: ' + (res?.message || ''), 'error')
        }
    }

    const handleDelete = (id) => {
        ask('حذف موظف', 'هل أنت متأكد من حذف هذا الموظف؟ (سيتم أرشفته ولن يظهر في القائمة)', async () => {
            const res = await window.api.deleteEmployee(id)
            if (res.success) { notify('تم حذف الموظف بنجاح', 'success'); onRefresh(); }
            else notify('فشل الحذف', 'error')
        })
    }

    const handleLogAttendance = async () => {
        const { empId, type, time } = timeModal
        if (!time) return notify('يرجى تحديد الوقت', 'error')
        const res = await window.api.invoke('attendance:log', { employee_id: empId, type, time })
        if (res.success) {
            notify(type === 'in' ? 'تم تسجيل حضور الموظف' : 'تم تسجيل انصراف الموظف', 'success')
            setTimeModal({ show: false, empId: null, type: null, time: '' })
            onRefresh()
        } else notify(res.message, 'error')
    }

    const handlePayout = async () => {
        const { emp, bonus, deduction, notes } = payoutModal
        if (!emp) return
        const b = parseFloat(bonus) || 0
        const d = parseFloat(deduction) || 0
        const net = emp.salary + b - d
        const month = new Date().toISOString().slice(0, 7)

        ask('تأكيد صرف الراتب', `سيتم صرف ${net.toFixed(2)} ج.م للموظف ${emp.name}. هل أنت متأكد؟`, async () => {
            const res = await window.api.invoke('hr:payout-salary', {
                employee_id: emp.id,
                month,
                base_salary: emp.salary,
                bonus: b,
                deduction: d,
                notes: notes || `صرف يدوي - شهر ${month} (إضافي: ${payoutModal.extraHours || 0} ساعة)`
            })
            if (res.success) {
                notify('تم صرف الراتب بنجاح ✅', 'success')
                setPayoutModal({ show: false, emp: null, bonus: '', deduction: '', notes: '', extraHours: 0 })
                onRefresh()
            } else {
                notify('حدث خطأ أثناء الصرف', 'error')
            }
        })
    }

    const openTimeModal = (empId, type) => {
        const now = new Date().toLocaleTimeString('ar-EG', { hour12: false }).substring(0, 5)
        setTimeModal({ show: true, empId, type, time: now })
    }

    return (
        <div className="space-y-6 text-right">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl font-black transition-all ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>قائمة الموظفين</button>
                    <button onClick={() => setActiveTab('qr')} className={`px-6 py-2.5 rounded-xl font-black transition-all ${activeTab === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>QR الحضور</button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={handleSyncEmployees} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 border border-blue-100 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all">
                        <Cloud className="w-4 h-4" /> رفـع للسحابة
                    </button>
                    <button onClick={handlePullAttendance} className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 border border-green-100 rounded-xl text-xs font-black hover:bg-green-600 hover:text-white transition-all">
                        <RefreshCw className="w-4 h-4" /> سحب الحضور (الموبايل)
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg text-xs"
                    >
                        <PlusCircle className="w-4 h-4 text-brand-primary" /> إضافة موظف
                    </button>
                </div>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5 text-right font-black">الموظف</th>
                                <th className="px-6 py-5 text-right font-black">الوظيفة</th>
                                <th className="px-6 py-5 text-right font-black">الراتب</th>
                                <th className="px-6 py-5 text-center font-black">الحضور/الانصراف</th>
                                <th className="px-6 py-5 text-center font-black">صرف المرتب</th>
                                <th className="px-6 py-5 text-center font-black">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-all font-bold">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-slate-900 font-black text-sm">{emp.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{emp.phone || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${emp.role === 'cashier' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {emp.role === 'cashier' ? 'كاشير' : 'موظف'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-800">
                                        {emp.salary} <span className="text-[10px] opacity-40">ج.م</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openTimeModal(emp.id, 'in')} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-green-600 hover:text-white transition-all border border-green-100">حضور</button>
                                            <button onClick={() => openTimeModal(emp.id, 'out')} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-600 hover:text-white transition-all border border-red-100">انصراف</button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => {
                                            const summary = attendanceSummary[emp.id] || { days: 0, extra: 0 }
                                            setPayoutModal({
                                                ...payoutModal,
                                                show: true,
                                                emp,
                                                extraHours: summary.extra
                                            })
                                        }} className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all">
                                            صرف الراتب
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openEditModal(emp)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[500px]">
                    <div ref={qrPrintRef} className="p-8 bg-white flex flex-col items-center text-center">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-slate-800 mb-2">تسجيل الحضور والانصراف</h2>
                            <p className="text-slate-500 font-bold mb-4">امسح الكود المناسب عبر تطبيق الموبايل</p>

                            {qrConfig?.tunnelUrl ? (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 font-bold text-xs">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    متصل بالسيرفر السحابي (Tunnel Active)
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-bold text-xs">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    متصل بالشبكة المحلية (Local Only)
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl">
                            {/* Check-in QR */}
                            <div className="flex flex-col items-center group">
                                <div className="p-6 bg-white border-8 border-green-600 rounded-[2.5rem] shadow-xl group-hover:scale-[1.02] transition-all">
                                    {qrConfig ? (
                                        <div className="bg-white p-2">
                                            <QRCodeComponent
                                                value={JSON.stringify({
                                                    action: 'punch',
                                                    type: 'IN',
                                                    ip: qrConfig.ip,
                                                    port: qrConfig.port,
                                                    branchId: qrConfig.branchId,
                                                    endpoint: `https://elator-pos.veila.shop/api.php?type=IN`
                                                })}
                                                size={220}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400 font-bold">جاري التحميل...</div>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <div className="bg-green-600 text-white px-8 py-2 rounded-2xl font-black text-lg shadow-lg shadow-green-600/20">تـسـجـيـل حـضـور 📥</div>
                                </div>
                            </div>

                            {/* Check-out QR */}
                            <div className="flex flex-col items-center group">
                                <div className="p-6 bg-white border-8 border-red-600 rounded-[2.5rem] shadow-xl group-hover:scale-[1.02] transition-all">
                                    {qrConfig ? (
                                        <div className="bg-white p-2">
                                            <QRCodeComponent
                                                value={JSON.stringify({
                                                    action: 'punch',
                                                    type: 'OUT',
                                                    ip: qrConfig.ip,
                                                    port: qrConfig.port,
                                                    branchId: qrConfig.branchId,
                                                    endpoint: `https://elator-pos.veila.shop/api.php?type=OUT`
                                                })}
                                                size={220}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400 font-bold">جاري التحميل...</div>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <div className="bg-red-600 text-white px-8 py-2 rounded-2xl font-black text-lg shadow-lg shadow-red-600/20">تـسـجـيـل انـصـراف 📤</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-slate-400 border-t border-slate-100 pt-6 w-full flex justify-around">
                            <div className="text-right">
                                <p className="font-black text-slate-700">{qrConfig?.branchId || 'الفرع الرئيسي'}</p>
                                <p className="font-bold text-xs">سيرفر النظام: {qrConfig?.ip || '0.0.0.0'}:{qrConfig?.port || '5001'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex gap-4">
                        <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                            <Printer className="w-6 h-6" /> طباعة الكود
                        </button>
                        <button onClick={onRefresh} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-slate-200 transition-all">
                            <RefreshCw className="w-6 h-6" /> تحديث البيانات
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showAdd && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-3xl font-black text-slate-800 mb-8 pr-6 border-r-8 border-brand-primary">{editingEmp ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">اسم الموظف كلاً</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" required /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">الرقم القومي / الهوية</label><input value={nationalId} onChange={e => setNationalId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">رقم الهاتف</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">الوظيفة</label><select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none"><option value="employee">موظف</option><option value="cashier">كاشير</option></select></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">الراتب الشهري</label><input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">عدد أيام العمل في الشهر</label><input type="number" value={workingDays} onChange={e => setWorkingDays(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">عدد ساعات العمل اليومية</label><input type="number" value={workHours} onChange={e => setWorkHours(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black" placeholder="مثلاً 8" /></div>

                                <div className="md:col-span-2 flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                    <div className="text-right">
                                        <span className="block text-lg font-black text-slate-800">تفعيل مواعيد الحضور والانصراف</span>
                                        <span className="text-xs text-slate-400 font-bold">تحديد وقت ثابت للحضور والانصراف اليومي</span>
                                    </div>
                                    <button
                                        onClick={() => setHasHours(!hasHours)}
                                        className={`w-14 h-7 rounded-full transition-all relative ${hasHours ? 'bg-brand-primary' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${hasHours ? 'right-8' : 'right-1'}`}></div>
                                    </button>
                                </div>

                                {hasHours && (
                                    <>
                                        <div className="space-y-2"><label className="text-sm font-black text-slate-500">وقت الحضور</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black" /></div>
                                        <div className="space-y-2"><label className="text-sm font-black text-slate-500">وقت الانصراف</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black" /></div>
                                    </>
                                )}
                                <div className="md:col-span-2 space-y-2"><label className="text-sm font-black text-slate-500">كود الموظف (للدخول للموقع)</label><input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black outline-none" placeholder="اتركه فارغاً للتوليد التلقائي" /></div>
                            </div>
                            <button onClick={handleSubmit} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-xl mt-12 shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] transition-all">حفظ البيانات 💾</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {timeModal.show && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setTimeModal({ show: false, empId: null, type: null, time: '' })} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 text-center shadow-2xl">
                            <h3 className="text-2xl font-black text-slate-800 mb-6">{timeModal.type === 'in' ? 'تأكيد الحضور' : 'تأكيد الانصراف'}</h3>
                            <input type="time" value={timeModal.time} onChange={e => setTimeModal({ ...timeModal, time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-3xl font-black text-center mb-8 outline-none focus:ring-4 focus:ring-brand-primary/20" />
                            <div className="flex gap-4">
                                <button onClick={handleLogAttendance} className={`flex-1 ${timeModal.type === 'in' ? 'bg-green-600' : 'bg-red-600'} text-white font-black py-5 rounded-2xl shadow-xl hover:scale-105 transition-all text-lg`}>تأكيد</button>
                                <button onClick={() => setTimeModal({ show: false, empId: null, type: null, time: '' })} className="flex-1 bg-slate-100 text-slate-400 font-black py-5 rounded-2xl">إلغاء</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {payoutModal.show && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPayoutModal({ ...payoutModal, show: false })} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-10 shadow-2xl text-right">
                            <h3 className="text-2xl font-black text-slate-800 mb-4 border-r-8 border-brand-primary pr-6">صرف راتب: {payoutModal.emp?.name}</h3>

                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl mb-6 flex justify-between items-center">
                                <div className="text-xs font-black text-blue-600 uppercase">ساعات العمل الإضافية</div>
                                <div className="text-xl font-black text-blue-700">{payoutModal.extraHours || 0} <span className="text-[10px] opacity-60">ساعة</span></div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2"><label className="text-sm font-black text-slate-500">مكافأة (+)</label><input type="number" value={payoutModal.bonus} onChange={e => setPayoutModal({ ...payoutModal, bonus: e.target.value })} className="w-full bg-green-50 border border-green-100 p-5 rounded-2xl font-black text-green-700 text-xl outline-none" placeholder="0" /></div>
                                <div className="space-y-2"><label className="text-sm font-black text-red-600">خصم (-)</label><input type="number" value={payoutModal.deduction} onChange={e => setPayoutModal({ ...payoutModal, deduction: e.target.value })} className="w-full bg-red-50 border border-red-100 p-5 rounded-2xl font-black text-red-700 text-xl outline-none" placeholder="0" /></div>
                                <div className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-3xl text-center shadow-inner">
                                    {(payoutModal.emp?.salary + (parseFloat(payoutModal.bonus) || 0) - (parseFloat(payoutModal.deduction) || 0)).toFixed(2)} <span className="text-sm opacity-50">ج.م</span>
                                </div>
                                <button onClick={handlePayout} className="w-full py-6 bg-brand-primary text-white rounded-2xl font-black text-xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all">تأكيد الصرف 💸</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
