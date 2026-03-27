import { BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * Generates an HTML string for the invoice that looks like a thermal receipt.
 * Using HTML/CSS ensures perfect Arabic character shaping and RTL support.
 */
export const generateInvoiceHTML = (saleData, settings) => {
  const shopName = settings.shop_name || 'Al-Areen Perfumes'
  const shopAddress = settings.shop_address || ''
  const shopPhone = settings.shop_phone || ''
  const shopLogo = settings.shop_logo // Base64
  const footerText = settings.invoice_footer || 'شكراً لزيارتكم! نأمل رؤيتكم قريباً.'
  
    const itemsHtml = saleData.items.map(item => {
    const price = Number(item.price) || 0
    const qty = Number(item.quantity) || 0
    const total = (price * qty).toFixed(2)
    
    // Process details/description for formulas
    let detailsHtml = ''
    const rawDetails = item.details || item.description || ''
    if (rawDetails) {
      try {
        const parsed = JSON.parse(rawDetails)
        if (parsed.text) {
          detailsHtml = `<div style="font-size: 10px; color: #555; margin-top: 2px;">${parsed.text}</div>`
        } else if (typeof parsed === 'string') {
           detailsHtml = `<div style="font-size: 10px; color: #555; margin-top: 2px;">${parsed}</div>`
        }
      } catch (e) {
        // Not JSON, use as is
        detailsHtml = `<div style="font-size: 10px; color: #555; margin-top: 2px; white-space: pre-line;">${rawDetails}</div>`
      }
    }

    // Detect if this item is a formula/oil item (has sub-items in details or specific keywords)
    let isOilItem = !!(item.is_ml || item.type === 'oil_mix' || (item.name || item.item_name || '').includes('تركيبة'))
    
    if (!isOilItem && rawDetails) {
      if (rawDetails.includes('المكونات') || rawDetails.includes('مل') || rawDetails.includes('زجاجة')) {
        isOilItem = true
      }
      try {
        const parsedCheck = JSON.parse(rawDetails)
        if (parsedCheck && (parsedCheck.items || parsedCheck.text || parsedCheck.oils)) {
          isOilItem = true
        }
      } catch (e) { /* not JSON */ }
    }

    return `
      <tr>
        <td style="text-align: left; font-weight: bold; vertical-align: top;">${total}</td>
        <td style="text-align: center; vertical-align: top;">${isOilItem ? '' : qty}</td>
        <td style="text-align: right; vertical-align: top;">
          <div style="font-weight: bold;">${item.name || item.item_name || 'صنف'}</div>
          ${isOilItem 
            ? detailsHtml
            : detailsHtml}
        </td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        body {
          font-family: Arial, sans-serif;
          background-color: #ffffff;
          padding: 10px; /* Reduced from 20px */
          color: #000000;
          width: 72mm; /* Adjusted for better fit in viewer */
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 10px; /* Reduced from 15px */
        }
        .logo {
          max-width: 50px; /* Reduced from 60px */
          margin-bottom: 5px;
        }
        .shop-name {
          font-size: 18px; /* Reduced from 20px */
          font-weight: 900;
          margin: 2px 0;
        }
        .divider {
          text-align: center;
          margin: 8px 0;
          border-top: 1px dashed #000;
        }
        .info {
          margin-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        th {
          border-bottom: 1px solid #000;
          padding: 3px 0;
          font-size: 14px;
        }
        td {
          padding: 4px 0;
          font-size: 13px;
        }
        .total-section {
          background: #f8f9fa;
          padding: 6px;
          border-top: 1px solid #000;
        }
        .final-total {
          font-size: 16px; /* Reduced from 18px */
          font-weight: 900;
          display: flex;
          justify-content: space-between;
          margin-top: 3px;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 11px;
        }
      </style>
    </head>
    <body style="height: auto; min-height: auto;">
      <div class="header">
        ${shopLogo ? `<img src="${shopLogo}" class="logo" />` : ''}
        <div class="shop-name">${shopName}</div>
        <div style="font-size: 11px;">${shopAddress}</div>
        <div style="font-weight: bold; font-size: 12px;">هاتف: ${shopPhone}</div>
      </div>

      <div class="divider"></div>

      <div class="info">
        <div class="info-row">
          <span style="font-weight: bold;">رقم الفاتورة:</span>
          <span style="font-weight: 900;">#${saleData.invoice_code || saleData.invoiceCode}</span>
        </div>
        <div class="info-row">
          <span style="font-weight: bold;">التاريخ:</span>
          <span>${new Date().toLocaleDateString('ar-EG')}</span>
        </div>
        ${saleData.customer_name ? `
          <div class="info-row">
            <span style="font-weight: bold;">العميل:</span>
            <span>${saleData.customer_name}</span>
          </div>
        ` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">الإجمالي</th>
            <th style="text-align: center;">الكمية</th>
            <th style="text-align: right;">الصنف</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section">
        ${saleData.discount > 0 ? `
          <div class="info-row">
            <span>الخصم:</span>
            <span>-${Number(saleData.discount).toFixed(2)} ج.م</span>
          </div>
        ` : ''}
        <div class="final-total">
          <span>الإجمالي:</span>
          <span>${Number(saleData.total).toFixed(2)} ج.م</span>
        </div>
      </div>

      <div class="footer">
        <div style="font-weight: 900; font-size: 14px; margin-bottom: 5px;">*** شكراً لثقتكم بنا ***</div>
        <div>${footerText}</div>
        <div style="margin-top: 10px; font-size: 8px; opacity: 0.5;">${new Date().toLocaleString('ar-EG')}</div>
      </div>
    </body>
    </html>
  `
}

export const generateInvoicePDF = async (saleData, settings, type = 'Normal') => {
  let workerWindow = null
  const tempHtmlPath = path.join(app.getPath('temp'), `invoice_${Date.now()}.html`)
  
  try {
    console.log(`[PDF] STARTING: invoice #${saleData.invoice_code}`)
    
    // 1. Prepare Paths
    const docsPath = app.getPath('documents')
    const invoicesPath = path.join(docsPath, 'Invoices')
    const typePath = path.join(invoicesPath, type)

    if (!fs.existsSync(invoicesPath)) fs.mkdirSync(invoicesPath, { recursive: true })
    if (!fs.existsSync(typePath)) fs.mkdirSync(typePath, { recursive: true })

    const fileName = `invoice_${saleData.invoice_code}_${Date.now()}.pdf`
    const filePath = path.join(typePath, fileName)

    console.log(`[PDF] Preparing HTML content...`)
    // 2. Write HTML
    const htmlContent = generateInvoiceHTML(saleData, settings)
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8')
    console.log(`[PDF] HTML written to temp: ${tempHtmlPath}`)

    // 3. Create a visible but OFF-SCREEN window
    console.log(`[PDF] Creating background window...`)
    workerWindow = new BrowserWindow({
      show: true,
      x: -5000, 
      y: -5000,
      width: 600,
      height: 1200,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    })

    console.log(`[PDF] Loading HTML file into window...`)
    // 4. Load and Wait (Aggressively)
    await workerWindow.loadFile(tempHtmlPath)
    
    console.log(`[PDF] Waiting 400ms for rendering...`)
    // We wait 400ms to be sure hardware acceleration and basic styling are applied.
    await new Promise(resolve => setTimeout(resolve, 400))

    console.log('[PDF] Generating PDF buffer...')
    // 5. Convert to PDF
    const pdfBuffer = await workerWindow.webContents.printToPDF({
      margins: { marginType: 'default' },
      pageSize: 'A4',
      printBackground: true,
      scale: 1.0
    })

    console.log(`[PDF] Writing buffer to file: ${filePath}`)
    fs.writeFileSync(filePath, pdfBuffer)
    console.log(`[PDF] SUCCESS: File saved. Size: ${pdfBuffer.length} bytes`)
    
    // Cleanup
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath)
    return filePath

  } catch (error) {
    console.error('[PDF] CRITICAL ERROR:', error)
    if (fs.existsSync(tempHtmlPath)) try { fs.unlinkSync(tempHtmlPath) } catch(e){}
    throw error
  } finally {
    if (workerWindow && !workerWindow.isDestroyed()) {
      workerWindow.destroy() // Use destroy() for immediate cleanup of the visible window
    }
  }
}
 