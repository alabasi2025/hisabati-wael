-- =============================================
-- بيانات أولية للنظام
-- =============================================

-- إعدادات النظام
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('company_name', 'شركتي', 'اسم الشركة'),
  ('company_name_en', 'My Company', 'Company Name English'),
  ('fiscal_year', '2026', 'السنة المالية الحالية'),
  ('default_currency', '1', 'العملة الافتراضية'),
  ('decimal_places', '2', 'عدد الخانات العشرية'),
  ('voucher_auto_post', '0', 'ترحيل السندات تلقائياً'),
  ('journal_auto_number', '1', 'ترقيم القيود تلقائياً');

-- السنة المالية
INSERT OR IGNORE INTO fiscal_years (year, is_active, start_date, end_date) VALUES
  (2025, 0, '2025-01-01', '2025-12-31'),
  (2026, 1, '2026-01-01', '2026-12-31');

-- العملات
INSERT OR IGNORE INTO currencies (code, name_ar, name_en, symbol, exchange_rate, is_default) VALUES
  ('IQD', 'دينار عراقي', 'Iraqi Dinar', 'د.ع', 1, 1),
  ('USD', 'دولار أمريكي', 'US Dollar', '$', 1480, 0),
  ('EUR', 'يورو', 'Euro', '€', 1600, 0),
  ('TRY', 'ليرة تركية', 'Turkish Lira', '₺', 42, 0);

-- المستخدم الافتراضي (admin / admin123)
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, is_active) VALUES
  ('admin', 'admin123', 'مدير النظام', 'admin', 1),
  ('محاسب', 'user123', 'المحاسب العام', 'accountant', 1);

-- وحدات النظام (القائمة الرئيسية)
INSERT OR IGNORE INTO modules (id, name, name_ar, icon, route, parent_id, sort_order, module_type) VALUES
  (1, 'dashboard', 'لوحة التحكم', 'fas fa-tachometer-alt', '/dashboard', NULL, 1, 'page'),
  (2, 'accounts', 'الحسابات', 'fas fa-sitemap', NULL, NULL, 2, 'group'),
  (3, 'chart_of_accounts', 'دليل الحسابات', 'fas fa-tree', '/accounts', 2, 1, 'page'),
  (4, 'cost_centers', 'مراكز التكلفة', 'fas fa-bullseye', '/cost-centers', 2, 2, 'page'),
  (5, 'transactions', 'العمليات المالية', 'fas fa-exchange-alt', NULL, NULL, 3, 'group'),
  (6, 'journal_entries', 'القيود اليومية', 'fas fa-book', '/journal', 5, 1, 'page'),
  (7, 'receipt_vouchers', 'سندات القبض', 'fas fa-hand-holding-usd', '/vouchers/receipt', 5, 2, 'page'),
  (8, 'payment_vouchers', 'سندات الصرف', 'fas fa-money-bill-wave', '/vouchers/payment', 5, 3, 'page'),
  (9, 'reports', 'التقارير', 'fas fa-chart-bar', NULL, NULL, 4, 'group'),
  (10, 'trial_balance', 'ميزان المراجعة', 'fas fa-balance-scale', '/reports/trial-balance', 9, 1, 'report'),
  (11, 'account_statement', 'كشف حساب', 'fas fa-file-invoice-dollar', '/reports/account-statement', 9, 2, 'report'),
  (12, 'income_statement', 'قائمة الدخل', 'fas fa-chart-line', '/reports/income', 9, 3, 'report'),
  (13, 'balance_sheet', 'الميزانية العمومية', 'fas fa-file-alt', '/reports/balance-sheet', 9, 4, 'report'),
  (14, 'admin_section', 'الإدارة', 'fas fa-cogs', NULL, NULL, 5, 'group'),
  (15, 'users_management', 'إدارة المستخدمين', 'fas fa-users-cog', '/admin/users', 14, 1, 'page'),
  (16, 'system_settings', 'إعدادات النظام', 'fas fa-sliders-h', '/admin/settings', 14, 2, 'page'),
  (17, 'currencies', 'العملات', 'fas fa-coins', '/admin/currencies', 14, 3, 'page'),
  (18, 'fiscal_years_mgmt', 'السنوات المالية', 'fas fa-calendar-alt', '/admin/fiscal-years', 14, 4, 'page'),
  (19, 'audit_log', 'سجل النشاطات', 'fas fa-history', '/admin/audit-log', 14, 5, 'page');

-- صلاحيات المدير (كل شي مفتوح)
INSERT OR IGNORE INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, can_print)
SELECT 1, id, 1, 1, 1, 1, 1 FROM modules WHERE module_type != 'group';

-- دليل الحسابات الافتراضي (هيكل شجري)
-- المستوى 1: الأصول
INSERT OR IGNORE INTO accounts (id, code, name_ar, name_en, parent_id, account_type, account_nature, level, is_parent) VALUES
  (1, '1', 'الأصول', 'Assets', NULL, 'asset', 'debit', 1, 1),
  (2, '2', 'الخصوم', 'Liabilities', NULL, 'liability', 'credit', 1, 1),
  (3, '3', 'حقوق الملكية', 'Equity', NULL, 'equity', 'credit', 1, 1),
  (4, '4', 'الإيرادات', 'Revenue', NULL, 'revenue', 'credit', 1, 1),
  (5, '5', 'المصروفات', 'Expenses', NULL, 'expense', 'debit', 1, 1);

-- المستوى 2: الأصول المتداولة
INSERT OR IGNORE INTO accounts (id, code, name_ar, name_en, parent_id, account_type, account_nature, level, is_parent) VALUES
  (11, '11', 'الأصول المتداولة', 'Current Assets', 1, 'asset', 'debit', 2, 1),
  (12, '12', 'الأصول الثابتة', 'Fixed Assets', 1, 'asset', 'debit', 2, 1),
  (21, '21', 'الخصوم المتداولة', 'Current Liabilities', 2, 'liability', 'credit', 2, 1),
  (22, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 2, 'liability', 'credit', 2, 1),
  (31, '31', 'رأس المال', 'Capital', 3, 'equity', 'credit', 2, 1),
  (32, '32', 'الأرباح المحتجزة', 'Retained Earnings', 3, 'equity', 'credit', 2, 1),
  (41, '41', 'إيرادات التشغيل', 'Operating Revenue', 4, 'revenue', 'credit', 2, 1),
  (42, '42', 'إيرادات أخرى', 'Other Revenue', 4, 'revenue', 'credit', 2, 1),
  (51, '51', 'مصروفات التشغيل', 'Operating Expenses', 5, 'expense', 'debit', 2, 1),
  (52, '52', 'مصروفات إدارية', 'Administrative Expenses', 5, 'expense', 'debit', 2, 1);

-- المستوى 3: حسابات تفصيلية
INSERT OR IGNORE INTO accounts (id, code, name_ar, name_en, parent_id, account_type, account_nature, level, is_parent) VALUES
  (111, '111', 'الصندوق', 'Cash', 11, 'asset', 'debit', 3, 0),
  (112, '112', 'البنك', 'Bank', 11, 'asset', 'debit', 3, 1),
  (113, '113', 'المدينون', 'Accounts Receivable', 11, 'asset', 'debit', 3, 1),
  (114, '114', 'المخزون', 'Inventory', 11, 'asset', 'debit', 3, 0),
  (121, '121', 'الأثاث والمعدات', 'Furniture & Equipment', 12, 'asset', 'debit', 3, 0),
  (122, '122', 'السيارات', 'Vehicles', 12, 'asset', 'debit', 3, 0),
  (123, '123', 'العقارات', 'Real Estate', 12, 'asset', 'debit', 3, 0),
  (211, '211', 'الدائنون', 'Accounts Payable', 21, 'liability', 'credit', 3, 1),
  (212, '212', 'قروض قصيرة الأجل', 'Short-term Loans', 21, 'liability', 'credit', 3, 0),
  (221, '221', 'قروض طويلة الأجل', 'Long-term Loans', 22, 'liability', 'credit', 3, 0),
  (311, '311', 'رأس المال المدفوع', 'Paid-in Capital', 31, 'equity', 'credit', 3, 0),
  (321, '321', 'أرباح العام الحالي', 'Current Year Profit', 32, 'equity', 'credit', 3, 0),
  (411, '411', 'إيرادات المبيعات', 'Sales Revenue', 41, 'revenue', 'credit', 3, 0),
  (412, '412', 'إيرادات الخدمات', 'Service Revenue', 41, 'revenue', 'credit', 3, 0),
  (421, '421', 'أرباح الصرف', 'Exchange Gains', 42, 'revenue', 'credit', 3, 0),
  (511, '511', 'رواتب وأجور', 'Salaries & Wages', 51, 'expense', 'debit', 3, 0),
  (512, '512', 'إيجارات', 'Rent', 51, 'expense', 'debit', 3, 0),
  (513, '513', 'مصروفات كهرباء وماء', 'Utilities', 51, 'expense', 'debit', 3, 0),
  (521, '521', 'مصروفات إدارية عامة', 'General Admin Expenses', 52, 'expense', 'debit', 3, 0),
  (522, '522', 'مصروفات اتصالات', 'Communications', 52, 'expense', 'debit', 3, 0);

-- حسابات بنكية تفصيلية
INSERT OR IGNORE INTO accounts (id, code, name_ar, name_en, parent_id, account_type, account_nature, level, is_parent) VALUES
  (1121, '1121', 'بنك الرشيد', 'Rasheed Bank', 112, 'asset', 'debit', 4, 0),
  (1122, '1122', 'بنك الرافدين', 'Rafidain Bank', 112, 'asset', 'debit', 4, 0),
  (1131, '1131', 'ذمم عملاء', 'Customer Receivables', 113, 'asset', 'debit', 4, 0),
  (1132, '1132', 'ذمم موظفين', 'Employee Receivables', 113, 'asset', 'debit', 4, 0),
  (2111, '2111', 'ذمم موردين', 'Supplier Payables', 211, 'liability', 'credit', 4, 0);
