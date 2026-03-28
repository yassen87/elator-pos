/** EAN-13 بادئة 622 متوافقة مع سكانر النظام (من extract الإيدي من 9 أرقام وسطى) */

export function ean13CheckDigit12(first12) {
  const s = String(first12 || '')
  if (!/^\d{12}$/.test(s)) return '0'
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(s[i], 10) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

/** باركود ثابت لكل منتج من معرفه (622 + id بعرض 9 + رقم تحقق) */
export function ean13FromProductId(id) {
  const n = Math.max(0, parseInt(id, 10) || 0)
  const nine = String(n).replace(/\D/g, '').slice(-9).padStart(9, '0')
  const core12 = '622' + nine
  return core12 + ean13CheckDigit12(core12)
}

/** باركود فريد عشوائي 622 (للمعاينة قبل الحفظ) */
export function ean13Random622() {
  const nine = String(Math.floor(100000000 + Math.random() * 900000000))
  const core12 = '622' + nine
  return core12 + ean13CheckDigit12(core12)
}

/** تركيبات: بادئة 623 حتى لا تتداخل مع أكواد المنتجات 622 */
export function ean13FromFormulaId(id) {
  const n = Math.max(0, parseInt(id, 10) || 0)
  const nine = String(n).replace(/\D/g, '').slice(-9).padStart(9, '0')
  const core12 = '623' + nine
  return core12 + ean13CheckDigit12(core12)
}

export function ean13Random623() {
  const nine = String(Math.floor(100000000 + Math.random() * 900000000))
  const core12 = '623' + nine
  return core12 + ean13CheckDigit12(core12)
}
