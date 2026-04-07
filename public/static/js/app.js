// ===================================================
// النظام المحاسبي الحديث - Frontend Application
// ===================================================

const API = '/api';
let currentUser = null;
let menuItems = [];
let accountsCache = [];

// ===== Auth =====
function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + url, { ...options, headers });
  return res.json();
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
  sidebar.classList.toggle('mr-0');
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

// ===== Modal =====
function showModal(title, content, footer = '') {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h3 class="text-lg font-bold text-white">${title}</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[65vh]">${content}</div>
        ${footer ? `<div class="px-6 py-4 border-t border-dark-600 flex justify-end gap-3">${footer}</div>` : ''}
      </div>
    </div>`;
}
function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

// ===== Number Formatting =====
function formatNumber(n) {
  if (n == null) return '0';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ');
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
  document.querySelectorAll(`.sidebar-link[data-path="${path}"]`).forEach(l => l.classList.add('active'));
}

function updateBreadcrumb(path) {
  const bc = document.getElementById('breadcrumb');
  const parts = path.split('/').filter(Boolean);
  let html = '<a href="#" onclick="navigate(\'/dashboard\')" class="text-gray-500 hover:text-gray-300"><i class="fas fa-home"></i></a>';
  const names = {
    'dashboard': 'لوحة التحكم', 'accounts': 'دليل الحسابات', 'journal': 'القيود اليومية',
    'vouchers': 'السندات', 'receipt': 'سندات القبض', 'payment': 'سندات الصرف',
    'reports': 'التقارير', 'trial-balance': 'ميزان المراجعة', 'account-statement': 'كشف حساب',
    'income': 'قائمة الدخل', 'balance-sheet': 'الميزانية', 'admin': 'الإدارة',
    'users': 'المستخدمين', 'settings': 'الإعدادات', 'currencies': 'العملات'
  };
  parts.forEach((p, i) => {
    html += ` <i class="fas fa-chevron-left text-gray-600 text-xs"></i> <span class="${i === parts.length - 1 ? 'text-gray-200' : 'text-gray-500'}">${names[p] || p}</span>`;
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
        <button onclick="this.parentElement.classList.toggle('open')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 text-sm w-full hover:bg-dark-800">
          <i class="${root.icon} w-5 text-center"></i><span class="flex-1 text-right">${root.name_ar}</span>
          <i class="fas fa-chevron-left chevron text-xs"></i>
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
  const content = document.getElementById('pageContent');
  if (path === '/dashboard' || path === '/' || !path) renderDashboard(content);
  else if (path === '/accounts') renderAccounts(content);
  else if (path === '/journal') renderJournal(content);
  else if (path === '/vouchers/receipt') renderVouchers(content, 'receipt');
  else if (path === '/vouchers/payment') renderVouchers(content, 'payment');
  else if (path === '/reports/trial-balance') renderTrialBalance(content);
  else if (path === '/reports/account-statement') renderAccountStatement(content);
  else if (path === '/reports/income') renderIncomeStatement(content);
  else if (path === '/reports/balance-sheet') renderBalanceSheet(content);
  else if (path === '/admin/users') renderUsers(content);
  else if (path === '/admin/settings') renderSettings(content);
  else if (path === '/admin/currencies') renderCurrencies(content);
  else content.innerHTML = '<div class="text-center text-gray-500 py-20"><i class="fas fa-hard-hat text-5xl mb-4"></i><p class="text-xl">الصفحة قيد الإنشاء</p></div>';
}

// ===== DASHBOARD =====
async function renderDashboard(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/dashboard/stats');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ في جلب البيانات</p>'; return; }
  const d = res.data;
  el.innerHTML = `
    <div class="mb-6"><h2 class="text-2xl font-bold text-white">لوحة التحكم</h2><p class="text-gray-500 text-sm mt-1">نظرة عامة على النظام المحاسبي</p></div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-building-columns', 'رصيد الصندوق', formatNumber(d.cashBalance) + ' د.ع', 'from-blue-600 to-blue-800')}
      ${statCard('fa-hand-holding-usd', 'إجمالي القبض', formatNumber(d.totalReceipts) + ' د.ع', 'from-green-600 to-green-800')}
      ${statCard('fa-money-bill-wave', 'إجمالي الصرف', formatNumber(d.totalPayments) + ' د.ع', 'from-red-600 to-red-800')}
      ${statCard('fa-book', 'القيود المرحّلة', d.postedEntries + ' / ' + d.totalEntries, 'from-purple-600 to-purple-800')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-white font-bold mb-4"><i class="fas fa-clock ml-2 text-primary-400"></i>آخر القيود</h3>
        ${d.recentEntries.length === 0 ? '<p class="text-gray-500 text-sm text-center py-4">لا توجد قيود</p>' : `
        <div class="space-y-2">${d.recentEntries.map(e => `
          <div class="flex items-center justify-between p-3 bg-dark-900 rounded-xl">
            <div><span class="text-primary-400 font-mono text-sm">#${e.entry_number}</span><span class="text-gray-400 text-xs mr-3">${e.entry_date}</span>
            <p class="text-gray-300 text-sm mt-1">${e.description || 'بدون وصف'}</p></div>
            <div class="text-left"><span class="text-white font-bold text-sm">${formatNumber(e.total_debit)}</span>
            <span class="badge ${e.status === 'posted' ? 'badge-success' : 'badge-warning'} block mt-1">${e.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></div>
          </div>`).join('')}</div>`}
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-white font-bold mb-4"><i class="fas fa-receipt ml-2 text-primary-400"></i>آخر السندات</h3>
        ${d.recentVouchers.length === 0 ? '<p class="text-gray-500 text-sm text-center py-4">لا توجد سندات</p>' : `
        <div class="space-y-2">${d.recentVouchers.map(v => `
          <div class="flex items-center justify-between p-3 bg-dark-900 rounded-xl">
            <div><span class="${v.voucher_type === 'receipt' ? 'text-green-400' : 'text-red-400'} text-sm font-bold">${v.voucher_type === 'receipt' ? 'قبض' : 'صرف'} #${v.voucher_number}</span>
            <span class="text-gray-500 text-xs mr-2">${v.voucher_date}</span>
            <p class="text-gray-400 text-xs mt-1">${v.account_name}</p></div>
            <span class="text-white font-bold text-sm">${formatNumber(v.amount)}</span>
          </div>`).join('')}</div>`}
      </div>
    </div>`;
}

function statCard(icon, label, value, gradient) {
  return `<div class="stat-card bg-gradient-to-br ${gradient} rounded-2xl p-5 relative overflow-hidden">
    <div class="relative z-10"><p class="text-white/70 text-sm mb-1">${label}</p>
    <p class="text-white text-xl font-bold">${value}</p></div>
    <i class="fas ${icon} absolute -bottom-2 -left-2 text-6xl text-white/10"></i></div>`;
}

// ===== ACCOUNTS (دليل الحسابات) =====
async function renderAccounts(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/accounts');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ في جلب البيانات</p>'; return; }
  accountsCache = res.data;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white">دليل الحسابات</h2><p class="text-gray-500 text-sm mt-1">إدارة الهيكل الشجري للحسابات</p></div>
      <button onclick="showAddAccountModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-plus"></i> إضافة حساب</button>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-4 border-b border-dark-700">
        <input type="text" id="accountSearch" onkeyup="filterAccounts()" placeholder="بحث في الحسابات..." class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-4 py-2 w-full max-w-md text-sm outline-none focus:border-primary-500">
      </div>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">اسم الحساب</th>
          <th class="px-4 py-3 text-right">النوع</th><th class="px-4 py-3 text-right">الطبيعة</th>
          <th class="px-4 py-3 text-left">الرصيد</th><th class="px-4 py-3 text-center">إجراءات</th>
        </tr></thead>
        <tbody id="accountsTable"></tbody>
      </table></div>
    </div>`;
  renderAccountsTree();
}

function renderAccountsTree() {
  const tbody = document.getElementById('accountsTable');
  if (!tbody) return;
  const types = { asset: 'أصول', liability: 'خصوم', equity: 'ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
  const typeColors = { asset: 'badge-info', liability: 'badge-danger', equity: 'badge-warning', revenue: 'badge-success', expense: 'badge-danger' };
  tbody.innerHTML = accountsCache.map(a => {
    const indent = (a.level - 1) * 20;
    const isBold = a.is_parent ? 'font-bold text-white' : 'text-gray-300';
    return `<tr class="table-row border-b border-dark-700/50">
      <td class="px-4 py-3"><span class="font-mono text-primary-400">${a.code}</span></td>
      <td class="px-4 py-3"><div style="padding-right:${indent}px" class="flex items-center gap-2">
        <i class="fas ${a.is_parent ? 'fa-folder text-yellow-500' : 'fa-file-invoice text-gray-500'} text-xs"></i>
        <span class="${isBold}">${a.name_ar}</span></div></td>
      <td class="px-4 py-3"><span class="badge ${typeColors[a.account_type]}">${types[a.account_type]}</span></td>
      <td class="px-4 py-3 text-gray-400">${a.account_nature === 'debit' ? 'مدين' : 'دائن'}</td>
      <td class="px-4 py-3 text-left font-mono ${a.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}">${a.is_parent ? '-' : formatNumber(a.current_balance)}</td>
      <td class="px-4 py-3 text-center">
        <button onclick="showEditAccountModal(${a.id})" class="text-primary-400 hover:text-primary-300 mx-1" title="تعديل"><i class="fas fa-edit"></i></button>
        ${!a.is_parent ? `<button onclick="deleteAccount(${a.id})" class="text-red-400 hover:text-red-300 mx-1" title="حذف"><i class="fas fa-trash"></i></button>` : ''}
      </td></tr>`;
  }).join('');
}

function filterAccounts() {
  const q = document.getElementById('accountSearch')?.value?.toLowerCase() || '';
  const rows = document.querySelectorAll('#accountsTable tr');
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

function showAddAccountModal(parentId = null) {
  const parents = accountsCache.filter(a => a.is_parent || !parentId);
  const parentOpts = parents.map(a => `<option value="${a.id}" ${a.id == parentId ? 'selected' : ''}>${a.code} - ${a.name_ar}</option>`).join('');
  showModal('إضافة حساب جديد', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">رمز الحساب *</label>
          <input type="text" id="accCode" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">الحساب الأب</label>
          <select id="accParent" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500" onchange="suggestCode()">
            <option value="">-- رئيسي --</option>${parentOpts}</select></div>
      </div>
      <div><label class="block text-gray-400 text-xs mb-1">اسم الحساب (عربي) *</label>
        <input type="text" id="accNameAr" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div><label class="block text-gray-400 text-xs mb-1">اسم الحساب (إنجليزي)</label>
        <input type="text" id="accNameEn" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">نوع الحساب *</label>
          <select id="accType" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="asset">أصول</option><option value="liability">خصوم</option><option value="equity">ملكية</option>
            <option value="revenue">إيرادات</option><option value="expense">مصروفات</option></select></div>
        <div><label class="block text-gray-400 text-xs mb-1">طبيعة الحساب *</label>
          <select id="accNature" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="debit">مدين</option><option value="credit">دائن</option></select></div>
      </div>
      <div class="flex items-center gap-2"><input type="checkbox" id="accIsParent"><label for="accIsParent" class="text-gray-400 text-sm">حساب رئيسي (مجمّع)</label></div>
    </div>`,
    `<button onclick="closeModal()" class="px-4 py-2 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="saveAccount()" class="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm">حفظ</button>`);
}

async function saveAccount() {
  const data = {
    code: document.getElementById('accCode').value,
    name_ar: document.getElementById('accNameAr').value,
    name_en: document.getElementById('accNameEn').value,
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
  showModal('تعديل الحساب', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">رمز الحساب</label>
          <input type="text" id="editAccCode" value="${a.code}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">النوع</label>
          <select id="editAccType" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="asset" ${a.account_type==='asset'?'selected':''}>أصول</option><option value="liability" ${a.account_type==='liability'?'selected':''}>خصوم</option>
            <option value="equity" ${a.account_type==='equity'?'selected':''}>ملكية</option><option value="revenue" ${a.account_type==='revenue'?'selected':''}>إيرادات</option>
            <option value="expense" ${a.account_type==='expense'?'selected':''}>مصروفات</option></select></div>
      </div>
      <div><label class="block text-gray-400 text-xs mb-1">اسم الحساب (عربي)</label>
        <input type="text" id="editAccNameAr" value="${a.name_ar}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div><label class="block text-gray-400 text-xs mb-1">اسم الحساب (إنجليزي)</label>
        <input type="text" id="editAccNameEn" value="${a.name_en||''}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">الطبيعة</label>
          <select id="editAccNature" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="debit" ${a.account_nature==='debit'?'selected':''}>مدين</option><option value="credit" ${a.account_nature==='credit'?'selected':''}>دائن</option></select></div>
        <div><label class="block text-gray-400 text-xs mb-1">الحالة</label>
          <select id="editAccActive" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="1" ${a.is_active?'selected':''}>نشط</option><option value="0" ${!a.is_active?'selected':''}>معطل</option></select></div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-4 py-2 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="updateAccount(${id})" class="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm">حفظ التعديلات</button>`);
}

async function updateAccount(id) {
  const data = {
    code: document.getElementById('editAccCode').value,
    name_ar: document.getElementById('editAccNameAr').value,
    name_en: document.getElementById('editAccNameEn').value,
    account_type: document.getElementById('editAccType').value,
    account_nature: document.getElementById('editAccNature').value,
    is_active: document.getElementById('editAccActive').value === '1',
    is_parent: accountsCache.find(a => a.id === id)?.is_parent
  };
  const res = await apiFetch(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/accounts'); }
  else showToast(res.message, 'error');
}

async function deleteAccount(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
  const res = await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(res.message); navigate('/accounts'); }
  else showToast(res.message, 'error');
}

// ===== JOURNAL ENTRIES (القيود اليومية) =====
async function renderJournal(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/journal');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ في جلب البيانات</p>'; return; }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white">القيود اليومية</h2><p class="text-gray-500 text-sm mt-1">إدارة القيود المحاسبية</p></div>
      <button onclick="showAddJournalModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-plus"></i> قيد جديد</button>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th>
          <th class="px-4 py-3 text-right">الوصف</th><th class="px-4 py-3 text-left">مدين</th>
          <th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-center">الحالة</th>
          <th class="px-4 py-3 text-center">إجراءات</th>
        </tr></thead>
        <tbody>${res.data.map(e => `
          <tr class="table-row border-b border-dark-700/50">
            <td class="px-4 py-3 font-mono text-primary-400">#${e.entry_number}</td>
            <td class="px-4 py-3 text-gray-400">${e.entry_date}</td>
            <td class="px-4 py-3 text-gray-300">${e.description || '-'}</td>
            <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(e.total_debit)}</td>
            <td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(e.total_credit)}</td>
            <td class="px-4 py-3 text-center"><span class="badge ${e.status==='posted'?'badge-success':e.status==='cancelled'?'badge-danger':'badge-warning'}">${e.status==='posted'?'مرحّل':e.status==='cancelled'?'ملغي':'مسودة'}</span></td>
            <td class="px-4 py-3 text-center">
              <button onclick="viewJournalEntry(${e.id})" class="text-primary-400 hover:text-primary-300 mx-1" title="عرض"><i class="fas fa-eye"></i></button>
              ${e.status==='draft'?`<button onclick="postJournalEntry(${e.id})" class="text-green-400 hover:text-green-300 mx-1" title="ترحيل"><i class="fas fa-check-circle"></i></button>
              <button onclick="deleteJournalEntry(${e.id})" class="text-red-400 hover:text-red-300 mx-1" title="حذف"><i class="fas fa-trash"></i></button>`:''}
            </td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

async function showAddJournalModal() {
  // Fetch leaf accounts
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  const accOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');

  showModal('قيد محاسبي جديد', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">التاريخ *</label>
          <input type="date" id="jeDate" value="${new Date().toISOString().split('T')[0]}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">المرجع</label>
          <input type="text" id="jeRef" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      </div>
      <div><label class="block text-gray-400 text-xs mb-1">الوصف</label>
        <input type="text" id="jeDesc" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-xs">أسطر القيد</label>
          <button onclick="addJournalLine()" class="text-primary-400 text-xs hover:text-primary-300"><i class="fas fa-plus"></i> إضافة سطر</button>
        </div>
        <div id="journalLines" class="space-y-2"></div>
        <div class="flex justify-between mt-3 p-3 bg-dark-900 rounded-xl text-sm">
          <span class="text-gray-400">المجموع:</span>
          <span>مدين: <strong id="jeTotalDebit" class="text-green-400">0</strong> | دائن: <strong id="jeTotalCredit" class="text-red-400">0</strong></span>
          <span id="jeBalance" class="text-yellow-400"></span>
        </div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-4 py-2 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="saveJournalEntry()" class="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm">حفظ القيد</button>`);

  window._jeAccounts = accOptions;
  addJournalLine(); addJournalLine();
}

function addJournalLine() {
  const container = document.getElementById('journalLines');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center';
  div.innerHTML = `
    <select class="je-account col-span-5 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none focus:border-primary-500">
      <option value="">اختر الحساب</option>${window._jeAccounts}</select>
    <input type="number" class="je-debit col-span-2 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="مدين" oninput="calcJournalTotals()">
    <input type="number" class="je-credit col-span-2 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="دائن" oninput="calcJournalTotals()">
    <input type="text" class="je-line-desc col-span-2 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none focus:border-primary-500" placeholder="بيان">
    <button onclick="this.parentElement.remove();calcJournalTotals()" class="col-span-1 text-red-400 hover:text-red-300 text-xs"><i class="fas fa-times"></i></button>`;
  container.appendChild(div);
}

function calcJournalTotals() {
  let td = 0, tc = 0;
  document.querySelectorAll('.je-debit').forEach(i => td += parseFloat(i.value || 0));
  document.querySelectorAll('.je-credit').forEach(i => tc += parseFloat(i.value || 0));
  document.getElementById('jeTotalDebit').textContent = formatNumber(td);
  document.getElementById('jeTotalCredit').textContent = formatNumber(tc);
  const diff = Math.abs(td - tc);
  document.getElementById('jeBalance').textContent = diff < 0.01 ? '✓ متوازن' : `الفرق: ${formatNumber(diff)}`;
  document.getElementById('jeBalance').className = diff < 0.01 ? 'text-green-400 font-bold' : 'text-yellow-400';
}

async function saveJournalEntry() {
  const lines = [];
  document.querySelectorAll('#journalLines > div').forEach(row => {
    const acc = row.querySelector('.je-account').value;
    const debit = row.querySelector('.je-debit').value;
    const credit = row.querySelector('.je-credit').value;
    const desc = row.querySelector('.je-line-desc').value;
    if (acc && (parseFloat(debit) > 0 || parseFloat(credit) > 0)) {
      lines.push({ account_id: parseInt(acc), debit: parseFloat(debit || 0), credit: parseFloat(credit || 0), description: desc });
    }
  });

  const data = {
    entry_date: document.getElementById('jeDate').value,
    description: document.getElementById('jeDesc').value,
    reference: document.getElementById('jeRef').value,
    lines,
    created_by: getUser()?.id
  };

  const res = await apiFetch('/journal', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/journal'); }
  else showToast(res.message, 'error');
}

async function viewJournalEntry(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast(res.message, 'error'); return; }
  const e = res.data;
  showModal(`قيد رقم #${e.entry_number}`, `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div><span class="text-gray-500">التاريخ:</span><br><span class="text-white">${e.entry_date}</span></div>
        <div><span class="text-gray-500">الحالة:</span><br><span class="badge ${e.status==='posted'?'badge-success':'badge-warning'}">${e.status==='posted'?'مرحّل':'مسودة'}</span></div>
        <div><span class="text-gray-500">المرجع:</span><br><span class="text-white">${e.reference||'-'}</span></div>
      </div>
      <div><span class="text-gray-500 text-sm">الوصف:</span><p class="text-white">${e.description||'-'}</p></div>
      <table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs">
        <th class="px-3 py-2 text-right">الحساب</th><th class="px-3 py-2 text-right">البيان</th>
        <th class="px-3 py-2 text-left">مدين</th><th class="px-3 py-2 text-left">دائن</th>
      </tr></thead><tbody>${e.lines.map(l => `
        <tr class="border-b border-dark-700/50">
          <td class="px-3 py-2"><span class="text-primary-400 font-mono">${l.account_code}</span> ${l.account_name}</td>
          <td class="px-3 py-2 text-gray-400">${l.description||''}</td>
          <td class="px-3 py-2 text-left font-mono text-green-400">${l.debit>0?formatNumber(l.debit):''}</td>
          <td class="px-3 py-2 text-left font-mono text-red-400">${l.credit>0?formatNumber(l.credit):''}</td>
        </tr>`).join('')}
        <tr class="bg-dark-900 font-bold"><td class="px-3 py-2" colspan="2">المجموع</td>
          <td class="px-3 py-2 text-left text-green-400">${formatNumber(e.total_debit)}</td>
          <td class="px-3 py-2 text-left text-red-400">${formatNumber(e.total_credit)}</td></tr>
      </tbody></table>
    </div>`);
}

async function postJournalEntry(id) {
  if (!confirm('هل تريد ترحيل هذا القيد؟ لا يمكن التراجع بعد الترحيل.')) return;
  const res = await apiFetch(`/journal/${id}/post`, { method: 'POST' });
  if (res.success) { showToast(res.message); navigate('/journal'); } else showToast(res.message, 'error');
}

async function deleteJournalEntry(id) {
  if (!confirm('هل أنت متأكد من حذف هذا القيد؟')) return;
  const res = await apiFetch(`/journal/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(res.message); navigate('/journal'); } else showToast(res.message, 'error');
}

// ===== VOUCHERS (السندات) =====
async function renderVouchers(el, type) {
  const typeLabel = type === 'receipt' ? 'القبض' : 'الصرف';
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch(`/vouchers?type=${type}`);
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white">سندات ${typeLabel}</h2></div>
      <button onclick="showAddVoucherModal('${type}')" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-plus"></i> سند جديد</button>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th>
          <th class="px-4 py-3 text-right">الحساب</th><th class="px-4 py-3 text-right">الوصف</th>
          <th class="px-4 py-3 text-left">المبلغ</th><th class="px-4 py-3 text-center">الحالة</th>
          <th class="px-4 py-3 text-center">إجراءات</th>
        </tr></thead>
        <tbody>${res.data.map(v => `
          <tr class="table-row border-b border-dark-700/50">
            <td class="px-4 py-3 font-mono text-primary-400">#${v.voucher_number}</td>
            <td class="px-4 py-3 text-gray-400">${v.voucher_date}</td>
            <td class="px-4 py-3"><span class="text-primary-400 font-mono">${v.account_code}</span> ${v.account_name}</td>
            <td class="px-4 py-3 text-gray-300">${v.description||'-'}</td>
            <td class="px-4 py-3 text-left font-mono font-bold ${type==='receipt'?'text-green-400':'text-red-400'}">${formatNumber(v.amount)}</td>
            <td class="px-4 py-3 text-center"><span class="badge ${v.status==='posted'?'badge-success':'badge-warning'}">${v.status==='posted'?'مرحّل':'مسودة'}</span></td>
            <td class="px-4 py-3 text-center">
              <button onclick="viewVoucher(${v.id})" class="text-primary-400 hover:text-primary-300 mx-1"><i class="fas fa-eye"></i></button>
              ${v.status==='draft'?`<button onclick="postVoucher(${v.id})" class="text-green-400 hover:text-green-300 mx-1"><i class="fas fa-check-circle"></i></button>
              <button onclick="deleteVoucher(${v.id},'${type}')" class="text-red-400 hover:text-red-300 mx-1"><i class="fas fa-trash"></i></button>`:''}
            </td></tr>`).join('')}
        </tbody></table></div>
    </div>`;
}

async function showAddVoucherModal(type) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  const accOpts = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');
  const label = type === 'receipt' ? 'قبض' : 'صرف';

  showModal(`سند ${label} جديد`, `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">التاريخ *</label>
          <input type="date" id="vDate" value="${new Date().toISOString().split('T')[0]}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">المبلغ *</label>
          <input type="number" id="vAmount" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500 text-left" step="0.01"></div>
      </div>
      <div><label class="block text-gray-400 text-xs mb-1">${type==='receipt'?'الحساب المدين (الصندوق/البنك)':'الحساب الدائن (الصندوق/البنك)'} *</label>
        <select id="vAccount" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"><option value="">اختر</option>${accOpts}</select></div>
      <div><label class="block text-gray-400 text-xs mb-1">المستفيد</label>
        <input type="text" id="vBeneficiary" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div><label class="block text-gray-400 text-xs mb-1">الوصف</label>
        <input type="text" id="vDesc" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div><label class="block text-gray-400 text-xs mb-1">طريقة الدفع</label>
        <select id="vPayment" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
          <option value="cash">نقداً</option><option value="check">شيك</option><option value="transfer">تحويل</option></select></div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-xs">${type==='receipt'?'الحسابات الدائنة':'الحسابات المدينة'} (التوزيع)</label>
          <button onclick="addVoucherLine()" class="text-primary-400 text-xs"><i class="fas fa-plus"></i> إضافة</button>
        </div>
        <div id="voucherLines" class="space-y-2"></div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-4 py-2 rounded-xl bg-dark-600 text-gray-300 hover:bg-dark-500 text-sm">إلغاء</button>
     <button onclick="saveVoucher('${type}')" class="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm">حفظ</button>`);
  window._vAccounts = accOpts;
  addVoucherLine();
}

function addVoucherLine() {
  const c = document.getElementById('voucherLines');
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center';
  div.innerHTML = `
    <select class="vl-account col-span-5 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none"><option value="">اختر الحساب</option>${window._vAccounts}</select>
    <input type="number" class="vl-amount col-span-3 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none text-left" placeholder="المبلغ" step="0.01">
    <input type="text" class="vl-desc col-span-3 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-gray-200 text-xs outline-none" placeholder="بيان">
    <button onclick="this.parentElement.remove()" class="col-span-1 text-red-400 text-xs"><i class="fas fa-times"></i></button>`;
  c.appendChild(div);
}

async function saveVoucher(type) {
  const details = [];
  document.querySelectorAll('#voucherLines > div').forEach(row => {
    const acc = row.querySelector('.vl-account').value;
    const amt = row.querySelector('.vl-amount').value;
    const desc = row.querySelector('.vl-desc').value;
    if (acc && parseFloat(amt) > 0) details.push({ account_id: parseInt(acc), amount: parseFloat(amt), description: desc });
  });

  const data = {
    voucher_type: type,
    voucher_date: document.getElementById('vDate').value,
    account_id: parseInt(document.getElementById('vAccount').value),
    amount: parseFloat(document.getElementById('vAmount').value),
    description: document.getElementById('vDesc').value,
    beneficiary: document.getElementById('vBeneficiary').value,
    payment_method: document.getElementById('vPayment').value,
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
  const typeLabel = v.voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف';
  showModal(`${typeLabel} رقم #${v.voucher_number}`, `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div><span class="text-gray-500">التاريخ:</span><br>${v.voucher_date}</div>
        <div><span class="text-gray-500">المبلغ:</span><br><strong class="text-xl ${v.voucher_type==='receipt'?'text-green-400':'text-red-400'}">${formatNumber(v.amount)}</strong></div>
        <div><span class="text-gray-500">الحالة:</span><br><span class="badge ${v.status==='posted'?'badge-success':'badge-warning'}">${v.status==='posted'?'مرحّل':'مسودة'}</span></div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-gray-500">الحساب:</span><br><span class="text-primary-400">${v.account_code}</span> ${v.account_name}</div>
        <div><span class="text-gray-500">طريقة الدفع:</span><br>${v.payment_method==='cash'?'نقداً':v.payment_method==='check'?'شيك':'تحويل'}</div>
      </div>
      ${v.description?`<div class="text-sm"><span class="text-gray-500">الوصف:</span><br>${v.description}</div>`:''}
      ${v.details.length>0?`<table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs">
        <th class="px-3 py-2 text-right">الحساب</th><th class="px-3 py-2 text-right">البيان</th><th class="px-3 py-2 text-left">المبلغ</th>
      </tr></thead><tbody>${v.details.map(d=>`<tr class="border-b border-dark-700/50">
        <td class="px-3 py-2"><span class="text-primary-400 font-mono">${d.account_code}</span> ${d.account_name}</td>
        <td class="px-3 py-2 text-gray-400">${d.description||''}</td>
        <td class="px-3 py-2 text-left font-mono">${formatNumber(d.amount)}</td></tr>`).join('')}</tbody></table>`:''}
    </div>`);
}

async function postVoucher(id) {
  if (!confirm('ترحيل السند؟ سيتم إنشاء قيد محاسبي تلقائياً.')) return;
  const res = await apiFetch(`/vouchers/${id}/post`, { method: 'POST' });
  if (res.success) { showToast(res.message); const path = window.location.pathname.replace('/app',''); navigate(path); }
  else showToast(res.message, 'error');
}

async function deleteVoucher(id, type) {
  if (!confirm('حذف السند؟')) return;
  const res = await apiFetch(`/vouchers/${id}`, { method: 'DELETE' });
  if (res.success) { showToast(res.message); navigate(`/vouchers/${type}`); } else showToast(res.message, 'error');
}

// ===== REPORTS =====
async function renderTrialBalance(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/reports/trial-balance');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const data = res.data.filter(a => a.total_debit > 0 || a.total_credit > 0 || a.opening_balance !== 0);

  let sumDebit = 0, sumCredit = 0, sumDbBal = 0, sumCrBal = 0;
  data.forEach(a => { if (!a.is_parent) { sumDebit += a.total_debit; sumCredit += a.total_credit; sumDbBal += a.debit_balance; sumCrBal += a.credit_balance; } });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white">ميزان المراجعة</h2></div>
      <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-print"></i> طباعة</button>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden print:border-gray-300">
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase print:bg-gray-100 print:text-gray-800">
          <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">الحساب</th>
          <th class="px-4 py-3 text-left">مدين</th><th class="px-4 py-3 text-left">دائن</th>
          <th class="px-4 py-3 text-left">رصيد مدين</th><th class="px-4 py-3 text-left">رصيد دائن</th>
        </tr></thead>
        <tbody>${data.map(a => `
          <tr class="table-row border-b border-dark-700/50 ${a.is_parent?'bg-dark-900/50':''}">
            <td class="px-4 py-2 font-mono text-primary-400">${a.code}</td>
            <td class="px-4 py-2 ${a.is_parent?'font-bold text-white':'text-gray-300'}" style="padding-right:${(a.level-1)*16+16}px">${a.name_ar}</td>
            <td class="px-4 py-2 text-left font-mono">${a.total_debit>0?formatNumber(a.total_debit):''}</td>
            <td class="px-4 py-2 text-left font-mono">${a.total_credit>0?formatNumber(a.total_credit):''}</td>
            <td class="px-4 py-2 text-left font-mono text-green-400">${a.debit_balance>0?formatNumber(a.debit_balance):''}</td>
            <td class="px-4 py-2 text-left font-mono text-red-400">${a.credit_balance>0?formatNumber(a.credit_balance):''}</td>
          </tr>`).join('')}
          <tr class="bg-primary-900/30 font-bold text-white"><td class="px-4 py-3" colspan="2">المجموع</td>
            <td class="px-4 py-3 text-left">${formatNumber(sumDebit)}</td><td class="px-4 py-3 text-left">${formatNumber(sumCredit)}</td>
            <td class="px-4 py-3 text-left text-green-400">${formatNumber(sumDbBal)}</td><td class="px-4 py-3 text-left text-red-400">${formatNumber(sumCrBal)}</td></tr>
        </tbody></table></div>
    </div>`;
}

async function renderAccountStatement(el) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  const accOpts = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');

  el.innerHTML = `
    <div class="mb-6"><h2 class="text-2xl font-bold text-white">كشف حساب</h2></div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">الحساب *</label>
          <select id="stmtAccount" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"><option value="">اختر الحساب</option>${accOpts}</select></div>
        <div><label class="block text-gray-400 text-xs mb-1">من تاريخ</label>
          <input type="date" id="stmtFrom" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">إلى تاريخ</label>
          <input type="date" id="stmtTo" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div class="flex items-end">
          <button onclick="loadAccountStatement()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full">عرض</button>
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

  const res = await apiFetch(url);
  if (!res.success) { showToast(res.message, 'error'); return; }
  const d = res.data;

  document.getElementById('stmtResult').innerHTML = `
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-4 border-b border-dark-700 flex justify-between items-center">
        <div><span class="text-white font-bold text-lg">${d.account.name_ar}</span><span class="text-gray-500 text-sm mr-3">(${d.account.code})</span></div>
        <button onclick="window.print()" class="text-gray-400 hover:text-white text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
      <div class="grid grid-cols-3 gap-4 p-4 bg-dark-900 text-sm">
        <div>الرصيد الافتتاحي: <strong class="text-white">${formatNumber(d.opening_balance)}</strong></div>
        <div>إجمالي المدين: <strong class="text-green-400">${formatNumber(d.total_debit)}</strong></div>
        <div>إجمالي الدائن: <strong class="text-red-400">${formatNumber(d.total_credit)}</strong></div>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">التاريخ</th><th class="px-4 py-3 text-right">رقم القيد</th>
          <th class="px-4 py-3 text-right">البيان</th><th class="px-4 py-3 text-left">مدين</th>
          <th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-left">الرصيد</th>
        </tr></thead>
        <tbody>
          <tr class="bg-dark-900/50 border-b border-dark-700"><td class="px-4 py-2" colspan="5" class="text-gray-400">رصيد مرحّل</td>
            <td class="px-4 py-2 text-left font-mono font-bold">${formatNumber(d.opening_balance)}</td></tr>
          ${d.lines.map(l => `<tr class="table-row border-b border-dark-700/50">
            <td class="px-4 py-2 text-gray-400">${l.entry_date}</td>
            <td class="px-4 py-2 font-mono text-primary-400">#${l.entry_number}</td>
            <td class="px-4 py-2 text-gray-300">${l.description || l.entry_description || ''}</td>
            <td class="px-4 py-2 text-left font-mono text-green-400">${l.debit>0?formatNumber(l.debit):''}</td>
            <td class="px-4 py-2 text-left font-mono text-red-400">${l.credit>0?formatNumber(l.credit):''}</td>
            <td class="px-4 py-2 text-left font-mono font-bold ${l.running_balance>=0?'text-white':'text-red-400'}">${formatNumber(l.running_balance)}</td>
          </tr>`).join('')}
          <tr class="bg-primary-900/30 font-bold text-white"><td class="px-4 py-3" colspan="3">الرصيد الختامي</td>
            <td class="px-4 py-3 text-left text-green-400">${formatNumber(d.total_debit)}</td>
            <td class="px-4 py-3 text-left text-red-400">${formatNumber(d.total_credit)}</td>
            <td class="px-4 py-3 text-left text-xl">${formatNumber(d.closing_balance)}</td></tr>
        </tbody></table></div>
    </div>`;
}

async function renderIncomeStatement(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/reports/income-statement');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const d = res.data;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white">قائمة الدخل</h2>
      <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
    </div>
    <div class="max-w-3xl mx-auto bg-dark-800 rounded-2xl border border-dark-700 p-6">
      <h3 class="text-green-400 font-bold text-lg mb-3"><i class="fas fa-arrow-down ml-2"></i>الإيرادات</h3>
      ${d.revenues.map(r=>`<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300"><span class="text-primary-400 font-mono">${r.code}</span> ${r.name_ar}</span><span class="text-green-400 font-mono">${formatNumber(r.balance)}</span></div>`).join('')}
      <div class="flex justify-between py-3 font-bold text-green-400 border-t border-dark-600 mt-2"><span>إجمالي الإيرادات</span><span>${formatNumber(d.totalRevenue)}</span></div>

      <h3 class="text-red-400 font-bold text-lg mb-3 mt-6"><i class="fas fa-arrow-up ml-2"></i>المصروفات</h3>
      ${d.expenses.map(e=>`<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300"><span class="text-primary-400 font-mono">${e.code}</span> ${e.name_ar}</span><span class="text-red-400 font-mono">${formatNumber(e.balance)}</span></div>`).join('')}
      <div class="flex justify-between py-3 font-bold text-red-400 border-t border-dark-600 mt-2"><span>إجمالي المصروفات</span><span>${formatNumber(d.totalExpenses)}</span></div>

      <div class="mt-6 p-4 rounded-xl ${d.netIncome>=0?'bg-green-900/20 border border-green-800':'bg-red-900/20 border border-red-800'}">
        <div class="flex justify-between text-xl font-bold"><span>${d.netIncome>=0?'صافي الربح':'صافي الخسارة'}</span>
          <span class="${d.netIncome>=0?'text-green-400':'text-red-400'}">${formatNumber(Math.abs(d.netIncome))}</span></div>
      </div>
    </div>`;
}

async function renderBalanceSheet(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-primary-500"></i></div>';
  const res = await apiFetch('/reports/balance-sheet');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const d = res.data;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white">الميزانية العمومية</h2>
      <button onclick="window.print()" class="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-blue-400 font-bold text-lg mb-4"><i class="fas fa-building ml-2"></i>الأصول</h3>
        ${d.assets.map(a=>`<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${a.name_ar}</span><span class="font-mono">${formatNumber(a.balance)}</span></div>`).join('')}
        <div class="flex justify-between py-3 font-bold text-blue-400 border-t border-dark-600 mt-2 text-lg"><span>إجمالي الأصول</span><span>${formatNumber(d.totalAssets)}</span></div>
      </div>
      <div class="space-y-6">
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <h3 class="text-red-400 font-bold text-lg mb-4"><i class="fas fa-file-invoice-dollar ml-2"></i>الخصوم</h3>
          ${d.liabilities.map(l=>`<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${l.name_ar}</span><span class="font-mono">${formatNumber(Math.abs(l.balance))}</span></div>`).join('')}
          <div class="flex justify-between py-3 font-bold text-red-400 border-t border-dark-600 mt-2"><span>إجمالي الخصوم</span><span>${formatNumber(d.totalLiabilities)}</span></div>
        </div>
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <h3 class="text-yellow-400 font-bold text-lg mb-4"><i class="fas fa-landmark ml-2"></i>حقوق الملكية</h3>
          ${d.equity.map(e=>`<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${e.name_ar}</span><span class="font-mono">${formatNumber(Math.abs(e.balance))}</span></div>`).join('')}
          <div class="flex justify-between py-3 font-bold text-yellow-400 border-t border-dark-600 mt-2"><span>إجمالي حقوق الملكية</span><span>${formatNumber(d.totalEquity)}</span></div>
        </div>
        <div class="bg-primary-900/20 border border-primary-700 rounded-2xl p-4">
          <div class="flex justify-between font-bold text-lg"><span class="text-white">الخصوم + الملكية</span><span class="text-primary-400">${formatNumber(d.totalLiabilitiesAndEquity)}</span></div>
        </div>
      </div>
    </div>`;
}

// ===== ADMIN PAGES =====
async function renderUsers(el) {
  const res = await apiFetch('/admin/users');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const roles = { admin:'مدير', manager:'مدير قسم', accountant:'محاسب', user:'مستخدم', viewer:'مشاهد' };

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white">إدارة المستخدمين</h2>
      <button onclick="showAddUserModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm"><i class="fas fa-plus ml-1"></i> مستخدم جديد</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${res.data.map(u => `
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">${u.full_name.charAt(0)}</div>
            <div><h4 class="text-white font-bold">${u.full_name}</h4><p class="text-gray-500 text-xs">@${u.username}</p></div>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">الدور:</span><span class="badge badge-info">${roles[u.role]||u.role}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">الحالة:</span><span class="badge ${u.is_active?'badge-success':'badge-danger'}">${u.is_active?'نشط':'معطل'}</span></div>
            ${u.last_login?`<div class="flex justify-between"><span class="text-gray-500">آخر دخول:</span><span class="text-gray-400 text-xs">${u.last_login}</span></div>`:''}
          </div>
        </div>`).join('')}
    </div>`;
}

function showAddUserModal() {
  showModal('مستخدم جديد', `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">اسم المستخدم *</label><input type="text" id="newUsername" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">كلمة المرور *</label><input type="password" id="newPassword" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      </div>
      <div><label class="block text-gray-400 text-xs mb-1">الاسم الكامل *</label><input type="text" id="newFullName" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">البريد</label><input type="email" id="newEmail" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">الدور</label><select id="newRole" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
          <option value="user">مستخدم</option><option value="accountant">محاسب</option><option value="manager">مدير قسم</option><option value="admin">مدير</option></select></div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-4 py-2 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveNewUser()" class="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm">حفظ</button>`);
}

async function saveNewUser() {
  const data = {
    username: document.getElementById('newUsername').value,
    password: document.getElementById('newPassword').value,
    full_name: document.getElementById('newFullName').value,
    email: document.getElementById('newEmail').value,
    role: document.getElementById('newRole').value
  };
  const res = await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/users'); }
  else showToast(res.message, 'error');
}

async function renderSettings(el) {
  const res = await apiFetch('/admin/settings');
  if (!res.success) return;
  const settings = {};
  res.data.forEach(s => settings[s.key] = s.value);

  el.innerHTML = `
    <div class="mb-6"><h2 class="text-2xl font-bold text-white">إعدادات النظام</h2></div>
    <div class="max-w-2xl bg-dark-800 rounded-2xl border border-dark-700 p-6 space-y-4">
      <div><label class="block text-gray-400 text-xs mb-1">اسم الشركة</label>
        <input type="text" id="setCompanyName" value="${settings.company_name||''}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div><label class="block text-gray-400 text-xs mb-1">اسم الشركة (إنجليزي)</label>
        <input type="text" id="setCompanyNameEn" value="${settings.company_name_en||''}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-gray-400 text-xs mb-1">الخانات العشرية</label>
          <input type="number" id="setDecimals" value="${settings.decimal_places||2}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500"></div>
        <div><label class="block text-gray-400 text-xs mb-1">ترحيل تلقائي</label>
          <select id="setAutoPost" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-gray-200 text-sm outline-none focus:border-primary-500">
            <option value="0" ${settings.voucher_auto_post==='0'?'selected':''}>لا</option><option value="1" ${settings.voucher_auto_post==='1'?'selected':''}>نعم</option></select></div>
      </div>
      <button onclick="saveSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm">حفظ الإعدادات</button>
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
  if (res.success) showToast(res.message); else showToast(res.message, 'error');
}

async function renderCurrencies(el) {
  const res = await apiFetch('/admin/currencies');
  if (!res.success) return;

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white">إدارة العملات</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      ${res.data.map(c => `
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 text-center">
          <div class="text-3xl mb-2">${c.symbol || c.code}</div>
          <h4 class="text-white font-bold">${c.name_ar}</h4>
          <p class="text-gray-500 text-xs">${c.name_en || ''}</p>
          <p class="text-primary-400 font-mono mt-2 text-lg">${c.exchange_rate}</p>
          <p class="text-gray-500 text-xs">سعر الصرف</p>
          ${c.is_default?'<span class="badge badge-success mt-2">العملة الافتراضية</span>':''}
        </div>`).join('')}
    </div>`;
}

// ===== INITIALIZATION =====
(function init() {
  currentUser = getUser();
  if (!currentUser && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
    return;
  }

  if (currentUser) {
    document.getElementById('userFullName').textContent = currentUser.fullName;
    const roles = { admin:'مدير النظام', manager:'مدير', accountant:'محاسب', user:'مستخدم', viewer:'مشاهد' };
    document.getElementById('userRole').textContent = roles[currentUser.role] || currentUser.role;
  }

  // Set date
  const now = new Date();
  document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('fiscalYearBadge').innerHTML = `<span class="badge badge-info">السنة المالية 2026</span>`;

  // Build sidebar & load page
  buildSidebar().then(() => {
    const path = window.location.pathname.replace('/app', '') || '/dashboard';
    loadPage(path);
    updateActiveLink(path);
    updateBreadcrumb(path);
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const path = window.location.pathname.replace('/app', '') || '/dashboard';
    loadPage(path);
    updateActiveLink(path);
    updateBreadcrumb(path);
  });
})();
