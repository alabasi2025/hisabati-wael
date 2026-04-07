# النظام المحاسبي الحديث - Accounting System

## نظرة عامة
نظام محاسبي متكامل تم تحويله من Oracle Forms 6i القديم إلى تطبيق ويب حديث يعمل على Cloudflare Pages.

**التقنيات:** Hono + TypeScript + Cloudflare D1 + TailwindCSS

## الميزات المكتملة

### 1. تسجيل الدخول وإدارة المستخدمين
- شاشة دخول أنيقة مع تشفير
- نظام أدوار (مدير، مدير قسم، محاسب، مستخدم، مشاهد)
- إدارة المستخدمين (إضافة/تعديل/تعطيل)
- `/login` - شاشة تسجيل الدخول
- `POST /api/auth/login` - تسجيل دخول API

### 2. لوحة التحكم
- إحصائيات عامة (رصيد الصندوق، القبض، الصرف، القيود)
- آخر القيود والسندات
- ملخص شهري
- `/app` - لوحة التحكم الرئيسية
- `GET /api/dashboard/stats` - إحصائيات

### 3. دليل الحسابات (شجرة)
- هيكل شجري متعدد المستويات
- إضافة/تعديل/حذف حسابات
- بحث سريع
- أنواع: أصول، خصوم، ملكية، إيرادات، مصروفات
- `GET /api/accounts` - جلب كل الحسابات
- `POST /api/accounts` - إنشاء حساب
- `PUT /api/accounts/:id` - تعديل
- `DELETE /api/accounts/:id` - حذف
- `GET /api/accounts/search/:query` - بحث
- `GET /api/accounts/leaf/all` - الحسابات الفرعية فقط

### 4. القيود المحاسبية
- إنشاء قيود يومية متعددة الأسطر
- ترحيل القيود (تحديث أرصدة الحسابات)
- التحقق من التوازن (مدين = دائن)
- ترقيم تلقائي
- `GET /api/journal` - القيود (مع فلاتر)
- `POST /api/journal` - قيد جديد
- `GET /api/journal/:id` - تفاصيل قيد
- `POST /api/journal/:id/post` - ترحيل
- `DELETE /api/journal/:id` - حذف (مسودة فقط)

### 5. السندات (قبض وصرف)
- سندات قبض وسندات صرف
- توزيع المبالغ على عدة حسابات
- ترحيل تلقائي مع إنشاء قيد محاسبي
- طرق دفع: نقد، شيك، تحويل
- `GET /api/vouchers?type=receipt|payment` - القائمة
- `POST /api/vouchers` - سند جديد
- `GET /api/vouchers/:id` - تفاصيل
- `POST /api/vouchers/:id/post` - ترحيل
- `DELETE /api/vouchers/:id` - حذف

### 6. التقارير المالية
- **ميزان المراجعة** - `GET /api/reports/trial-balance`
- **كشف حساب** - `GET /api/reports/account-statement/:accountId`
- **قائمة الدخل** - `GET /api/reports/income-statement`
- **الميزانية العمومية** - `GET /api/reports/balance-sheet`
- دعم الطباعة

### 7. الإدارة
- إعدادات النظام (اسم الشركة، خانات عشرية...)
- إدارة العملات (دينار عراقي، دولار، يورو، ليرة)
- إدارة السنوات المالية
- إدارة المستخدمين

## قاعدة البيانات
**Cloudflare D1** (SQLite)
- 13 جدول رئيسي
- هيكل حسابات شجري مع 40 حساب افتراضي
- نظام صلاحيات مرن
- سجل نشاطات (Audit Log)

### الجداول الرئيسية
| الجدول | الوصف |
|--------|-------|
| settings | إعدادات النظام |
| fiscal_years | السنوات المالية |
| currencies | العملات |
| users | المستخدمين |
| user_permissions | الصلاحيات |
| modules | وحدات النظام |
| accounts | دليل الحسابات |
| journal_entries | رؤوس القيود |
| journal_entry_lines | تفاصيل القيود |
| vouchers | السندات |
| voucher_details | تفاصيل السندات |
| cost_centers | مراكز التكلفة |
| audit_log | سجل النشاطات |

## بيانات الدخول الافتراضية
- **المدير:** admin / admin123
- **المحاسب:** محاسب / user123

## التشغيل محلياً
```bash
npm install
npm run build
npm run db:migrate:local
npm run db:seed
npm run dev:sandbox
```

## النشر على Cloudflare
```bash
npm run build
npx wrangler pages deploy dist
```

## المنصة
- **النوع:** Cloudflare Pages
- **التقنية:** Hono + TypeScript + D1
- **الحالة:** يعمل
