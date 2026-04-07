-- =============================================
-- النظام المحاسبي الحديث - قاعدة البيانات
-- تحويل من Oracle Forms إلى نظام ويب حديث
-- =============================================

-- 1. إعدادات النظام (TITL)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. السنوات المالية
CREATE TABLE IF NOT EXISTS fiscal_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 0,
  is_closed INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. العملات (AMLH)
CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  symbol TEXT,
  exchange_rate REAL DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. المستخدمين (USER_U)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin','manager','accountant','user','viewer')),
  is_active INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. صلاحيات المستخدمين (USERGN)
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  can_view INTEGER DEFAULT 0,
  can_create INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_print INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  UNIQUE(user_id, module_id)
);

-- 6. وحدات النظام (DATA_ACM)
CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT,
  route TEXT,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  module_type TEXT DEFAULT 'page' CHECK(module_type IN ('group','page','report')),
  FOREIGN KEY (parent_id) REFERENCES modules(id) ON DELETE SET NULL
);

-- 7. دليل الحسابات (DATA_AC + DATA_AG) - شجري
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  parent_id INTEGER,
  account_type TEXT NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense')),
  account_nature TEXT NOT NULL CHECK(account_nature IN ('debit','credit')),
  level INTEGER DEFAULT 1,
  is_parent INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  currency_id INTEGER DEFAULT 1,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- 8. القيود المحاسبية - الرأس (FB/FM headers)
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_number INTEGER NOT NULL,
  entry_date TEXT NOT NULL,
  fiscal_year_id INTEGER NOT NULL,
  description TEXT,
  reference TEXT,
  entry_type TEXT DEFAULT 'manual' CHECK(entry_type IN ('manual','auto','opening','closing','voucher')),
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','posted','cancelled')),
  created_by INTEGER,
  posted_by INTEGER,
  posted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- 9. تفاصيل القيود (FBF/FMF details)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  description TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  currency_id INTEGER DEFAULT 1,
  exchange_rate REAL DEFAULT 1,
  cost_center_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- 10. السندات (SNDK - سند قبض / SNDS - سند صرف)
CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_number INTEGER NOT NULL,
  voucher_type TEXT NOT NULL CHECK(voucher_type IN ('receipt','payment')),
  voucher_date TEXT NOT NULL,
  fiscal_year_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency_id INTEGER DEFAULT 1,
  exchange_rate REAL DEFAULT 1,
  description TEXT,
  beneficiary TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','check','transfer','other')),
  check_number TEXT,
  check_date TEXT,
  bank_name TEXT,
  reference TEXT,
  journal_entry_id INTEGER,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved','posted','cancelled')),
  created_by INTEGER,
  approved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (currency_id) REFERENCES currencies(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 11. تفاصيل السندات (SNDKF/SNDSF)
CREATE TABLE IF NOT EXISTS voucher_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  cost_center_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 12. مراكز التكلفة
CREATE TABLE IF NOT EXISTS cost_centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  parent_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES cost_centers(id) ON DELETE RESTRICT
);

-- 13. سجل النشاطات (Audit Log)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- الفهارس
-- =============================================
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_year ON journal_entries(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_account ON vouchers(account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_voucher_details_voucher ON voucher_details(voucher_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_parent ON modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
