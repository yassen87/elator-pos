# دليل نشر التحديثات - Update Release Guide

## 📦 خطوات نشر تحديث جديد

### 1. تحديث رقم الإصدار في `package.json`

```json
{
  "name": "elator-pos",
  "version": "1.0.1",  // ← غيّر الرقم هنا
  "description": "نظام إدارة محل عطور بريميوم"
}
```

**مهم:** اتبع نظام Semantic Versioning:
- `1.0.0` → `1.0.1` (إصلاحات بسيطة)
- `1.0.0` → `1.1.0` (ميزات جديدة)
- `1.0.0` → `2.0.0` (تغييرات كبيرة)

---

### 2. بناء البرنامج

```bash
# تأكد من تثبيت كل الحزم
npm install

# بناء النسخة النهائية
npm run build

# بناء ملف exe للويندوز
npm run build:win
```

**النتيجة:**
سيتم إنشاء ملفات في مجلد `dist/`:
- `Elator POS Setup 1.0.1.exe` (المثبت)
- `latest.yml` (ملف التحديث)

---

### 3. رفع التحديث على GitHub Releases

#### الطريقة الأولى: من خلال الموقع

1. اذهب إلى: `https://github.com/yassen87/elator-pos/releases`
2. اضغط **"Draft a new release"**
3. املأ البيانات:
   - **Tag version**: `v1.0.1`
   - **Release title**: `الإصدار 1.0.1`
   - **Description**: اكتب التحسينات والإصلاحات
4. ارفع الملفات:
   - `Elator POS Setup 1.0.1.exe`
   - `latest.yml`
5. اضغط **"Publish release"**

#### الطريقة الثانية: من خلال الـ Terminal

```bash
# تثبيت GitHub CLI (مرة واحدة فقط)
winget install GitHub.cli

# تسجيل الدخول
gh auth login

# إنشاء Release جديد
gh release create v1.0.1 \
  --title "الإصدار 1.0.1" \
  --notes "تحسينات عامة وإصلاحات" \
  "dist/Elator POS Setup 1.0.1.exe" \
  "dist/latest.yml"
```

---

### 4. تكوين electron-builder

تأكد من وجود هذا في `package.json`:

```json
{
  "build": {
    "appId": "com.yassen87.elator-pos",
    "productName": "Elator POS",
    "win": {
      "target": ["nsis"],
      "icon": "resources/icon.png",
      "publish": {
        "provider": "github",
        "owner": "yassen87",
        "repo": "elator-pos"
      }
    },
    "publish": {
      "provider": "github",
      "owner": "yassen87",
      "repo": "elator-pos"
    }
  }
}
```

---

### 5. التحقق من التحديث

بعد النشر:
1. شغّل البرنامج القديم
2. انتظر 30 ثانية
3. سيظهر Modal التحديث تلقائياً
4. اضغط "تحديث الآن"
5. سيتم التحميل والتثبيت

---

## 🔐 إعداد GitHub Token (مرة واحدة فقط)

### 1. إنشاء Personal Access Token

1. اذهب إلى: `https://github.com/settings/tokens`
2. اضغط **"Generate new token (classic)"**
3. اختر الصلاحيات:
   - ✅ `repo` (كل الصلاحيات)
   - ✅ `write:packages`
4. اضغط **"Generate token"**
5. انسخ الـ Token

### 2. إضافة Token للمشروع

أنشئ ملف `.env` في جذر المشروع:

```env
GH_TOKEN=ghp_your_token_here
```

**مهم:** لا ترفع ملف `.env` على GitHub!

---

## 📝 مثال عملي كامل

### السيناريو: إصدار نسخة 1.0.1

```bash
# 1. تحديث رقم الإصدار
# افتح package.json وغيّر "version": "1.0.1"

# 2. بناء البرنامج
npm run build:win

# 3. رفع على GitHub
gh release create v1.0.1 \
  --title "الإصدار 1.0.1 - إصلاحات وتحسينات" \
  --notes "
  ## التحسينات
  - ✅ نظام تحديثات تلقائي حديث
  - ✅ إصلاح مشكلة WhatsApp Toggle
  - ✅ تحسين واجهة المستخدم
  
  ## الإصلاحات
  - 🐛 إصلاح خطأ في صرف المرتبات
  - 🐛 تحسين أداء التقارير
  " \
  "dist/Elator POS Setup 1.0.1.exe" \
  "dist/latest.yml"

# 4. تم! البرامج القديمة ستتلقى التحديث تلقائياً
```

---

## 🎯 Checklist قبل النشر

- [ ] تحديث رقم الإصدار في `package.json`
- [ ] اختبار البرنامج محلياً
- [ ] بناء النسخة النهائية `npm run build:win`
- [ ] التحقق من وجود ملفات `exe` و `latest.yml`
- [ ] كتابة Release Notes واضحة
- [ ] رفع الملفات على GitHub Releases
- [ ] اختبار التحديث على جهاز آخر

---

## 🚀 نصائح مهمة

1. **دائماً اختبر قبل النشر**: شغّل البرنامج وتأكد من عمل كل شيء
2. **اكتب Release Notes واضحة**: المستخدمين يحبون يعرفوا الجديد
3. **استخدم Semantic Versioning**: يسهل تتبع التحديثات
4. **احتفظ بنسخة احتياطية**: قبل كل تحديث كبير
5. **اختبر التحديث التلقائي**: تأكد إن النظام شغال صح

---

## 📞 في حالة المشاكل

### المشكلة: التحديث لا يظهر
**الحل:**
- تأكد من رفع `latest.yml` مع الـ exe
- تأكد من رقم الإصدار في `package.json` أكبر من النسخة الحالية
- تحقق من اتصال الإنترنت

### المشكلة: خطأ في التحميل
**الحل:**
- تأكد من صلاحيات GitHub Token
- تحقق من رابط الـ repo في `package.json`
- تأكد من أن الـ Release مُنشور (Published) وليس Draft

---

## ✨ ملخص سريع

```bash
# 1. غيّر الإصدار
# package.json → "version": "1.0.1"

# 2. ابني
npm run build:win

# 3. ارفع
gh release create v1.0.1 \
  --title "الإصدار 1.0.1" \
  --notes "التحسينات والإصلاحات" \
  "dist/*.exe" \
  "dist/latest.yml"

# 4. تم! 🎉
```
