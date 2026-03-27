import React, { useState, useEffect, useRef } from 'react'
import { PlusCircle, Search, Trash2, FlaskConical, ClipboardList, Plus, Edit3, X, Beaker, Printer, Barcode } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { BarcodeSticker } from './BarcodeSticker'

export function FormulasManager({ products, formulas, onRefresh, notify, ask, settings }) {
    const [subTab, setSubTab] = useState('create') // 'create' or 'list'
    const [editingFormula, setEditingFormula] = useState(null)

    const handleEdit = (formula) => {
        setEditingFormula(formula)
        setSubTab('create')
    }

    const handleCancelEdit = () => {
        setEditingFormula(null)
    }

    return (
        <div className="space-y-6 text-right">
            {/* Sub-navigation Tabs */}
            <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit mx-auto md:mr-0">
                <button
                    onClick={() => {
                        setSubTab('create')
                        setEditingFormula(null)
                    }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${subTab === 'create' && !editingFormula
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                        : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <PlusCircle className="w-5 h-5" />
                    تصميم تركيبة جديدة
                </button>
                <button
                    onClick={() => {
                        setSubTab('list')
                        setEditingFormula(null)
                    }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${subTab === 'list'
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                        : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <ClipboardList className="w-5 h-5" />
                    سجل التركيبات المحفوظة
                </button>
                {editingFormula && (
                    <button
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    >
                        <Edit3 className="w-5 h-5" />
                        تعديل: {editingFormula.name}
                    </button>
                )}
            </div>

            <div className="pt-2">
                {subTab === 'create' ? (
                    <FormulaCreator
                        products={products}
                        onRefresh={onRefresh}
                        notify={notify}
                        editingFormula={editingFormula}
                        onCancelEdit={handleCancelEdit}
                        settings={settings}
                    />
                ) : (
                    <FormulasList
                        formulas={formulas}
                        onRefresh={onRefresh}
                        notify={notify}
                        ask={ask}
                        onEdit={handleEdit}
                        settings={settings}
                    />
                )}
            </div>
        </div>
    )
}

function FormulaCreator({ products, onRefresh, notify, editingFormula, onCancelEdit, settings }) {
    const [formulaName, setFormulaName] = useState('')
    const [formulaBarcode, setFormulaBarcode] = useState('')
    const [formulaPrice, setFormulaPrice] = useState('')
    const [formulaItems, setFormulaItems] = useState([]) // { product, qty }
    const [formSearch, setFormSearch] = useState('')

    // Initialize if editing
    useEffect(() => {
        if (editingFormula) {
            setFormulaName(editingFormula.name)
            setFormulaBarcode(editingFormula.barcode || '')
            setFormulaPrice(editingFormula.total_price.toString())
            // Map items back to products
            const mappedItems = editingFormula.items.map(item => {
                const product = products.find(p => p.id === item.product_id)
                return {
                    product: product || { id: item.product_id, name: item.product_name || item.custom_name, category: item.product_id ? 'oil' : 'custom' },
                    qty: item.quantity.toString()
                }
            })
            setFormulaItems(mappedItems)
        } else {
            setFormulaName('')
            setFormulaBarcode('')
            setFormulaPrice('')
            setFormulaItems([])
        }
    }, [editingFormula, products])

    const handleSaveFormula = async () => {
        if (!formulaName || !formulaPrice || formulaItems.length === 0) {
            return notify('يرجى إكمال بيانات التركيبة وتحديد السعر والمكونات', 'error')
        }
        try {
            const payload = {
                name: formulaName,
                barcode: formulaBarcode || '622' + Math.floor(100000000 + Math.random() * 900000000).toString(), // 622 + 9 digits
                total_price: parseFloat(formulaPrice),
                items: formulaItems.map(i => ({
                    product_id: i.product.id,
                    quantity: parseFloat(i.qty) || 0
                }))
            }

            let res;
            if (editingFormula) {
                res = await window.api.invoke('formulas:update', {
                    ...payload,
                    id: editingFormula.id,
                    oldName: editingFormula.name
                })
            } else {
                res = await window.api.invoke('formulas:add', payload)
            }

            if (res.success) {
                notify(editingFormula ? 'تم تحديث التركيبة بنجاح ✅' : 'تم حفظ التركيبة بنجاح ✅', 'success')
                if (!editingFormula) {
                    setFormulaName('')
                    setFormulaBarcode('')
                    setFormulaPrice('')
                    setFormulaItems([])
                }
                onRefresh()
                if (editingFormula && onCancelEdit) onCancelEdit()
            } else {
                notify('فشل العملية: ' + res.message, 'error')
            }
        } catch (err) {
            notify('خطأ تقني: ' + err.message, 'error')
        }
    }

    const generateBarcode = () => {
        const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
        setFormulaBarcode('622' + randomPart);
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-right pb-20">
            <div className="bg-white border-2 border-brand-primary/20 rounded-[3rem] p-8 shadow-2xl space-y-8 relative overflow-hidden">
                {editingFormula && (
                    <div className="absolute top-0 right-0 left-0 h-2 bg-orange-500" />
                )}

                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${editingFormula ? 'bg-orange-100 text-orange-600' : 'bg-brand-primary/10 text-brand-primary'} rounded-2xl flex items-center justify-center`}>
                            {editingFormula ? <Edit3 className="w-6 h-6" /> : <FlaskConical className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {editingFormula ? 'تعديل التركيبة الحالية' : 'مصمم التركيبات الذكي'}
                            </h3>
                            <p className="text-slate-400 font-bold text-sm">
                                {editingFormula ? 'قم بتعديل المكونات أو السعر لهذه التركيبة' : 'حدد الزيوت والزجاجة المناسبة لإنشاء منتج جديد'}
                            </p>
                        </div>
                    </div>
                    {editingFormula && (
                        <button
                            onClick={onCancelEdit}
                            className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Component Selector */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-black text-slate-500 pr-2">أضف مكونات للتركيبة (زيوت أو زجاجة واحدة فقط)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formSearch}
                                    onChange={(e) => setFormSearch(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-12 py-4 font-bold outline-none focus:border-brand-primary transition-all text-right"
                                    placeholder="ابحث عن المكونات بالاسم..."
                                />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[2rem] p-4 h-[400px] overflow-y-auto border border-slate-100 custom-scrollbar">
                            {products
                                .filter(p => !formSearch || p.name.includes(formSearch))
                                .map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            if (formulaItems.some(i => i.product.id === p.id)) {
                                                return notify('هذا المكون مضاف بالفعل', 'warning');
                                            }
                                            // Restriction: Max 1 bottle
                                            if (p.category === 'bottle' && formulaItems.some(i => i.product.category === 'bottle')) {
                                                return notify('لا يمكن إضافة أكثر من زجاجة واحدة للتركيبة', 'error');
                                            }
                                            const defaultQty = p.category === 'bottle' ? '1' : '';
                                            setFormulaItems([...formulaItems, { product: p, qty: defaultQty }]);
                                        }}
                                        className="w-full text-right p-4 border-b border-white hover:bg-white hover:rounded-2xl transition-all flex justify-between items-center group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <PlusCircle className="w-5 h-5 text-brand-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                                            <span className="font-bold text-slate-700">{p.name}</span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${p.category === 'oil' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                                            {p.category === 'oil' ? 'زيت خام' : p.category === 'bottle' ? 'زجاجة' : 'منتج'}
                                        </span>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Form and Items */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-500 pr-2">اسم التركيبة</label>
                                <input
                                    value={formulaName}
                                    onChange={(e) => setFormulaName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-brand-primary text-right"
                                    placeholder="مثلاً: خلطة الصيف بريميوم"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-500 pr-2">باركود مخصص (اختياري)</label>
                                <div className="relative">
                                    <input
                                        value={formulaBarcode}
                                        onChange={(e) => setFormulaBarcode(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-brand-primary text-right pl-12"
                                        placeholder="مثلاً: 123456"
                                    />
                                    <button
                                        onClick={generateBarcode}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all"
                                        title="توليد باركود تلقائي"
                                    >
                                        <Barcode className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-500 pr-2">سعر البيع النهائي</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formulaPrice}
                                        onChange={(e) => setFormulaPrice(e.target.value)}
                                        className={`w-full ${editingFormula ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary'} border rounded-2xl p-4 font-black text-2xl outline-none text-right`}
                                        placeholder="0.00"
                                    />
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black ${editingFormula ? 'text-orange-600' : 'text-brand-primary'}`}>ج.م</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest">المكونات المختارة:</label>
                                <span className="text-[10px] font-bold text-slate-400">({formulaItems.length} مكونات)</span>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                {formulaItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-700">{item.product.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{item.product.category === 'oil' ? 'زيت عطري' : 'زجاجة'}</p>
                                        </div>
                                        <div className="w-32 relative">
                                            <input
                                                type="number"
                                                value={item.qty}
                                                disabled={item.product.category === 'bottle'}
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (item.product.category === 'bottle' && parseFloat(val) > 1) {
                                                        val = '1';
                                                    }
                                                    const newItems = [...formulaItems];
                                                    newItems[idx].qty = val;
                                                    setFormulaItems(newItems);
                                                }}
                                                placeholder="الكمية"
                                                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 pl-10 text-center font-black text-lg outline-none"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">
                                                {item.product.category === 'oil' ? 'جم' : 'ق'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setFormulaItems(formulaItems.filter((_, i) => i !== idx))}
                                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {formulaItems.length === 0 && (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <Plus className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-300 font-bold">ابدأ بإضافة الزيوت من القائمة الجانبية</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveFormula}
                            disabled={!formulaName || !formulaPrice || formulaItems.length === 0}
                            className={`w-full ${editingFormula ? 'bg-orange-500 shadow-orange-500/20' : 'bg-brand-primary shadow-brand-primary/20'} text-white py-5 rounded-[2.5rem] font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100`}
                        >
                            {editingFormula ? 'تحديث بيانات التركيبة ✅' : 'حفظ التركيبة وجعلها متاحة للبيع ✅'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FormulasList({ formulas, onRefresh, notify, ask, onEdit, settings }) {
    const [printingFormula, setPrintingFormula] = useState(null)
    const [stickerCount, setStickerCount] = useState(1)
    const [showBarcodePreview, setShowBarcodePreview] = useState(false)
    const stickerRef = useRef()

    const handleNativePrint = async () => {
        if (!stickerRef.current) return;

        const useCustom = settings?.use_custom_sticker_size === 'true';
        const wMm = useCustom && settings?.custom_sticker_width
            ? parseFloat(settings.custom_sticker_width)
            : 58;
        const hMm = useCustom && settings?.custom_sticker_height
            ? parseFloat(settings.custom_sticker_height)
            : 16;

        const pageSize = { width: Math.round(wMm * 1000), height: Math.round(hMm * 1000) };
        const stickerHtml = stickerRef.current.outerHTML;
        const fullHtml = `<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${wMm}mm; height: ${hMm}mm; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; }
  @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
</style></head>
<body>${stickerHtml}</body></html>`;

        try {
            const count = parseInt(stickerCount) || 1;
            for (let i = 0; i < count; i++) {
                await window.api.invoke('print:silent', { html: fullHtml, printer: settings?.default_printer, pageSize });
            }
        } catch (err) {
            console.error('[NativePrint] Error:', err);
        }
    };

    const handleDelete = (id) => {
        ask('حذف تركيبة', 'هل أنت متأكد من حذف هذه التركيبة؟', async () => {
            const res = await window.api.deleteFormula(id)
            if (res.success) {
                notify('تم حذف التركيبة بنجاح', 'success')
                onRefresh()
            } else {
                notify('حدث خطأ أثناء الحذف', 'error')
            }
        })
    }

    return (
        <div className="space-y-6 text-right pb-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary">
                        <ClipboardList className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">قائمة التركيبات المحفوظة</h3>
                        <p className="text-slate-400 font-bold text-sm">جميع الخلطات التي قمت بإنشائها مسبقاً</p>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 font-bold text-slate-500">
                    إجمالي التركيبات: {formulas.length}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <th className="p-6 font-black text-xs uppercase tracking-widest">اسم التركيبة</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest">المكونات</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest">السعر النهائي</th>
                                <th className="p-6 font-black text-xs uppercase tracking-widest text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {formulas.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                                                <Beaker className="w-5 h-5" />
                                            </div>
                                            <span className="font-black text-slate-700 text-lg">{f.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-wrap gap-2">
                                            {f.items?.map((item, idx) => (
                                                <span key={idx} className="bg-white border border-slate-100 px-3 py-1 rounded-full text-[11px] font-bold text-slate-500 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/40"></span>
                                                    {item.product_name || item.custom_name}
                                                    <span className="text-brand-primary font-black">({item.quantity} {item.product_id ? 'جم' : 'ق'})</span>
                                                </span>
                                            ))}
                                            {(!f.items || f.items.length === 0) && (
                                                <span className="text-xs text-slate-300 italic">لا توجد تفاصيل</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="inline-flex items-center gap-1 bg-brand-primary/5 text-brand-primary px-4 py-2 rounded-xl font-black text-lg">
                                            {f.total_price}
                                            <span className="text-[10px]">ج.م</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setPrintingFormula(f)
                                                    setStickerCount(1)
                                                    setShowBarcodePreview(true)
                                                }}
                                                className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-95"
                                                title="طباعة باركود التركيبة"
                                            >
                                                <Printer className="w-5 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(f)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => handleDelete(f.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {formulas.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <FlaskConical className="w-16 h-16 text-slate-100" />
                                            <p className="text-slate-400 font-bold text-xl">لا توجد تركيبات محفوظة حالياً</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Barcode Sticker for Printing */}
            <div
                style={{
                    position: 'fixed',
                    top: '-1000px',
                    left: '-1000px',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -9999
                }}
            >
                {printingFormula && (
                    <BarcodeSticker
                        ref={stickerRef}
                        product={{
                            ...printingFormula,
                            barcode: printingFormula.barcode || printingFormula.id.toString()
                        }}
                        settings={settings}
                    />
                )}
            </div>

            {/* Barcode Preview Modal */}
            <AnimatePresence>
                {showBarcodePreview && printingFormula && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm relative z-10 border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800">معاينة استيكر التركيبة</h3>
                                <button onClick={() => setShowBarcodePreview(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl flex flex-col items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                                <div style={{ transform: 'scale(1.1)', transformOrigin: 'center' }} className="mb-4">
                                    <BarcodeSticker
                                        product={{
                                            ...printingFormula,
                                            barcode: printingFormula.barcode || printingFormula.id.toString()
                                        }}
                                        settings={settings}
                                    />
                                </div>
                                <div className="w-full flex items-center justify-between gap-4 mt-2">
                                    <label className="text-sm font-bold text-slate-500">عدد الملصقات:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={stickerCount}
                                        onChange={(e) => setStickerCount(parseInt(e.target.value) || 1)}
                                        className="w-20 bg-white border-2 border-slate-200 rounded-xl py-2 px-3 text-center font-bold outline-none focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleNativePrint()}
                                    className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    طباعة الآن (مباشر بدون Edge)
                                </button>
                                <button
                                    onClick={() => setShowBarcodePreview(false)}
                                    className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold text-center mt-6">
                                سيتم استخدام كود المنتج أو الرقم المخصص كباركود.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
