import React, { useState, useEffect } from 'react'
import {
    Plus,
    Search,
    Package,
    Edit,
    Trash2,
    RotateCcw,
    XCircle,
    X,
    Barcode,
    Printer,
    Globe,
    Link as LinkIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { BarcodeSticker } from '../BarcodeSticker'

import { useRef } from 'react'

const cleanNum = (val) => {
    if (!val) return 0;
    let s = String(val).trim();
    const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    arabicNumbers.forEach((r, i) => { s = s.replace(r, i); });
    return parseFloat(s) || 0;
}

export function ProductsView({ products, onRefresh, notify, ask, user, settings }) {
    // Permission Helper
    const can = (permission) => {
        if (!user) return false;
        // Super admin and regular admin have full access
        if (user.role === 'super_admin' || user.role === 'admin') return true;
        try {
            const perms = JSON.parse(user.permissions || '[]');
            return perms.includes(permission);
        } catch (e) {
            return false;
        }
    }
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [pricePerMl, setPricePerMl] = useState('')
    const [pricePerGram, setPricePerGram] = useState('')
    const [wholesalePrice, setWholesalePrice] = useState('')
    const [wholesalePricePerMl, setWholesalePricePerMl] = useState('')
    const [wholesalePricePerGram, setWholesalePricePerGram] = useState('')
    const [totalGram, setTotalGram] = useState('')
    const [totalMl, setTotalMl] = useState('')
    const [stockQuantity, setStockQuantity] = useState('')
    const [minStock, setMinStock] = useState('')
    const [category, setCategory] = useState('oil')
    const [sellUnit, setSellUnit] = useState('gram') // Force gram for oils by default
    const [editingProduct, setEditingProduct] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [barcode, setBarcode] = useState('')
    const [isLookingUp, setIsLookingUp] = useState(false)
    const [printingProduct, setPrintingProduct] = useState(null)
    const [stickerCount, setStickerCount] = useState(1)
    const [showBarcodePreview, setShowBarcodePreview] = useState(false)
    const [isWebsiteVisible, setIsWebsiteVisible] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const stickerRef = useRef()
    const [isPrintingSelection, setIsPrintingSelection] = useState(false)
 
    const handlePrintWithSelection = useReactToPrint({
        contentRef: stickerRef,
        onAfterPrint: () => {
            notify('تمت الطباعة بنجاح', 'success')
            setIsPrintingSelection(false)
        },
        onPrintError: (error) => {
            console.error('[PrintSelection] Error:', error)
            notify('خطأ في الطباعة', 'error')
            setIsPrintingSelection(false)
        }
    })

    const handleNativePrint = async () => {
        if (!stickerRef.current) return;

        // Determine page size: use custom settings if enabled, otherwise use measured values
        const useCustom = settings?.use_custom_sticker_size === 'true';
        const wMm = useCustom && settings?.custom_sticker_width
            ? parseFloat(settings.custom_sticker_width)
            : 58;
        const hMm = useCustom && settings?.custom_sticker_height
            ? parseFloat(settings.custom_sticker_height)
            : 16;

        // Electron expects microns (1mm = 1000 microns)
        const pageSize = { width: Math.round(wMm * 1000), height: Math.round(hMm * 1000) };

        // Serialize the rendered sticker DOM to HTML with embedded styles
        const stickerHtml = stickerRef.current.outerHTML;
        const fullHtml = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${wMm}mm;
    height: ${hMm}mm;
    overflow: hidden;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
  @font-face { font-family: 'Cairo'; }
</style>
</head>
<body>${stickerHtml}</body>
</html>`;

        try {
            const printer = settings?.default_printer;
            const count = parseInt(stickerCount) || 1;
            for (let i = 0; i < count; i++) {
                await window.api.invoke('print:silent', { html: fullHtml, printer, pageSize });
            }
        } catch (err) {
            console.error('[NativePrint] Error:', err);
        }
    };


    const showBarcode = settings?.show_barcode_field === '1'
    const pricingMode = settings?.pricing_mode || 'both' // 'both', 'wholesale', 'retail'
    const globalUnit = settings?.global_unit || 'gram'

    // Update sellUnit when global setting changes (for new products)
    useEffect(() => {
        if (!editingProduct) {
            setSellUnit('gram')
        }
    }, [editingProduct])



    const handleAdd = async (e) => {
        e.preventDefault()
        try {
            const isGram = sellUnit === 'gram'
            const isMl = sellUnit === 'ml'
            const res = await window.api.addProduct({
                name,
                category,
                sell_unit: sellUnit,
                price: isGram || isMl ? 0 : cleanNum(price),
                price_per_ml: isMl ? cleanNum(pricePerMl) : 0,
                price_per_gram: isGram ? cleanNum(pricePerGram) : 0,
                wholesale_price: isGram || isMl ? 0 : cleanNum(wholesalePrice),
                wholesale_price_per_ml: isMl ? cleanNum(wholesalePricePerMl) : 0,
                wholesale_price_per_gram: isGram ? cleanNum(wholesalePricePerGram) : 0,
                stock_quantity: isGram ? cleanNum(totalGram) : isMl ? cleanNum(totalMl) : cleanNum(stockQuantity),
                total_ml: isMl ? cleanNum(totalMl) : 0,
                total_gram: isGram ? cleanNum(totalGram) : 0,
                min_stock: parseInt(cleanNum(minStock)) || 10,
                barcode,
                is_website_visible: isWebsiteVisible ? 1 : 0,
                image_url: imageUrl || null
            })

            if (res && res.success) {
                notify('تم إضافة المنتج بنجاح', 'success')
                setName(''); setPrice(''); setPricePerMl(''); setPricePerGram('')
                setWholesalePrice(''); setWholesalePricePerMl(''); setWholesalePricePerGram('')
                setStockQuantity(''); setTotalGram(''); setTotalMl(''); setMinStock(''); setBarcode('')
                setIsWebsiteVisible(false); setImageUrl('')
                onRefresh()
            } else {
                notify('فشل إضافة المنتج: ' + (res?.message || 'خطأ'), 'error')
            }
        } catch (err) {
            notify('خطأ تقني: ' + err.message, 'error')
        }
    }

    const handleUpdateStock = async (id, currentQty, amount, isAbsolute = false) => {
        try {
            const product = products.find(p => p.id === id);
            if (!product) {
                console.error('[ProductsView] Product not found for id:', id);
                return;
            }

            let diff = 0;
            if (isAbsolute) {
                const newVal = parseFloat(amount);
                if (isNaN(newVal)) {
                    notify('يرجى إدخل رقم صحيح', 'error');
                    return;
                }
                diff = newVal - parseFloat(currentQty);
            } else {
                diff = parseFloat(amount);
            }

            if (diff === 0 && isAbsolute) {
                return; // Nothing to change
            }

            console.log(`[ProductsView] Updating stock: ID=${id}, current=${currentQty}, amount=${amount}, diff=${diff}`);

            const result = await window.api.updateProductStock({
                id,
                quantity: diff,
                isOil: product.category === 'oil'
            });

            if (result && result.success) {
                onRefresh();
                if (isAbsolute) notify('تم تحديث المخزون بنجاح', 'success');
            } else {
                const errorMsg = result?.message || 'فشل التحديث من الخادم';
                notify(errorMsg, 'error');
                console.error('[ProductsView] IPC Error:', errorMsg);
            }
        } catch (err) {
            console.error('[ProductsView] Exception in handleUpdateStock:', err);
            notify('حدث خطأ تقني: ' + err.message, 'error');
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const res = await window.api.updateProduct(editingProduct);
            if (res.success) {
                notify('تم تحديث المنتج بنجاح', 'success');
                setEditingProduct(null);
                onRefresh();
            } else {
                notify('فشل التحديث: ' + res.message, 'error');
            }
        } catch (err) {
            notify('حدث خطأ: ' + err.message, 'error');
        }
    };

    const generateBarcode = () => {
        const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
        setBarcode('622' + randomPart);
    }

    const handleDelete = async (id) => {
        ask('حذف منتج', 'هل أنت متأكد من حذف هذا المنتج؟', async () => {
            await window.api.deleteProduct(id)
            notify('تم حذف المنتج بنجاح', 'success')
            onRefresh()
        })
    }

    const handleBarcodeLookup = async (code) => {
        if (!code || code.length < 3) return
        try {
            const product = await window.api.findProductByBarcode(code)
            if (product) {
                notify('تم العثور على منتج مسجل بهذا الباركود، تم ملء البيانات للتعديل', 'info')
                setName(product.name)
                setCategory(product.category)
                if (product.category === 'oil') {
                    setPricePerGram(product.price_per_gram?.toString() || '')
                    setWholesalePricePerGram(product.wholesale_price_per_gram?.toString() || '')
                    setTotalGram(product.total_gram?.toString() || product.stock_quantity?.toString() || '')
                } else {
                    setPrice(product.price?.toString() || '')
                    setWholesalePrice(product.wholesale_price?.toString() || '')
                }
                setStockQuantity(product.stock_quantity?.toString() || '')
                setMinStock(product.min_stock?.toString() || '')
            } else {
                // NEW BARCODE Scanned -> Try Remote Lookup
                notify('باركود جديد، جاري البحث عن بيانات المنتج...', 'info')
                setIsLookingUp(true)
                const remoteRes = await window.api.invoke('products:lookup-remote-barcode', code)
                setIsLookingUp(false)

                if (remoteRes && remoteRes.success && remoteRes.data) {
                    const data = remoteRes.data
                    notify(`تم العثory على البيانات سحابياً: ${data.name}`, 'success')
                    setName(data.name)
                    setCategory(data.category || 'product')
                    setPrice('')
                    setPricePerMl('')
                    setWholesalePrice('')
                    setWholesalePricePerMl('')
                    setStockQuantity('')
                    setMinStock('')
                } else {
                    // NEW BARCODE Scanned -> Rapid Workflow
                    // If fields were already filled (maybe from a previous scan), clear them
                    if (name || price || pricePerMl || stockQuantity !== '') {
                        notify('باركود جديد! يمكنك الآن إدخال بيانات هذا المنتج', 'success')
                        setName('')
                        setCategory('product')
                        setPrice('')
                        setPricePerMl('')
                        setWholesalePrice('')
                        setWholesalePricePerMl('')
                        setStockQuantity('')
                        setMinStock('')
                        setEditingProduct(null)
                    }
                }
            }
        } catch (err) {
            console.error('Barcode lookup error:', err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800">إدارة المنتجات</h2>
                        <p className="text-sm font-bold text-slate-500">أضف وعدل منتجات المحل</p>
                    </div>
                </div>


            </div>

            <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-6 gap-4 items-end shadow-sm">
                <div className="md:col-span-1.5 space-y-2">
                    <label className="text-sm font-bold text-slate-500 mr-1">اسم المنتج</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                        placeholder="مثال: زيت الصندل"
                        required
                    />
                </div>
                {showBarcode && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 block text-right">الباركود (اختياري)</label>
                        <div className="relative group">
                            <input
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        await handleBarcodeLookup(e.target.value)
                                    }
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pr-4 pl-12 outline-none focus:border-brand-primary transition-all font-mono font-bold group-hover:bg-white"
                                placeholder={isLookingUp ? "جاري البحث..." : "امسح أو اكتب الباركود..."}
                                disabled={isLookingUp}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {isLookingUp && (
                                    <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                )}
                                {!isLookingUp && barcode && (
                                    <button
                                        type="button"
                                        onClick={() => setBarcode('')}
                                        className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                        title="مسح الباركود"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
                                        setBarcode('622' + randomPart);
                                    }}
                                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary/20 transition-all active:scale-95"
                                    title="توليد باركود"
                                >
                                    <Barcode className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Category */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 mr-1">تصنيف المنتج</label>
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value)
                            if (e.target.value === 'oil') setSellUnit('gram')
                            else setSellUnit('piece')
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold appearance-none cursor-pointer"
                    >
                        <option value="oil">زيت</option>
                        <option value="bottle">زجاجة</option>
                        <option value="product">منتج</option>
                    </select>
                </div>

                {/* Sell Unit (Only for Oils) */}
                {category === 'oil' && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 mr-1">وحدة بيع الزيت</label>
                        <select
                            value={sellUnit}
                            onChange={(e) => setSellUnit(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-brand-primary/20 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold appearance-none cursor-pointer text-brand-primary"
                        >
                            <option value="gram">بالجرام</option>
                        </select>
                    </div>
                )}

                {/* Retail Price */}
                {(pricingMode === 'both' || pricingMode === 'retail') && (
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-1 uppercase">
                            {sellUnit === 'gram' ? 'سعر الجرام (قطاعي)' : sellUnit === 'ml' ? 'سعر الكمية (قطاعي)' : 'السعر (قطاعي)'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={sellUnit === 'ml' ? pricePerMl : sellUnit === 'gram' ? pricePerGram : price}
                            onChange={(e) => sellUnit === 'ml' ? setPricePerMl(e.target.value) : sellUnit === 'gram' ? setPricePerGram(e.target.value) : setPrice(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-right text-green-600"
                            placeholder={sellUnit === 'gram' ? 'سعر الجرام' : 'السعر'}
                            required
                        />
                    </div>
                )}

                {/* Wholesale Price */}
                {(pricingMode === 'both' || pricingMode === 'wholesale') && (
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-1 uppercase">
                            {sellUnit === 'gram' ? 'سعر الجرام (جملة)' : sellUnit === 'ml' ? 'سعر الكمية (جملة)' : 'السعر (جملة)'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={sellUnit === 'ml' ? wholesalePricePerMl : sellUnit === 'gram' ? wholesalePricePerGram : wholesalePrice}
                            onChange={(e) => sellUnit === 'ml' ? setWholesalePricePerMl(e.target.value) : sellUnit === 'gram' ? setWholesalePricePerGram(e.target.value) : setWholesalePrice(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-right text-blue-600"
                            placeholder={sellUnit === 'gram' ? 'سعر الجرام جملة' : 'سعر الجملة'}
                        />
                    </div>
                )}

                {/* Stock */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 mr-1">
                        {sellUnit === 'ml' ? 'الكمية' : sellUnit === 'gram' ? 'الكمية (جرام)' : 'الكمية'}
                    </label>
                    <input
                        type="number"
                        step={sellUnit === 'piece' ? '1' : '0.01'}
                        value={sellUnit === 'gram' ? totalGram : sellUnit === 'ml' ? totalMl : stockQuantity}
                        onChange={(e) => sellUnit === 'gram' ? setTotalGram(e.target.value) : sellUnit === 'ml' ? setTotalMl(e.target.value) : setStockQuantity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400 font-bold"
                        placeholder="0"
                        required
                    />
                </div>
                


                <button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2 rounded-xl h-11 flex items-center justify-center gap-2 font-bold transition-all shadow-md shadow-brand-primary/10">
                    <Plus className="w-5 h-5" />
                    إضافة منتج
                </button>
            </form>

            {/* Search Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث عن منتج بالاسم أو الفئة..."
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-12 font-bold outline-none focus:border-brand-primary transition-all text-right"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-2 text-sm font-bold text-slate-500 mr-1 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>إجمالي الأصناف: {products.length}</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">#</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">الاسم</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">التصنيف</th>
                            {(pricingMode === 'both' || pricingMode === 'retail') && (
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">سعر القطاعي</th>
                            )}
                            {(pricingMode === 'both' || pricingMode === 'wholesale') && (
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">سعر الجملة</th>
                            )}
                            {showBarcode && (
                                <th className="px-6 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">الباركود</th>
                            )}
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">المخزون</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">التحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {products
                            .filter(p => {
                                if (!searchQuery.trim()) return true
                                const query = searchQuery.toLowerCase()
                                return p.name.toLowerCase().includes(query) ||
                                    (p.category === 'oil' && ('زيت'.includes(query) || 'oil'.includes(query))) ||
                                    (p.category === 'bottle' && ('زجاجة'.includes(query) || 'bottle'.includes(query))) ||
                                    (p.category === 'product' && ('منتج'.includes(query) || 'product'.includes(query))) ||
                                    (p.barcode && p.barcode.toString().includes(query))
                            })
                            .map((p, index) => {
                                const isOil = p.category === 'oil' || p.category === 'زيت';
                                const isGram = isOil ? true : (p.sell_unit === 'gram');
                                const isMl = !isOil && p.sell_unit === 'ml';
                                // Fallback: If unit-specific stock is 0 but stock_quantity has data, use it (handles legacy data)
                                const currentStock = isGram
                                    ? (p.total_gram || p.total_ml || p.stock_quantity || 0)
                                    : isMl
                                        ? (p.total_ml || p.stock_quantity || 0)
                                        : (p.stock_quantity || 0);
                                const minStock = p.min_stock || 10;
                                const currentPrice = isGram ? (p.price_per_gram || p.price_per_ml || p.price) : isMl ? p.price_per_ml : p.price;
                                const currentWholesale = isGram ? (p.wholesale_price_per_gram || p.wholesale_price_per_ml || p.wholesale_price) : isMl ? p.wholesale_price_per_ml : p.wholesale_price;
                                const unitLabel = isGram ? 'ج.م/جرام' : isMl ? 'ج.م/مل' : 'ج.م';
                                const stockUnit = isGram ? 'جرام' : isMl ? 'مل' : 'قطعة';

                                return (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                                {p.name}
                                                {p.is_website_visible === 1 && (
                                                    <Globe className="w-3.5 h-3.5 text-blue-500" title="معروض" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                            {p.category === 'oil' ? 'زيت (بالجرام)' : p.category === 'bottle' ? 'زجاجة' : 'منتج'}
                                        </td>
                                        {(pricingMode === 'both' || pricingMode === 'retail') && (
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {currentPrice || 0} <span className="text-[10px] text-slate-400">{unitLabel}</span>
                                            </td>
                                        )}
                                        {(pricingMode === 'both' || pricingMode === 'wholesale') && (
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {currentWholesale || 0} <span className="text-[10px] text-slate-400">{unitLabel}</span>
                                            </td>
                                        )}
                                        {showBarcode && (
                                            <td className="px-6 py-4 text-center">
                                                {p.barcode ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-sm">
                                                        <Barcode className="w-4 h-4 text-slate-500" />
                                                        <span className="font-mono text-xs font-black tracking-wider">{p.barcode}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-bold text-xs italic">لا يوجد</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold min-w-[60px] justify-center ${currentStock === 0
                                                    ? 'bg-red-100 text-red-600'
                                                    : currentStock <= minStock
                                                        ? 'bg-yellow-100 text-yellow-600'
                                                        : 'bg-green-100 text-green-600'
                                                    }`}>
                                                    {currentStock} {stockUnit !== 'مل' && <span className="text-[10px] opacity-70">{stockUnit}</span>}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[10px] text-right">
                                                {currentStock === 0 && <span className="text-red-500 font-bold"> (نفذ)</span>}
                                                {currentStock > 0 && currentStock <= minStock && <span className="text-yellow-600 font-bold"> (قليل)</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-left flex items-center gap-2">
                                                {can('products:edit') && (
                                                    <button
                                                        onClick={() => {
                                                            const actualStock = p.sell_unit === 'gram' 
                                                                ? (p.total_gram || p.stock_quantity || 0)
                                                                : p.sell_unit === 'ml' 
                                                                    ? (p.total_ml || p.stock_quantity || 0)
                                                                    : (p.stock_quantity || 0);
                                                            setEditingProduct({ ...p, stock_quantity: actualStock });
                                                        }}
                                                        className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-all active:scale-95"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {can('products:delete') && (
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-95"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setPrintingProduct({ ...p, item_name: p.name })
                                                        setStickerCount(1)
                                                        setShowBarcodePreview(true)
                                                    }}
                                                    className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-95"
                                                    title="معاينة وطباعة الباركود"
                                                >
                                                    <Printer className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                    </tbody>
                </table>
            </div>

            {/* Hidden Barcode Sticker for Printing (Actual size/styles) */}
            <div
                id="barcode-print-container"
                style={{
                    position: 'fixed',
                    top: '-1000px',
                    left: '-1000px',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -9999
                }}
            >
                {printingProduct && (
                    <BarcodeSticker
                        ref={stickerRef}
                        product={printingProduct}
                        settings={settings}
                    />
                )}
            </div>

            {/* Barcode Preview Modal */}
            <AnimatePresence>
                {showBarcodePreview && printingProduct && (
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
                                <h3 className="text-xl font-black text-slate-800">معاينة استيكر الباركود</h3>
                                <button onClick={() => setShowBarcodePreview(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl flex flex-col items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                                {/* Visual Preview (Scaled up for visibility) */}
                                <div style={{ transform: 'scale(1.2)', transformOrigin: 'center' }} className="mb-4">
                                    <BarcodeSticker product={printingProduct} settings={settings} />
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
                                    onClick={() => {
                                        setIsPrintingSelection(true)
                                        setTimeout(() => {
                                            handlePrintWithSelection()
                                        }, 100)
                                    }}
                                    className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    طباعة مع اختيار الطابعة 🖨️
                                </button>

                                <button
                                    onClick={() => setShowBarcodePreview(false)}
                                    className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    إغلاق المعاينة
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold text-center mt-6">
                                تأكد من اختيار طابعة الاستيكرات الافتراضية في إعدادات الويندوز لجودة أفضل.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Product Modal */}
            <AnimatePresence>
                {editingProduct && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Edit className="w-5 h-5 text-brand-primary" />
                                    تعديل المنتج
                                </h3>
                                <button
                                    onClick={() => setEditingProduct(null)}
                                    className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[80vh] overflow-y-auto">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">اسم المنتج</label>
                                    <input
                                        value={editingProduct.name}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">تصنيف المنتج</label>
                                    <select
                                        value={editingProduct.category}
                                        onChange={(e) => setEditingProduct({
                                            ...editingProduct,
                                            category: e.target.value,
                                            sell_unit: e.target.value === 'oil' ? 'gram' : 'piece'
                                        })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                    >
                                        <option value="oil">زيت</option>
                                        <option value="bottle">زجاجة</option>
                                        <option value="product">منتج</option>
                                    </select>
                                </div>

                                {/* Edit Sell Unit for Oil */}
                                {editingProduct.category === 'oil' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 mr-1">وحدة بيع الزيت</label>
                                        <select
                                            value={editingProduct.sell_unit || 'gram'}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, sell_unit: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-brand-primary/20 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold text-brand-primary"
                                        >
                                            <option value="gram">بالجرام (جرام)</option>
                                        </select>
                                    </div>
                                )}

                                {(pricingMode === 'both' || pricingMode === 'retail') && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 mr-1">
                                            {editingProduct.sell_unit === 'gram' ? 'سعر الجرام (قطاعي)' : editingProduct.sell_unit === 'ml' ? 'سعر المل (قطاعي)' : 'سعر البيع (قطاعي)'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.sell_unit === 'gram' ? editingProduct.price_per_gram : editingProduct.sell_unit === 'ml' ? editingProduct.price_per_ml : editingProduct.price}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (editingProduct.sell_unit === 'gram') setEditingProduct({ ...editingProduct, price_per_gram: val });
                                                else if (editingProduct.sell_unit === 'ml') setEditingProduct({ ...editingProduct, price_per_ml: val });
                                                else setEditingProduct({ ...editingProduct, price: val });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold text-green-600"
                                        />
                                    </div>
                                )}

                                {(pricingMode === 'both' || pricingMode === 'wholesale') && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500 mr-1">
                                            {editingProduct.sell_unit === 'gram' ? 'سعر الجرام (جملة)' : editingProduct.sell_unit === 'ml' ? 'سعر المل (جملة)' : 'سعر البيع (جملة)'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.sell_unit === 'gram' ? (editingProduct.wholesale_price_per_gram || 0) : editingProduct.sell_unit === 'ml' ? editingProduct.wholesale_price_per_ml : editingProduct.wholesale_price}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (editingProduct.sell_unit === 'gram') setEditingProduct({ ...editingProduct, wholesale_price_per_gram: val });
                                                else if (editingProduct.sell_unit === 'ml') setEditingProduct({ ...editingProduct, wholesale_price_per_ml: val });
                                                else setEditingProduct({ ...editingProduct, wholesale_price: val });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold text-blue-600"
                                        />
                                    </div>
                                )}


                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">
                                        {editingProduct.sell_unit === 'gram' ? 'المخزون الحالي (جرام)' : editingProduct.sell_unit === 'ml' ? 'المخزون الحالي' : 'المخزون الحالي'}
                                    </label>
                                    <input
                                        type="number"
                                        step={editingProduct.sell_unit === 'piece' ? "1" : "0.01"}
                                        value={
                                            editingProduct.sell_unit === 'gram'
                                                ? (editingProduct.total_gram || editingProduct.stock_quantity || 0)
                                                : editingProduct.sell_unit === 'ml'
                                                    ? (editingProduct.total_ml || editingProduct.stock_quantity || 0)
                                                    : (editingProduct.stock_quantity || 0)
                                        }
                                        onChange={(e) => {
                                            const qty = parseFloat(e.target.value) || 0;
                                            if (editingProduct.sell_unit === 'gram') setEditingProduct({ ...editingProduct, total_gram: qty, stock_quantity: qty });
                                            else if (editingProduct.sell_unit === 'ml') setEditingProduct({ ...editingProduct, total_ml: qty, stock_quantity: qty });
                                            else setEditingProduct({ ...editingProduct, stock_quantity: qty, total_ml: 0, total_gram: 0 });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 mr-1">الحد الأدنى للتنبيه</label>
                                    <input
                                        type="number"
                                        value={editingProduct.min_stock}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, min_stock: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
                                    />
                                </div>

                                {showBarcode && (
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs font-bold text-slate-500 block">الباركود</label>
                                        <div className="relative group/edit">
                                            <input
                                                value={editingProduct.barcode || ''}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 pl-12 text-sm font-mono font-black"
                                                placeholder="مسح الباركود..."
                                            />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {editingProduct.barcode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingProduct({ ...editingProduct, barcode: '' })}
                                                        className="text-[10px] font-black text-red-400 hover:text-red-500 transition-colors"
                                                    >
                                                        إزالة الباركود ✖
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
                                                        setEditingProduct({ ...editingProduct, barcode: '622' + randomPart });
                                                    }}
                                                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary/20 transition-all active:scale-95"
                                                    title="توليد باركود"
                                                >
                                                    <Barcode className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}



                                <div className="md:col-span-2 pt-4 flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
                                    >
                                        حفظ التعديلات
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    )
}
