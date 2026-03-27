import React from 'react'

const parseDetails = (details) => {
    if (!details) return '';
    try {
        const parsed = typeof details === 'string' ? JSON.parse(details) : details;
        let text = parsed.text || '';
        if (!text && parsed.items && Array.isArray(parsed.items)) {
            text = parsed.items.map(i => {
                const amount = i.amount || i.qty || i.quantity;
                const unit = i.unit || (i.is_ml ? 'مل' : i.is_gram ? 'جرام' : '');
                return `${i.name}${amount ? ` (${amount}${unit})` : ''}`;
            }).join(' + ');
        }
        if (!text && typeof details === 'string' && !details.startsWith('{')) text = details;
        if (text) {
            return text.split('\n').filter(line => line.trim() !== '' && !line.includes('السعر:') && !line.includes('سعر:')).join('\n');
        }
        return '';
    } catch (e) {
        if (typeof details === 'string') {
            return details.split('\n').filter(line => line.trim() !== '' && !line.includes('السعر:') && !line.includes('سعر:')).join('\n');
        }
        return '';
    }
}

/**
 * A simple Code 128B Barcode SVG Generator
 */
/**
 * Professional Barcode Constants & Patterns
 */
// Code 128B patterns (1 = bar, 0 = space)
const C128_PATTERNS = {
    ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
    '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
    '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11001100100',
    ',': '10110111000', '-': '10110001110', '.': '10001101110', '/': '10111011000',
    '0': '10111000110', '1': '10001110110', '2': '11101101000', '3': '11101100010',
    '4': '11101100100', '5': '11100011010', '6': '11100011001', '7': '11011001110',
    '8': '11011000111', '9': '11000110111', ':': '11101110100', ';': '11110110100',
    '<': '11110110010', '=': '11011011110', '>': '11011001111', '?': '11001101111',
    '@': '10111101110', 'A': '10111100011', 'B': '10001111011', 'C': '10111011110',
    'D': '10111000111', 'E': '10001110111', 'F': '11110111010', 'G': '11110111001',
    'H': '11110001101', 'I': '11110001110', 'J': '11110101100', 'K': '11110100110',
    'L': '11110010110', 'M': '11110011010', 'N': '11110011001', 'O': '11101101111',
    'P': '11101001111', 'Q': '11100101111', 'R': '10111110110', 'S': '10111110011',
    'T': '10001111101', 'U': '10111011111', 'V': '10111110111', 'W': '11101011111',
    'X': '11110101111', 'Y': '11111010110', 'Z': '11111010011', '[': '11111011010',
    '\\': '11111011001', ']': '11110110111', '^': '11110111101', '_': '11111011101',
    '`': '11111101101', 'a': '11111101110', 'b': '11111101111', 'c': '10110111111',
    'd': '10111101111', 'e': '10001011111', 'f': '10111110100', 'g': '10111110010',
    'h': '11101011110', 'i': '11101111010', 'j': '11101111001', 'k': '11111010100',
    'l': '11111011100', 'm': '11111011110', 'n': '10111111010', 'o': '10111111001',
    'p': '11110101110', 'q': '11111101011', 'r': '11111101101', 's': '11111110110',
    't': '11111110101', 'u': '11111011111', 'v': '11111101111', 'w': '11111110111',
    'x': '11101111101', 'y': '11101111110', 'z': '11010111111', '{': '11011111011',
    '|': '11011111101', '}': '11111011011', '~': '11111110101'
};

// EAN-13 Patterns
const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

const BARCODE_START_B = '11010010000';
const BARCODE_STOP = '1100011101011';
const BARCODE_ALPHABET = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

/**
 * Format ID or Code into an EAN-style 13-digit string starting with 622
 */
const formatEANStyle = (val) => {
    const s = String(val || '0');
    // If it's already an EAN-13 (12 or 13 digits)
    if (/^\d{12,13}$/.test(s)) {
        if (s.length === 12) {
            let sum = 0;
            for (let i = 0; i < 12; i++) sum += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3);
            return s + ((10 - (sum % 10)) % 10);
        }
        return s;
    }
    
    // Fallback: Create a 13-digit code: 622 + padded numeric ID
    const core = "622" + s.replace(/\D/g, '').slice(-9).padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(core[i]) * (i % 2 === 0 ? 1 : 3);
    const checkDigit = (10 - (sum % 10)) % 10;
    return core + checkDigit;
};

/**
 * Professional Barcode SVG Generator (Supports EAN-13 and Code 128)
 */
export const BarcodeGenerator = React.memo(({ value }) => {
    const val = String(value || '');
    
    // EAN-13 Encoding Logic (corrected per ISO/IEC 15420)
    const encodeEAN13 = (str) => {
        if (!/^\d{13}$/.test(str)) return null;
        const first = parseInt(str[0]);
        const parityPattern = EAN_PARITY[first];
        
        let bits = '101'; // Start Guard (3 bits)
        // Left side: digits 1-6 using L or G pattern based on first digit's parity
        for (let i = 1; i <= 6; i++) {
            const digit = parseInt(str[i]);
            bits += parityPattern[i - 1] === 'L' ? EAN_L[digit] : EAN_G[digit];
        }
        bits += '01010'; // Center Guard (5 bits) — CORRECTED
        // Right side: digits 7-12 always use R pattern
        for (let i = 7; i <= 12; i++) {
            const digit = parseInt(str[i]);
            bits += EAN_R[digit];
        }
        bits += '101'; // Stop Guard (3 bits)
        return bits;  // Total: 3 + 6*7 + 5 + 6*7 + 3 = 95 bits
    };

    // Code 128 Encoding Logic
    const encodeC128 = (str) => {
        const getChecksumPattern = (s) => {
            let sum = 104;
            for (let i = 0; i < s.length; i++) {
                const charCode = s.charCodeAt(i) - 32;
                sum += charCode * (i + 1);
            }
            const checkValue = sum % 103;
            const char = BARCODE_ALPHABET[checkValue] || ' ';
            return C128_PATTERNS[char] || C128_PATTERNS[' '];
        };

        let res = BARCODE_START_B;
        for (let char of str) res += C128_PATTERNS[char] || C128_PATTERNS[' '];
        res += getChecksumPattern(str);
        res += BARCODE_STOP;
        return res;
    };

    // Decision: EAN-13 if 12-13 numeric, otherwise Code 128
    const isEAN = /^\d{12,13}$/.test(val);
    const encodedVal = isEAN ? formatEANStyle(val) : val;
    const bits = isEAN ? encodeEAN13(encodedVal) : encodeC128(encodedVal);
    
    if (!bits) return null;

    const quietZone = isEAN ? '0000000' : '00000';
    const finalBars = quietZone + bits + quietZone;
    const barsWidth = finalBars.length;
    const svgHeight = 100;

    // Guard bar positions in EAN-13 (within the 95-bit payload, after quiet zone)
    // Quiet zone = 7 bits. Payload bits: 0-94
    // Start Guard:  pos 0,1,2  → after quiet: 7,8,9
    // Center Guard: pos 45,46,47,48,49 → after quiet: 52,53,54,55,56
    // Stop Guard:   pos 92,93,94 → after quiet: 99,100,101
    const isGuard = (i) => {
        if (!isEAN) return false;
        const pos = i - 7; // subtract quiet zone length (7)
        return (pos >= 0 && pos <= 2) || (pos >= 45 && pos <= 49) || (pos >= 92 && pos <= 94);
    };

    return (
        <svg
            viewBox={`0 0 ${barsWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <path
                d={finalBars.split('').map((b, i) => {
                    if (b === '0') return '';
                    const h = isGuard(i) ? svgHeight : svgHeight * 0.85;
                    return `M${i},0 h1 v${h} h-1 z`;
                }).join(' ')}
                fill="black"
            />
        </svg>
    );
});

export const BarcodeSticker = React.memo(React.forwardRef(({ product, settings }, ref) => {
    if (!product) return <div ref={ref} style={{ padding: '10mm', color: '#000' }}>جاري التحضير...</div>;

    const shopName = settings?.shop_name || '';
    const itemName = product.item_name || product.name || product.product_name || '---';
    const barcodeValue = product.barcode || '';

    // Price Formatting
    let priceLabel = '';
    const unitLabel = 'جم';
    const priceValue = product.price_per_gram || product.price_per_ml || 0;
    priceLabel = `${priceValue} ج.م/${unitLabel}`;

    const quantityLabel = product.category === 'oil'
        ? `${product.total_ml || product.total_gram || product.stock_quantity || 0} جم`
        : `${product.stock_quantity || 0} ق`;

    // Dynamic Orientation Logic
    const isTwin = settings?.sticker_type === 'twin';
    const isTwin35 = settings?.sticker_type === 'twin_35x25';
    const isStandard35 = settings?.sticker_type === 'standard_35x25';
    const isPharmacy = settings?.sticker_type === 'pharmacy';
    const isCompact = settings?.sticker_type === 'compact';
    const isPortrait = settings?.sticker_orientation === 'portrait';

    const useCustomSize = settings?.use_custom_sticker_size === 'true';

    // Helper for dynamic font scaling and horizontal compression
    const getDynamicStyles = (name) => {
        const len = name?.length || 0;
        const words = name?.trim()?.split(/\s+/)?.length || 0;
        let fontSize = '15pt';
        let scaleX = 1;

        if (len < 12) { fontSize = '16pt'; scaleX = 1; }
        else if (len < 18) { fontSize = '15pt'; scaleX = 0.95; }
        else if (len < 25) { fontSize = '13pt'; scaleX = 0.95; }
        else if (len < 35) { fontSize = '11pt'; scaleX = 0.85; }
        else if (len < 55) { fontSize = '10pt'; scaleX = 0.65; }
        else { fontSize = '8pt'; scaleX = 0.45; }

        return { fontSize, scaleX };
    };
    const { fontSize: dynamicNameFontSize, scaleX: dynamicNameScaleX } = getDynamicStyles(itemName);

    // Base dimensions (Landscape default)
    let baseW = 58;
    let baseH = 16;

    if (useCustomSize && settings?.custom_sticker_width && settings?.custom_sticker_height) {
        baseW = parseFloat(settings.custom_sticker_width);
        baseH = parseFloat(settings.custom_sticker_height);
    } else {
        baseW = (isTwin35 || isStandard35) ? 35 : (isTwin ? 38 : (isPharmacy ? 38 : (isCompact ? 58 : 58)));
        baseH = (isTwin35 || isStandard35) ? 25 : (isTwin ? 25 : (isPharmacy ? 12.5 : (isCompact ? 16 : 16)));
    }

    // Swap if Portrait is requested
    if (isPortrait) {
        ;[baseW, baseH] = [baseH, baseW]
    }

    const sWidth = `${baseW}mm`;
    const sHeight = `${baseH}mm`;

    const isEAN = /^\d{12,13}$/.test(barcodeValue);
    const displayBarcode = isEAN ? formatEANStyle(barcodeValue) : barcodeValue;

    return (
        <div ref={ref} className="barcode-sticker-print" dir="rtl">
            <style>
                {`
                    @media print {
                        @page {
                            margin: 0;
                            size: ${sWidth} ${sHeight};
                        }
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            background-color: white !important;
                            width: ${sWidth} !important;
                            height: ${sHeight} !important;
                            overflow: hidden !important;
                        }
                        .barcode-sticker-print {
                            visibility: visible !important;
                            opacity: 1 !important;
                            background-color: white !important;
                            width: ${sWidth} !important;
                            height: ${sHeight} !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: row !important;
                            align-items: center !important;
                            justify-content: flex-start !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            overflow: hidden !important;
                            page-break-after: always;
                            color: black !important;
                        }

                        .print-half {
                            flex: 1;
                            width: 100%;
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: flex-start;
                            overflow: hidden;
                            box-sizing: border-box;
                            padding: 0.5mm 0.5mm;
                            text-align: center;
                        }

                        /* Container for the two physical stickers on one paper */
                        .twin-wrapper {
                            display: flex !important;
                            flex-direction: row !important;
                            width: 100% !important;
                            height: 100% !important;
                        }
                        .first-sticker-slot {
                            flex: 0 0 ${isStandard35 ? '100%' : '50%'}; 
                            width: ${isStandard35 ? '100%' : '50%'} !important;
                            height: 100% !important;
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            justify-content: flex-start !important;
                            overflow: hidden !important;
                            padding: 0.5mm 0.5mm;
                            gap: 0.2mm;
                        }

                        .empty-sticker-slot {
                            flex: 0 0 50%;
                            width: 50% !important;
                        }
                        
                        .print-item-name { 
                            font-size: ${dynamicNameFontSize}; 
                            font-weight: 950; 
                            text-align: center; 
                            width: 100%;
                            overflow: hidden; 
                            line-height: 1.1;
                            display: block;
                            white-space: normal;
                            color: #000;
                            margin: 0;
                            padding: 0;
                            display: -webkit-box;
                            -webkit-line-clamp: 3;
                            -webkit-box-orient: vertical;
                            letter-spacing: -0.5px;
                            max-height: 11mm;
                            transform: scaleX(${dynamicNameScaleX});
                            transform-origin: center;
                        }
                        .print-barcode-container {
                            height: 12.5mm;
                            width: 100%;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            margin-top: 0.2mm;
                            direction: ltr !important;
                        }
                        .print-barcode-text {
                            font-size: 8.5pt;
                            font-weight: 1000;
                            margin-top: -0.5mm;
                            letter-spacing: 0;
                            font-family: 'Arial Black', Arial, sans-serif;
                            width: 100%;
                            display: flex;
                            justify-content: center;
                            gap: 1.5mm;
                            direction: ltr !important;
                        }
                        .print-price {
                            font-size: 13pt;
                            font-weight: 950;
                            line-height: 1;
                            text-align: center;
                            width: 100%;
                            color: #000;
                            margin-top: 0.2mm;
                            padding-top: 0.5mm;
                            border-top: 0.3mm solid #000;
                        }

                        /* Compact One-Line Layout Styles */
                        .compact-row {
                            display: flex !important;
                            flex-direction: ${isPortrait ? 'column' : 'row'} !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: ${isPortrait ? '15mm' : '50mm'} !important;
                            height: ${isPortrait ? '50mm' : '15mm'} !important;
                            max-width: ${isPortrait ? '15mm' : '50mm'} !important;
                            max-height: ${isPortrait ? '50mm' : '15mm'} !important;
                            gap: ${isPortrait ? '1mm' : '4mm'} !important;
                            overflow: hidden !important;
                        }
                        .compact-col {
                            flex: 1 !important;
                            width: ${isPortrait ? '100%' : '30mm'} !important;
                            max-width: ${isPortrait ? '100%' : '30mm'} !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: center !important;
                            align-items: center !important;
                            height: 100% !important;
                            overflow: hidden !important;
                            text-align: center !important;
                        }
                        .compact-barcode { 
                            flex: 1.2 !important;
                            height: ${isPortrait ? '18mm' : '13mm'} !important;
                            width: ${isPortrait ? '15mm' : '18mm'} !important;
                            max-width: ${isPortrait ? '15mm' : '18mm'} !important;
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        .compact-name { 
                            font-size: ${isPortrait ? '14pt' : '24pt'} !important;
                            font-weight: 1000 !important; 
                            color: #000 !important;
                            line-height: 0.85 !important;
                            text-align: center !important;
                            white-space: normal !important; 
                            display: -webkit-box !important;
                            -webkit-line-clamp: 2 !important;
                            -webkit-box-orient: vertical !important;
                            overflow: hidden !important; 
                            width: 100% !important;
                            margin: auto 0 !important;
                        }
                        .compact-price { 
                            font-size: ${isPortrait ? '10pt' : '13pt'} !important; 
                            font-weight: 900 !important; 
                            text-align: center !important;
                        }

                        .print-qty { font-size: ${isPharmacy || isCompact ? '6pt' : (isTwin ? '7pt' : '8pt')}; font-weight: bold; text-align: center; width: 100%; }
                    }

                    /* Screen styles (preview in UI) */
                    @media screen {
                        .barcode-sticker-print {
                            width: ${sWidth};
                            height: ${sHeight};
                            padding: ${isCompact ? '0' : '1mm'};
                            background-color: white;
                            display: flex;
                            flex-direction: ${isPortrait ? 'column' : (isCompact ? 'row' : 'column')};
                            align-items: center;
                            justify-content: center;
                            gap: ${isCompact ? '4mm' : '1mm'};
                            font-family: 'Segoe UI', sans-serif;
                            color: #000;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                            box-sizing: border-box;
                            overflow: hidden;
                        }
                        .print-shop-name { font-size: 7pt; font-weight: bold; text-align: center; width: 100%; }
                        .print-item-name { 
                            font-size: 12pt; 
                            font-weight: 900; 
                            max-height: 12mm; overflow: hidden; line-height: 1.1; 
                            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; width: 100%;
                        }
                        .print-barcode-container { width: 90%; height: 8mm; display: flex; flex-direction: column; align-items: center; background-color: white; direction: ltr; }
                        .print-barcode-text { font-size: 6pt; font-family: monospace; margin-top: 0.5mm; direction: ltr; }
                        .print-price { font-size: 12pt; font-weight: 900; text-align: center; border-top: 0.5pt solid #000; width: 100%; padding-top: 1mm; }
                        .print-qty { font-size: 8pt; font-weight: bold; text-align: center; width: 100%; }

                        /* Compact Screen Layout Styles */
                        .compact-row {
                            display: flex !important;
                            flex-direction: ${isPortrait ? 'column' : 'row'} !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: ${isPortrait ? '15mm' : '50mm'} !important;
                            height: ${isPortrait ? '50mm' : '15mm'} !important;
                            max-width: ${isPortrait ? '15mm' : '50mm'} !important;
                            max-height: ${isPortrait ? '50mm' : '15mm'} !important;
                            gap: ${isPortrait ? '1mm' : '4mm'} !important;
                            overflow: hidden !important;
                        }
                        .compact-col {
                            flex: 1 !important;
                            width: ${isPortrait ? '100%' : '30mm'} !important;
                            max-width: ${isPortrait ? '100%' : '30mm'} !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: center !important;
                            align-items: center !important;
                            height: 100% !important;
                            overflow: hidden !important;
                            text-align: center !important;
                        }
                        .compact-barcode { 
                            flex: 1.2 !important;
                            height: ${isPortrait ? '18mm' : '12mm'} !important;
                            width: ${isPortrait ? '15mm' : '16mm'} !important;
                            max-width: ${isPortrait ? '15mm' : '16mm'} !important;
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        .compact-name { 
                            font-size: ${isPortrait ? '12pt' : '16pt'} !important;
                            font-weight: 900 !important; 
                            color: #000 !important;
                            line-height: 1.1 !important;
                            text-align: center !important;
                            white-space: normal !important; 
                            display: -webkit-box !important;
                            -webkit-line-clamp: 2 !important;
                            -webkit-box-orient: vertical !important;
                            overflow: hidden !important; 
                            width: 100% !important;
                            margin: auto 0 !important;
                        }
                        .compact-price { 
                            font-size: ${isPortrait ? '10pt' : '12pt'} !important; 
                            font-weight: 900 !important; 
                            text-align: center !important;
                        }
                    }
                `}
            </style>

            <div className="twin-wrapper">
                <div className="first-sticker-slot">
                    {settings?.barcode_show_name !== '0' && <div className="print-item-name">{itemName}</div>}
                    {barcodeValue && settings?.barcode_show_graphic !== '0' && (
                        <div className="print-barcode-container">
                            <div style={{ width: '92%', height: '11mm' }}>
                                <BarcodeGenerator value={barcodeValue} />
                            </div>
                            <div className="print-barcode-text">
                                {isEAN ? (
                                    <>
                                        <span style={{ fontSize: '7pt', margin: '0 1mm 0 2mm' }}>{displayBarcode[0]}</span>
                                        <span>{displayBarcode.slice(1, 7)}</span>
                                        <span>{displayBarcode.slice(7, 13)}</span>
                                    </>
                                ) : barcodeValue}
                            </div>
                        </div>
                    )}
                    {settings?.barcode_show_price !== '0' && (
                        <div className="print-price">
                            {priceLabel}
                            {settings?.barcode_show_qty !== '0' && quantityLabel && <span style={{ fontSize: '7pt', marginRight: '1mm' }}>({quantityLabel})</span>}
                        </div>
                    )}
                </div>
                {!isStandard35 && <div className="empty-sticker-slot"></div>}
            </div>
        </div>
    );
}));

/**
 * Customer Order Label
 */
export const OrderSticker = React.memo(React.forwardRef(({ orderItem, settings }, ref) => {
    if (!orderItem) return <div ref={ref} style={{ padding: '10mm', color: '#000' }}>جاري التحضير...</div>;

    const shopName = settings?.shop_name || '';
    const itemName = orderItem.name || '---';
    const barcodeValue = orderItem.barcode || '';
    const quantity = orderItem.qty ?? orderItem.quantity ?? '';
    const unit = orderItem.unit || 'قطعة';
    const price = orderItem.price || orderItem.total_price || '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Dynamic Orientation Logic
    const isTwin = settings?.sticker_type === 'twin';
    const isPharmacy = settings?.sticker_type === 'pharmacy';
    const isPortrait = settings?.sticker_orientation === 'portrait';

    let baseW = isTwin ? 38 : (isPharmacy ? 38 : 50);
    let baseH = isTwin ? 25 : (isPharmacy ? 12.5 : 30);
    if (isPortrait) [baseW, baseH] = [baseH, baseW];

    const sWidth = `${baseW}mm`;
    const sHeight = `${baseH}mm`;

    return (
        <div ref={ref} className="order-sticker-print" dir="rtl">
            <style>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${sWidth} ${sHeight}; 
                    }
                    body { margin: 0; padding: 0; }
                    .order-sticker-print {
                        visibility: visible !important;
                        display: flex !important;
                        background-color: white !important;
                        width: ${sWidth} !important;
                        height: ${sHeight} !important;
                        padding: ${isPharmacy ? '0.5mm' : '1mm'} !important;
                        box-sizing: border-box !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: ${isPharmacy ? '0.2mm' : '0.5mm'} !important;
                        overflow: hidden !important;
                        color: black !important;
                        page-break-after: always;
                        direction: rtl !important;
                    }
                    .os-shop { font-size: ${isPharmacy ? '5pt' : '6pt'}; font-weight: bold; text-align: center; width: 100%; border-bottom: 0.1mm solid #000; }
                    .os-name { font-size: ${isPharmacy ? '7pt' : (isTwin ? '8.5pt' : '10pt')}; font-weight: 900; text-align: center; width: 100%; line-height: 1.1;
                        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                    .os-qty-row { display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 0.1mm solid #eee; padding-top: ${isPharmacy ? '0.2mm' : '0.5mm'}; }
                    .os-qty { font-size: ${isPharmacy ? '6pt' : '8pt'}; font-weight: bold; }
                    .os-price { font-size: ${isPharmacy ? '6pt' : '8pt'}; font-weight: bold; }
                    .os-datetime { font-size: 4pt; font-weight: 500; font-family: monospace; text-align: center; width: 100%; }
                    .os-barcode-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
                    .os-barcode-num { font-size: 4pt; font-family: monospace; }
                }
                @media screen {
                    .order-sticker-print {
                        width: ${sWidth}; height: ${sHeight}; padding: 1.5mm;
                        background-color: white; display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        font-family: 'Segoe UI', sans-serif; color: #000;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15);
                        box-sizing: border-box; overflow: hidden; gap: 1mm;
                    }
                    .os-shop { font-size: 6.5pt; font-weight: 900; text-align: center; border-bottom: 0.5pt solid #000; padding-bottom: 0.5mm; }
                    .os-name { font-size: 10.5pt; font-weight: 900; text-align: right; line-height: 1.2;
                        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                    .os-qty-row { display: flex; justify-content: space-between; align-items: center; }
                    .os-qty { font-size: 9pt; font-weight: 900; }
                    .os-price { font-size: 9pt; font-weight: 900; }
                    .os-datetime { font-size: 5.5pt; color: #444; font-family: monospace; text-align: center; }
                    .os-barcode-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
                    .os-barcode-num { font-size: 5pt; font-family: monospace; }
                }
            `}</style>


            {settings?.barcode_show_name !== '0' && <div className="os-name">{itemName}</div>}

            <div className="os-qty-row">
                {settings?.barcode_show_qty !== '0' && quantity !== '' && <div className="os-qty">{quantity} {unit}</div>}
                {settings?.barcode_show_price !== '0' && price !== '' && <div className="os-price">{price} ج.م</div>}
            </div>

            {settings?.barcode_show_price !== '0' && <div className="os-datetime">{dateStr}  {timeStr}</div>}

            {barcodeValue && settings?.barcode_show_graphic !== '0' && (
                <div className="os-barcode-wrap">
                    <BarcodeGenerator value={barcodeValue} />
                    <div className="os-barcode-num">{barcodeValue}</div>
                </div>
            )}
        </div>
    );
}));

/**
 * Invoice Sticker
 */
export const InvoiceSticker = React.memo(React.forwardRef(({ cart = [], total = 0, customerName = '', settings = {} }, ref) => {
    const shopName = settings?.shop_name || '';
    const shopPhone = settings?.shop_phone || '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    const items = cart || [];

    const mainTitle = items.length === 1 ? (items[0].name || '') : (shopName || 'فاتورة مبيعات');
    let mixtureDetails = items.length === 1 && items[0].details ? parseDetails(items[0].details) : '';
    // Apply ML filter on sticker too
    if (settings?.show_ml_in_invoices === '0' && mixtureDetails) {
        mixtureDetails = mixtureDetails
            .replace(/\s?\([0-9.]+\s*م[لي]+\)/g, '')
            .replace(/[0-9.]+\s*م[لي]+\s*/g, '')
            .replace(/[0-9.]+\s*مل\s*/g, '');
    }
    
    // Aggregates
    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const unitPrice = items.length === 1 ? Number(items[0].price || 0) : (total / (totalQty || 1));

    const isTwin = settings?.sticker_type === 'twin';
    const sWidth = '38mm';
    const sHeight = '25mm';

    return (
        <div ref={ref} className="scale-sticker-print" dir="rtl">
            <style>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${sWidth} ${sHeight}; 
                    }
                    html, body {
                        margin: 0 !important; padding: 0 !important;
                        background: white !important;
                    }
                    .scale-sticker-print {
                        visibility: visible !important;
                        display: flex !important;
                        flex-direction: column !important;
                        background: white !important;
                        width: ${sWidth} !important;
                        height: ${sHeight} !important;
                        margin: 0 !important;
                        padding: 0.2mm 0.5mm !important;
                        box-sizing: border-box !important;
                        color: black !important;
                        direction: rtl !important;
                        page-break-after: always;
                        overflow: hidden !important;
                        line-height: 1.1;
                    }
                    
                    /* Title Section */
                    .ss-title-wrap {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        margin-bottom: 0.3mm;
                        height: ${mixtureDetails ? '6.5mm' : '3.8mm'};
                    }
                    .ss-title {
                        font-size: 7.5pt;
                        font-weight: 900;
                        text-align: center;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                    }
                    .ss-ingredients {
                        font-size: 4pt;
                        font-weight: 700;
                        text-align: center;
                        color: #444;
                        line-height: 1;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        width: 100%;
                    }

                    /* Grid Section */
                    .ss-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1.2fr;
                        text-align: center;
                        border-bottom: 0.1mm solid #000;
                        padding-bottom: 0.1mm;
                        margin-bottom: 0.3mm;
                        height: 5.5mm;
                    }
                    .ss-grid-header {
                        font-size: 4.2pt;
                        font-weight: 900;
                        color: #333;
                    }
                    .ss-grid-value {
                        font-size: 7.2pt;
                        font-weight: 1000;
                        margin-top: 0.1mm;
                    }
                    .ss-total-value {
                        font-size: 8.5pt;
                        font-weight: 1000;
                    }

                    /* Middle Section (Barcode & Date) */
                    .ss-mid {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        height: 5.5mm;
                        margin-bottom: 0.3mm;
                    }
                    .ss-barcode-wrap {
                        width: 55%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    .ss-barcode-svg {
                        height: 8.5mm;
                        width: 100%;
                    }
                    .ss-barcode-num {
                        font-size: 6pt;
                        font-weight: 800;
                        font-family: monospace;
                        margin-top: 0.2mm;
                    }
                    .ss-date-wrap {
                        width: 40%;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .ss-date-label { font-size: 4.2pt; font-weight: 900; margin-bottom: 0.1mm; }
                    .ss-date-value { font-size: 3.8pt; font-weight: 700; font-family: monospace; }

                    /* Footer Section */
                    .ss-footer {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        border-top: 0.1mm dashed #eee;
                    }
                    .ss-shop-name {
                        font-size: 10pt;
                        font-weight: 1000;
                        line-height: 1;
                        margin-bottom: 0.1mm;
                    }
                    .ss-contact {
                        display: flex;
                        justify-content: center;
                        gap: 2mm;
                        font-size: 4.8pt;
                        font-weight: 900;
                    }
                }

                @media screen {
                    .scale-sticker-print {
                        width: ${sWidth}; height: ${sHeight};
                        padding: 1mm;
                        background: white; display: flex; flex-direction: column;
                        font-family: 'Segoe UI', sans-serif; color: #000;
                        box-shadow: 0 4px 12px -1px rgb(0 0 0 / 0.15);
                        box-sizing: border-box; border-radius: 1mm;
                        overflow: hidden;
                        line-height: 1.1;
                    }
                    .ss-title-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 1mm; }
                    .ss-title { font-size: 10pt; font-weight: 900; text-align: center; }
                    .ss-ingredients { font-size: 6pt; font-weight: 700; text-align: center; color: #444; }
                    .ss-grid { display: grid; grid-template-columns: 1fr 1fr 1.2fr; text-align: center; border-bottom: 0.5pt solid #000; padding-bottom: 1mm; margin-bottom: 1mm; }
                    .ss-grid-header { font-size: 6.5pt; font-weight: 900; }
                    .ss-grid-value { font-size: 10pt; font-weight: 1000; }
                    .ss-total-value { font-size: 12pt; font-weight: 1000; }
                    .ss-mid { display: flex; justify-content: space-between; align-items: center; height: 10mm; }
                    .ss-barcode-wrap { width: 50%; display: flex; flex-direction: column; align-items: center; }
                    .ss-barcode-svg { height: 7mm; width: 100%; }
                    .ss-barcode-num { font-size: 5pt; font-family: monospace; }
                    .ss-date-wrap { width: 45%; text-align: center; }
                    .ss-date-label { font-size: 6pt; font-weight: 900; }
                    .ss-date-value { font-size: 6pt; font-family: monospace; }
                    .ss-footer { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
                    .ss-shop-name { font-size: 14pt; font-weight: 1000; line-height: 1; }
                    .ss-contact { display: flex; justify-content: center; gap: 2mm; font-size: 7pt; font-weight: 900; }
                }
            `}</style>

            <div className="ss-title-wrap">
                <div className="ss-title">{mainTitle}</div>
                {mixtureDetails && <div className="ss-ingredients">{mixtureDetails}</div>}
            </div>

            <div className="ss-grid">
                <div className="ss-grid-col">
                    <div className="ss-grid-header">سعر الوحدة</div>
                    <div className="ss-grid-value">{unitPrice.toFixed(2)}</div>
                </div>
                <div className="ss-grid-col">
                    <div className="ss-grid-header">الكمية</div>
                    <div className="ss-grid-value">{totalQty}</div>
                </div>
                <div className="ss-grid-col">
                    <div className="ss-grid-header">الإجمالي</div>
                    <div className="ss-total-value">{total.toFixed(2)}</div>
                </div>
            </div>

            <div className="ss-mid">
                <div className="ss-barcode-wrap">
                    <div className="ss-barcode-svg">
                        {items[0]?.barcode && <BarcodeGenerator value={items[0].barcode} />}
                    </div>
                    {items[0]?.barcode && <div className="ss-barcode-num">{items[0].barcode}</div>}
                </div>
                <div className="ss-date-wrap">
                    <div className="ss-date-label">التاريخ</div>
                    <div className="ss-date-value">{dateStr}</div>
                </div>
            </div>

            <div className="ss-footer">
                <div className="ss-shop-name">{shopName}</div>
                <div className="ss-contact">
                    <span>إدارة المحل</span>
                    {shopPhone && <span>📱 {shopPhone}</span>}
                </div>
            </div>
        </div>
    );
}));
