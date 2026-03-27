import React from 'react'
import { AlertCircle, Plus } from 'lucide-react'

export function ShortagesView({ products, onRefresh, notify }) {
    const shortages = products
        .filter(p => !p.category || p.category !== 'formula')
        .filter(p => p.stock_quantity <= (p.min_stock || 0))
        .sort((a, b) => a.stock_quantity - b.stock_quantity)

    const handleUpdateStock = async (product, amount) => {
        const val = parseFloat(amount)
        if (isNaN(val) || val === 0) return
        const res = await window.api.updateProductStock({ id: product.id, quantity: val, isOil: product.category === 'oil' })
        if (res.success) { notify('تم تحديث المخزون بنجاح', 'success'); onRefresh(); }
    }

    return (
        <div className="space-y-6 text-right">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 font-black text-slate-500 text-sm">المنتج</th>
                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الكمية الحالية</th>
                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الحد الأدنى</th>
                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">الحالة</th>
                            <th className="px-6 py-4 font-black text-slate-500 text-sm text-center">تحديث سريع</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {shortages.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-900">{p.name}</td>
                                <td className="px-6 py-4 text-center"><span className={`text-lg font-black ${p.stock_quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.stock_quantity}</span></td>
                                <td className="px-6 py-4 text-center text-slate-400">{p.min_stock || 0}</td>
                                <td className="px-6 py-4 text-center">
                                    {p.stock_quantity === 0 ? <span className="flex items-center justify-center gap-1.5 text-red-600 text-xs"><AlertCircle className="w-4 h-4" />نفد</span> :
                                        <span className="flex items-center justify-center gap-1.5 text-orange-500 text-xs"><AlertCircle className="w-4 h-4" />منخفض</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 justify-center">
                                        <input type="number" placeholder="أضف..." className="w-20 bg-slate-100 border-none rounded-lg p-2 text-center text-sm outline-none font-bold" onKeyDown={e => { if (e.key === 'Enter') { handleUpdateStock(p, e.target.value); e.target.value = ''; } }} />
                                        <button onClick={(e) => { const input = e.currentTarget.previousSibling; handleUpdateStock(p, input.value); input.value = ''; }} className="p-2 bg-brand-primary text-white rounded-lg hover:bg-black transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {shortages.length === 0 && <tr><td colSpan="5" className="p-16 text-center text-slate-300 font-bold italic">لا توجد نواقص في المخزون 🎉</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
