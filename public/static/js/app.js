// ===================================================
// النظام المحاسبي الحديث - Frontend Application v3.0
// ===================================================

const API = '/api';
let currentUser = null;
let menuItems = [];
let accountsCache = [];
let currenciesCache = [];

// ===== Auth =====
function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(API + url, { ...options, headers });
    const data = await res.json();
    if (res.status === 401) { handleLogout(); return { success: false, message: 'انتهت الجلسة' }; }
    return data;
  } catch (err) {
    return { success: false, message: 'خطأ في الاتصال بالخادم' };
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

function toggleUserMenu() {
  document.getElementById('userMenu')?.classList.toggle('hidden');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('main');
  sidebar.classList.toggle('-mr-64');
  main.classList.toggle('mr-0');
  main.classList.toggle('mr-64');
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-blue-600' };
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px]`;
  toast.innerHTML = `<i class="fas ${icons[type]}"></i><span class="flex-1 text-sm">${message}</span><button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ===== Confirm Dialog =====
function showConfirm(title, message, onConfirm) {
  showModal(title, `
    <div class="text-center py-4">
      <i class="fas fa-question-circle text-5xl text-yellow-400 mb-4"></i>
      <p class="text-gray-300 text-lg">${message}</p>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="closeModal();(${onConfirm.toString()})()" class="px-5 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm">تأكيد</button>`);
}

// ===== Modal =====
function showModal(title, content, footer = '', size = 'max-w-2xl') {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 w-full ${size} max-h-[90vh] overflow-hidden shadow-2xl animate-modalIn">
        <div class="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h3 class="text-lg font-bold text-white">${title}</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-white transition"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[65vh]">${content}</div>
        ${footer ? `<div class="px-6 py-4 border-t border-dark-600 flex justify-end gap-3">${footer}</div>` : ''}
      </div>
    </div>`;
}
function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

// ===== Number Formatting =====
function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  return d;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

// ===== Input Helpers =====
function inputField(id, label, type = 'text', value = '', extra = '') {
  return `<div><label class="block text-gray-400 text-xs mb-1.5 font-medium">${label}</label>
    <input type="${type}" id="${id}" value="${value}" ${extra} class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition"></div>`;
}
function selectField(id, label, options, selected = '') {
  const opts = options.map(o => {
    const val = typeof o === 'object' ? o.value : o;
    const txt = typeof o === 'object' ? o.text : o;
    return `<option value="${val}" ${val == selected ? 'selected' : ''}>${txt}</option>`;
  }).join('');
  return `<div><label class="block text-gray-400 text-xs mb-1.5 font-medium">${label}</label>
    <select id="${id}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition">${opts}</select></div>`;
}
function textareaField(id, label, value = '', rows = 3) {
  return `<div><label class="block text-gray-400 text-xs mb-1.5 font-medium">${label}</label>
    <textarea id="${id}" rows="${rows}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition">${value}</textarea></div>`;
}

// ===== Navigation / SPA Router =====
function navigate(path) {
  window.history.pushState({}, '', '/app' + (path === '/dashboard' ? '' : path));
  loadPage(path);
  updateActiveLink(path);
  updateBreadcrumb(path);
}

function updateActiveLink(path) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.sidebar-link[data-path="${path}"]`).forEach(l => {
    l.classList.add('active');
    const group = l.closest('.sidebar-group');
    if (group) group.classList.add('open');
  });
}

function updateBreadcrumb(path) {
  const bc = document.getElementById('breadcrumb');
  const parts = path.split('/').filter(Boolean);
  const names = {
    'dashboard': 'لوحة التحكم', 'accounts': 'دليل الحسابات', 'journal': 'القيود اليومية',
    'vouchers': 'السندات', 'receipt': 'سندات القبض', 'payment': 'سندات الصرف',
    'reports': 'التقارير', 'trial-balance': 'ميزان المراجعة', 'account-statement': 'كشف حساب',
    'income': 'قائمة الدخل', 'balance-sheet': 'الميزانية', 'admin': 'الإدارة',
    'users': 'المستخدمين', 'settings': 'الإعدادات', 'currencies': 'العملات',
    'fiscal-years': 'السنوات المالية', 'audit-log': 'سجل النشاطات'
  };
  let html = '<a href="#" onclick="navigate(\'/dashboard\')" class="text-gray-500 hover:text-gray-300"><i class="fas fa-home"></i></a>';
  parts.forEach((p, i) => {
    html += ` <i class="fas fa-chevron-left text-gray-600 text-xs mx-1"></i> <span class="${i === parts.length - 1 ? 'text-gray-200 font-medium' : 'text-gray-500'}">${names[p] || p}</span>`;
  });
  bc.innerHTML = html;
}

// ===== Sidebar Builder =====
async function buildSidebar() {
  try {
    const res = await apiFetch('/admin/modules');
    if (!res.success) return;
    menuItems = res.data;
    const nav = document.getElementById('sidebarNav');
    const roots = menuItems.filter(m => !m.parent_id);
    nav.innerHTML = roots.map(root => {
      const children = menuItems.filter(m => m.parent_id === root.id);
      if (children.length === 0) {
        return `<a href="#" class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 text-sm" data-path="${root.route}" onclick="event.preventDefault();navigate('${root.route}')">
          <i class="${root.icon} w-5 text-center"></i><span>${root.name_ar}</span></a>`;
      }
      return `<div class="sidebar-group">
        <button onclick="this.parentElement.classList.toggle('open')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 text-sm w-full hover:bg-dark-800 transition">
          <i class="${root.icon} w-5 text-center"></i><span class="flex-1 text-right">${root.name_ar}</span>
          <i class="fas fa-chevron-left chevron text-xs transition-transform"></i>
        </button>
        <div class="sidebar-children pr-4 space-y-0.5 mt-0.5">
          ${children.map(ch => `<a href="#" class="sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 text-xs" data-path="${ch.route}" onclick="event.preventDefault();navigate('${ch.route}')">
            <i class="${ch.icon} w-4 text-center text-[10px]"></i><span>${ch.name_ar}</span></a>`).join('')}
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Sidebar error:', e); }
}

// ===== Page Router =====
function loadPage(path) {
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';

  if (path === '/dashboard' || path === '/' || !path) renderDashboard(el);
  else if (path === '/accounts') renderAccounts(el);
  else if (path === '/journal') renderJournal(el);
  else if (path === '/vouchers/receipt') renderVouchers(el, 'receipt');
  else if (path === '/vouchers/payment') renderVouchers(el, 'payment');
  else if (path === '/reports/trial-balance') renderTrialBalance(el);
  else if (path === '/reports/account-statement') renderAccountStatement(el);
  else if (path === '/reports/income') renderIncomeStatement(el);
  else if (path === '/reports/balance-sheet') renderBalanceSheet(el);
  else if (path === '/admin/users') renderUsers(el);
  else if (path === '/admin/settings') renderSettings(el);
  else if (path === '/admin/currencies') renderCurrencies(el);
  else if (path === '/admin/fiscal-years') renderFiscalYears(el);
  else if (path === '/admin/audit-log') renderAuditLog(el);
  else el.innerHTML = '<div class="text-center text-gray-500 py-20"><i class="fas fa-hard-hat text-6xl mb-4 block"></i><p class="text-xl">الصفحة قيد الإنشاء</p></div>';
}

// ╔══════════════════════════════════════════════════╗
// ║                    DASHBOARD                      ║
// ╚══════════════════════════════════════════════════╝
async function renderDashboard(el) {
  const res = await apiFetch('/dashboard/stats');
  if (!res.success) { el.innerHTML = '<p class="text-red-400 text-center py-10">خطأ في جلب البيانات</p>'; return; }
  const d = res.data;

  el.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">لوحة التحكم</h2>
      <p class="text-gray-500 text-sm mt-1">نظرة عامة على النظام المحاسبي</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-vault', 'رصيد الصندوق', formatNumber(d.cashBalance), 'د.ع', 'from-blue-600 to-cyan-700')}
      ${statCard('fa-arrow-down', 'إجمالي القبض', formatNumber(d.totalReceipts), 'د.ع', 'from-emerald-600 to-green-700')}
      ${statCard('fa-arrow-up', 'إجمالي الصرف', formatNumber(d.totalPayments), 'د.ع', 'from-rose-600 to-red-700')}
      ${statCard('fa-book-open', 'القيود', d.postedEntries + '/' + d.totalEntries, 'مرحّل', 'from-violet-600 to-purple-700')}
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      ${quickAction('fa-plus-circle', 'قيد جديد', "navigate('/journal')", 'text-blue-400 hover:bg-blue-500/10')}
      ${quickAction('fa-hand-holding-usd', 'سند قبض', "navigate('/vouchers/receipt')", 'text-green-400 hover:bg-green-500/10')}
      ${quickAction('fa-money-bill-wave', 'سند صرف', "navigate('/vouchers/payment')", 'text-red-400 hover:bg-red-500/10')}
      ${quickAction('fa-balance-scale', 'ميزان المراجعة', "navigate('/reports/trial-balance')", 'text-purple-400 hover:bg-purple-500/10')}
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div class="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <h3 class="text-white font-bold text-sm"><i class="fas fa-clock ml-2 text-primary-400"></i>آخر القيود</h3>
          <a href="#" onclick="event.preventDefault();navigate('/journal')" class="text-primary-400 text-xs hover:text-primary-300">عرض الكل ←</a>
        </div>
        <div class="p-4">
          ${d.recentEntries.length === 0 ? emptyState('لا توجد قيود بعد', 'fa-book') : `
          <div class="space-y-2">${d.recentEntries.map(e => `
            <div class="flex items-center justify-between p-3 bg-dark-900/60 rounded-xl hover:bg-dark-900 transition cursor-pointer" onclick="viewJournalEntry(${e.id})">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-primary-400 font-mono text-sm font-bold">#${e.entry_number}</span>
                  <span class="text-gray-500 text-xs">${e.entry_date}</span>
                </div>
                <p class="text-gray-300 text-sm truncate">${e.description || 'بدون وصف'}</p>
              </div>
              <div class="text-left mr-3">
                <span class="text-white font-bold text-sm block">${formatNumber(e.total_debit)}</span>
                <span class="badge ${e.status === 'posted' ? 'badge-success' : 'badge-warning'}">${e.status === 'posted' ? 'مرحّل' : 'مسودة'}</span>
              </div>
            </div>`).join('')}</div>`}
        </div>
      </div>

      <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div class="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <h3 class="text-white font-bold text-sm"><i class="fas fa-receipt ml-2 text-primary-400"></i>آخر السندات</h3>
          <a href="#" onclick="event.preventDefault();navigate('/vouchers/receipt')" class="text-primary-400 text-xs hover:text-primary-300">عرض الكل ←</a>
        </div>
        <div class="p-4">
          ${d.recentVouchers.length === 0 ? emptyState('لا توجد سندات بعد', 'fa-receipt') : `
          <div class="space-y-2">${d.recentVouchers.map(v => `
            <div class="flex items-center justify-between p-3 bg-dark-900/60 rounded-xl hover:bg-dark-900 transition cursor-pointer" onclick="viewVoucher(${v.id})">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="${v.voucher_type === 'receipt' ? 'text-green-400' : 'text-red-400'} text-sm font-bold">
                    <i class="fas ${v.voucher_type === 'receipt' ? 'fa-arrow-down' : 'fa-arrow-up'} ml-1"></i>
                    ${v.voucher_type === 'receipt' ? 'قبض' : 'صرف'} #${v.voucher_number}
                  </span>
                  <span class="text-gray-500 text-xs">${v.voucher_date}</span>
                </div>
                <p class="text-gray-400 text-xs truncate">${v.account_name || ''}</p>
              </div>
              <span class="text-white font-bold text-sm font-mono mr-3">${formatNumber(v.amount)}</span>
            </div>`).join('')}</div>`}
        </div>
      </div>
    </div>`;
}

function statCard(icon, label, value, unit, gradient) {
  return `<div class="stat-card bg-gradient-to-br ${gradient} rounded-2xl p-5 relative overflow-hidden">
    <div class="relative z-10">
      <p class="text-white/70 text-xs mb-2">${label}</p>
      <p class="text-white text-2xl font-bold tracking-tight">${value}</p>
      <p class="text-white/50 text-xs mt-1">${unit}</p>
    </div>
    <i class="fas ${icon} absolute -bottom-3 -left-3 text-7xl text-white/10"></i>
  </div>`;
}

function quickAction(icon, label, action, color) {
  return `<button onclick="${action}" class="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center ${color} transition group">
    <i class="fas ${icon} text-2xl mb-2 block group-hover:scale-110 transition-transform"></i>
    <span class="text-xs font-medium">${label}</span>
  </button>`;
}

function emptyState(msg, icon) {
  return `<div class="text-center py-8 text-gray-500"><i class="fas ${icon} text-3xl mb-3 block opacity-40"></i><p class="text-sm">${msg}</p></div>`;
}

// ╔══════════════════════════════════════════════════╗
// ║              ACCOUNTS (دليل الحسابات)             ║
// ╚══════════════════════════════════════════════════╝
async function renderAccounts(el) {
  const res = await apiFetch('/accounts');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ في جلب البيانات</p>'; return; }
  accountsCache = res.data;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white">دليل الحسابات</h2>
        <p class="text-gray-500 text-sm mt-1">${accountsCache.length} حساب مسجل</p>
      </div>
      <div class="flex gap-2">
        <button onclick="toggleAccountView()" id="viewToggleBtn" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm" title="تبديل العرض">
          <i class="fas fa-th-list"></i>
        </button>
        <button onclick="expandAllTree()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm" title="فتح الكل">
          <i class="fas fa-expand-alt"></i>
        </button>
        <button onclick="collapseAllTree()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm" title="إغلاق الكل">
          <i class="fas fa-compress-alt"></i>
        </button>
        <button onclick="showAddAccountModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition">
          <i class="fas fa-plus"></i> إضافة حساب
        </button>
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-4 border-b border-dark-700 flex gap-3">
        <div class="relative flex-1 max-w-md">
          <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="accountSearch" onkeyup="filterAccounts()" placeholder="بحث بالرمز أو الاسم..." class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl pr-10 pl-4 py-2.5 w-full text-sm outline-none focus:border-primary-500 transition">
        </div>
        <select id="accountTypeFilter" onchange="filterAccounts()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الأنواع</option>
          <option value="asset">أصول</option>
          <option value="liability">خصوم</option>
          <option value="equity">ملكية</option>
          <option value="revenue">إيرادات</option>
          <option value="expense">مصروفات</option>
        </select>
      </div>

      <!-- Tree View -->
      <div id="accountsTreeView" class="p-4">
        ${buildAccountsTree(accountsCache)}
      </div>

      <!-- Table View (hidden by default) -->
      <div id="accountsTableView" class="hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
            <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">اسم الحساب</th>
            <th class="px-4 py-3 text-right">النوع</th><th class="px-4 py-3 text-right">الطبيعة</th>
            <th class="px-4 py-3 text-left">الرصيد</th><th class="px-4 py-3 text-center">إجراءات</th>
          </tr></thead>
          <tbody id="accountsTableBody"></tbody>
        </table>
      </div>
    </div>`;

  renderAccountsTable();
}

function buildAccountsTree(accounts) {
  const types = { asset: 'أصول', liability: 'خصوم', equity: 'ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
  const typeColors = { asset: 'text-blue-400', liability: 'text-red-400', equity: 'text-yellow-400', revenue: 'text-green-400', expense: 'text-orange-400' };
  const typeBg = { asset: 'bg-blue-500/10', liability: 'bg-red-500/10', equity: 'bg-yellow-500/10', revenue: 'bg-green-500/10', expense: 'bg-orange-500/10' };

  function buildNode(parentId, level) {
    const children = accounts.filter(a => a.parent_id === parentId);
    if (children.length === 0) return '';

    return children.map(a => {
      const hasChildren = accounts.some(c => c.parent_id === a.id);
      const indent = level * 20;
      const balanceText = a.is_parent ? '' : `<span class="font-mono text-xs ${a.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}">${formatNumber(a.current_balance)}</span>`;

      if (hasChildren) {
        return `<div class="tree-node" data-type="${a.account_type}" data-name="${a.name_ar} ${a.code}">
          <div class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-dark-700/50 cursor-pointer transition group" style="padding-right:${indent + 12}px" onclick="this.parentElement.classList.toggle('tree-closed')">
            <i class="fas fa-chevron-down text-[10px] text-gray-500 transition-transform tree-chevron"></i>
            <i class="fas fa-folder-open text-yellow-500 text-sm tree-icon-open"></i>
            <i class="fas fa-folder text-yellow-600 text-sm tree-icon-closed hidden"></i>
            <span class="text-primary-400 font-mono text-xs">${a.code}</span>
            <span class="text-white font-medium text-sm flex-1">${a.name_ar}</span>
            <span class="${typeColors[a.account_type]} ${typeBg[a.account_type]} text-[10px] px-2 py-0.5 rounded-full font-medium">${types[a.account_type]}</span>
            ${balanceText}
            <div class="opacity-0 group-hover:opacity-100 transition flex gap-1">
              <button onclick="event.stopPropagation();showAddAccountModal(${a.id})" class="text-green-400 hover:text-green-300 p-1" title="إضافة فرعي"><i class="fas fa-plus text-xs"></i></button>
              <button onclick="event.stopPropagation();showEditAccountModal(${a.id})" class="text-primary-400 hover:text-primary-300 p-1" title="تعديل"><i class="fas fa-edit text-xs"></i></button>
            </div>
          </div>
          <div class="tree-children mr-2 border-r border-dark-700/50">${buildNode(a.id, level + 1)}</div>
        </div>`;
      }

      return `<div class="tree-node" data-type="${a.account_type}" data-name="${a.name_ar} ${a.code}">
        <div class="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-dark-700/50 transition group" style="padding-right:${indent + 28}px">
          <i class="fas fa-file-invoice text-gray-600 text-xs"></i>
          <span class="text-primary-400 font-mono text-xs">${a.code}</span>
          <span class="text-gray-300 text-sm flex-1">${a.name_ar}</span>
          ${balanceText}
          <div class="opacity-0 group-hover:opacity-100 transition flex gap-1">
            <button onclick="showEditAccountModal(${a.id})" class="text-primary-400 hover:text-primary-300 p-1" title="تعديل"><i class="fas fa-edit text-xs"></i></button>
            <button onclick="deleteAccount(${a.id})" class="text-red-400 hover:text-red-300 p-1" title="حذف"><i class="fas fa-trash text-xs"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  return buildNode(null, 0);
}

let accountViewMode = 'tree';
function toggleAccountView() {
  const treeView = document.getElementById('accountsTreeView');
  const tableView = document.getElementById('accountsTableView');
  const btn = document.getElementById('viewToggleBtn');
  if (accountViewMode === 'tree') {
    accountViewMode = 'table';
    treeView.classList.add('hidden');
    tableView.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-sitemap"></i>';
  } else {
    accountViewMode = 'tree';
    treeView.classList.remove('hidden');
    tableView.classList.add('hidden');
    btn.innerHTML = '<i class="fas fa-th-list"></i>';
  }
}

function expandAllTree() {
  document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('tree-closed'));
}
function collapseAllTree() {
  document.querySelectorAll('.tree-node').forEach(n => {
    if (n.querySelector('.tree-children')) n.classList.add('tree-closed');
  });
}

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  if (!tbody) return;
  const types = { asset: 'أصول', liability: 'خصوم', equity: 'ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
  const typeColors = { asset: 'badge-info', liability: 'badge-danger', equity: 'badge-warning', revenue: 'badge-success', expense: 'badge-danger' };
  tbody.innerHTML = accountsCache.map(a => {
    const indent = (a.level - 1) * 20;
    return `<tr class="table-row border-b border-dark-700/50" data-type="${a.account_type}" data-name="${a.name_ar} ${a.code}">
      <td class="px-4 py-2.5"><span class="font-mono text-primary-400 text-xs">${a.code}</span></td>
      <td class="px-4 py-2.5"><div style="padding-right:${indent}px" class="flex items-center gap-2">
        <i class="fas ${a.is_parent ? 'fa-folder text-yellow-500' : 'fa-file-invoice text-gray-600'} text-xs"></i>
        <span class="${a.is_parent ? 'font-bold text-white' : 'text-gray-300'} text-sm">${a.name_ar}</span></div></td>
      <td class="px-4 py-2.5"><span class="badge ${typeColors[a.account_type]}">${types[a.account_type]}</span></td>
      <td class="px-4 py-2.5 text-gray-400 text-xs">${a.account_nature === 'debit' ? 'مدين' : 'دائن'}</td>
      <td class="px-4 py-2.5 text-left font-mono text-xs ${a.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}">${a.is_parent ? '-' : formatNumber(a.current_balance)}</td>
      <td class="px-4 py-2.5 text-center">
        <button onclick="showEditAccountModal(${a.id})" class="text-primary-400 hover:text-primary-300 mx-0.5 p-1"><i class="fas fa-edit text-xs"></i></button>
        ${!a.is_parent ? `<button onclick="deleteAccount(${a.id})" class="text-red-400 hover:text-red-300 mx-0.5 p-1"><i class="fas fa-trash text-xs"></i></button>` : ''}
      </td></tr>`;
  }).join('');
}

function filterAccounts() {
  const q = (document.getElementById('accountSearch')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('accountTypeFilter')?.value || '';

  document.querySelectorAll('.tree-node').forEach(n => {
    const name = (n.dataset.name || '').toLowerCase();
    const type = n.dataset.type || '';
    const matchText = !q || name.includes(q);
    const matchType = !typeFilter || type === typeFilter;
    n.style.display = (matchText && matchType) ? '' : 'none';
  });

  document.querySelectorAll('#accountsTableBody tr').forEach(r => {
    const name = (r.dataset.name || '').toLowerCase();
    const type = r.dataset.type || '';
    const matchText = !q || name.includes(q);
    const matchType = !typeFilter || type === typeFilter;
    r.style.display = (matchText && matchType) ? '' : 'none';
  });
}

function showAddAccountModal(parentId = null) {
  const parents = accountsCache.filter(a => a.is_parent || a.level < 4);
  const parentOpts = [{ value: '', text: '-- حساب رئيسي --' }, ...parents.map(a => ({ value: a.id, text: `${'  '.repeat(a.level-1)}${a.code} - ${a.name_ar}` }))];

  const autoType = parentId ? (accountsCache.find(a => a.id === parentId)?.account_type || 'asset') : 'asset';
  const autoNature = ['asset', 'expense'].includes(autoType) ? 'debit' : 'credit';

  showModal('إضافة حساب جديد', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('accCode', 'رمز الحساب *')}
        ${selectField('accParent', 'الحساب الأب', parentOpts, parentId || '')}
      </div>
      ${inputField('accNameAr', 'اسم الحساب (عربي) *')}
      ${inputField('accNameEn', 'اسم الحساب (إنجليزي)')}
      <div class="grid grid-cols-2 gap-4">
        ${selectField('accType', 'نوع الحساب *', [
          {value:'asset',text:'أصول'},{value:'liability',text:'خصوم'},{value:'equity',text:'ملكية'},
          {value:'revenue',text:'إيرادات'},{value:'expense',text:'مصروفات'}
        ], autoType)}
        ${selectField('accNature', 'طبيعة الحساب *', [{value:'debit',text:'مدين'},{value:'credit',text:'دائن'}], autoNature)}
      </div>
      <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
        <input type="checkbox" id="accIsParent" class="rounded bg-dark-900 border-dark-600">
        حساب رئيسي (مجمّع) - لا يقبل قيود مباشرة
      </label>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm transition">إلغاء</button>
     <button onclick="saveAccount()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm transition"><i class="fas fa-save ml-1"></i> حفظ</button>`);

  document.getElementById('accParent').addEventListener('change', function() {
    const pid = this.value;
    if (pid) {
      const parent = accountsCache.find(a => a.id == pid);
      if (parent) {
        const siblings = accountsCache.filter(a => a.parent_id == pid);
        const maxCode = siblings.length > 0 ? Math.max(...siblings.map(s => parseInt(s.code))) : parseInt(parent.code) * 10;
        document.getElementById('accCode').value = maxCode + 1;
        document.getElementById('accType').value = parent.account_type;
        document.getElementById('accNature').value = parent.account_nature;
      }
    }
  });

  if (parentId) document.getElementById('accParent').dispatchEvent(new Event('change'));
}

async function saveAccount() {
  const data = {
    code: document.getElementById('accCode').value.trim(),
    name_ar: document.getElementById('accNameAr').value.trim(),
    name_en: document.getElementById('accNameEn').value.trim(),
    parent_id: document.getElementById('accParent').value || null,
    account_type: document.getElementById('accType').value,
    account_nature: document.getElementById('accNature').value,
    is_parent: document.getElementById('accIsParent').checked
  };
  if (!data.code || !data.name_ar) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return; }
  const res = await apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/accounts'); }
  else showToast(res.message, 'error');
}

function showEditAccountModal(id) {
  const a = accountsCache.find(x => x.id === id);
  if (!a) return;
  showModal('تعديل الحساب: ' + a.name_ar, `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('editAccCode', 'رمز الحساب', 'text', a.code)}
        ${selectField('editAccType', 'النوع', [
          {value:'asset',text:'أصول'},{value:'liability',text:'خصوم'},{value:'equity',text:'ملكية'},
          {value:'revenue',text:'إيرادات'},{value:'expense',text:'مصروفات'}
        ], a.account_type)}
      </div>
      ${inputField('editAccNameAr', 'اسم الحساب (عربي)', 'text', a.name_ar)}
      ${inputField('editAccNameEn', 'اسم الحساب (إنجليزي)', 'text', a.name_en || '')}
      <div class="grid grid-cols-2 gap-4">
        ${selectField('editAccNature', 'الطبيعة', [{value:'debit',text:'مدين'},{value:'credit',text:'دائن'}], a.account_nature)}
        ${selectField('editAccActive', 'الحالة', [{value:'1',text:'نشط'},{value:'0',text:'معطل'}], a.is_active ? '1' : '0')}
      </div>
      ${inputField('editAccNotes', 'ملاحظات', 'text', a.notes || '')}
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="updateAccount(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateAccount(id) {
  const data = {
    code: document.getElementById('editAccCode').value,
    name_ar: document.getElementById('editAccNameAr').value,
    name_en: document.getElementById('editAccNameEn').value,
    account_type: document.getElementById('editAccType').value,
    account_nature: document.getElementById('editAccNature').value,
    is_active: document.getElementById('editAccActive').value === '1',
    is_parent: accountsCache.find(a => a.id === id)?.is_parent,
    notes: document.getElementById('editAccNotes').value
  };
  const res = await apiFetch(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/accounts'); }
  else showToast(res.message, 'error');
}

async function deleteAccount(id) {
  const a = accountsCache.find(x => x.id === id);
  showConfirm('حذف حساب', `هل أنت متأكد من حذف الحساب "${a?.name_ar}"؟`, async () => {
    const res = await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); navigate('/accounts'); }
    else showToast(res.message, 'error');
  });
}

// ╔══════════════════════════════════════════════════╗
// ║            JOURNAL ENTRIES (القيود اليومية)        ║
// ╚══════════════════════════════════════════════════╝
async function renderJournal(el) {
  const page = 1;
  const res = await apiFetch(`/journal?page=${page}&limit=50`);
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white">القيود اليومية</h2>
        <p class="text-gray-500 text-sm mt-1">${res.total} قيد مسجل</p>
      </div>
      <button onclick="showAddJournalModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition">
        <i class="fas fa-plus"></i> قيد جديد
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="relative">
          <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="jeSearchInput" placeholder="بحث بالوصف أو الرقم..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none focus:border-primary-500" onkeyup="filterJournalTable()">
        </div>
        ${selectField('jeStatusFilter', '', [{value:'',text:'كل الحالات'},{value:'draft',text:'مسودة'},{value:'posted',text:'مرحّل'}])}
        <input type="date" id="jeFromDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterJournalByDate()">
        <input type="date" id="jeToDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterJournalByDate()">
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
            <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th>
            <th class="px-4 py-3 text-right">الوصف</th><th class="px-4 py-3 text-right">المرجع</th>
            <th class="px-4 py-3 text-left">مدين</th><th class="px-4 py-3 text-left">دائن</th>
            <th class="px-4 py-3 text-center">الحالة</th><th class="px-4 py-3 text-center">إجراءات</th>
          </tr></thead>
          <tbody id="journalTableBody">${res.data.map(e => journalRow(e)).join('')}</tbody>
        </table>
      </div>
      ${res.data.length === 0 ? emptyState('لا توجد قيود بعد - أنشئ أول قيد', 'fa-book-open') : ''}
    </div>`;

  document.getElementById('jeStatusFilter').addEventListener('change', filterJournalTable);
}

function journalRow(e) {
  return `<tr class="table-row border-b border-dark-700/50 cursor-pointer" onclick="viewJournalEntry(${e.id})" data-desc="${e.description || ''}" data-num="${e.entry_number}" data-status="${e.status}" data-date="${e.entry_date}">
    <td class="px-4 py-3 font-mono text-primary-400 font-bold">#${e.entry_number}</td>
    <td class="px-4 py-3 text-gray-400 text-xs">${e.entry_date}</td>
    <td class="px-4 py-3 text-gray-300 max-w-[200px] truncate">${e.description || '<span class="text-gray-600">-</span>'}</td>
    <td class="px-4 py-3 text-gray-500 text-xs">${e.reference || ''}</td>
    <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(e.total_debit)}</td>
    <td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(e.total_credit)}</td>
    <td class="px-4 py-3 text-center"><span class="badge ${e.status==='posted'?'badge-success':e.status==='cancelled'?'badge-danger':'badge-warning'}">${e.status==='posted'?'مرحّل':e.status==='cancelled'?'ملغي':'مسودة'}</span></td>
    <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
      ${e.status==='draft'?`
        <button onclick="postJournalEntry(${e.id})" class="text-green-400 hover:text-green-300 p-1 mx-0.5" title="ترحيل"><i class="fas fa-check-circle"></i></button>
        <button onclick="showEditJournalModal(${e.id})" class="text-primary-400 hover:text-primary-300 p-1 mx-0.5" title="تعديل"><i class="fas fa-edit"></i></button>
        <button onclick="deleteJournalEntry(${e.id})" class="text-red-400 hover:text-red-300 p-1 mx-0.5" title="حذف"><i class="fas fa-trash"></i></button>
      `:`<button onclick="viewJournalEntry(${e.id})" class="text-primary-400 hover:text-primary-300 p-1" title="عرض"><i class="fas fa-eye"></i></button>`}
    </td></tr>`;
}

function filterJournalTable() {
  const q = (document.getElementById('jeSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('jeStatusFilter')?.value || '';
  document.querySelectorAll('#journalTableBody tr').forEach(r => {
    const desc = (r.dataset.desc || '').toLowerCase();
    const num = r.dataset.num || '';
    const st = r.dataset.status || '';
    const matchText = !q || desc.includes(q) || num.includes(q);
    const matchStatus = !status || st === status;
    r.style.display = (matchText && matchStatus) ? '' : 'none';
  });
}

function filterJournalByDate() {
  const from = document.getElementById('jeFromDate')?.value || '';
  const to = document.getElementById('jeToDate')?.value || '';
  document.querySelectorAll('#journalTableBody tr').forEach(r => {
    const date = r.dataset.date || '';
    const matchFrom = !from || date >= from;
    const matchTo = !to || date <= to;
    r.style.display = (matchFrom && matchTo) ? '' : 'none';
  });
}

async function showJournalModal(entryId = null, prefillData = null) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  window._jeAccOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');

  const title = entryId ? `تعديل القيد #${prefillData?.entry_number || ''}` : 'قيد محاسبي جديد';

  showModal(title, `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('jeDate', 'التاريخ *', 'date', prefillData?.entry_date || todayStr())}
        ${inputField('jeRef', 'المرجع', 'text', prefillData?.reference || '')}
      </div>
      ${inputField('jeDesc', 'الوصف / البيان', 'text', prefillData?.description || '')}
      <input type="hidden" id="jeEntryId" value="${entryId || ''}">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-sm font-medium">أسطر القيد</label>
          <button onclick="addJournalLine()" class="text-primary-400 text-xs hover:text-primary-300 transition"><i class="fas fa-plus ml-1"></i> إضافة سطر</button>
        </div>
        <div class="bg-dark-900 rounded-xl p-3">
          <div class="grid grid-cols-12 gap-2 mb-2 text-[10px] text-gray-500 uppercase font-medium">
            <span class="col-span-5">الحساب</span><span class="col-span-2 text-center">مدين</span>
            <span class="col-span-2 text-center">دائن</span><span class="col-span-2">بيان</span><span class="col-span-1"></span>
          </div>
          <div id="journalLines" class="space-y-2"></div>
        </div>
        <div class="flex justify-between items-center mt-3 p-3 bg-dark-900 rounded-xl text-sm">
          <span class="text-gray-400">المجموع:</span>
          <div class="flex items-center gap-4">
            <span>مدين: <strong id="jeTotalDebit" class="text-green-400 font-mono">0</strong></span>
            <span>دائن: <strong id="jeTotalCredit" class="text-red-400 font-mono">0</strong></span>
            <span id="jeBalance" class="font-bold"></span>
          </div>
        </div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveJournalEntry()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> ${entryId ? 'حفظ التعديلات' : 'حفظ القيد'}</button>`,
    'max-w-3xl');

  // Add lines
  if (prefillData?.lines?.length > 0) {
    prefillData.lines.forEach(l => {
      addJournalLine();
      const lastLine = document.querySelector('.journal-line:last-child');
      lastLine.querySelector('.je-account').value = l.account_id;
      lastLine.querySelector('.je-debit').value = l.debit > 0 ? l.debit : '';
      lastLine.querySelector('.je-credit').value = l.credit > 0 ? l.credit : '';
      lastLine.querySelector('.je-line-desc').value = l.description || '';
    });
    calcJournalTotals();
  } else {
    addJournalLine(); addJournalLine();
  }
}

async function showAddJournalModal() {
  await showJournalModal();
}

async function showEditJournalModal(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات القيد', 'error'); return; }
  const e = res.data;
  if (e.status === 'posted') { showToast('لا يمكن تعديل قيد مرحّل', 'error'); return; }
  await showJournalModal(id, e);
}

function addJournalLine() {
  const container = document.getElementById('journalLines');
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center journal-line';
  div.innerHTML = `
    <select class="je-account col-span-5 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500">
      <option value="">اختر الحساب</option>${window._jeAccOptions}</select>
    <input type="number" class="je-debit col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="0" oninput="if(this.value>0)this.closest('.journal-line').querySelector('.je-credit').value='';calcJournalTotals()" min="0" step="0.01">
    <input type="number" class="je-credit col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="0" oninput="if(this.value>0)this.closest('.journal-line').querySelector('.je-debit').value='';calcJournalTotals()" min="0" step="0.01">
    <input type="text" class="je-line-desc col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none" placeholder="بيان">
    <button onclick="this.closest('.journal-line').remove();calcJournalTotals()" class="col-span-1 text-red-400 hover:text-red-300 text-center"><i class="fas fa-times-circle"></i></button>`;
  container.appendChild(div);
}

function calcJournalTotals() {
  let td = 0, tc = 0;
  document.querySelectorAll('.je-debit').forEach(i => td += parseFloat(i.value || 0));
  document.querySelectorAll('.je-credit').forEach(i => tc += parseFloat(i.value || 0));
  const tdEl = document.getElementById('jeTotalDebit');
  const tcEl = document.getElementById('jeTotalCredit');
  const balEl = document.getElementById('jeBalance');
  if (tdEl) tdEl.textContent = formatNumber(td);
  if (tcEl) tcEl.textContent = formatNumber(tc);
  const diff = Math.abs(td - tc);
  if (balEl) {
    balEl.textContent = diff < 0.01 ? '✓ متوازن' : `فرق: ${formatNumber(diff)}`;
    balEl.className = diff < 0.01 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold';
  }
}

async function saveJournalEntry() {
  const lines = [];
  document.querySelectorAll('.journal-line').forEach(row => {
    const acc = row.querySelector('.je-account').value;
    const debit = parseFloat(row.querySelector('.je-debit').value || 0);
    const credit = parseFloat(row.querySelector('.je-credit').value || 0);
    const desc = row.querySelector('.je-line-desc').value;
    if (acc && (debit > 0 || credit > 0)) {
      lines.push({ account_id: parseInt(acc), debit, credit, description: desc });
    }
  });

  const entryId = document.getElementById('jeEntryId')?.value;
  const data = {
    entry_date: document.getElementById('jeDate').value,
    description: document.getElementById('jeDesc').value,
    reference: document.getElementById('jeRef').value,
    lines,
    created_by: getUser()?.id
  };

  let res;
  if (entryId) {
    res = await apiFetch(`/journal/${entryId}`, { method: 'PUT', body: JSON.stringify(data) });
  } else {
    res = await apiFetch('/journal', { method: 'POST', body: JSON.stringify(data) });
  }
  if (res.success) { showToast(res.message); closeModal(); navigate('/journal'); }
  else showToast(res.message, 'error');
}

async function viewJournalEntry(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast(res.message, 'error'); return; }
  const e = res.data;
  showModal(`قيد رقم #${e.entry_number}`, `
    <div class="space-y-4">
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">التاريخ</span><span class="text-white font-medium">${e.entry_date}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">الحالة</span><span class="badge ${e.status==='posted'?'badge-success':'badge-warning'}">${e.status==='posted'?'مرحّل':'مسودة'}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">المرجع</span><span class="text-white">${e.reference||'-'}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">النوع</span><span class="text-white">${e.entry_type==='manual'?'يدوي':e.entry_type==='voucher'?'سند':'تلقائي'}</span></div>
      </div>
      ${e.description ? `<div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">الوصف:</span><p class="text-white mt-1">${e.description}</p></div>` : ''}
      <table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs">
          <th class="px-3 py-2.5 text-right w-8">#</th><th class="px-3 py-2.5 text-right">الحساب</th>
          <th class="px-3 py-2.5 text-right">البيان</th><th class="px-3 py-2.5 text-left">مدين</th><th class="px-3 py-2.5 text-left">دائن</th>
        </tr></thead>
        <tbody>${e.lines.map((l,i) => `
          <tr class="border-b border-dark-700/50">
            <td class="px-3 py-2.5 text-gray-500 text-xs">${i+1}</td>
            <td class="px-3 py-2.5"><span class="text-primary-400 font-mono text-xs">${l.account_code}</span> <span class="text-gray-300">${l.account_name}</span></td>
            <td class="px-3 py-2.5 text-gray-400 text-xs">${l.description||''}</td>
            <td class="px-3 py-2.5 text-left font-mono ${l.debit>0?'text-green-400':'text-gray-600'}">${l.debit>0?formatNumber(l.debit):''}</td>
            <td class="px-3 py-2.5 text-left font-mono ${l.credit>0?'text-red-400':'text-gray-600'}">${l.credit>0?formatNumber(l.credit):''}</td>
          </tr>`).join('')}
          <tr class="bg-primary-900/20 font-bold text-white">
            <td class="px-3 py-3" colspan="3">المجموع</td>
            <td class="px-3 py-3 text-left font-mono text-green-400">${formatNumber(e.total_debit)}</td>
            <td class="px-3 py-3 text-left font-mono text-red-400">${formatNumber(e.total_credit)}</td>
          </tr>
        </tbody>
      </table>
    </div>`,
    `${e.status==='draft'?`<button onclick="closeModal();showEditJournalModal(${e.id})" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm"><i class="fas fa-edit ml-1"></i> تعديل</button>`:''}
     <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`,
    'max-w-3xl');
}

async function postJournalEntry(id) {
  showConfirm('ترحيل القيد', 'سيتم ترحيل القيد وتحديث أرصدة الحسابات. لا يمكن التراجع.', async () => {
    const res = await apiFetch(`/journal/${id}/post`, { method: 'POST' });
    if (res.success) { showToast(res.message); navigate('/journal'); } else showToast(res.message, 'error');
  });
}

async function deleteJournalEntry(id) {
  showConfirm('حذف القيد', 'هل أنت متأكد من حذف هذا القيد؟', async () => {
    const res = await apiFetch(`/journal/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); navigate('/journal'); } else showToast(res.message, 'error');
  });
}

// ╔══════════════════════════════════════════════════╗
// ║                VOUCHERS (السندات)                 ║
// ╚══════════════════════════════════════════════════╝
async function renderVouchers(el, type) {
  const typeLabel = type === 'receipt' ? 'القبض' : 'الصرف';
  const typeIcon = type === 'receipt' ? 'fa-hand-holding-usd' : 'fa-money-bill-wave';
  const typeColor = type === 'receipt' ? 'green' : 'red';
  const res = await apiFetch(`/vouchers?type=${type}`);
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white"><i class="fas ${typeIcon} ml-2 text-${typeColor}-400"></i>سندات ${typeLabel}</h2>
        <p class="text-gray-500 text-sm mt-1">${res.total} سند</p>
      </div>
      <button onclick="showAddVoucherModal('${type}')" class="bg-${typeColor}-600 hover:bg-${typeColor}-700 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition">
        <i class="fas fa-plus"></i> سند ${typeLabel === 'القبض' ? 'قبض' : 'صرف'} جديد
      </button>
    </div>

    <!-- Search -->
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="relative">
          <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="vSearchInput" placeholder="بحث بالرقم أو المستفيد..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none focus:border-primary-500" onkeyup="filterVoucherTable()">
        </div>
        <select id="vStatusFilter" onchange="filterVoucherTable()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مرحّل</option>
        </select>
        <input type="date" id="vDateFilter" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterVoucherTable()">
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
            <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th>
            <th class="px-4 py-3 text-right">الحساب</th><th class="px-4 py-3 text-right">المستفيد/الوصف</th>
            <th class="px-4 py-3 text-right">الدفع</th><th class="px-4 py-3 text-left">المبلغ</th>
            <th class="px-4 py-3 text-center">الحالة</th><th class="px-4 py-3 text-center">إجراءات</th>
          </tr></thead>
          <tbody id="voucherTableBody">${res.data.map(v => `
            <tr class="table-row border-b border-dark-700/50 cursor-pointer" onclick="viewVoucher(${v.id})" data-num="${v.voucher_number}" data-ben="${v.beneficiary||''}" data-status="${v.status}" data-date="${v.voucher_date}">
              <td class="px-4 py-3 font-mono text-primary-400 font-bold">#${v.voucher_number}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">${v.voucher_date}</td>
              <td class="px-4 py-3 text-sm"><span class="text-primary-400 font-mono text-xs">${v.account_code}</span> <span class="text-gray-300">${v.account_name}</span></td>
              <td class="px-4 py-3 text-gray-300 text-sm max-w-[150px] truncate">${v.beneficiary || v.description || '-'}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">${v.payment_method==='cash'?'نقد':v.payment_method==='check'?'شيك':'تحويل'}</td>
              <td class="px-4 py-3 text-left font-mono font-bold text-${typeColor}-400">${formatNumber(v.amount)}</td>
              <td class="px-4 py-3 text-center"><span class="badge ${v.status==='posted'?'badge-success':'badge-warning'}">${v.status==='posted'?'مرحّل':'مسودة'}</span></td>
              <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
                ${v.status==='draft'?`
                  <button onclick="postVoucher(${v.id})" class="text-green-400 hover:text-green-300 p-1" title="ترحيل"><i class="fas fa-check-circle"></i></button>
                  <button onclick="deleteVoucher(${v.id},'${type}')" class="text-red-400 hover:text-red-300 p-1" title="حذف"><i class="fas fa-trash"></i></button>
                `:`<button onclick="printVoucher(${v.id})" class="text-gray-400 hover:text-gray-300 p-1" title="طباعة"><i class="fas fa-print"></i></button>`}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${res.data.length === 0 ? emptyState('لا توجد سندات بعد', typeIcon) : ''}
    </div>`;
}

function filterVoucherTable() {
  const q = (document.getElementById('vSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('vStatusFilter')?.value || '';
  const date = document.getElementById('vDateFilter')?.value || '';
  document.querySelectorAll('#voucherTableBody tr').forEach(r => {
    const num = r.dataset.num || '';
    const ben = (r.dataset.ben || '').toLowerCase();
    const st = r.dataset.status || '';
    const dt = r.dataset.date || '';
    const matchText = !q || num.includes(q) || ben.includes(q);
    const matchStatus = !status || st === status;
    const matchDate = !date || dt === date;
    r.style.display = (matchText && matchStatus && matchDate) ? '' : 'none';
  });
}

async function showAddVoucherModal(type) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  window._vAccOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');
  const label = type === 'receipt' ? 'قبض' : 'صرف';

  showModal(`سند ${label} جديد`, `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('vDate', 'التاريخ *', 'date', todayStr())}
        ${inputField('vAmount', 'المبلغ الإجمالي *', 'number', '', 'step="0.01" min="0"')}
      </div>
      ${selectField('vAccount', type==='receipt'?'الحساب المدين (الصندوق/البنك) *':'الحساب الدائن (الصندوق/البنك) *',
        [{value:'',text:'اختر الحساب'}, ...accounts.map(a => ({value: a.id, text: `${a.code} - ${a.name_ar}`}))])}
      <div class="grid grid-cols-2 gap-4">
        ${inputField('vBeneficiary', 'المستفيد / الجهة')}
        ${selectField('vPayment', 'طريقة الدفع', [{value:'cash',text:'نقداً'},{value:'check',text:'شيك'},{value:'transfer',text:'تحويل بنكي'}])}
      </div>
      ${inputField('vDesc', 'الوصف / البيان')}

      <div id="checkDetails" class="hidden grid grid-cols-3 gap-3">
        ${inputField('vCheckNum', 'رقم الشيك')}
        ${inputField('vCheckDate', 'تاريخ الشيك', 'date')}
        ${inputField('vBankName', 'اسم البنك')}
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-sm font-medium">${type==='receipt'?'الحسابات الدائنة':'الحسابات المدينة'} (التوزيع)</label>
          <button onclick="addVoucherLine()" class="text-primary-400 text-xs hover:text-primary-300"><i class="fas fa-plus ml-1"></i> إضافة</button>
        </div>
        <div id="voucherLines" class="space-y-2 bg-dark-900 rounded-xl p-3"></div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveVoucher('${type}')" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`,
    'max-w-2xl');

  document.getElementById('vPayment').addEventListener('change', function() {
    document.getElementById('checkDetails').classList.toggle('hidden', this.value !== 'check');
  });

  addVoucherLine();
}

function addVoucherLine() {
  const c = document.getElementById('voucherLines');
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center voucher-line';
  div.innerHTML = `
    <select class="vl-account col-span-5 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none"><option value="">اختر الحساب</option>${window._vAccOptions}</select>
    <input type="number" class="vl-amount col-span-3 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none text-left" placeholder="المبلغ" step="0.01" min="0">
    <input type="text" class="vl-desc col-span-3 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none" placeholder="بيان">
    <button onclick="this.closest('.voucher-line').remove()" class="col-span-1 text-red-400 hover:text-red-300 text-center"><i class="fas fa-times-circle"></i></button>`;
  c.appendChild(div);
}

async function saveVoucher(type) {
  const details = [];
  document.querySelectorAll('.voucher-line').forEach(row => {
    const acc = row.querySelector('.vl-account').value;
    const amt = parseFloat(row.querySelector('.vl-amount').value || 0);
    const desc = row.querySelector('.vl-desc').value;
    if (acc && amt > 0) details.push({ account_id: parseInt(acc), amount: amt, description: desc });
  });

  const amount = parseFloat(document.getElementById('vAmount').value);
  const accountId = document.getElementById('vAccount').value;
  if (!amount || !accountId) { showToast('يرجى ملء المبلغ والحساب', 'error'); return; }

  const data = {
    voucher_type: type,
    voucher_date: document.getElementById('vDate').value,
    account_id: parseInt(accountId),
    amount: amount,
    description: document.getElementById('vDesc').value,
    beneficiary: document.getElementById('vBeneficiary').value,
    payment_method: document.getElementById('vPayment').value,
    check_number: document.getElementById('vCheckNum')?.value || null,
    check_date: document.getElementById('vCheckDate')?.value || null,
    bank_name: document.getElementById('vBankName')?.value || null,
    details,
    created_by: getUser()?.id
  };

  const res = await apiFetch('/vouchers', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate(`/vouchers/${type}`); }
  else showToast(res.message, 'error');
}

async function viewVoucher(id) {
  const res = await apiFetch(`/vouchers/${id}`);
  if (!res.success) return;
  const v = res.data;
  const isReceipt = v.voucher_type === 'receipt';
  const typeLabel = isReceipt ? 'سند قبض' : 'سند صرف';
  const typeColor = isReceipt ? 'green' : 'red';

  showModal(`${typeLabel} رقم #${v.voucher_number}`, `
    <div id="voucherPrintContent">
      <div class="print-only text-center mb-6">
        <h2 class="text-xl font-bold">${typeLabel}</h2>
        <p>رقم: ${v.voucher_number} | تاريخ: ${v.voucher_date}</p>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block mb-1">المبلغ</span>
          <strong class="text-${typeColor}-400 text-xl font-mono">${formatNumber(v.amount)}</strong>
        </div>
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block mb-1">التاريخ</span>
          <span class="text-white">${v.voucher_date}</span>
        </div>
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block mb-1">الحالة</span>
          <span class="badge ${v.status==='posted'?'badge-success':'badge-warning'}">${v.status==='posted'?'مرحّل':'مسودة'}</span>
        </div>
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block mb-1">طريقة الدفع</span>
          <span class="text-white">${v.payment_method==='cash'?'نقداً':v.payment_method==='check'?'شيك':'تحويل'}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">الحساب:</span><br><span class="text-primary-400 font-mono">${v.account_code}</span> ${v.account_name}</div>
        ${v.beneficiary ? `<div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">المستفيد:</span><br><span class="text-white">${v.beneficiary}</span></div>` : ''}
      </div>

      ${v.description ? `<div class="bg-dark-900 rounded-xl p-3 mb-4 text-sm"><span class="text-gray-500 text-xs">الوصف:</span><br><span class="text-white">${v.description}</span></div>` : ''}

      ${v.details && v.details.length > 0 ? `
      <table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs">
          <th class="px-3 py-2 text-right">#</th><th class="px-3 py-2 text-right">الحساب</th>
          <th class="px-3 py-2 text-right">البيان</th><th class="px-3 py-2 text-left">المبلغ</th>
        </tr></thead>
        <tbody>${v.details.map((d,i) => `<tr class="border-b border-dark-700/50">
          <td class="px-3 py-2 text-gray-500 text-xs">${i+1}</td>
          <td class="px-3 py-2"><span class="text-primary-400 font-mono text-xs">${d.account_code}</span> ${d.account_name}</td>
          <td class="px-3 py-2 text-gray-400 text-xs">${d.description||''}</td>
          <td class="px-3 py-2 text-left font-mono font-bold">${formatNumber(d.amount)}</td>
        </tr>`).join('')}
        <tr class="bg-dark-900 font-bold"><td class="px-3 py-2" colspan="3">المجموع</td>
          <td class="px-3 py-2 text-left font-mono text-${typeColor}-400">${formatNumber(v.amount)}</td></tr>
        </tbody>
      </table>` : ''}

      <div class="print-only mt-10 grid grid-cols-3 gap-4 text-center text-sm">
        <div><p class="border-t border-black pt-2">المحاسب</p></div>
        <div><p class="border-t border-black pt-2">المدقق</p></div>
        <div><p class="border-t border-black pt-2">المدير المالي</p></div>
      </div>
    </div>`,
    `<button onclick="printVoucher(${v.id})" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
     <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`,
    'max-w-2xl');
}

function printVoucher(id) {
  window.print();
}

async function postVoucher(id) {
  showConfirm('ترحيل السند', 'سيتم ترحيل السند وإنشاء قيد محاسبي تلقائي.', async () => {
    const res = await apiFetch(`/vouchers/${id}/post`, { method: 'POST' });
    if (res.success) { showToast(res.message); const path = window.location.pathname.replace('/app',''); navigate(path); }
    else showToast(res.message, 'error');
  });
}

async function deleteVoucher(id, type) {
  showConfirm('حذف السند', 'هل أنت متأكد من حذف هذا السند؟', async () => {
    const res = await apiFetch(`/vouchers/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); navigate(`/vouchers/${type}`); } else showToast(res.message, 'error');
  });
}

// ╔══════════════════════════════════════════════════╗
// ║                  REPORTS (التقارير)                ║
// ╚══════════════════════════════════════════════════╝

// -- ميزان المراجعة --
async function renderTrialBalance(el) {
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-balance-scale ml-2 text-purple-400"></i>ميزان المراجعة</h2>
      <div class="flex gap-2">
        <button onclick="exportTableCSV('trialBalanceTable','ميزان_المراجعة')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-csv ml-1"></i> CSV</button>
        <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label class="text-gray-400 text-xs mb-1 block">من تاريخ</label>
          <input type="date" id="tbFromDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none"></div>
        <div><label class="text-gray-400 text-xs mb-1 block">إلى تاريخ</label>
          <input type="date" id="tbDate" value="${todayStr()}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none"></div>
        <div><label class="text-gray-400 text-xs mb-1 block">مستوى العرض</label>
          <select id="tbLevel" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none">
            <option value="0">كل المستويات</option><option value="1">المستوى 1</option><option value="2">المستوى 2</option><option value="3">المستوى 3</option>
          </select></div>
        <div class="flex items-end">
          <button onclick="loadTrialBalance()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button>
        </div>
      </div>
    </div>

    <div id="tbResult"></div>`;

  loadTrialBalance();
}

async function loadTrialBalance() {
  const date = document.getElementById('tbDate')?.value || '';
  const level = document.getElementById('tbLevel')?.value || '0';
  const resultEl = document.getElementById('tbResult');
  resultEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';

  const res = await apiFetch(`/reports/trial-balance?date=${date}&level=${level}`);
  if (!res.success) { resultEl.innerHTML = '<p class="text-red-400 text-center">خطأ</p>'; return; }

  const data = res.data.filter(a => a.total_debit > 0 || a.total_credit > 0 || a.opening_balance !== 0);
  let sumDebit = 0, sumCredit = 0, sumDbBal = 0, sumCrBal = 0;
  data.forEach(a => { if (!a.is_parent) { sumDebit += a.total_debit; sumCredit += a.total_credit; sumDbBal += a.debit_balance; sumCrBal += a.credit_balance; } });

  resultEl.innerHTML = `
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="trialBalanceTable">
          <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
            <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">الحساب</th>
            <th class="px-4 py-3 text-left">حركة مدين</th><th class="px-4 py-3 text-left">حركة دائن</th>
            <th class="px-4 py-3 text-left">رصيد مدين</th><th class="px-4 py-3 text-left">رصيد دائن</th>
          </tr></thead>
          <tbody>${data.map(a => `
            <tr class="table-row border-b border-dark-700/50 ${a.is_parent?'bg-dark-900/40':''}">
              <td class="px-4 py-2.5 font-mono text-primary-400 text-xs">${a.code}</td>
              <td class="px-4 py-2.5 ${a.is_parent?'font-bold text-white':'text-gray-300'} text-sm" style="padding-right:${(a.level-1)*16+16}px">${a.name_ar}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs">${a.total_debit>0?formatNumber(a.total_debit):''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs">${a.total_credit>0?formatNumber(a.total_credit):''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs text-green-400">${a.debit_balance>0?formatNumber(a.debit_balance):''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs text-red-400">${a.credit_balance>0?formatNumber(a.credit_balance):''}</td>
            </tr>`).join('')}
            <tr class="bg-primary-900/30 font-bold text-white text-sm">
              <td class="px-4 py-3" colspan="2">المجموع</td>
              <td class="px-4 py-3 text-left font-mono">${formatNumber(sumDebit)}</td>
              <td class="px-4 py-3 text-left font-mono">${formatNumber(sumCredit)}</td>
              <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(sumDbBal)}</td>
              <td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(sumCrBal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${data.length === 0 ? emptyState('لا توجد حركات مالية بعد', 'fa-balance-scale') : ''}
    </div>`;
}

// -- كشف حساب --
async function renderAccountStatement(el) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  const accOpts = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');

  el.innerHTML = `
    <div class="mb-6"><h2 class="text-2xl font-bold text-white"><i class="fas fa-file-invoice-dollar ml-2 text-blue-400"></i>كشف حساب</h2></div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1.5 font-medium">الحساب *</label>
          <select id="stmtAccount" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500"><option value="">اختر الحساب</option>${accOpts}</select></div>
        ${inputField('stmtFrom', 'من تاريخ', 'date')}
        ${inputField('stmtTo', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end gap-2">
          <button onclick="loadAccountStatement()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm flex-1 transition">عرض</button>
          <button onclick="exportTableCSV('stmtTable','كشف_حساب')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2.5 rounded-xl text-sm"><i class="fas fa-file-csv"></i></button>
        </div>
      </div>
    </div>
    <div id="stmtResult"></div>`;
}

async function loadAccountStatement() {
  const accId = document.getElementById('stmtAccount').value;
  if (!accId) { showToast('اختر حساباً', 'error'); return; }
  const from = document.getElementById('stmtFrom').value;
  const to = document.getElementById('stmtTo').value;
  let url = `/reports/account-statement/${accId}?`;
  if (from) url += `from=${from}&`;
  if (to) url += `to=${to}`;

  const resultEl = document.getElementById('stmtResult');
  resultEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';

  const res = await apiFetch(url);
  if (!res.success) { showToast(res.message, 'error'); resultEl.innerHTML = ''; return; }
  const d = res.data;

  resultEl.innerHTML = `
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-5 border-b border-dark-700 flex justify-between items-center">
        <div>
          <span class="text-white font-bold text-lg">${d.account.name_ar}</span>
          <span class="text-gray-500 text-sm mr-3">(${d.account.code})</span>
        </div>
        <button onclick="window.print()" class="text-gray-400 hover:text-white text-sm transition"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>

      <div class="grid grid-cols-4 gap-3 p-4">
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block">الرصيد الافتتاحي</span>
          <strong class="text-white font-mono">${formatNumber(d.opening_balance)}</strong>
        </div>
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block">إجمالي المدين</span>
          <strong class="text-green-400 font-mono">${formatNumber(d.total_debit)}</strong>
        </div>
        <div class="bg-dark-900 rounded-xl p-3 text-center">
          <span class="text-gray-500 text-xs block">إجمالي الدائن</span>
          <strong class="text-red-400 font-mono">${formatNumber(d.total_credit)}</strong>
        </div>
        <div class="bg-primary-900/30 rounded-xl p-3 text-center border border-primary-700">
          <span class="text-gray-400 text-xs block">الرصيد الختامي</span>
          <strong class="text-primary-400 font-mono text-lg">${formatNumber(d.closing_balance)}</strong>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="stmtTable">
          <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
            <th class="px-4 py-3 text-right">التاريخ</th><th class="px-4 py-3 text-right">رقم القيد</th>
            <th class="px-4 py-3 text-right">البيان</th><th class="px-4 py-3 text-left">مدين</th>
            <th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-left">الرصيد</th>
          </tr></thead>
          <tbody>
            <tr class="bg-dark-900/50 border-b border-dark-700 text-gray-400 text-sm"><td class="px-4 py-2.5" colspan="5">رصيد مرحّل</td>
              <td class="px-4 py-2.5 text-left font-mono font-bold text-white">${formatNumber(d.opening_balance)}</td></tr>
            ${d.lines.map(l => `<tr class="table-row border-b border-dark-700/50">
              <td class="px-4 py-2.5 text-gray-400 text-xs">${l.entry_date}</td>
              <td class="px-4 py-2.5 font-mono text-primary-400 text-xs cursor-pointer hover:text-primary-300" onclick="viewJournalEntry(${l.journal_entry_id})">#${l.entry_number}</td>
              <td class="px-4 py-2.5 text-gray-300 text-xs">${l.description || l.entry_description || ''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs text-green-400">${l.debit>0?formatNumber(l.debit):''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs text-red-400">${l.credit>0?formatNumber(l.credit):''}</td>
              <td class="px-4 py-2.5 text-left font-mono text-xs font-bold ${l.running_balance>=0?'text-white':'text-red-400'}">${formatNumber(l.running_balance)}</td>
            </tr>`).join('')}
            <tr class="bg-primary-900/30 font-bold text-white"><td class="px-4 py-3" colspan="3">الرصيد الختامي</td>
              <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(d.total_debit)}</td>
              <td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(d.total_credit)}</td>
              <td class="px-4 py-3 text-left font-mono text-lg">${formatNumber(d.closing_balance)}</td></tr>
          </tbody>
        </table>
      </div>
      ${d.lines.length === 0 ? emptyState('لا توجد حركات على هذا الحساب', 'fa-file-invoice-dollar') : ''}
    </div>`;
}

// -- قائمة الدخل --
async function renderIncomeStatement(el) {
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-chart-line ml-2 text-green-400"></i>قائمة الدخل</h2>
      <div class="flex gap-2">
        <button onclick="exportTableCSV('incomeTable','قائمة_الدخل')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-csv"></i></button>
        <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
    </div>
    <!-- Date Filters -->
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${inputField('incFrom', 'من تاريخ', 'date')}
        ${inputField('incTo', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end">
          <button onclick="loadIncomeStatement()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button>
        </div>
      </div>
    </div>
    <div id="incomeResult"></div>`;
  loadIncomeStatement();
}

async function loadIncomeStatement() {
  const from = document.getElementById('incFrom')?.value || '';
  const to = document.getElementById('incTo')?.value || '';
  let url = '/reports/income-statement?';
  if (from) url += `from=${from}&`;
  if (to) url += `to=${to}`;

  const resultEl = document.getElementById('incomeResult');
  resultEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';

  const res = await apiFetch(url);
  if (!res.success) { resultEl.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const d = res.data;

  resultEl.innerHTML = `
    <div class="max-w-3xl mx-auto bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden" id="incomeTable">
      <div class="p-5 border-b border-dark-700">
        <h3 class="text-green-400 font-bold text-lg mb-4"><i class="fas fa-arrow-trend-down ml-2"></i>الإيرادات</h3>
        ${d.revenues.length === 0 ? '<p class="text-gray-500 text-sm">لا توجد إيرادات</p>' :
        d.revenues.map(r => `<div class="flex justify-between py-2.5 border-b border-dark-700/30 text-sm hover:bg-dark-700/30 px-2 rounded transition">
          <span class="text-gray-300"><span class="text-primary-400 font-mono text-xs ml-2">${r.code}</span>${r.name_ar}</span>
          <span class="text-green-400 font-mono font-bold">${formatNumber(r.balance)}</span>
        </div>`).join('')}
        <div class="flex justify-between py-3 font-bold text-green-400 border-t-2 border-green-800/50 mt-3 text-lg">
          <span>إجمالي الإيرادات</span><span class="font-mono">${formatNumber(d.totalRevenue)}</span>
        </div>
      </div>

      <div class="p-5 border-b border-dark-700">
        <h3 class="text-red-400 font-bold text-lg mb-4"><i class="fas fa-arrow-trend-up ml-2"></i>المصروفات</h3>
        ${d.expenses.length === 0 ? '<p class="text-gray-500 text-sm">لا توجد مصروفات</p>' :
        d.expenses.map(e => `<div class="flex justify-between py-2.5 border-b border-dark-700/30 text-sm hover:bg-dark-700/30 px-2 rounded transition">
          <span class="text-gray-300"><span class="text-primary-400 font-mono text-xs ml-2">${e.code}</span>${e.name_ar}</span>
          <span class="text-red-400 font-mono font-bold">${formatNumber(e.balance)}</span>
        </div>`).join('')}
        <div class="flex justify-between py-3 font-bold text-red-400 border-t-2 border-red-800/50 mt-3 text-lg">
          <span>إجمالي المصروفات</span><span class="font-mono">${formatNumber(d.totalExpenses)}</span>
        </div>
      </div>

      <div class="p-5 ${d.netIncome>=0?'bg-green-900/20':'bg-red-900/20'}">
        <div class="flex justify-between items-center text-xl font-bold">
          <span class="text-white flex items-center gap-2">
            <i class="fas ${d.netIncome>=0?'fa-trending-up text-green-400':'fa-trending-down text-red-400'}"></i>
            ${d.netIncome>=0?'صافي الربح':'صافي الخسارة'}
          </span>
          <span class="font-mono ${d.netIncome>=0?'text-green-400':'text-red-400'} text-2xl">${formatNumber(Math.abs(d.netIncome))}</span>
        </div>
      </div>
    </div>`;
}

// -- الميزانية العمومية --
async function renderBalanceSheet(el) {
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-file-alt ml-2 text-blue-400"></i>الميزانية العمومية</h2>
      <div class="flex gap-2">
        <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${inputField('bsDate', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end">
          <button onclick="loadBalanceSheet()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button>
        </div>
      </div>
    </div>
    <div id="bsResult"></div>`;
  loadBalanceSheet();
}

async function loadBalanceSheet() {
  const date = document.getElementById('bsDate')?.value || '';
  const resultEl = document.getElementById('bsResult');
  resultEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';

  const res = await apiFetch(`/reports/balance-sheet?date=${date}`);
  if (!res.success) { resultEl.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const d = res.data;

  resultEl.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
        <div class="px-5 py-4 border-b border-dark-700"><h3 class="text-blue-400 font-bold text-lg"><i class="fas fa-building ml-2"></i>الأصول</h3></div>
        <div class="p-5">
          ${d.assets.length === 0 ? emptyState('لا توجد أصول', 'fa-building') :
          d.assets.map(a => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm">
            <span class="text-gray-300">${a.name_ar}</span><span class="font-mono text-white">${formatNumber(a.balance)}</span>
          </div>`).join('')}
          <div class="flex justify-between py-3 font-bold text-blue-400 border-t-2 border-blue-800/50 mt-3 text-lg">
            <span>إجمالي الأصول</span><span class="font-mono">${formatNumber(d.totalAssets)}</span>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-dark-700"><h3 class="text-red-400 font-bold text-lg"><i class="fas fa-file-invoice-dollar ml-2"></i>الخصوم</h3></div>
          <div class="p-5">
            ${d.liabilities.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد خصوم</p>' :
            d.liabilities.map(l => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm">
              <span class="text-gray-300">${l.name_ar}</span><span class="font-mono text-white">${formatNumber(Math.abs(l.balance))}</span>
            </div>`).join('')}
            <div class="flex justify-between py-3 font-bold text-red-400 border-t border-dark-600 mt-2">
              <span>إجمالي الخصوم</span><span class="font-mono">${formatNumber(d.totalLiabilities)}</span>
            </div>
          </div>
        </div>

        <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-dark-700"><h3 class="text-yellow-400 font-bold text-lg"><i class="fas fa-landmark ml-2"></i>حقوق الملكية</h3></div>
          <div class="p-5">
            ${d.equity.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد بيانات</p>' :
            d.equity.map(e => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm">
              <span class="text-gray-300">${e.name_ar}</span><span class="font-mono text-white">${formatNumber(Math.abs(e.balance))}</span>
            </div>`).join('')}
            <div class="flex justify-between py-3 font-bold text-yellow-400 border-t border-dark-600 mt-2">
              <span>إجمالي حقوق الملكية</span><span class="font-mono">${formatNumber(d.totalEquity)}</span>
            </div>
          </div>
        </div>

        <div class="bg-primary-900/30 border border-primary-700 rounded-2xl p-5">
          <div class="flex justify-between font-bold text-lg">
            <span class="text-white">الخصوم + حقوق الملكية</span>
            <span class="text-primary-400 font-mono text-xl">${formatNumber(d.totalLiabilitiesAndEquity)}</span>
          </div>
          ${Math.abs(d.totalAssets - d.totalLiabilitiesAndEquity) < 0.01 ?
            '<p class="text-green-400 text-xs mt-2"><i class="fas fa-check-circle ml-1"></i> الميزانية متوازنة</p>' :
            '<p class="text-red-400 text-xs mt-2"><i class="fas fa-exclamation-triangle ml-1"></i> الميزانية غير متوازنة</p>'}
        </div>
      </div>
    </div>`;
}

// ╔══════════════════════════════════════════════════╗
// ║                 ADMIN PAGES                       ║
// ╚══════════════════════════════════════════════════╝

// -- Users --
async function renderUsers(el) {
  const res = await apiFetch('/admin/users');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const roles = { admin:'مدير النظام', manager:'مدير قسم', accountant:'محاسب', user:'مستخدم', viewer:'مشاهد' };
  const roleColors = { admin:'badge-danger', manager:'badge-warning', accountant:'badge-info', user:'badge-success', viewer:'badge-info' };

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white"><i class="fas fa-users-cog ml-2 text-purple-400"></i>إدارة المستخدمين</h2>
        <p class="text-gray-500 text-sm mt-1">${res.data.length} مستخدم</p></div>
      <button onclick="showAddUserModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm transition"><i class="fas fa-plus ml-1"></i> مستخدم جديد</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${res.data.map(u => `
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 hover:border-dark-500 transition">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">${u.full_name.charAt(0)}</div>
            <div class="flex-1 min-w-0">
              <h4 class="text-white font-bold truncate">${u.full_name}</h4>
              <p class="text-gray-500 text-xs">@${u.username}</p>
            </div>
            <span class="badge ${u.is_active?'badge-success':'badge-danger'}">${u.is_active?'نشط':'معطل'}</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center"><span class="text-gray-500">الدور:</span><span class="badge ${roleColors[u.role]||'badge-info'}">${roles[u.role]||u.role}</span></div>
            ${u.email?`<div class="flex justify-between"><span class="text-gray-500">البريد:</span><span class="text-gray-400 text-xs">${u.email}</span></div>`:''}
            ${u.last_login?`<div class="flex justify-between"><span class="text-gray-500">آخر دخول:</span><span class="text-gray-400 text-xs">${u.last_login}</span></div>`:''}
          </div>
          <div class="mt-4 pt-3 border-t border-dark-700 flex gap-2">
            <button onclick="showEditUserModal(${u.id}, ${JSON.stringify(u).replace(/"/g, '&quot;')})" class="flex-1 text-center text-primary-400 hover:text-primary-300 text-xs py-1.5 rounded-lg hover:bg-dark-700 transition"><i class="fas fa-edit ml-1"></i> تعديل</button>
          </div>
        </div>`).join('')}
    </div>`;
}

function showAddUserModal() {
  showModal('مستخدم جديد', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('newUsername', 'اسم المستخدم *')}
        ${inputField('newPassword', 'كلمة المرور *', 'password')}
      </div>
      ${inputField('newFullName', 'الاسم الكامل *')}
      <div class="grid grid-cols-2 gap-4">
        ${inputField('newEmail', 'البريد الإلكتروني', 'email')}
        ${inputField('newPhone', 'رقم الهاتف', 'tel')}
      </div>
      ${selectField('newRole', 'الدور', [
        {value:'user',text:'مستخدم'},{value:'accountant',text:'محاسب'},
        {value:'manager',text:'مدير قسم'},{value:'admin',text:'مدير النظام'},{value:'viewer',text:'مشاهد فقط'}
      ])}
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveNewUser()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function saveNewUser() {
  const data = {
    username: document.getElementById('newUsername').value.trim(),
    password: document.getElementById('newPassword').value,
    full_name: document.getElementById('newFullName').value.trim(),
    email: document.getElementById('newEmail').value,
    phone: document.getElementById('newPhone').value,
    role: document.getElementById('newRole').value
  };
  if (!data.username || !data.password || !data.full_name) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return; }
  const res = await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/users'); }
  else showToast(res.message, 'error');
}

function showEditUserModal(id, user) {
  showModal('تعديل المستخدم: ' + user.full_name, `
    <div class="space-y-4">
      ${inputField('editFullName', 'الاسم الكامل', 'text', user.full_name)}
      <div class="grid grid-cols-2 gap-4">
        ${inputField('editEmail', 'البريد', 'email', user.email || '')}
        ${inputField('editPhone', 'الهاتف', 'tel', user.phone || '')}
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${selectField('editRole', 'الدور', [
          {value:'user',text:'مستخدم'},{value:'accountant',text:'محاسب'},
          {value:'manager',text:'مدير قسم'},{value:'admin',text:'مدير النظام'},{value:'viewer',text:'مشاهد'}
        ], user.role)}
        ${selectField('editActive', 'الحالة', [{value:'1',text:'نشط'},{value:'0',text:'معطل'}], user.is_active?'1':'0')}
      </div>
      ${inputField('editPassword', 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)', 'password')}
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="updateUser(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateUser(id) {
  const data = {
    full_name: document.getElementById('editFullName').value,
    email: document.getElementById('editEmail').value,
    phone: document.getElementById('editPhone').value,
    role: document.getElementById('editRole').value,
    is_active: document.getElementById('editActive').value === '1',
    password: document.getElementById('editPassword').value || undefined
  };
  const res = await apiFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/users'); }
  else showToast(res.message, 'error');
}

// -- Settings --
async function renderSettings(el) {
  const res = await apiFetch('/admin/settings');
  if (!res.success) return;
  const s = {};
  res.data.forEach(item => s[item.key] = item.value);

  el.innerHTML = `
    <div class="mb-6"><h2 class="text-2xl font-bold text-white"><i class="fas fa-sliders-h ml-2 text-gray-400"></i>إعدادات النظام</h2></div>
    <div class="max-w-2xl">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-6 space-y-5">
        <h3 class="text-white font-bold border-b border-dark-700 pb-3"><i class="fas fa-building ml-2 text-primary-400"></i>معلومات الشركة</h3>
        ${inputField('setCompanyName', 'اسم الشركة', 'text', s.company_name || '')}
        ${inputField('setCompanyNameEn', 'اسم الشركة (إنجليزي)', 'text', s.company_name_en || '')}

        <h3 class="text-white font-bold border-b border-dark-700 pb-3 pt-3"><i class="fas fa-cogs ml-2 text-primary-400"></i>إعدادات مالية</h3>
        <div class="grid grid-cols-2 gap-4">
          ${inputField('setDecimals', 'الخانات العشرية', 'number', s.decimal_places || '2')}
          ${selectField('setAutoPost', 'ترحيل السندات تلقائياً', [{value:'0',text:'لا'},{value:'1',text:'نعم'}], s.voucher_auto_post || '0')}
        </div>

        <button onclick="saveSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm transition w-full">
          <i class="fas fa-save ml-1"></i> حفظ الإعدادات
        </button>
      </div>
    </div>`;
}

async function saveSettings() {
  const data = {
    company_name: document.getElementById('setCompanyName').value,
    company_name_en: document.getElementById('setCompanyNameEn').value,
    decimal_places: document.getElementById('setDecimals').value,
    voucher_auto_post: document.getElementById('setAutoPost').value
  };
  const res = await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) showToast('تم حفظ الإعدادات بنجاح'); else showToast(res.message, 'error');
}

// -- Currencies --
async function renderCurrencies(el) {
  const res = await apiFetch('/admin/currencies');
  if (!res.success) return;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-coins ml-2 text-yellow-400"></i>إدارة العملات</h2>
      <button onclick="showAddCurrencyModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm transition"><i class="fas fa-plus ml-1"></i> عملة جديدة</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${res.data.map(c => `
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 text-center hover:border-dark-500 transition group relative">
          <div class="text-4xl mb-3">${c.symbol || c.code}</div>
          <h4 class="text-white font-bold">${c.name_ar}</h4>
          <p class="text-gray-500 text-xs mb-3">${c.name_en || c.code}</p>
          <p class="text-primary-400 font-mono text-2xl font-bold">${formatNumber(c.exchange_rate)}</p>
          <p class="text-gray-500 text-xs">سعر الصرف</p>
          ${c.is_default ? '<span class="badge badge-success mt-3">العملة الأساسية</span>' : ''}
          <button onclick="showEditCurrencyModal(${c.id}, '${c.name_ar}', '${c.name_en||''}', '${c.symbol||''}', ${c.exchange_rate}, ${c.is_active})"
            class="absolute top-3 left-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition p-1" title="تعديل"><i class="fas fa-edit"></i></button>
        </div>`).join('')}
    </div>`;
}

function showAddCurrencyModal() {
  showModal('عملة جديدة', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('newCurCode', 'رمز العملة (مثل USD)', 'text')}
        ${inputField('newCurSymbol', 'الرمز (مثل $)', 'text')}
      </div>
      ${inputField('newCurNameAr', 'الاسم (عربي)')}
      ${inputField('newCurNameEn', 'الاسم (إنجليزي)')}
      ${inputField('newCurRate', 'سعر الصرف', 'number', '1', 'step="0.01" min="0"')}
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveNewCurrency()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function saveNewCurrency() {
  const data = {
    code: document.getElementById('newCurCode').value.toUpperCase(),
    name_ar: document.getElementById('newCurNameAr').value,
    name_en: document.getElementById('newCurNameEn').value,
    symbol: document.getElementById('newCurSymbol').value,
    exchange_rate: parseFloat(document.getElementById('newCurRate').value) || 1
  };
  const res = await apiFetch('/admin/currencies', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/currencies'); }
  else showToast(res.message, 'error');
}

function showEditCurrencyModal(id, nameAr, nameEn, symbol, rate, isActive) {
  showModal('تعديل العملة', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('editCurNameAr', 'الاسم (عربي)', 'text', nameAr)}
        ${inputField('editCurNameEn', 'الاسم (إنجليزي)', 'text', nameEn)}
      </div>
      <div class="grid grid-cols-3 gap-4">
        ${inputField('editCurSymbol', 'الرمز', 'text', symbol)}
        ${inputField('editCurRate', 'سعر الصرف', 'number', rate, 'step="0.01"')}
        ${selectField('editCurActive', 'الحالة', [{value:'1',text:'نشطة'},{value:'0',text:'معطلة'}], isActive?'1':'0')}
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="updateCurrency(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateCurrency(id) {
  const data = {
    name_ar: document.getElementById('editCurNameAr').value,
    name_en: document.getElementById('editCurNameEn').value,
    symbol: document.getElementById('editCurSymbol').value,
    exchange_rate: parseFloat(document.getElementById('editCurRate').value),
    is_active: document.getElementById('editCurActive').value === '1'
  };
  const res = await apiFetch(`/admin/currencies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/currencies'); }
  else showToast(res.message, 'error');
}

// -- Fiscal Years --
async function renderFiscalYears(el) {
  const res = await apiFetch('/admin/fiscal-years');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-calendar-alt ml-2 text-blue-400"></i>السنوات المالية</h2>
      <button onclick="showAddFiscalYearModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm transition"><i class="fas fa-plus ml-1"></i> سنة مالية جديدة</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${res.data.map(fy => `
        <div class="bg-dark-800 rounded-2xl border ${fy.is_active ? 'border-primary-500 fy-active' : fy.is_closed ? 'border-red-800/50' : 'border-dark-700'} p-6">
          <div class="text-center mb-4">
            <div class="text-5xl font-bold ${fy.is_active ? 'text-primary-400' : fy.is_closed ? 'text-gray-600' : 'text-gray-400'} mb-2">${fy.year}</div>
            <div class="text-gray-400 text-sm">${fy.start_date} <i class="fas fa-arrow-left mx-1 text-xs"></i> ${fy.end_date}</div>
          </div>
          <div class="flex justify-center mb-4">
            ${fy.is_active ? '<span class="badge badge-success text-sm px-4 py-1"><i class="fas fa-check-circle ml-1"></i> السنة الحالية</span>' :
              fy.is_closed ? '<span class="badge badge-danger text-sm px-4 py-1"><i class="fas fa-lock ml-1"></i> مغلقة</span>' :
              '<span class="badge badge-warning text-sm px-4 py-1">غير نشطة</span>'}
          </div>
          ${!fy.is_closed ? `
          <div class="flex gap-2 mt-3">
            ${!fy.is_active ? `<button onclick="activateFiscalYear(${fy.id}, ${fy.year})" class="flex-1 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 py-2 rounded-xl text-xs transition"><i class="fas fa-power-off ml-1"></i> تفعيل</button>` : ''}
            <button onclick="closeFiscalYear(${fy.id}, ${fy.year})" class="flex-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 py-2 rounded-xl text-xs transition"><i class="fas fa-lock ml-1"></i> إغلاق</button>
          </div>` : ''}
        </div>`).join('')}
    </div>`;
}

function showAddFiscalYearModal() {
  const nextYear = new Date().getFullYear() + 1;
  showModal('سنة مالية جديدة', `
    <div class="space-y-4">
      ${inputField('fyYear', 'السنة', 'number', nextYear)}
      <div class="grid grid-cols-2 gap-4">
        ${inputField('fyStart', 'تاريخ البداية', 'date', `${nextYear}-01-01`)}
        ${inputField('fyEnd', 'تاريخ النهاية', 'date', `${nextYear}-12-31`)}
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveFiscalYear()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);

  document.getElementById('fyYear').addEventListener('change', function() {
    const y = this.value;
    document.getElementById('fyStart').value = `${y}-01-01`;
    document.getElementById('fyEnd').value = `${y}-12-31`;
  });
}

async function saveFiscalYear() {
  const data = {
    year: parseInt(document.getElementById('fyYear').value),
    start_date: document.getElementById('fyStart').value,
    end_date: document.getElementById('fyEnd').value
  };
  const res = await apiFetch('/admin/fiscal-years', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/fiscal-years'); }
  else showToast(res.message, 'error');
}

function activateFiscalYear(id, year) {
  showConfirm('تفعيل السنة المالية', `سيتم تفعيل السنة ${year} وإلغاء تفعيل السنة الحالية.`, async () => {
    const res = await apiFetch(`/admin/fiscal-years/${id}/activate`, { method: 'POST' });
    if (res.success) { showToast(res.message); navigate('/admin/fiscal-years'); }
    else showToast(res.message, 'error');
  });
}

function closeFiscalYear(id, year) {
  showConfirm('إغلاق السنة المالية', `سيتم إغلاق السنة ${year} نهائياً. يجب ترحيل جميع القيود والسندات أولاً.`, async () => {
    const res = await apiFetch(`/admin/fiscal-years/${id}/close`, { method: 'POST' });
    if (res.success) { showToast(res.message); navigate('/admin/fiscal-years'); }
    else showToast(res.message, 'error');
  });
}

// -- Audit Log --
async function renderAuditLog(el) {
  const res = await apiFetch('/admin/audit-log?limit=100');

  const actionLabels = {
    'create': { text: 'إنشاء', icon: 'fa-plus-circle', color: 'text-green-400' },
    'update': { text: 'تعديل', icon: 'fa-edit', color: 'text-blue-400' },
    'delete': { text: 'حذف', icon: 'fa-trash', color: 'text-red-400' },
    'post': { text: 'ترحيل', icon: 'fa-check-circle', color: 'text-emerald-400' },
    'activate': { text: 'تفعيل', icon: 'fa-power-off', color: 'text-yellow-400' },
    'close': { text: 'إغلاق', icon: 'fa-lock', color: 'text-red-400' }
  };

  const tableLabels = {
    'accounts': 'دليل الحسابات', 'journal_entries': 'القيود اليومية', 'vouchers': 'السندات',
    'users': 'المستخدمين', 'currencies': 'العملات', 'fiscal_years': 'السنوات المالية',
    'settings': 'الإعدادات'
  };

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white"><i class="fas fa-history ml-2 text-gray-400"></i>سجل النشاطات</h2>
        <p class="text-gray-500 text-sm mt-1">تتبع جميع العمليات في النظام</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select id="auditTableFilter" onchange="filterAuditLog()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الجداول</option>
          <option value="accounts">دليل الحسابات</option>
          <option value="journal_entries">القيود</option>
          <option value="vouchers">السندات</option>
          <option value="users">المستخدمين</option>
          <option value="currencies">العملات</option>
          <option value="settings">الإعدادات</option>
        </select>
        <select id="auditActionFilter" onchange="filterAuditLog()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل العمليات</option>
          <option value="create">إنشاء</option>
          <option value="update">تعديل</option>
          <option value="delete">حذف</option>
          <option value="post">ترحيل</option>
        </select>
        <div class="relative">
          <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="auditSearch" onkeyup="filterAuditLog()" placeholder="بحث..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none">
        </div>
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      ${!res.success || !res.data || res.data.length === 0 ? 
        emptyState('لا توجد نشاطات مسجلة بعد', 'fa-clipboard-list') : `
      <div class="divide-y divide-dark-700" id="auditLogList">
        ${res.data.map(log => {
          const a = actionLabels[log.action] || { text: log.action, icon: 'fa-circle', color: 'text-gray-400' };
          const t = tableLabels[log.table_name] || log.table_name;
          let details = '';
          try {
            const d = log.new_data ? JSON.parse(log.new_data) : (log.old_data ? JSON.parse(log.old_data) : {});
            details = Object.values(d).filter(v => v && typeof v === 'string').slice(0, 2).join(' - ');
          } catch {}
          return `<div class="audit-row flex items-start gap-3 p-4 hover:bg-dark-700/30 transition" data-table="${log.table_name}" data-action="${log.action}" data-text="${t} ${details}">
            <div class="w-8 h-8 rounded-full bg-dark-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i class="fas ${a.icon} ${a.color} text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-sm ${a.color}">${a.text}</span>
                <span class="text-gray-300 text-sm">${t}</span>
                ${log.record_id ? `<span class="text-gray-600 font-mono text-xs">#${log.record_id}</span>` : ''}
              </div>
              ${details ? `<p class="text-gray-500 text-xs mt-0.5 truncate">${details}</p>` : ''}
              <div class="flex items-center gap-3 mt-1 text-xs text-gray-600">
                <span><i class="fas fa-clock ml-1"></i>${log.created_at}</span>
                ${log.user_name ? `<span><i class="fas fa-user ml-1"></i>${log.user_name}</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

function filterAuditLog() {
  const table = document.getElementById('auditTableFilter')?.value || '';
  const action = document.getElementById('auditActionFilter')?.value || '';
  const q = (document.getElementById('auditSearch')?.value || '').toLowerCase();
  document.querySelectorAll('.audit-row').forEach(r => {
    const t = r.dataset.table || '';
    const a = r.dataset.action || '';
    const text = (r.dataset.text || '').toLowerCase();
    r.style.display = (!table || t === table) && (!action || a === action) && (!q || text.includes(q)) ? '' : 'none';
  });
}

// ╔══════════════════════════════════════════════════╗
// ║               EXPORT UTILITIES                    ║
// ╚══════════════════════════════════════════════════╝
function exportTableCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) { showToast('لا توجد بيانات للتصدير', 'warning'); return; }

  let csv = '\uFEFF'; // BOM for Arabic
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(col => rowData.push('"' + col.textContent.trim().replace(/"/g, '""') + '"'));
    csv += rowData.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${todayStr()}.csv`;
  link.click();
  showToast('تم تصدير الملف بنجاح', 'success');
}

// ╔══════════════════════════════════════════════════╗
// ║                 INITIALIZATION                    ║
// ╚══════════════════════════════════════════════════╝
(function init() {
  currentUser = getUser();
  if (!currentUser && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
    return;
  }

  if (currentUser) {
    const nameEl = document.getElementById('userFullName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = currentUser.fullName;
    const roles = { admin:'مدير النظام', manager:'مدير قسم', accountant:'محاسب', user:'مستخدم', viewer:'مشاهد' };
    if (roleEl) roleEl.textContent = roles[currentUser.role] || currentUser.role;
  }

  const now = new Date();
  const dateEl = document.getElementById('currentDate');
  const fyEl = document.getElementById('fiscalYearBadge');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (fyEl) fyEl.innerHTML = `<span class="badge badge-info">السنة المالية ${now.getFullYear()}</span>`;

  buildSidebar().then(() => {
    const path = window.location.pathname.replace('/app', '') || '/dashboard';
    loadPage(path);
    updateActiveLink(path);
    updateBreadcrumb(path);
  });

  window.addEventListener('popstate', () => {
    const path = window.location.pathname.replace('/app', '') || '/dashboard';
    loadPage(path);
    updateActiveLink(path);
    updateBreadcrumb(path);
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    if (menu && !menu.parentElement.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
})();
