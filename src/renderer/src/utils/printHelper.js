/**
 * printHelper.js
 * استخدام webContents.print() الخاص بـ Electron لضمان فتح شاشة الطباعة
 */

import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

/**
 * يأخذ React component، يعمله render في div مخفي، بعدين يعمله print
 * @param {React.ComponentType} Component - الكومبوننت المراد طباعته
 * @param {object} props - البروبس اللي هتتعمل للكومبوننت
 * @param {object} options - إعدادات الطباعة (width, height)
 */
export async function printComponent(Component, props = {}, options = {}) {
    const printWidth = options.width || '80mm';
    const printHeight = options.height || 'auto';

    // إنشاء container مخفي
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${printWidth};`
    document.body.appendChild(container)

    return new Promise((resolve, reject) => {
        try {
            // عمل render للكومبوننت
            const root = createRoot(container)
            root.render(createElement(Component, props))

            // انتظار React render
            setTimeout(() => {
                try {
                    const html = container.innerHTML

                    // جمع كل الـ CSS الموجود في الصفحة
                    const styles = Array.from(document.styleSheets)
                        .map(sheet => {
                            try {
                                return Array.from(sheet.cssRules || [])
                                    .map(rule => rule.cssText)
                                    .join('\n')
                            } catch {
                                return ''
                            }
                        })
                        .join('\n')

                    // فتح نافذة iframe للطباعة
                    const iframe = document.createElement('iframe')
                    iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${printWidth};border:none;`
                    document.body.appendChild(iframe)

                    const doc = iframe.contentDocument || iframe.contentWindow.document
                    doc.open()
                    doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; }
  body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; direction: rtl; display: flex; justify-content: center; }
  ${styles}
</style>
</head>
<body><div style="width: ${printWidth};">${html}</div></body>
</html>`)
                    doc.close()

                    iframe.onload = () => {
                        try {
                            iframe.contentWindow.focus()
                            iframe.contentWindow.print()

                            setTimeout(() => {
                                root.unmount()
                                document.body.removeChild(container)
                                document.body.removeChild(iframe)
                                resolve()
                            }, 1000)
                        } catch (err) {
                            reject(err)
                        }
                    }
                } catch (err) {
                    root.unmount()
                    document.body.removeChild(container)
                    reject(err)
                }
            }, 500) // التغيير لـ 500 ملي لضمان الرندر
        } catch (err) {
            document.body.removeChild(container)
            reject(err)
        }
    })
}
