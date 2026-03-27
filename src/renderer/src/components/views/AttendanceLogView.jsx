import React, { useState, useEffect } from 'react'
import { Calendar, Search, RefreshCw } from 'lucide-react'

export function AttendanceLogView({ notify }) {
    const [logs, setLogs] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

    const loadLogs = async () => {
        try {
            const res = await window.api.getAttendanceAll()
            setLogs(res || [])
        } catch (err) { console.error('Failed to load logs:', err) }
    }

    useEffect(() => {
        loadLogs()
        // Listen for global data updates (e.g. from cloud or mobile)
        const cleanup = window.api.onSalesUpdated ? window.api.onSalesUpdated(() => {
            loadLogs()
        }) : null
        return () => cleanup && cleanup()
    }, [])

    // Calculate actual working hours
    const calculateHours = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0

        const [inHour, inMin] = checkIn.split(':').map(Number)
        const [outHour, outMin] = checkOut.split(':').map(Number)

        const inMinutes = inHour * 60 + inMin
        const outMinutes = outHour * 60 + outMin

        let actualMinutes = outMinutes - inMinutes
        if (actualMinutes < 0) actualMinutes += 24 * 60 // Handle night shifts

        return actualMinutes / 60
    }

    const filteredLogs = logs.filter(log => {
        const name = log.employee_name || 'موظف مجهول'
        const matchesName = name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesDate = !dateFilter || log.date === dateFilter
        return matchesName && matchesDate
    })

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
                    <h3 className="text-2xl font-black text-slate-800">سجل حضور وانصراف الموظفين</h3>
                    <div className="flex flex-wrap gap-4">
                        <div className="relative">
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold pr-10 outline-none" />
                            <Calendar className="w-4 h-4 absolute left-3 top-4 text-slate-400" />
                        </div>
                        <div className="relative flex-1 min-w-[200px]">
                            <input type="text" placeholder="بحث باسم الموظف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold pr-10 outline-none" />
                            <Search className="w-4 h-4 absolute left-3 top-4 text-slate-400" />
                        </div>
                        <button onClick={loadLogs} className="bg-slate-100 p-3 rounded-2xl text-slate-600 hover:bg-brand-primary hover:text-white transition-all shadow-sm"><RefreshCw className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 font-black text-slate-500">الموظف</th>
                                <th className="p-4 font-black text-slate-500 text-center">التاريخ</th>
                                <th className="p-4 font-black text-slate-500 text-center text-green-600">وقت الحضور</th>
                                <th className="p-4 font-black text-slate-500 text-center text-red-600">وقت الانصراف</th>
                                <th className="p-4 font-black text-slate-500 text-center text-blue-600">الوقت الفعلي</th>
                                <th className="p-4 font-black text-slate-500 text-center text-purple-600">الوقت الإضافي</th>
                                <th className="p-4 font-black text-slate-500 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => {
                                const actualHours = calculateHours(log.check_in, log.check_out)
                                const expectedHours = log.work_hours || 8
                                const overtime = Math.max(0, actualHours - expectedHours)

                                return (
                                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{log.employee_name || '---'}</td>
                                        <td className="p-4 text-center text-slate-500 font-bold">{log.date}</td>
                                        <td className="p-4 text-center text-green-600 font-black">{log.check_in || '--:--'}</td>
                                        <td className="p-4 text-center text-red-600 font-black">{log.check_out || '--:--'}</td>
                                        <td className="p-4 text-center text-blue-600 font-black">
                                            {log.check_out ? `${actualHours.toFixed(2)} ساعة` : '--'}
                                        </td>
                                        <td className="p-4 text-center font-black">
                                            {log.check_out ? (
                                                overtime > 0 ? (
                                                    <span className="text-purple-600">+{overtime.toFixed(2)} ساعة</span>
                                                ) : (
                                                    <span className="text-slate-400">--</span>
                                                )
                                            ) : '--'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.check_out ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600'}`}>
                                                {log.check_out ? 'مكتمل' : 'دوام مفتوح'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
