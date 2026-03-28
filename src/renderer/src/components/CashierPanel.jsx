
import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
import {
    ShoppingCart,
    Search,
    User,
    Printer,
    Trash2,
    Plus,
    Minus,
    LogOut,
    History,
    Tag,
    FlaskConical,
    RefreshCw,
    AlertCircle,
    MessageCircle,
    Send,
    Barcode,
    Users,
    Package
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { BarcodeSticker, InvoiceSticker } from './BarcodeSticker'
import { PrintableInvoice } from './views/PrintableInvoice'
import { printComponent } from '../utils/printHelper'


// Memoized product card - only re-renders when item data or onClick changes
const ProductCard = memo(({ item, onClick }) => {
    const isOil = item.category === 'oil' || item.category === 'زيت';
    const isProduct = item.itemType === 'product';
    const stockVal = isOil
        ? (Number(item.total_gram) > 0 ? item.total_gram : Number(item.total_ml) > 0 ? item.total_ml : item.stock_quantity)
        : item.stock_quantity;
    const stockColor = stockVal === 0 ? 'bg-red-50 text-red-500' : stockVal <= item.min_stock ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600';
    const dotColor = stockVal === 0 ? 'bg-red-400' : stockVal <= item.min_stock ? 'bg-yellow-400' : 'bg-green-400';

    return (
        <div
            onClick={() => onClick(item)}
            className="bg-white border-2 border-slate-50 p-4 rounded-2xl text-right flex flex-col justify-between h-40 hover:border-brand-primary/20 hover:-translate-y-1 transition-all shadow-sm group relative overflow-hidden cursor-pointer select-none active:scale-95"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-50 to-transparent group-hover:via-brand-primary/20 transition-all" />
            <div className="flex justify-between items-start">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isProduct ? 'bg-blue-50 text-blue-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                    {isProduct ? <span className="text-base">🏷️</span> : <span className="text-base">🧪</span>}
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-black mb-0.5 ${isOil ? 'bg-amber-100 text-amber-600' : (isProduct ? 'bg-blue-100/50 text-blue-600' : 'bg-brand-primary/5 text-brand-primary')}`}>
                        {isOil ? 'زيت' : (isProduct ? 'منتج' : 'تركيبة')}
                    </span>
                    {isProduct && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-black text-[8px] ${stockColor}`}>
                            <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                            <span>{stockVal ?? 0}</span>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2 mb-1">{item.name}</p>
                {item.barcode && (
                    <div className="flex items-center gap-1 text-slate-300 mb-1">
                        <span className="text-[9px] font-mono font-bold tracking-tighter">{item.barcode}</span>
                    </div>
                )}
                
                {isProduct && (
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                             {item.wholesalePrice > 0 && (
                                <div className="flex items-baseline gap-0.5 opacity-60">
                                    <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1 py-0.5 rounded-sm">ج</span>
                                    <span className="text-[11px] font-black text-slate-500 line-through decoration-slate-300">{item.wholesalePrice}</span>
                                </div>
                            )}
                            <div className="flex items-baseline gap-0.5">
                                <span className="bg-sky-100 text-sky-700 text-[8px] font-black px-1 py-0.5 rounded-md">ق</span>
                                <span className="text-sm font-black text-slate-900 leading-none">{item.retailPrice}</span>
                                <span className="text-[9px] font-bold text-slate-400">ج.م</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {item.itemType === 'formula' && (
                    <div className="flex items-baseline justify-end gap-1.5">
                        <span className="text-base font-black text-slate-900 leading-none">{item.displayPrice}</span>
                        <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                    </div>
                )}
            </div>
            <div className="absolute bottom-3 left-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <div className="w-8 h-8 bg-brand-primary text-white rounded-lg shadow-lg shadow-brand-primary/30 flex items-center justify-center">
                    <span className="text-lg font-bold">+</span>
                </div>
            </div>
        </div>
    );
});
ProductCard.displayName = 'ProductCard';

export default function CashierPanel({ user, onLogout, notify, ask }) {
    const [products, setProducts] = useState([])
    const [formulas, setFormulas] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const searchRef = useRef(null)
    const gridContainerRef = useRef(null)
    const [cart, setCart] = useState([])
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [salesHistory, setSalesHistory] = useState([])
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [transferType, setTransferType] = useState('vodafone_cash')
    const [discount, setDiscount] = useState(0)

    const [settings, setSettings] = useState({})
    const [scanBuffer, setScanBuffer] = useState('')
    const [lastKeyTime, setLastKeyTime] = useState(0)

    const [showPreview, setShowPreview] = useState(false)
    const [filter, setFilter] = useState('all')
    const [oilConfig, setOilConfig] = useState({ show: false, oils: [], price: '', discount: '', bottle: null, pricingTier: null })
    const [lastBottle, setLastBottle] = useState(null) // Remember last used bottle
    const [showReturns, setShowReturns] = useState(false)
    const [returnInvoiceId, setReturnInvoiceId] = useState('')
    const [returnSale, setReturnSale] = useState(null)
    const [selectedReturnItems, setSelectedReturnItems] = useState([])
    const [returnType, setReturnType] = useState('refund') // 'refund' or 'exchange'
    const [returnReason, setReturnReason] = useState('')
    const [returnSearchResults, setReturnSearchResults] = useState([])
    const [searchOilTerm, setSearchOilTerm] = useState('') // New search term for formula oils
    const [customersList, setCustomersList] = useState([]) // For autocomplete
    const [printedSaleId, setPrintedSaleId] = useState(null)
    const [printedInvoiceCode, setPrintedInvoiceCode] = useState(null)
    const [sessionInvoiceCode, setSessionInvoiceCode] = useState(null)
    const [receiptData, setReceiptData] = useState({ items: [], total: 0, invoiceCode: null, saleId: null, customer_address: '' })
    const [isPrinting, setIsPrinting] = useState(false)
    const [isPrintingSticker, setIsPrintingSticker] = useState(false)
    const [itemToChoosePrice, setItemToChoosePrice] = useState(null) // For wholesale/retail choice
    
    const pricingMode = settings?.pricing_mode || 'both';
    const isWholesaleTier = user?.pricing_tier === 'wholesale';

    const retailPiece = (p) => {
        const n = parseFloat(p?.price ?? p?.sell_price);
        return isNaN(n) ? 0 : n;
    }

    // Helper: safely pick retail vs wholesale price based on product unit (مع fallback لحقل price للمنتجات القديمة)
    const resolvePrice = (product, isWholesale) => {
        if (!product) return 0;
        const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
        const unit = product.sell_unit;
        if (isWholesale) {
            if (unit === 'gram') {
                const w = safeNum(product.wholesale_price_per_gram);
                return w > 0 ? w : (safeNum(product.price_per_gram) || retailPiece(product));
            }
            if (unit === 'ml') {
                const w = safeNum(product.wholesale_price_per_ml);
                return w > 0 ? w : (safeNum(product.price_per_ml) || retailPiece(product));
            }
            if (product.category === 'oil' || product.category === 'زيت') {
                const w = safeNum(product.wholesale_price_per_gram || product.wholesale_price_per_ml || product.wholesale_price);
                return w > 0 ? w : safeNum(product.price_per_gram || product.price_per_ml || product.price || product.sell_price);
            }
            const w = safeNum(product.wholesale_price);
            return w > 0 ? w : retailPiece(product);
        } else {
            if (unit === 'gram') return safeNum(product.price_per_gram) || retailPiece(product);
            if (unit === 'ml') return safeNum(product.price_per_ml) || retailPiece(product);
            if (product.category === 'oil' || product.category === 'زيت') {
                return safeNum(product.price_per_gram || product.price_per_ml || product.price || product.sell_price);
            }
            return retailPiece(product);
        }
    }

    const getDisplayPrice = (i) => {
        if (i.itemType === 'formula') return i.total_price || 0;

        if (pricingMode === 'wholesale' || (pricingMode === 'both' && isWholesaleTier)) {
            return resolvePrice(i, true);
        } else {
            return resolvePrice(i, false);
        }
    };

    // O(1) Lookup Maps for instant barcode/ID scanning (+ numeric aliases for leading zeros / short IDs)
    const lookupMaps = useMemo(() => {
        const pMap = new Map();
        const fMap = new Map();
        const idMap = new Map(); // Combined ID map

        const addBarcodeKeys = (map, code, row) => {
            const b = String(code).trim();
            if (!b) return;
            map.set(b, row);
            if (/^\d+$/.test(b)) {
                const stripped = b.replace(/^0+/, '') || '0';
                if (stripped !== b) map.set(stripped, row);
            }
        };

        products.forEach(p => {
            if (p.barcode) addBarcodeKeys(pMap, p.barcode, p);
            idMap.set(String(p.id), { ...p, itemType: 'product' });
        });

        const formulaIdMap = new Map();
        formulas.forEach(f => {
            if (f.barcode) addBarcodeKeys(fMap, f.barcode, f);
            idMap.set(String(f.id), { ...f, itemType: 'formula' });
            formulaIdMap.set(String(f.id), f);
        });

        return { pMap, fMap, idMap, formulaIdMap };
    }, [products, formulas]);

    // Pre-calculate display prices for all items to avoid overhead during filtering/rendering
    const memoizedItems = useMemo(() => {
        const calculatePrices = (item, type) => {
            const retail = resolvePrice(item, false);
            const wholesale = resolvePrice(item, true);
            const display = (pricingMode === 'wholesale' || (pricingMode === 'both' && isWholesaleTier)) ? wholesale : retail;
            return { retail, wholesale, display };
        };

        const prods = (filter === 'all' || filter === 'product') 
            ? products.map(p => {
                const prices = calculatePrices(p, 'product');
                return { ...p, itemType: 'product', retailPrice: prices.retail, wholesalePrice: prices.wholesale, displayPrice: prices.display };
            })
            : [];
        const forms = (filter === 'all' || filter === 'formula')
            ? formulas.map(f => ({ ...f, itemType: 'formula', displayPrice: f.total_price || 0 }))
            : [];
        return [...prods, ...forms];
    }, [products, formulas, filter, pricingMode, isWholesaleTier]);


    const parseDetails = (details) => {
        if (!details) return '';
        try {
            // Handle both string and object
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            
            // If it has a 'text' field (V3 format), use it
            if (parsed && typeof parsed === 'object') {
                if ('text' in parsed && 'impact' in parsed) {
                    return parsed.text || '';
                }
                if (parsed.text) return parsed.text;

                // Legacy fallback (V2 format with 'oils' array)
                if (parsed.oils && Array.isArray(parsed.oils)) {
                    const parts = parsed.oils
                        .filter(o => o.quantity > 0)
                        .map(o => o.name || products.find(p => p.id === o.id)?.name || 'زيت غير معروف');

                    let bottleName = '';
                    if (parsed.bottle_id) {
                        bottleName = products.find(p => p.id === parsed.bottle_id)?.name || 'زجاجة';
                    }
                    return bottleName ? `نوع الزجاجة: ${bottleName}\nالمكونات: ${parts.join(' + ')}` : parts.join(' + ');
                }
            }

            // If it's just a string or unknown format, return as is
            return typeof details === 'string' ? details : JSON.stringify(details);
        } catch (e) {
            return String(details);
        }
    }




    const componentRef = useRef()


    useEffect(() => {
        if (isPrinting && receiptData.items.length > 0) {
            handlePrint()
            setIsPrinting(false)
        }
    }, [isPrinting, receiptData])

    const findItemByBarcodeOrId = useCallback((code) => {
        if (!code) return null;
        const cleanCode = String(code).trim().replace(/[^\x20-\x7E]/g, ''); // Strip control chars
        console.log(`[Scanner] Processing Code: "${cleanCode}"`);
        
        // 1. Exact Barcode Match (O(1))
        let item = lookupMaps.pMap.get(cleanCode);
        if (item) {
             console.log(`[Scanner] Found exact product match: ${item.name}`);
             return { ...item, type: 'product' };
        }
        
        item = lookupMaps.fMap.get(cleanCode);
        if (item) {
            console.log(`[Scanner] Found exact formula match: ${item.name}`);
            return { ...item, type: 'formula' };
        }

        // 2a. 623 = تركيبة مسجّلة (معرف التركيبة في الأرقام الوسطى)
        if (cleanCode.length === 13 && cleanCode.startsWith('623')) {
            const fid = cleanCode.substring(3, 12).replace(/^0+/, '') || '0';
            const f = lookupMaps.formulaIdMap.get(fid);
            if (f) {
                return { ...f, type: 'formula', itemType: 'formula' };
            }
        }

        // 2. 622 Internal ID Extraction (common Egyptian EAN-13 logic for local labels)
        let searchId = cleanCode;
        if (cleanCode.length === 13 && cleanCode.startsWith('622')) {
            // Try extracting middle numeric part
            searchId = cleanCode.substring(3, 12).replace(/^0+/, '');
            if (searchId === '') searchId = '0';
            console.log(`[Scanner] 622 Prefix detected. Extracted Search ID: "${searchId}"`);
        } else if (cleanCode.length <= 10) {
            // Short codes are likely raw IDs
            searchId = cleanCode.replace(/^0+/, '');
            if (searchId === '') searchId = '0';
        }

        // 3. ID Match (O(1))
        const found = lookupMaps.idMap.get(searchId);
        if (found) {
             console.log(`[Scanner] Found match by ID "${searchId}": ${found.name}`);
             return { ...found, type: found.itemType };
        }

        console.warn(`[Scanner] UNKNOWN CODE: "${cleanCode}" (Search ID: "${searchId}")`);
        return { notFound: true, raw: cleanCode, attemptedId: searchId };
    }, [lookupMaps]);

    const scannerBufferRef = useRef('')
    const lastScanKeyAtRef = useRef(0)

    useEffect(() => {
        const handleGlobalClick = (e) => {
            // If the user clicks on an empty area, or a generic div (not a button/input), return focus to search
            const interactiveTags = ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'];
            if (!interactiveTags.includes(e.target.tagName) && searchRef.current) {
                // Short delay to avoid race conditions with click events
                setTimeout(() => {
                    if (document.activeElement === document.body || document.activeElement.tagName === 'DIV') {
                        searchRef.current.focus();
                    }
                }, 50);
            }
        };

        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, []);

    useEffect(() => {
        loadData()

        // Real-time sync for sales and products
        const cleanup = window.api.onSalesUpdated(() => {
            console.log('[SYNC] Sales updated, refreshing records...')
            loadSalesHistory()
            loadData() // Reload products in case stock changed
        })

        return cleanup
    }, [])

    const loadData = async () => {
        const p = await window.api.getProducts()
        const f = await window.api.getFormulas()
        const s = await window.api.getSettings()
        const customers = await window.api.getCustomersList()
        setProducts(p)
        setFormulas(f)
        setSettings(s)
        setCustomersList(customers || [])
        console.log('Loader complete. Bottles found:', p.filter(x => x.category?.toLowerCase() === 'bottle' || x.category === 'زجاجة').length)
        console.log('[DEBUG] Facebook URL from settings:', s.facebook_url)
    }

    const loadSalesHistory = async () => {
        const history = await window.api.getSalesHistory({ limit: 100, cashierId: user.id })
        setSalesHistory(history)
    }

    useEffect(() => {
        if (showHistory) {
            loadSalesHistory()
        }
    }, [showHistory])

    // Auto-calculate oil mixture price whenever oils or bottle change
    useEffect(() => {
        if (!oilConfig.show || oilConfig.oils.length === 0) return;
        
        // Priority: 1. Manual selection in oilConfig, 2. Global shop settings
        const isWholesale = oilConfig.pricingTier 
            ? (oilConfig.pricingTier === 'wholesale') 
            : (pricingMode === 'wholesale' || (pricingMode === 'both' && isWholesaleTier));

        const oilTotal = oilConfig.oils.reduce((sum, o) => {
            const ml = parseFloat(o.ml) || 0;
            const perUnit = resolvePrice(o.oil, isWholesale);
            return sum + (ml * perUnit);
        }, 0);
        const bottlePrice = oilConfig.bottle ? parseFloat(resolvePrice(oilConfig.bottle, isWholesale)) || 0 : 0;
        const total = oilTotal + bottlePrice;
        if (total > 0) {
            setOilConfig(prev => ({ ...prev, price: total.toFixed(2) }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oilConfig.oils, oilConfig.bottle, oilConfig.show, oilConfig.pricingTier, pricingMode, isWholesaleTier, settings])

    const addToCart = (product, fromScanner = false) => {
        const itemType = product.type || product.itemType || 'product';
        const cartType = itemType === 'formula' ? 'formula' : 'product';

        // Validation: Stock check for products
        if (itemType === 'product' && Number(product.stock_quantity || product.total_gram || product.total_ml) <= 0) {
            notify(`المنتج ${product.name} غير متوفر في المخزون! ❌`, 'error')
            return
        }


        const isProductType = itemType === 'product' || product.category === 'oil' || product.category === 'زيت';

        // 1. If shop is 'both', and it's a product/oil, we MUST ask the user FIRST (unless scanned or already chosen)
        if (isProductType && !fromScanner && pricingMode === 'both' && !product.is_choosing_price) {
            setItemToChoosePrice(product);
            return;
        }

        // 2. If it's an oil that needs mixture screen (and it either already chose price, or shop is fixed to retail/wholesale, or was scanned)
        if ((product.category === 'oil' || product.category === 'زيت')) {
            const isWholesaleTier = user?.pricing_tier === 'wholesale';
            const initialTier = product.is_choosing_price 
                ? (product.price === resolvePrice(product, true) ? 'wholesale' : 'retail')
                : (pricingMode === 'wholesale' || (pricingMode === 'both' && isWholesaleTier) ? 'wholesale' : 'retail');

            setOilConfig({
                show: true,
                oils: [{ oil: product, ml: '' }],
                price: '',
                discount: '',
                bottle: lastBottle || null,
                pricingTier: initialTier
            });
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.type === cartType)
            if (existing) {
                return prev.map(item => item.id === product.id && item.type === cartType
                    ? { ...item, qty: item.qty + 1 }
                    : item
                )
            }

            // Default price determination for standard products
            let price = 0
            if (product.type === 'formula') {
                price = product.total_price || 0
            } else {
                const isGram = product.sell_unit === 'gram' || product.category === 'oil' || product.category === 'زيت'
                const isMl = product.sell_unit === 'ml'
                

                
                // Prioritize explicit modal choice if available
                if (product.is_choosing_price && product.price !== undefined) {
                    price = product.price;
                }
                // Check if shop forces wholesale, OR shop allows both but user is wholesale explicitly
                else if (pricingMode === 'wholesale' || (pricingMode === 'both' && isWholesaleTier)) {
                    price = resolvePrice(product, true);
                    
                    // Note: If shop relies on wholesale but product has no wholesale explicitly set (evals to 0), 
                    // we DO NOT fallback to retail. We respect their 0.
                } else {
                    // Retail fallback
                    price = resolvePrice(product, false);
                }
            }

            return [...prev, {
                id: product.id,
                name: product.name,
                price: price,
                qty: 1,
                type: cartType,
                itemType: itemType,
                category: product.category,
                barcode: product.barcode,
                discount: 0
            }]
        })
    }

    const addToCartRef = useRef(addToCart)
    const notifyRef = useRef(notify)
    addToCartRef.current = addToCart
    notifyRef.current = notify

    // سكانر HID: يُفضَّل التركيز على مربع البحث. هنا نكمّل فقط عندما التركيز ليس على مربع البحث (بدون حجب الأحرف عن أي حقل).
    useEffect(() => {
        const SCAN_GAP_MS = 100

        const runLookup = (finalCode) => {
            void (async () => {
                let res = findItemByBarcodeOrId(finalCode)
                if (res?.notFound && window.api?.findProductByBarcode) {
                    try {
                        const p = await window.api.findProductByBarcode(finalCode)
                        if (p) res = { ...p, itemType: 'product', type: 'product' }
                    } catch (err) {
                        console.warn('[Scanner] DB barcode lookup failed:', err)
                    }
                }
                if (res && !res.notFound) {
                    addToCartRef.current(res, true)
                    notifyRef.current(`تم إضافة ${res.itemType === 'product' ? 'المنتج' : 'التركيبة'}: ${res.name}`, 'success')
                } else if (res && res.notFound) {
                    notifyRef.current(`كود غير معروف: ${res.raw} ❌`, 'error')
                } else {
                    notifyRef.current(`كود غير معروف: ${finalCode} ❌`, 'error')
                }
            })()
        }

        const onKeyDown = (e) => {
            if (document.activeElement === searchRef.current || e.target === searchRef.current) return
            if (e.ctrlKey || e.metaKey || e.altKey) return

            const now = Date.now()
            if (now - lastScanKeyAtRef.current > SCAN_GAP_MS) {
                scannerBufferRef.current = ''
            }
            lastScanKeyAtRef.current = now

            if (e.key === 'Enter') {
                const code = scannerBufferRef.current.trim()
                if (code.length > 2) {
                    e.preventDefault()
                    e.stopPropagation()
                    runLookup(code)
                }
                scannerBufferRef.current = ''
                return
            }

            if (e.key.length === 1 && !e.isComposing) {
                scannerBufferRef.current += e.key
            }
        }

        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
    }, [findItemByBarcodeOrId])

    const proceedAddToCart = (item, type, customPrice = null, ml = null, bottleId = null) => {
        const finalPrice = customPrice !== null ? parseFloat(customPrice) : (item.sell_price ?? item.price ?? item.total_price ?? 0)

        const cartItem = {
            ...item,
            type,
            qty: 1,
            price: finalPrice,
            discount: 0,
            oil_id: item.category === 'oil' ? item.id : null,
            bottle_id: bottleId,
            ml: ml
        }

        const existing = cart.find(c => c.id === item.id && c.type === type && c.oil_id === cartItem.oil_id && c.bottle_id === cartItem.bottle_id)

        if (existing) {
            // منطق تحديث الكمية (بسيط للمثال)
            setCart(cart.map(c => (c.id === item.id && c.type === type && c.oil_id === cartItem.oil_id && c.bottle_id === cartItem.bottle_id) ? { ...c, qty: c.qty + 1 } : c))
        } else {
            setCart([...cart, cartItem])
        }
    }

    const updatePrice = (id, type, newPrice) => {
        const price = parseFloat(newPrice)
        if (isNaN(price) || price < 0) return

        setCart(cart.map(c => {
            if (c.id === id && c.type === type) {
                return { ...c, price: price }
            }
            return c
        }))
    }

    const updateQty = (id, type, delta) => {
        setCart(cart.map(c => {
            if (c.id === id && c.type === type) {
                const newQty = Math.max(1, c.qty + delta)

                // تحقق إضافي عند الزيادة للتركيبات
                if (delta > 0 && type === 'formula') {
                    const item = formulas.find(f => f.id === id)
                    const insufficient = item.items.find(ing => {
                        if (!ing.product_id) return false // تجاهل المكونات المخصصة
                        const p = products.find(prod => prod.id === ing.product_id)
                        return !p || p.stock_quantity < (ing.quantity * newQty)
                    })
                    if (insufficient) {
                        const p = products.find(prod => prod.id === insufficient.product_id)
                        notify(`لا يمكن زيادة الكمية لنقص في ${p?.name || 'المكونات'} `, 'error')
                        return c
                    }
                }

                if (delta > 0 && type === 'product') {
                    const p = products.find(prod => prod.id === id)
                    if (newQty > p.stock_quantity) {
                        notify(`الكمية المتاحة هي ${p.stock_quantity} فقط`, 'error')
                        return c
                    }
                }
                return { ...c, qty: newQty }
            }
            return c
        }))
    }

    const removeFromCart = (id, type) => {
        setCart(cart.filter(c => !(c.id === id && c.type === type)))
    }

    /** خصم نسبة مئوية على سطر السلة: منتجات جاهزة فقط (لا تركيبة ثابتة ولا ميكس زيوت) */
    const lineGetsPercentDiscount = (item) => item.type === 'product'

    const lineDiscountPercent = (item) => (lineGetsPercentDiscount(item) ? (parseFloat(item.discount) || 0) : 0)

    const lineUnitNet = (item) => {
        const unit = parseFloat(item.price) || 0
        const pct = lineDiscountPercent(item)
        return unit * (1 - Math.min(100, Math.max(0, pct)) / 100)
    }

    const updateItemLineDiscount = (id, type, rawPct) => {
        const pct = Math.min(100, Math.max(0, parseFloat(rawPct) || 0))
        setCart(cart.map(c => (c.id === id && c.type === type ? { ...c, discount: pct } : c)))
    }

    // total = sum of each item's net price (after item-level discount) * qty
    const itemsSubtotal = cart.reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * item.qty), 0)
    const itemsDiscount = cart.reduce((acc, item) => {
        if (!lineGetsPercentDiscount(item)) return acc
        const price = parseFloat(item.price) || 0
        const discountPercent = parseFloat(item.discount) || 0
        const discountAmount = price * (discountPercent / 100)
        return acc + (discountAmount * item.qty)
    }, 0)
    const total = itemsSubtotal - itemsDiscount

    // Memoize the cart data for printing to avoid expensive re-mapping on every single render
    const memoizedPrintCart = useMemo(() => {
        const sourceItems = receiptData.items.length > 0 ? receiptData.items : cart;
        return sourceItems.map(item => ({
            name: item.item_name || item.name || 'منتج',
            qty: item.quantity || item.qty || 1,
            price: item.price || 0,
            barcode: item.barcode || '',
            category: item.category || '',
            is_ml: item.is_ml || false,
            is_gram: item.is_gram || false,
            details: item.details || '',
        }));
    }, [cart, receiptData.items]);

    const handlePrint = async () => {
        if (!receiptData.items?.length) return;
        try {
            await printComponent(PrintableInvoice, {
                sale: receiptData,
                settings: settings,
                parseDetails: parseDetails
            }, { width: '80mm' });
        } catch (err) {
            console.error('Invoice Print Error:', err);
            notify('حدث خطأ أثناء طباعة الفاتورة', 'error');
        }
    };

    const handleReprintInvoice = async (sale) => {
        try {
            await printComponent(PrintableInvoice, {
                sale: sale,
                settings: settings,
                parseDetails: parseDetails
            }, { width: '80mm' });
            notify('تم إعادة طباعة الفاتورة بنجاح', 'success');
        } catch (err) {
            console.error('Reprint Invoice Error:', err);
            notify('حدث خطأ أثناء إعادة طباعة الفاتورة', 'error');
        }
    };

    const handleReprintSticker = async (sale) => {
        try {
            const isTwin = settings.sticker_type === 'twin' || settings.sticker_type === 'twin_35x25';
            const isCompact = settings.sticker_type === 'compact';
            const isPharmacy = settings.sticker_type === 'pharmacy';

            let w = '50mm', h = '30mm';
            if (settings.sticker_type === 'twin_35x25' || settings.sticker_type === 'standard_35x25') { w = '35mm'; h = '25mm'; }
            else if (isTwin) { w = '38mm'; h = '25mm'; }
            else if (isCompact) { h = '16mm'; }
            else if (isPharmacy) { w = '38mm'; h = '12.5mm'; }

            const reprintCart = sale.items.map(item => ({
                name: item.item_name || item.name || 'منتج',
                qty: item.quantity || 1,
                price: item.price || 0,
                barcode: item.barcode || '',
                category: item.category || '',
                is_ml: item.is_ml || false,
                is_gram: item.is_gram || false,
                details: item.details || '',
            }));

            await printComponent(InvoiceSticker, {
                cart: reprintCart,
                total: sale.total,
                customerName: sale.customer_name || '',
                settings: settings
            }, { width: w, height: h });
            notify('تم إعادة طباعة الاستيكر بنجاح', 'success');
        } catch (err) {
            console.error('Reprint Sticker Error:', err);
            notify('حدث خطأ أثناء إعادة طباعة الاستيكر', 'error');
        }
    };

    const handleStickerPrint = async () => {
        try {
            const isTwin = settings.sticker_type === 'twin' || settings.sticker_type === 'twin_35x25';
            const isCompact = settings.sticker_type === 'compact';
            const isPharmacy = settings.sticker_type === 'pharmacy';

            let w = '50mm', h = '30mm';
            if (settings.sticker_type === 'twin_35x25' || settings.sticker_type === 'standard_35x25') { w = '35mm'; h = '25mm'; }
            else if (isTwin) { w = '38mm'; h = '25mm'; }
            else if (isCompact) { h = '16mm'; }
            else if (isPharmacy) { w = '38mm'; h = '12.5mm'; }

            await printComponent(InvoiceSticker, {
                cart: memoizedPrintCart,
                total: receiptData.total || total,
                customerName: customerName || '',
                settings: settings
            }, { width: w, height: h });
        } catch (err) {
            console.error('Sticker Print Error:', err);
            notify('حدث خطأ أثناء طباعة الاستيكر', 'error');
        }
    };

    const unifySaleItems = (items) => {
        if (!items || !Array.isArray(items)) return [];
        const unified = [];
        const processed = new Set();
        const bottleIndices = new Set();
        const oilIndices = new Set();

        items.forEach((item, idx) => {
            const itemName = (item.item_name || item.name || '').toLowerCase();
            const itemDetails = typeof item.details === 'string' ? item.details : JSON.stringify(item.details || {});

            const isBottle = item.category === 'bottle' || item.category === 'زجاجة' ||
                itemName.includes('زجاجة') || itemName.includes('زجاجه');
            const isOil = item.type === 'oil_mix' || itemName.includes('تركيبة') ||
                itemDetails.includes('المكونات:') || (item.formula_id !== null && item.formula_id !== undefined);

            if (isBottle) bottleIndices.add(idx);
            else if (isOil) oilIndices.add(idx);
        });

        // Match oils with bottles
        items.forEach((item, idx) => {
            if (processed.has(idx)) return;
            if (oilIndices.has(idx)) {
                let foundBottleIdx = -1;
                const iDetailsRaw = item.details ? (typeof item.details === 'string' ? item.details : JSON.stringify(item.details)) : '';

                for (const bIdx of bottleIndices) {
                    if (processed.has(bIdx)) continue;
                    const bottle = items[bIdx];
                    const bName = bottle.item_name || bottle.name || '';

                    // Match by text in details OR by mixture linkage
                    const textMatch = bName && iDetailsRaw.includes(bName);
                    const linkMatch = (item.bottle_id && item.bottle_id === bottle.product_id);

                    if (textMatch || linkMatch) {
                        foundBottleIdx = bIdx;
                        break;
                    }
                }

                if (foundBottleIdx !== -1) {
                    const bottle = items[foundBottleIdx];
                    processed.add(foundBottleIdx);
                    unified.push({
                        ...item,
                        item_name: 'تركيبة عطور',
                        bottle_name: bottle.name || bottle.item_name || '', // Save bottle name
                        price: (parseFloat(item.price) || 0) + (parseFloat(bottle.price) || 0),
                        original_indices: [idx, foundBottleIdx],
                        isUnified: true
                    });
                } else {
                    unified.push({ ...item, original_indices: [idx] });
                }
                processed.add(idx);
            }
        });

        // Add remaining
        items.forEach((item, idx) => {
            if (!processed.has(idx)) unified.push({ ...item, original_indices: [idx] });
        });

        return unified;
    }

    const handleConfirmSale = async () => {
        if (cart.length === 0) return

        // Final Stock Check before processing
        for (const cartItem of cart) {
            if (cartItem.bottle_id) {
                const b = products.find(p => p.id === cartItem.bottle_id)
                if (b && Number(b.stock_quantity) <= 0) {
                    notify(`فشل العملية: زجاجة ${b.name} غير متوفرة حالياً! ❌`, 'error')
                    loadData() // Refresh items
                    return
                }
            }
            if (cartItem.type === 'product' && !cartItem.bottle_id) {
                const p = products.find(prod => prod.id === cartItem.id)
                if (p && Number(p.stock_quantity) < cartItem.qty) {
                    notify(`فشل العملية: الكمية غير كافية من ${p.name} ! ❌`, 'error')
                    loadData()
                    return
                }
            }
        }
        // Snapshot current cart for printing
        const snapshotItems = cart.map(c => ({
            item_name: c.name,
            price: parseFloat(c.price) || 0,
            quantity: c.qty,
            details: c.description || '',
            discount: c.discount || 0
        }))
        const snapshotTotal = total // already accounts for item discounts

        const result = await window.api.addSale({
            total: total,
            discount: itemsDiscount,
            cashier_id: user.id,
            customer_name: customerName,
            customer_phone: customerPhone,
            invoice_code: sessionInvoiceCode,
            payment_method: paymentMethod,
            payment_details: paymentMethod === 'transfer' ? transferType : '',
            items: cart.map(c => ({
                name: c.name,
                price: lineUnitNet(c),
                quantity: c.qty,
                product_id: c.type === 'product' ? c.id : null,
                formula_id: c.type === 'formula' ? c.id : null,
                oils: c.oils,
                bottle_id: c.bottle_id,
                description: c.description
            }))
        })

        if (result.success) {
            setPrintedSaleId(result.id)
            setPrintedInvoiceCode(result.invoiceCode)
            setReceiptData({
                items: snapshotItems,
                total: snapshotTotal,
                discount: itemsDiscount,
                invoice_code: result.invoiceCode,
                saleId: result.id,
                date: new Date().toISOString().split('T')[0], // For PrintableInvoice expectations
                cashier_name: user.username,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress
            })
            setIsPrinting(true)
            const phoneDigits = (customerPhone || '').replace(/\D/g, '')
            const waNote = phoneDigits.length >= 10 ? ' تم فتح واتساب ومجلد الفاتورة — أرفق PDF وأرسله للعميل.' : ''
            notify(`تمت العملية بنجاح! رقم الفاتورة: ${result.invoiceCode}${waNote}`, 'success')
        }

        setShowPreview(false)
        setCart([])
        setCustomerName('')
        setCustomerPhone('')
        setCustomerAddress('')
        await loadSalesHistory() // Explicitly refresh history immediately
        await loadData() // Refresh stock
    }

    // Returns functions
    const handleLookupInvoice = async () => {
        let cleanId = returnInvoiceId.trim().replace('#', '')
        const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g]
        arabicNumbers.forEach((r, i) => { cleanId = cleanId.replace(r, i) })

        if (!cleanId) {
            notify('من فضلك أدخل رقم العملية أو اسم العميل', 'error')
            return
        }

        // Check if it's likely a name/phone or an ID
        const isNumeric = /^\d+$/.test(cleanId)

        if (!isNumeric && cleanId.length > 0) {
            const results = await window.api.findSalesByCustomer(cleanId)
            if (!results || results.length === 0) {
                notify(`لم يتم العثور على مبيعات للعميل: ${cleanId}`, 'error')
                return
            }
            if (results.length === 1) {
                const sale = await window.api.findSaleById(results[0].id)
                handleSetReturnSale(sale)
            } else {
                setReturnSearchResults(results)
            }
            return
        }

        // If numeric, it's an ID or invoice_code
        const sale = await window.api.findSaleById(cleanId)
        if (!sale) {
            notify(`لم يتم العثور على فاتورة رقم ${returnInvoiceId}`, 'error')
            return
        }

        handleSetReturnSale(sale)
    }

    const handleSetReturnSale = (sale) => {
        // Apply unification to return items
        const unifiedItems = unifySaleItems(sale.items);
        setReturnSale(sale)
        setReturnSearchResults([])
        setSelectedReturnItems(unifiedItems.map(item => ({
            ...item,
            returnQty: 0,
            selected: false,
            // If unified, max quantity is the oil's quantity (assuming 1:1 pairing)
            maxReturnQty: item.remaining_quantity || item.quantity || 0
        })))
    }

    const handleToggleReturnItem = (index) => {
        const newItems = [...selectedReturnItems]
        const item = newItems[index]

        if (item.remaining_quantity <= 0) {
            notify('هذا المنتج تم إرجاعه بالكامل', 'error')
            return
        }

        newItems[index].selected = !newItems[index].selected
        if (newItems[index].selected) {
            newItems[index].returnQty = item.remaining_quantity || item.quantity
        } else {
            newItems[index].returnQty = 0
        }
        setSelectedReturnItems(newItems)
    }

    const handleProcessReturn = async () => {
        const itemsToReturn = selectedReturnItems.filter(i => i.selected && i.returnQty > 0)
        if (itemsToReturn.length === 0) {
            notify('من فضلك اختر على الأقل منتج واحد للإرجاع', 'error')
            return
        }

        const totalRefund = itemsToReturn.reduce((sum, item) => sum + (item.price * item.returnQty), 0)

        const expandedItemsToReturn = [];
        itemsToReturn.forEach(item => {
            if (item.isUnified && item.original_indices) {
                // Return both components if unified
                item.original_indices.forEach(idx => {
                    const originalItem = returnSale.items[idx];
                    expandedItemsToReturn.push({
                        product_id: originalItem.product_id,
                        item_name: originalItem.item_name || originalItem.name,
                        quantity: item.returnQty, // Same quantity for both parts of mixture
                        refund_amount: (originalItem.price / (item.price || 1)) * (item.price * item.returnQty), // Split refund relative to price
                        details: originalItem.details // FIX: Pass original details through
                    });
                });
            } else {
                expandedItemsToReturn.push({
                    product_id: item.product_id,
                    item_name: item.item_name || item.name,
                    quantity: item.returnQty,
                    refund_amount: item.price * item.returnQty,
                    details: item.details // FIX: Pass original details through
                });
            }
        });

        const returnData = {
            original_sale_id: returnSale.id,
            return_type: returnType,
            cashier_id: user.id,
            customer_name: returnSale.customer_name || '',
            customer_phone: returnSale.customer_phone || '',
            reason: returnReason,
            total_refund: totalRefund,
            items: expandedItemsToReturn
        }

        const result = await window.api.addReturn(returnData)
        if (result.success) {
            notify(`تم تسجيل ${returnType === 'refund' ? 'استرجاع' : 'استبدال'} بنجاح!`, 'success')
            setShowReturns(false)
            setReturnInvoiceId('')
            setReturnSale(null)
            setSelectedReturnItems([])
            loadData()
        } else {
            notify('حدث خطأ أثناء معالجة الإرجاع', 'error')
        }
    }





    // بحث بالاسم/الباركود فقط — الإضافة للسلة عند Enter (قيمة الحقل مباشرة من الـ DOM لتفادي lag السكانر مع React state)
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    };

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        
        let items = memoizedItems;
        if (term) {
            items = memoizedItems.filter(i => 
                (i.name || '').toLowerCase().includes(term) ||
                (i.barcode || '').includes(term) ||
                String(i.id) === term
            );
        }
        
        // عرض كل النتائج: البطاقات تستخدم content-visibility لتخفيف ضغط الرسم
        return items;
    }, [memoizedItems, searchTerm]);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-noto">
            {/* Sidebar / Categories & Search */}
            <div className="flex-1 flex flex-col p-8 min-w-0 bg-white/40 backdrop-blur-xl">
                <header className="flex items-center gap-6 mb-10">
                    <div className="relative flex-1 group">
                        <Search className="absolute right-5 top-4 w-6 h-6 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                        <input
                            ref={searchRef}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => {
                                scannerBufferRef.current = ''
                            }}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return
                                const code = (e.currentTarget?.value ?? '').trim()
                                if (!code) return
                                e.preventDefault()
                                e.stopPropagation()
                                scannerBufferRef.current = ''
                                void (async () => {
                                    let res = findItemByBarcodeOrId(code)
                                    if (res?.notFound && window.api?.findProductByBarcode) {
                                        try {
                                            const p = await window.api.findProductByBarcode(code)
                                            if (p) res = { ...p, itemType: 'product', type: 'product' }
                                        } catch (_) {}
                                    }
                                    if (res && !res.notFound) {
                                        setSearchTerm('')
                                        addToCart(res, true)
                                        notify(`تمت إضافة ${res.name} ✅`, 'success')
                                    } else if (res && res.notFound) {
                                        if (/^\d{3,}$/.test(code)) {
                                            notify(`كود غير معروف: ${code} ❌`, 'error')
                                            setTimeout(() => setSearchTerm(''), 1200)
                                        }
                                    }
                                })()
                            }}
                            placeholder="ابحث بالاسم — اضغط هنا ثم امسح الباركود ثم Enter من السكانر"
                            className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-4 pr-14 pl-6 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-sm text-lg font-bold placeholder:text-slate-300"
                        />
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] hover:bg-slate-50 transition-all text-slate-600 shadow-sm font-black active:scale-95"
                    >
                        <History className="w-6 h-6" />
                        <span>السجل</span>
                    </button>
                    <button
                        onClick={() => setShowReturns(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-red-50 border-2 border-red-100 rounded-[1.5rem] hover:bg-red-100 transition-all text-red-600 shadow-sm font-black active:scale-95"
                    >
                        <RefreshCw className="w-6 h-6" />
                        <span>استرجاع</span>
                    </button>
                    <div className="h-10 w-[2px] bg-slate-100 mx-2"></div>
                    <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'all' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            الكل
                        </button>
                        <button
                            onClick={() => setFilter('product')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'product' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            عطور
                        </button>
                        <button
                            onClick={() => setFilter('formula')}
                            className={`px-6 py-2.5 font-black rounded-[1.2rem] transition-all ${filter === 'formula' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            تركيبات
                        </button>
                    </div>
                </header>

                <div 
                    ref={gridContainerRef}
                    className="flex-1 overflow-auto pr-2 grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 content-start pb-10"
                >
                    {filteredItems.map(item => (
                        <ProductCard
                            key={`${item.itemType}-${item.id}`}
                            item={item}
                            onClick={addToCart}
                        />
                    ))}
                </div>
            </div>

            {/* Cart Section (The Modern Receipt) */}
            <div className="w-96 bg-white border-l-2 border-slate-100 flex flex-col shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] relative">
                <header className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20 rotate-3 group">
                                <ShoppingCart className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl text-slate-900 tracking-tight">طلب جديد</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">العناصر: {cart.length}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={() => setCart([])} className="p-2.5 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100" title="تفريغ السلة">
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-slate-900 transition-all bg-slate-50 border border-slate-100 rounded-xl active:scale-90">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border-2 border-slate-50 shadow-inner">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">البائع</div>
                            <div className="text-sm font-black truncate text-slate-800 leading-none">{user.username}</div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto px-8 py-2 space-y-4">
                    <AnimatePresence initial={false}>
                        {cart.map(item => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                key={`${item.type}-${item.id}`}
                                className="bg-white border-2 border-slate-50 p-4 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all relative group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 text-base leading-tight mb-1">{item.name}</h4>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                                {item.type === 'formula' ? 'تركيبة' : item.type === 'oil_mix' ? 'ميكس' : 'منتج'}
                                            </span>

                                            <div className="flex items-center gap-1 bg-slate-50 rounded-md border border-slate-100 px-1.5 py-0.5">
                                                <input
                                                    type="number"
                                                    className="w-14 bg-transparent font-bold text-slate-800 text-[11px] outline-none border-b border-transparent focus:border-brand-primary transition-colors text-center"
                                                    value={item.price || item.total_price || 0}
                                                    onChange={(e) => updatePrice(item.id, item.type, e.target.value)}
                                                    onClick={(e) => e.target.select()}
                                                />
                                                <span className="text-[9px] text-slate-400">ج.م</span>
                                            </div>
                                            {lineGetsPercentDiscount(item) && (
                                                <div className="flex items-center gap-0.5 bg-amber-50/80 rounded-md border border-amber-100 px-1.5 py-0.5">
                                                    <span className="text-[8px] font-black text-amber-700">خصم</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        className="w-10 bg-transparent font-black text-amber-800 text-[11px] outline-none text-center"
                                                        value={lineDiscountPercent(item) || ''}
                                                        placeholder="0"
                                                        onChange={(e) => updateItemLineDiscount(item.id, item.type, e.target.value)}
                                                        onClick={(e) => e.target.select()}
                                                    />
                                                    <span className="text-[8px] font-bold text-amber-600">%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        {lineDiscountPercent(item) > 0 && (
                                            <span className="text-slate-300 line-through text-xs block text-right">{((parseFloat(item.price) || 0) * item.qty).toFixed(2)}</span>
                                        )}
                                        <span className="text-brand-primary font-black text-lg leading-none block mb-1">{(lineUnitNet(item) * item.qty).toFixed(2)}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">ج.م</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 bg-slate-100/50 rounded-xl p-1 border border-slate-100">
                                        <button onClick={() => updateQty(item.id, item.type, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white transition-all text-slate-500 hover:text-brand-primary rounded-lg shadow-sm"><Minus className="w-3 h-3" /></button>
                                        <span className="w-10 text-center font-black text-slate-800 text-base">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, item.type, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white transition-all text-slate-500 hover:text-brand-primary rounded-lg shadow-sm"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id, item.type)} className="w-9 h-9 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 group">
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 py-24 px-10 text-center">
                            <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                                <ShoppingCart className="w-16 h-16 opacity-20 transform -rotate-12" />
                            </div>
                            <h3 className="font-black text-2xl text-slate-300 mb-2">السلة فارغة تماماً</h3>
                            <p className="text-slate-300 text-sm font-bold">ابدأ بإضافة بعض العطور الرائعة لقائمة الطلبات</p>
                        </div>
                    )}
                </div>

                <footer className="bg-white border-t-2 border-slate-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {/* Customer Info - 2+1 Layout */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase pr-1">اسم العميل</label>
                                    <input
                                        value={customerName}
                                        list="customers-datalist"
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setCustomerName(value)
                                            const customer = customersList.find(c => c.customer_name === value)
                                            if (customer) {
                                                setCustomerPhone(customer.customer_phone || '')
                                                setCustomerAddress(customer.customer_address || '')
                                            } else {
                                                setCustomerPhone('')
                                                setCustomerAddress('')
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-xs font-black focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                        placeholder="ادخل الاسم..."
                                    />
                                    <datalist id="customers-datalist">
                                        {customersList.map((customer, idx) => (
                                            <option key={idx} value={customer.customer_name} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase pr-1">رقم الموبايل</label>
                                    <input
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-xs font-black focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                        placeholder="01xxxxxxxxx"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase pr-1">العنوان</label>
                                <input
                                    value={customerAddress}
                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-xs font-black focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                    placeholder="العنوان (اختياري)"
                                />
                            </div>
                        </div>

                        {/* Bottom Bar - Totals & Action */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">الإجمالي النهائي</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-4xl font-black text-slate-900 leading-none">{total.toFixed(2)}</span>
                                        <span className="text-xs font-black text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded-lg">ج.م</span>
                                    </div>
                                </div>
                                {itemsDiscount > 0 && (
                                    <div className="text-right border-r border-slate-100 pr-6">
                                        <div className="text-[9px] text-slate-400 font-bold mb-0.5">قبل الخصم: {itemsSubtotal.toFixed(2)}</div>
                                        <div className="text-sm font-black text-emerald-500">خصم: -{itemsDiscount.toFixed(2)}</div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={async () => {
                                    if (cart.length === 0) return
                                    try {
                                        const nextCode = await window.api.getNextInvoiceCode()
                                        setSessionInvoiceCode(nextCode)
                                        setReceiptData(prev => ({
                                            ...prev,
                                            invoiceCode: nextCode,
                                            discount: itemsDiscount,
                                            customer_name: customerName,
                                            customer_phone: customerPhone,
                                            customer_address: customerAddress,
                                            items: cart.map(c => ({
                                                name: c.name,
                                                price: lineUnitNet(c),
                                                quantity: c.qty,
                                                description: c.description || '',
                                                discount: lineDiscountPercent(c),
                                                discount_percent: lineDiscountPercent(c)
                                            }))
                                        }))
                                        setShowPreview(true)
                                    } catch (error) {
                                        console.error('Error fetching next code:', error)
                                        setShowPreview(true)
                                    }
                                }}
                                disabled={cart.length === 0}
                                className="bg-slate-900 hover:bg-black text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-20 transition-all active:scale-[0.95]"
                            >
                                <Printer className="w-4 h-4 text-brand-primary" />
                                <span className="text-sm">إصدار الفاتورة</span>
                            </button>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Oil Configuration Modal */}
            <AnimatePresence>
                {oilConfig.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-black text-xl text-slate-800">تركيب عطر جديد (ميكس)</h3>
                                <button
                                    onClick={() => setOilConfig({ show: false, oils: [], price: '', discount: '', bottle: null })}
                                    className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-xl shadow-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 space-y-6">
                                {/* Bottle Selection */}
                                <div className="space-y-2">
                                    <div className="flex gap-2 mb-2">
                                        {(() => {
                                            // Use top_bottles_ids from settings if available, otherwise fall back to quick-size match
                                            let quickBottles = []
                                            try {
                                                const topIds = JSON.parse(settings.top_bottles_ids || '[]')
                                                if (Array.isArray(topIds) && topIds.length > 0) {
                                                    quickBottles = topIds
                                                        .map(id => products.find(p => p.id === id))
                                                        .filter(Boolean)
                                                }
                                            } catch (e) { }

                                            // Fallback: find bottles by common sizes
                                            if (quickBottles.length === 0) {
                                                quickBottles = products.filter(p =>
                                                    (p.category?.toLowerCase() === 'bottle' || p.category === 'زجاجة')
                                                ).slice(0, 3)
                                            }

                                            return quickBottles.map(bottleForSize => {
                                                const isOutOfStock = Number(bottleForSize.stock_quantity) <= 0
                                                const isSelected = oilConfig.bottle?.id === bottleForSize?.id

                                                return (
                                                    <button
                                                        key={bottleForSize.id}
                                                        onClick={() => {
                                                            if (isOutOfStock) {
                                                                notify(`زجاجة ${bottleForSize.name} نافدة من المخزون! ❌`, 'error')
                                                                return
                                                            }
                                                            setOilConfig({ ...oilConfig, bottle: bottleForSize })
                                                            setLastBottle(bottleForSize)
                                                        }}
                                                        className={`flex-1 py-3 rounded-2xl text-base font-black transition-all shadow-sm border-2 flex flex-col items-center justify-center gap-0 ${isSelected && !isOutOfStock
                                                            ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/20 scale-105'
                                                            : isOutOfStock
                                                                ? 'bg-red-50 text-red-500 border-red-200 opacity-90'
                                                                : 'bg-white text-slate-600 border-slate-100 hover:border-brand-primary/50 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-1 text-sm">
                                                            {bottleForSize.name}
                                                            {isSelected && !isOutOfStock && <span>✔</span>}
                                                            {isOutOfStock && <span>❌</span>}
                                                        </span>
                                                        <span className="text-[9px] font-bold opacity-70">
                                                            {isOutOfStock ? 'نفد' : `متاح: ${bottleForSize.stock_quantity}`}
                                                        </span>
                                                    </button>
                                                )
                                            })
                                        })()}
                                    </div>

                                    <select
                                        value={oilConfig.bottle?.id || ''}
                                        onChange={(e) => {
                                            const bottleId = e.target.value
                                            if (!bottleId) {
                                                setOilConfig({ ...oilConfig, bottle: null })
                                                return
                                            }
                                            const latestBottle = products.find(p => p.id === parseInt(bottleId))

                                            if (latestBottle && Number(latestBottle.stock_quantity) <= 0) {
                                                notify(`زجاجة ${latestBottle.name} غير متوفرة حالياً في المخزون! ❌`, 'error')
                                                // We don't prevent selection here to let user see the error state, 
                                                // but the final validation will block it anyway.
                                            }

                                            setOilConfig({ ...oilConfig, bottle: latestBottle || null })
                                            if (latestBottle) setLastBottle(latestBottle)
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 outline-none focus:border-brand-primary transition-colors font-bold text-slate-700"
                                    >
                                        <option value="">بدون زجاجة (زيت فقط)</option>
                                        {products.filter(p => p.category?.toLowerCase() === 'bottle' || p.category === 'زجاجة').map(b => (
                                            <option key={b.id} value={b.id} className={Number(b.stock_quantity) <= 0 ? 'text-red-400' : ''}>
                                                {b.name} {Number(b.stock_quantity) <= 0 ? '(نفد ❌)' : `(متاح: ${b.stock_quantity})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Oils List */}
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-500">البحث وإضافة زيت/منتج</label>
                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                                {products.filter(p => p.category !== 'bottle' && p.name.toLowerCase().includes(searchOilTerm.toLowerCase())).length} متاح
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن زيت أو منتج..."
                                                className="w-full bg-slate-100 border-none rounded-xl py-2 pr-10 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-slate-400"
                                                value={searchOilTerm}
                                                onChange={(e) => setSearchOilTerm(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="w-full text-sm bg-brand-primary/10 text-brand-primary font-bold py-2.5 px-4 rounded-xl outline-none cursor-pointer hover:bg-brand-primary/20 transition-all border-none"
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                const oilToAdd = products.find(p => p.id === parseInt(e.target.value));
                                                // check if already exists
                                                if (oilConfig.oils.find(o => o.oil.id === oilToAdd.id)) {
                                                    notify('هذا المنتج مضاف بالفعل', 'warning')
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setOilConfig({
                                                    ...oilConfig,
                                                    oils: [...oilConfig.oils, { oil: oilToAdd, ml: '' }]
                                                })
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">+ اختر من القائمة المفلترة</option>
                                            {products
                                                .filter(p => p.category !== 'bottle')
                                                .filter(p => !searchOilTerm || p.name.toLowerCase().includes(searchOilTerm.toLowerCase()))
                                                .map(oil => (
                                                    <option key={oil.id} value={oil.id}>{oil.name} ({oil.category === 'oil' ? 'زيت' : 'منتج'})</option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        {oilConfig.oils.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <div className="flex-1 font-bold text-slate-700">{item.oil.name}</div>
                                                <div className="w-32 relative">
                                                    <input
                                                        type="number"
                                                        placeholder="الكمية"
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pl-8 text-sm font-black outline-none focus:border-brand-primary"
                                                        value={item.ml}
                                                        onChange={(e) => {
                                                            const newOils = [...oilConfig.oils];
                                                            newOils[idx].ml = e.target.value;
                                                            setOilConfig({ ...oilConfig, oils: newOils });
                                                        }}
                                                    />
                                                    <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400">مل</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newOils = oilConfig.oils.filter((_, i) => i !== idx);
                                                        setOilConfig({ ...oilConfig, oils: newOils });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {oilConfig.oils.length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-2xl border-dashed border-2 border-slate-100">
                                                لا يوجد زيوت مختارة. أضف زيت للبدء.
                                            </div>
                                        )}
                                    </div>
                                </div>


                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-500">سعر البيع الافتراضي</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={oilConfig.price}
                                                onChange={(e) => setOilConfig({ ...oilConfig, price: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pr-4 pl-12 outline-none focus:border-brand-primary transition-colors font-black text-lg"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">ج.م</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-emerald-600">خصم (اختياري)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={oilConfig.discount}
                                                onChange={(e) => setOilConfig({ ...oilConfig, discount: e.target.value })}
                                                className="w-full bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl py-3 pr-4 pl-12 outline-none focus:border-emerald-500 transition-colors font-black text-lg text-emerald-700"
                                                placeholder="0"
                                            />
                                            <span className="absolute left-4 top-4 text-sm font-bold text-emerald-400">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-slate-900/10">
                                    <span className="font-bold text-slate-400">السعر النهائي بعد الخصم</span>
                                    <span className="font-black text-2xl">
                                        {(parseFloat(oilConfig.price || 0) * (1 - (parseFloat(oilConfig.discount || 0) / 100))).toFixed(2)} ج.م
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                                <button
                                    onClick={() => {
                                        if (oilConfig.oils.length === 0) {
                                            notify('يجب اختيار زيت واحد على الأقل', 'error')
                                            return
                                        }
                                        if (!oilConfig.price) {
                                            notify('برجاء تحديد السعر', 'error')
                                            return
                                        }

                                        // Validate Stock logic-RE-CHECK against latest products array to avoid stale state
                                        if (oilConfig.bottle && !oilConfig.bottle.isVirtual) {
                                            const latestBottle = products.find(p => p.id === oilConfig.bottle.id)
                                            if (latestBottle && Number(latestBottle.stock_quantity) <= 0) {
                                                notify(`عذراً، زجاجة ${latestBottle.name} نفدت للتو من المخزون! ❌`, 'error')
                                                // Refresh local bottle ref
                                                setOilConfig(prev => ({ ...prev, bottle: latestBottle }))
                                                return
                                            }
                                        }

                                        // Validate Oils Stock (strict unit-based check)
                                        for (const item of oilConfig.oils) {
                                            if (!item.ml || parseFloat(item.ml) <= 0) {
                                                notify(`برجاء تحديد كمية للزيت: ${item.oil.name} `, 'error')
                                                return;
                                            }
                                            // Strictly check unit: gram products use total_gram, ml/oil use total_ml
                                            let availableStock;
                                            if (item.oil.sell_unit === 'gram') {
                                                availableStock = parseFloat(item.oil.total_gram || item.oil.stock_quantity || 0);
                                            } else if (item.oil.sell_unit === 'ml') {
                                                availableStock = parseFloat(item.oil.total_ml || item.oil.stock_quantity || 0);
                                            } else {
                                                // General oil category: prefer total_gram then total_ml
                                                availableStock = parseFloat(item.oil.total_gram || item.oil.total_ml || item.oil.stock_quantity || 0);
                                            }

                                            if (availableStock < parseFloat(item.ml)) {
                                                notify(`الكمية غير كافية للزيت: ${item.oil.name} (المتاح: ${availableStock})`, 'error')
                                                return;
                                            }
                                        }

                                        const discountVal = parseFloat(oilConfig.discount) || 0;
                                        const originalPrice = parseFloat(oilConfig.price) || 0;
                                        const finalPrice = Math.max(0, originalPrice * (1 - discountVal / 100));

                                        const bottleText = oilConfig.bottle ? `نوع الزجاجة: ${oilConfig.bottle.name} ` : 'بدون زجاجة';
                                        const oilsText = oilConfig.oils.map(o => `${o.oil.name} (${o.ml} مل)`).join(' + ');
                                        const description = `${bottleText} \nالمكونات: ${oilsText}`;

                                        const cartItem = {
                                            id: Date.now(),
                                            type: 'oil_mix',
                                            name: `تركيبة عطور`,
                                            description: description,
                                            price: finalPrice,
                                            discount: 0,
                                            qty: 1,
                                            itemType: 'product',
                                            oils: oilConfig.oils.map(o => ({ oil_id: o.oil.id, ml: parseFloat(o.ml) })),
                                            bottle_id: oilConfig.bottle ? oilConfig.bottle.id : null,
                                        }

                                        setCart([...cart, cartItem])
                                        setOilConfig({ show: false, oils: [], price: '', discount: '', bottle: null })
                                        setLastBottle(null) // Reset or keep? User implied reset flow maybe. detailed flow allows reset.
                                        notify('تم إضافة التركيبة للسلة', 'success')
                                    }}
                                    className="w-full bg-brand-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>إضافة التركيبة للسلة</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-black text-xl text-slate-800">معاينة الفاتورة قبل الطباعة</h3>
                                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-xl">
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
                                <div className="bg-white shadow-xl mx-auto p-8 rounded-xl border border-slate-100 max-w-[80mm] text-right font-mono text-[13px] text-black">
                                    {/* Mockup of the thermal receipt */}
                                    <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
                                        {settings.shop_logo && (
                                            <img
                                                src={settings.shop_logo}
                                                alt="Logo"
                                                className="w-16 h-16 mx-auto mb-2 object-contain grayscale"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        )}
                                        <h1 className="text-lg font-bold m-0">{settings.shop_name}</h1>
                                        {settings.shop_address && (
                                            <p className="m-1 text-xs">{settings.shop_address}</p>
                                        )}
                                        {settings.shop_phone && (
                                            <p className="m-1 font-bold">هاتف: {settings.shop_phone}</p>
                                        )}
                                        {settings.shop_whatsapp && (
                                            <p className="m-1 font-bold">واتساب: {settings.shop_whatsapp}</p>
                                        )}
                                    </div>
                                    <div className="mb-4 space-y-1">
                                        <div className="flex justify-between"><span>تاريخ:</span><span>{new Date().toLocaleDateString('ar-EG')}</span></div>
                                        <div className="flex justify-between"><span>رقم الفاتورة:</span><span className="font-black text-lg">#{receiptData.invoiceCode || '---'}</span></div>
                                        <div className="flex justify-between"><span>بائع:</span><span>{user.username}</span></div>
                                        <div className="flex justify-between"><span>عميل:</span><span>{receiptData.customer_name || '---'}</span></div>
                                    </div>
                                    <table className="w-full mb-6 border-y border-dashed border-slate-300 py-2">
                                        <thead>
                                            <tr className="border-b border-slate-900">
                                                <th className="text-right py-1">الصنف</th>
                                                <th className="text-center py-1">ك</th>
                                                <th className="text-left py-1">ج</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.map((item, i) => (
                                                <tr key={i} className="border-b border-slate-50">
                                                    <td className="py-2 text-right">
                                                        <div className="font-bold">{item.name}</div>
                                                        {item.description && <div className="text-[10px] whitespace-pre-line text-slate-500">
                                                            {settings.show_ml_in_invoices === '0' 
                                                                ? item.description
                                                                    .replace(/\s?\([0-9.]+\s*م[لي]+\)/g, '')
                                                                    .replace(/[0-9.]+\s*م[لي]+\s*/g, '')
                                                                : item.description}
                                                        </div>}
                                                        {lineDiscountPercent(item) > 0 && (
                                                            <div className="text-[10px] font-bold text-emerald-700">خصم {lineDiscountPercent(item)}%</div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-center align-top">{item.qty}</td>
                                                    <td className="py-2 text-left align-top">{(lineUnitNet(item) * item.qty).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {itemsDiscount > 0 && (
                                        <div className="flex justify-between text-xs font-bold mb-1 opacity-70">
                                            <span>قبل الخصم:</span>
                                            <span className="line-through text-slate-400">{itemsSubtotal.toFixed(2)} ج.م</span>
                                        </div>
                                    )}
                                    {itemsDiscount > 0 && (
                                        <div className="flex justify-between text-xs font-bold mb-2 text-emerald-600">
                                            <span>الخصم ({((itemsDiscount/itemsSubtotal)*100).toFixed(0)}%):</span>
                                            <span>-{itemsDiscount.toFixed(2)} ج.م</span>
                                        </div>
                                    )}
                                    <div className="text-center p-4 border-2 border-slate-900 rounded-lg text-lg font-black bg-slate-50 mb-4">
                                        الإجمالي النهائي: {total.toFixed(2)} ج.م
                                    </div>
                                    <div className="text-center text-[10px] space-y-1 opacity-60">
                                        <p>*** شكراً لزيارتكم ***</p>
                                        {settings.qr_code_image && (
                                            <div className="py-2 flex flex-col items-center">
                                                <img
                                                    src={settings.qr_code_image}
                                                    alt="Store QR"
                                                    className="w-24 h-24 mb-1"
                                                />
                                                <p className="text-[8px] font-bold">يمكنكم مسح الكود للتواصل معنا</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 block text-right">طريقة الدفع</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'cash' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            كاش
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('visa')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'visa' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            فيزا
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('transfer')}
                                            className={`py-3 rounded-xl font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-primary'} `}
                                        >
                                            تحويل
                                        </button>
                                    </div>
                                </div>

                                {paymentMethod === 'transfer' && (
                                    <div className="space-y-2 animate-fadeIn">
                                        <label className="text-sm font-bold text-slate-700 block text-right">نوع التحويل</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'vodafone_cash', label: 'فودافون كاش' },
                                                { id: 'etisalat_cash', label: 'اتصالات كاش' },
                                                { id: 'instapay', label: 'انستا باي' },
                                                { id: 'fawry', label: 'فوري' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setTransferType(type.id)}
                                                    className={`py-2 rounded-lg font-bold text-sm transition-all ${transferType === type.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-800'} `}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`p-8 bg-white border-t border-slate-100 grid ${settings.show_sticker_button !== '0' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    تعديل الطلب
                                </button>
                                <button
                                    onClick={handleConfirmSale}
                                    className="px-6 py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl shadow-brand-primary/30 hover:bg-brand-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    تأكيد وطباعة
                                </button>
                                {settings.show_sticker_button !== '0' && (
                                    <button
                                        onClick={() => {
                                            setIsPrintingSticker(true)
                                            setTimeout(() => {
                                                handleStickerPrint()
                                                setIsPrintingSticker(false)
                                            }, 100)
                                        }}
                                        className="px-4 py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/30 hover:bg-amber-400 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        طباعة استيكر
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lazy Render Printable Components removed - using printComponent instead */}

            {/* Hidden Invoice for Printing (Thermal) */}
            <div style={{ display: 'none' }}>
                <PrintableInvoice
                    ref={componentRef}
                    sale={receiptData}
                    settings={settings}
                    parseDetails={parseDetails}
                />
            </div>

            {/* Sales History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                        onClick={() => setShowHistory(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-brand-primary to-purple-600 text-white p-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <History className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black">سجل المبيعات</h2>
                                        <p className="text-white/80 text-sm font-bold mt-1">آخر {salesHistory.length} عملية بيع</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-8">
                                {salesHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <History className="w-24 h-24 mb-4 opacity-20" />
                                        <p className="text-xl font-bold">لا توجد مبيعات بعد</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {salesHistory.map((sale) => (
                                            <motion.div
                                                key={`${sale.entry_type} -${sale.id} `}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`bg-slate-50 rounded-2xl p-6 border-2 transition-all ${sale.is_return ? 'border-red-100' : 'border-slate-100 hover:border-brand-primary/20'} `}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sale.is_return ? 'bg-red-50' : 'bg-brand-primary/10'} `}>
                                                            {sale.is_return ? (
                                                                <RefreshCw className="w-6 h-6 text-red-500" />
                                                            ) : (
                                                                <ShoppingCart className="w-6 h-6 text-brand-primary" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg font-black text-slate-900">
                                                                    {sale.is_return ? 'مرتجع' : 'فاتورة'} #{sale.invoice_code || sale.id}
                                                                </span>
                                                                {sale.is_return && (
                                                                    <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                                                        عملية مرتجع
                                                                    </span>
                                                                )}
                                                                {sale.customer_name && (
                                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center gap-2">
                                                                        <User className="w-4 h-4" />
                                                                        {sale.customer_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                                <span className="font-bold">{new Date(sale.date).toLocaleString('ar-EG')}</span>
                                                                {sale.cashier_name && (
                                                                    <span className="font-bold">الكاشير: {sale.cashier_name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`text-3xl font-black ${sale.is_return ? 'text-red-500' : 'text-brand-primary'} `}>
                                                            {sale.is_return ? '-' : ''}{sale.total} ج.م
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-bold mt-1">{sale.items?.length || 0} عنصر</div>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                {sale.items && sale.items.length > 0 && (
                                                    <div className="bg-white rounded-xl p-4 space-y-2">
                                                        {sale.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                                        <Tag className="w-4 h-4 text-slate-400" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900">{item.item_name}</div>
                                                                        {item.details && (
                                                                            <div className="text-[10px] text-slate-400 font-bold whitespace-pre-line leading-relaxed">
                                                                                {parseDetails(item.details)}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-xs text-slate-400">الكمية: {item.quantity}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="font-black text-slate-700">{item.price} ج.م</div>
                                                            </div>
                                                        ))}
                                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                                                            {!sale.is_return && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleReprintSticker(sale)}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                                                                    >
                                                                        <Printer className="w-4 h-4" />
                                                                        طبع استيكر
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReprintInvoice(sale)}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                                                                    >
                                                                        <Printer className="w-4 h-4" />
                                                                        طبع فاتورة
                                                                    </button>
                                                                </>
                                                            )}
                                                            {sale.customer_phone && (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await window.api.sendWhatsApp({
                                                                                phone: sale.customer_phone,
                                                                                invoiceCode: sale.invoice_code || sale.id,
                                                                                customerName: sale.customer_name,
                                                                                total: sale.total,
                                                                                items: sale.items.map(i => ({ name: i.item_name, quantity: i.quantity }))
                                                                            });

                                                                            if (res.success) {
                                                                                if (res.method === 'bot') {
                                                                                    notify('تم إرسال الفاتورة آلياً بنجاح ✅', 'success');
                                                                                } else {
                                                                                    notify('البوت غير متصل. جاري فتح رابط الإرسال اليدوي...', 'warning');
                                                                                    if (res.url) window.api.openExternal(res.url);
                                                                                }
                                                                            } else {
                                                                                notify('فشل الإرسال: ' + res.message, 'error');
                                                                            }
                                                                        } catch (err) {
                                                                            notify('خطأ تقني: ' + err.message, 'error');
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" />
                                                                    إرسال واتساب
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Returns Modal */}
            <AnimatePresence>
                {showReturns && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50 text-right">
                                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2 flex-row-reverse">
                                    <RefreshCw className="w-7 h-7 text-red-600" />
                                    <span>استرجاع / استبدال منتج</span>
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowReturns(false)
                                        setReturnInvoiceId('')
                                        setReturnSale(null)
                                        setSelectedReturnItems([])
                                        setReturnSearchResults([])
                                    }}
                                    className="text-slate-400 hover:text-slate-900 transition-all"
                                >
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 space-y-6">
                                {!returnSale ? (
                                    /* Step 1: Invoice Lookup */
                                    <div className="space-y-4 text-right">
                                        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 flex flex-row-reverse items-center gap-4">
                                            <AlertCircle className="w-10 h-10 text-blue-600" />
                                            <p className="text-blue-800 font-bold">أدخل رقم العملية (رقم المعرف) للبحث عن البيعة</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={returnInvoiceId}
                                                onChange={(e) => setReturnInvoiceId(e.target.value)}
                                                placeholder="أدخل رقم العملية المنتهي أو اسم العميل..."
                                                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 text-lg font-bold outline-none focus:border-red-500 transition-all text-right"
                                            />
                                            <button
                                                onClick={handleLookupInvoice}
                                                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95"
                                            >
                                                بحث
                                            </button>
                                        </div>
                                        {returnSearchResults.length > 0 && (
                                            <div className="mt-4 bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                                <div className="bg-slate-50 p-4 border-b border-slate-100 text-right font-black text-slate-700">
                                                    نتائج البحث لـ "{returnInvoiceId}":
                                                </div>
                                                <div className="max-h-64 overflow-y-auto">
                                                    {returnSearchResults.map((sale) => (
                                                        <div
                                                            key={sale.id}
                                                            onClick={async () => {
                                                                const s = await window.api.findSaleById(sale.id);
                                                                handleSetReturnSale(s);
                                                            }}
                                                            className="p-4 border-b border-slate-50 hover:bg-red-50 cursor-pointer transition-colors flex justify-between items-center text-right"
                                                        >
                                                            <div className="flex gap-4 items-center">
                                                                <span className="font-black text-brand-primary text-xl px-4">{sale.total} ج.م</span>
                                                                <div>
                                                                    <div className="font-bold text-slate-800">فاتورة #{sale.invoice_code || sale.id}</div>
                                                                    <div className="text-sm text-slate-500">{new Date(sale.date).toLocaleString('ar-EG')}</div>
                                                                </div>
                                                            </div>
                                                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                                <RefreshCw className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Step 2: Select Items & Process */
                                    <div className="space-y-6 text-right" dir="rtl">
                                        {/* Sale Info */}
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <div className="grid grid-cols-2 gap-4 text-sm text-right">
                                                <div><span className="text-slate-500">كود الفاتورة:</span> <span className="font-black text-xl text-red-600">#{returnSale.invoice_code || '---'}</span></div>
                                                <div><span className="text-slate-500">التاريخ:</span> <span className="font-black">{new Date(returnSale.date).toLocaleDateString('ar-EG')}</span></div>
                                                <div><span className="text-slate-500">العميل:</span> <span className="font-black">{returnSale.customer_name || 'غير محدد'}</span></div>
                                                <div><span className="text-slate-500">الإجمالي:</span> <span className="font-black text-brand-primary">{returnSale.total} ج.م</span></div>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-3">
                                            <h4 className="font-black text-lg">اختر المنتجات المراد إرجاعها:</h4>
                                            {selectedReturnItems.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`border-2 rounded-2xl p-4 transition-all ${item.remaining_quantity <= 0
                                                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                        : item.selected
                                                            ? 'border-red-500 bg-red-50 cursor-pointer'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                                                        } `}
                                                    onClick={() => item.remaining_quantity > 0 && handleToggleReturnItem(idx)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${item.selected ? 'bg-red-600 border-red-600' : 'border-slate-300'
                                                                } `}>
                                                                {item.selected && <span className="text-white font-black text-xs">✓</span>}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-black text-slate-900">
                                                                        {item.isUnified && item.bottle_name ? `تركيبة عطور (${item.bottle_name})` : item.item_name}
                                                                    </div>
                                                                    {item.remaining_quantity <= 0 && (
                                                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">تم إرجاعه بالكامل</span>
                                                                    )}
                                                                    {item.returned_quantity > 0 && item.remaining_quantity > 0 && (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg">مرتجع جزئياً</span>
                                                                    )}
                                                                </div>
                                                                {item.details && (
                                                                    <div className="text-[10px] text-slate-400 font-bold whitespace-pre-line leading-relaxed">
                                                                        {parseDetails(item.details)}
                                                                    </div>
                                                                )}
                                                                <div className="text-sm text-slate-500">
                                                                    الكمية: {item.quantity}
                                                                    {item.returned_quantity > 0 && (
                                                                        <span className="text-orange-600 font-bold"> (تم إرجاع {item.returned_quantity})</span>
                                                                    )}
                                                                    {' | '}السعر: {item.price} ج.م
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {item.selected && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400 font-bold">إرجاع كمية:</span>
                                                                <input
                                                                    type="number"
                                                                    value={item.returnQty}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation()
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        const newItems = [...selectedReturnItems]
                                                                        newItems[idx].returnQty = Math.min(val, item.remaining_quantity || item.quantity)
                                                                        setSelectedReturnItems(newItems)
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    max={item.remaining_quantity || item.quantity}
                                                                    step="0.1"
                                                                    className="w-20 bg-white border-2 border-slate-200 rounded-xl py-2 px-3 text-center font-bold"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Return Type */}
                                        <div className="space-y-2">
                                            <label className="font-black text-slate-700 block text-right">نوع العملية:</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setReturnType('refund')}
                                                    className={`flex-1 py-3 rounded-2xl font-black border-2 transition-all ${returnType === 'refund'
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                                                        } `}
                                                >
                                                    استرجاع (رد المبلغ)
                                                </button>
                                                <button
                                                    onClick={() => setReturnType('exchange')}
                                                    className={`flex-1 py-3 rounded-2xl font-black border-2 transition-all ${returnType === 'exchange'
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                        } `}
                                                >
                                                    استبدال
                                                </button>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="space-y-2">
                                            <label className="font-black text-slate-700 block text-right">سبب {returnType === 'refund' ? 'الاسترجاع' : 'الاستبدال'}:</label>
                                            <textarea
                                                value={returnReason}
                                                onChange={(e) => setReturnReason(e.target.value)}
                                                placeholder="مثال: منتج تالف، عدم رضا العميل... (اختياري)"
                                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 font-bold outline-none focus:border-red-500 transition-all resize-none text-right"
                                                rows="3"
                                            />
                                        </div>

                                        {/* Total */}
                                        {selectedReturnItems.some(i => i.selected) && (
                                            <div className="bg-brand-primary/10 border-2 border-brand-primary/20 rounded-2xl p-6 flex justify-between items-center">
                                                <span className="font-black text-3xl text-brand-primary">
                                                    {selectedReturnItems
                                                        .filter(i => i.selected)
                                                        .reduce((sum, i) => sum + (i.price * i.returnQty), 0)
                                                        .toFixed(2)
                                                    } ج.م
                                                </span>
                                                <span className="font-black text-lg">المبلغ المستحق:</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {returnSale && (
                                <div className="p-6 border-t border-slate-100 flex gap-4">
                                    <button
                                        onClick={handleProcessReturn}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black transition-all active:scale-95"
                                    >
                                        تأكيد {returnType === 'refund' ? 'الاسترجاع' : 'الاستبدال'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setReturnSale(null)
                                            setSelectedReturnItems([])
                                            setReturnSearchResults([])
                                        }}
                                        className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Price Selection Modal */}
            {itemToChoosePrice && (() => {
                const retailPrice = resolvePrice(itemToChoosePrice, false);
                const wholesalePrice = resolvePrice(itemToChoosePrice, true);

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="p-8 border-b bg-slate-50">
                                <h3 className="text-2xl font-black text-slate-800 text-center">اختيار نوع السعر</h3>
                                <p className="text-slate-500 text-center font-bold mt-2">{itemToChoosePrice.name}</p>
                            </div>
                            <div className="p-8 space-y-4">
                                <button
                                    onClick={() => {
                                        const item = { ...itemToChoosePrice, price: retailPrice, is_choosing_price: true };
                                        if (item.category === 'oil' || item.category === 'زيت') {
                                            setOilConfig({
                                                show: true,
                                                oils: [{ oil: item, ml: '' }],
                                                price: '',
                                                discount: '',
                                                bottle: lastBottle || null,
                                                pricingTier: 'retail'
                                            });
                                        } else {
                                            proceedAddToCart(item, itemToChoosePrice.type || 'product');
                                        }
                                        setItemToChoosePrice(null);
                                    }}
                                    className="w-full flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 hover:border-brand-primary hover:bg-purple-50 transition-all group"
                                >
                                    <div className="text-right">
                                        <span className="block font-black text-slate-800 text-lg">سعر القطاعي</span>
                                        <span className="text-brand-primary font-black text-xl">{retailPrice} ج.م</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-brand-primary/10 flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-all">
                                        <Users size={24} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        const wholesaleItem = { 
                                            ...itemToChoosePrice, 
                                            price: wholesalePrice,
                                            is_choosing_price: true 
                                        };
                                        if (wholesaleItem.category === 'oil' || wholesaleItem.category === 'زيت') {
                                            setOilConfig({
                                                show: true,
                                                oils: [{ oil: wholesaleItem, ml: '' }],
                                                price: '',
                                                discount: '',
                                                bottle: lastBottle || null,
                                                pricingTier: 'wholesale'
                                            });
                                        } else {
                                            proceedAddToCart(wholesaleItem, itemToChoosePrice.type || 'product');
                                        }
                                        setItemToChoosePrice(null);
                                    }}
                                    className="w-full flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                                >
                                    <div className="text-right">
                                        <span className="block font-black text-slate-800 text-lg">سعر الجملة</span>
                                        <span className="text-indigo-600 font-black text-xl">{wholesalePrice} ج.م</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all">
                                        <Package size={24} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => setItemToChoosePrice(null)}
                                    className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                );
            })()}
        </div>
    )
}
