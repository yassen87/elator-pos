import React from 'react'

export const PrintableInvoice = React.forwardRef(({ sale, settings, parseDetails }, ref) => {
    if (!sale) return null;

    return (
        <div ref={ref} style={{
            padding: '10px',
            direction: 'rtl',
            fontFamily: "'Inter', 'Arial', sans-serif",
            width: '72mm',
            color: '#000',
            backgroundColor: '#fff',
            margin: '0 auto'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '15px', paddingTop: '30px' }}>
                <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '900' }}>{settings.shop_name}</h1>
                {settings.shop_address && settings.shop_address.trim() !== '' && <p style={{ margin: '5px 0', fontSize: '13px' }}>{settings.shop_address}</p>}
                {settings.shop_phone && settings.shop_phone.trim() !== '' && <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>هاتف: {settings.shop_phone}</p>}
                {settings.shop_whatsapp && settings.shop_whatsapp.trim() !== '' && (
                    <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>واتساب: {settings.shop_whatsapp}</p>
                )}
            </div>

            <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '12px', letterSpacing: '2px' }}>
                --------------------------------------------------
            </div>

            <div style={{ marginBottom: '15px', fontSize: '14px', direction: 'rtl', padding: '0 5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', whiteSpace: 'nowrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>رقم الفاتورة:</span>
                    <span style={{ fontWeight: '900', fontSize: '16px' }}>#{sale.invoice_code || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>التاريخ:</span>
                    <span>{new Date(sale.date + 'Z').toLocaleDateString('ar-EG')}   {new Date(sale.date + 'Z').toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>البائع:</span>
                    <span>{sale.cashier_name}</span>
                </div>
                {sale.customer_name && sale.customer_name.trim() !== '' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>العميل:</span>
                        <span>{sale.customer_name}</span>
                    </div>
                )}
                {sale.customer_phone && sale.customer_phone.trim() !== '' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>هاتف العميل:</span>
                        <span>{sale.customer_phone}</span>
                    </div>
                )}
                {sale.customer_address && sale.customer_address.trim() !== '' && (
                    <div style={{ fontSize: '12px', marginTop: '2px', textAlign: 'right', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>العنوان:</span>
                        <span>{sale.customer_address}</span>
                    </div>
                )}
            </div>

            <div style={{
                display: 'flex',
                padding: '10px 0',
                fontWeight: 'bold',
                fontSize: '16px',
                borderBottom: '1px solid #000',
                marginBottom: '10px'
            }}>
                <div style={{ flex: 1.5, textAlign: 'right' }}>الصنف</div>
                <div style={{ flex: 1, textAlign: 'center' }}>الكمية</div>
                <div style={{ flex: 1.2, textAlign: 'left' }}>الإجمالي</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                {(() => {
                    // Pre-process items to unify bottles with mixtures
                    const unifiedItems = [];
                    const processedIndices = new Set();

                    sale.items?.forEach((item, idx) => {
                        if (processedIndices.has(idx)) return;

                        const itemName = item.item_name || item.name || item.product_name || '';
                        const itemDetails = typeof item.details === 'string' ? item.details : (item.details?.text || '');

                        const isMixture = item.type === 'oil_mix' ||
                            itemName.includes('تركيبة') ||
                            itemDetails.includes('المكونات:');

                        if (isMixture) {
                            const unified = { ...item, item_name: 'تركيبة عطور' };
                            // Look ahead/behind for a bottle that might be separate
                            for (let j = 0; j < sale.items.length; j++) {
                                if (j === idx || processedIndices.has(j)) continue;
                                const nextItem = sale.items[j];
                                const nextItemName = nextItem.item_name || nextItem.name || nextItem.product_name || '';
                                const isBottle = nextItem.category?.toLowerCase() === 'bottle' ||
                                    nextItemName.includes('زجاجة') ||
                                    nextItemName.includes('زجاجه');

                                if (isBottle) {
                                    unified.price = (parseFloat(unified.price) + parseFloat(nextItem.price)).toFixed(2);
                                    processedIndices.add(j);
                                    break;
                                }
                            }
                            unifiedItems.push(unified);
                        } else {
                            // Any unabsorbed item should be pushed (standalone items/bottles)
                            unifiedItems.push(item);
                        }
                        processedIndices.add(idx);
                    });

                    return unifiedItems.map((item, idx) => (
                        <div key={idx} style={{ padding: '5px 0', fontSize: '13px' }}>
                            <div style={{ display: 'flex', marginBottom: '2px' }}>
                                <div style={{ flex: 2, textAlign: 'right', fontWeight: 'bold' }}>
                                    {(item && (item.type === 'oil_mix' || (item.item_name && item.item_name.includes('تركيبة')) || (item.name && item.name.includes('تركيبة')))) ? 'تركيبة عطور' : (item?.item_name || item?.name || 'صنف غير معروف')}
                                </div>
                                <div style={{ flex: 0.8, textAlign: 'center' }}>
                                    {(item.type === 'oil_mix' || item.item_name?.includes('تركيبة') || (item.name && item.name.includes('تركيبة'))) ? '' : item.quantity}
                                </div>
                                <div style={{ flex: 1.2, textAlign: 'left', fontWeight: 'bold' }}>{((parseFloat(item.price) - (parseFloat(item.discount) || 0)) * item.quantity).toFixed(2)}</div>
                            </div>
                            {item.details && (
                                <div style={{ fontSize: '11px', color: '#000', whiteSpace: 'pre-line', paddingRight: '5px', marginBottom: '2px' }}>
                                    {(() => {
                                        let details = (typeof parseDetails === 'function') ? parseDetails(item.details) : (item.details?.text || String(item.details || ''));
                                        if (settings.show_ml_in_invoices === '0') {
                                            // Strip (X مل), X ملي كلمة, X مل كلمة patterns
                                            details = details
                                                .replace(/\s?\([0-9.]+\s*م[لي]+\)/g, '')  // (15 مل) or (15 ملي)
                                                .replace(/[0-9.]+\s*م[لي]+\s*/g, '') // 15 ملي or 15 مل standalone
                                                .replace(/[0-9.]+\s*مل\s*/g, ''); // 15مل
                                        }
                                        return details
                                            .split('\n')
                                            .filter(line => !line.includes('السعر:') && !line.includes('سعر:'))
                                            .join('\n');
                                    })()}
                                    {item.discount_percent > 0 && (
                                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>
                                            خصم {item.discount_percent}%
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ));
                })()}
            </div>

            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '10px 15px',
                margin: '10px 0',
                borderTop: '2px solid #000'
            }}>
                {sale.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                        <span style={{ flex: '1 1 auto', marginLeft: '4px' }}>الإجمالي قبل الخصم:</span>
                        <span style={{ flexShrink: 0 }}>{(sale.total + sale.discount).toFixed(2)} ج.م</span>
                    </div>
                )}
                {sale.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '5px', color: '#000', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        <span style={{ flex: '1 1 auto', marginLeft: '4px' }}>خصم ({((sale.discount / (sale.total + sale.discount)) * 100).toFixed(0)}%):</span>
                        <span style={{ flexShrink: 0 }}>-{sale.discount.toFixed(2)} ج.م</span>
                    </div>
                )}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '18px',
                    fontWeight: '900',
                    whiteSpace: 'nowrap',
                    borderTop: sale.discount > 0 ? '1px dashed #000' : 'none',
                    paddingTop: sale.discount > 0 ? '5px' : '0'
                }}>
                    <span style={{ flex: '1 1 auto', marginLeft: '8px' }}>الإجمالي النهائي</span>
                    <span style={{ flexShrink: 0, direction: 'ltr' }}>{sale.total.toFixed(2)} ج.م</span>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>شكراً لزيارتكم!</p>
                {settings.qr_code_image && (
                    <div style={{ margin: '15px auto', width: '100px', height: '100px' }}>
                        <img src={settings.qr_code_image} style={{ width: '100%', height: '100%' }} alt="QR" />
                    </div>
                )}
                <p style={{ fontSize: '10px', color: '#666', marginTop: '10px', direction: 'ltr' }}>
                    system made by Aion 01141058632
                </p>
            </div>
        </div>
    )
})
PrintableInvoice.displayName = 'PrintableInvoice'
