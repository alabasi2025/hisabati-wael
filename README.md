# النظام المحاسبي الحديث - Modern Accounting System (hisabati-wael)

## نظرة عامة
نظام محاسبي متكامل تم تحويله من Oracle Forms إلى تطبيق ويب حديث باستخدام Hono + TypeScript + Cloudflare D1.

## الروابط
- **GitHub**: https://github.com/alabasi2025/hisabati-wael
- **الحالة**: قيد التطوير النشط

## الميزات المكتملة

### 1. لوحة التحكم (Dashboard)
- بطاقات إحصائية: رصيد الصندوق، إجمالي القبض/الصرف، القيود
- أرصدة البنوك مع التفاصيل
- رسم بياني شريطي للحركة الشهرية (مدين/دائن) باستخدام Chart.js
- رسم بياني دائري لتوزيع أنواع الحسابات
- أعلى 10 حسابات بالرصيد مع شريط تقدم
- آخر القيود والسندات مع روابط سريعة

### 2. دليل الحسابات (Chart of Accounts)
- عرض شجري 4 مستويات قابل للطي/الفرد
- عرض جدولي بديل
- بحث وفلاتر بالنوع (أصول/خصوم/ملكية/إيرادات/مصروفات)
- إضافة/تعديل/حذف مع حماية للحسابات المستخدمة
- ترقيم تلقائي ذكي عند اختيار حساب أب
- دعم الرصيد الافتتاحي

### 3. القيود اليومية (Journal Entries)
- إنشاء قيود متعددة الأسطر
- التحقق التلقائي من التوازن (مدين = دائن)
- تعديل القيود غير المرحّلة
- ترحيل القيود وتحديث الأرصدة
- حذف القيود المسودة
- فلاتر: بحث، حالة، نطاق تاريخ
- طباعة القيد مع توقيعات

### 4. السندات (Vouchers)
- سندات القبض وسندات الصرف
- ربط تفصيلي بالحسابات (توزيع المبالغ)
- تعديل السندات غير المرحّلة
- ترحيل تلقائي ينشئ قيد محاسبي
- دعم طرق الدفع: نقد/شيك/تحويل
- بيانات الشيك (رقم، تاريخ، بنك)
- فلاتر وبحث متقدم
- طباعة احترافية مع توقيعات

### 5. التقارير المالية
- **ميزان المراجعة**: فلاتر تاريخ ومستوى عرض + تصدير CSV/Excel
- **كشف حساب**: رصيد افتتاحي/ختامي، رصيد تشغيلي + تصدير CSV/Excel + طباعة
- **قائمة الدخل**: إيرادات ومصروفات وصافي الربح/الخسارة + تصدير Excel
- **الميزانية العمومية**: أصول = خصوم + ملكية مع التحقق من التوازن + تصدير Excel

### 6. مراكز التكلفة (Cost Centers)
- CRUD كامل (إنشاء/عرض/تعديل/حذف)
- ربط مع سجل المراجعة

### 7. إدارة المستخدمين
- إنشاء/تعديل/تعطيل المستخدمين
- الأدوار: مدير نظام، مدير قسم، محاسب، مستخدم، مشاهد
- شاشة صلاحيات تفصيلية: عرض/إنشاء/تعديل/حذف/طباعة لكل وحدة
- تحديد/إلغاء الكل

### 8. إدارة النظام الشاملة (محسّنة)
- **إعدادات الشركة**: اسم عربي/إنجليزي، عنوان، هاتف، بريد، موقع، رقم ضريبي، سجل تجاري
- **إعدادات مالية**: عملة افتراضية، خانات عشرية، ترحيل تلقائي، فحص توازن، حسابات افتراضية
- **إعدادات الترقيم**: بادئات وأنماط ترقيم القيود وسندات القبض والصرف
- **إعدادات الطباعة**: رأس وذيل التقارير، توقيعات مخصصة، حجم ورق، معاينة حية
- **إعدادات النظام**: لغة، تنسيق تاريخ، مدة جلسة، أمان، معلومات النظام
- إدارة العملات (أسعار صرف)
- السنوات المالية (تفعيل/إغلاق مع تحقق)
- **سجل التدقيق المفصل** (Audit Log): عرض التغييرات قبل/بعد مع فلاتر متقدمة

### 9. نظام الإشعارات
- إشعارات محلية (localStorage) مع أنواع متعددة
- جرس إشعارات في شريط العنوان
- تسجيل الأحداث المهمة تلقائياً

### 10. التصدير والطباعة
- تصدير جميع التقارير بصيغة CSV مع دعم العربية (BOM)
- **تصدير Excel (XLSX)** عبر SheetJS مع دعم RTL
- طباعة احترافية لجميع المستندات والتقارير والسندات
- طباعة تجريبية من إعدادات الطباعة

### 11. المصادقة والأمان
- Middleware للمصادقة مع Token (يدعم أسماء عربية)
- انتهاء صلاحية الجلسة (24 ساعة)
- حماية المسارات المختلفة حسب الدور
- صلاحيات تفصيلية لكل وحدة

## البنية التقنية
- **Backend**: Hono Framework + TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS + Tailwind CSS + Font Awesome + Chart.js + SheetJS
- **Font**: Tajawal (Arabic)
- **Build**: Vite + Wrangler

## المسارات (API Endpoints)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/auth/login` | POST | تسجيل الدخول |
| `/api/auth/me` | GET | التحقق من الجلسة |
| `/api/accounts` | GET/POST | دليل الحسابات |
| `/api/accounts/:id` | GET/PUT/DELETE | حساب محدد |
| `/api/accounts/leaf/all` | GET | الحسابات الفرعية فقط |
| `/api/accounts/search/:query` | GET | بحث في الحسابات |
| `/api/journal` | GET/POST | القيود اليومية |
| `/api/journal/:id` | GET/PUT/DELETE | قيد محدد |
| `/api/journal/:id/post` | POST | ترحيل قيد |
| `/api/vouchers` | GET/POST | السندات |
| `/api/vouchers/:id` | GET/PUT/DELETE | سند محدد |
| `/api/vouchers/:id/post` | POST | ترحيل سند |
| `/api/cost-centers` | GET/POST | مراكز التكلفة |
| `/api/cost-centers/:id` | PUT/DELETE | مركز تكلفة محدد |
| `/api/reports/trial-balance` | GET | ميزان المراجعة |
| `/api/reports/account-statement/:id` | GET | كشف حساب |
| `/api/reports/income-statement` | GET | قائمة الدخل |
| `/api/reports/balance-sheet` | GET | الميزانية العمومية |
| `/api/dashboard/stats` | GET | إحصائيات لوحة التحكم |
| `/api/admin/users` | GET/POST | المستخدمين |
| `/api/admin/users/:id` | PUT | تعديل مستخدم |
| `/api/admin/users/:id/permissions` | GET/PUT | صلاحيات المستخدم |
| `/api/admin/settings` | GET/PUT | الإعدادات |
| `/api/admin/currencies` | GET/POST | العملات |
| `/api/admin/currencies/:id` | PUT | تعديل عملة |
| `/api/admin/fiscal-years` | GET/POST | السنوات المالية |
| `/api/admin/fiscal-years/:id/activate` | POST | تفعيل سنة |
| `/api/admin/fiscal-years/:id/close` | POST | إغلاق سنة |
| `/api/admin/audit-log` | GET | سجل المراجعة |
| `/api/admin/modules` | GET | وحدات القائمة |

## قاعدة البيانات
13 جدول: settings, fiscal_years, currencies, users, user_permissions, modules, accounts, journal_entries, journal_entry_lines, vouchers, voucher_details, cost_centers, audit_log

## بيانات الدخول الافتراضية
- **admin / admin123** (مدير النظام)
- **محاسب / user123** (محاسب)

## التشغيل المحلي
```bash
npm install
npm run build
npx wrangler d1 migrations apply webapp-production --local
npx wrangler d1 execute webapp-production --local --file=./seed.sql
npx wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000
```

## المراحل القادمة (TODO)
- [ ] تحسين أداء الشجرة لعدد حسابات كبير
- [ ] دعم multi-currency في القيود
- [ ] نشر على Cloudflare Pages
- [ ] تطبيق Permissions Middleware على كل المسارات
- [ ] إضافة تصدير PDF
- [ ] بحث متقدم شامل

## آخر تحديث: 2026-04-07 - المرحلة الرابعة (إعدادات شاملة + تصدير Excel)
