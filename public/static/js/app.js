// ===================================================
// النظام المحاسبي الحديث - Frontend Application v4.0
// تحويل كامل من Oracle Forms - المرحلة الرابعة
// ===================================================

const API = '/api';
const APP_VERSION = '4.0';
let currentUser = null;
let menuItems = [];
let accountsCache = [];
let currenciesCache = [];
let costCentersCache = [];
let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

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
  addNotification('تسجيل خروج', 'تم تسجيل خروجك من النظام', 'info');
  window.location.href = '/login';
}

// ===== Notifications System =====
function addNotification(title, message, type = 'info') {
  const notif = { id: Date.now(), title, message, type, time: new Date().toISOString(), read: false };
  notifications.unshift(notif);
  if (notifications.length > 50) notifications = notifications.slice(0, 50);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  renderNotifList();
  // Mark as read
  notifications.forEach(n => n.read = true);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  setTimeout(updateNotifBadge, 300);
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (notifications.length === 0) {
    list.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm"><i class="fas fa-bell-slash text-2xl mb-2 block opacity-40"></i>لا توجد إشعارات</div>';
    return;
  }
  const icons = { success: 'fa-check-circle text-green-400', error: 'fa-times-circle text-red-400', warning: 'fa-exclamation-triangle text-yellow-400', info: 'fa-info-circle text-blue-400' };
  list.innerHTML = notifications.slice(0, 20).map(n => {
    const ago = timeAgo(n.time);
    return `<div class="px-4 py-3 hover:bg-dark-700/50 transition border-b border-dark-700/50 flex gap-3 ${n.read ? '' : 'bg-dark-700/20'}">
      <i class="fas ${icons[n.type] || icons.info} mt-0.5"></i>
      <div class="flex-1 min-w-0"><p class="text-gray-200 text-sm font-medium">${n.title}</p>
      <p class="text-gray-500 text-xs truncate">${n.message}</p>
      <p class="text-gray-600 text-[10px] mt-1">${ago}</p></div>
    </div>`;
  }).join('');
}

function clearNotifications() {
  notifications = [];
  localStorage.setItem('notifications', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotifList();
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
  return `منذ ${Math.floor(diff/86400)} يوم`;
}

// ===== Global Search =====
let searchTimeout = null;
let searchResultIndex = -1;

function handleGlobalSearch(query) {
  clearTimeout(searchTimeout);
  if (!query || query.length < 2) {
    hideSearchResults();
    return;
  }
  searchTimeout = setTimeout(async () => {
    const res = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
    if (res.success) {
      renderSearchResults(res.data, query);
      showSearchResults();
    }
  }, 300);
}

function showSearchResults() {
  const q = document.getElementById('globalSearchInput')?.value;
  if (q && q.length >= 2) {
    document.getElementById('globalSearchResults')?.classList.remove('hidden');
  }
}

function hideSearchResults() {
  document.getElementById('globalSearchResults')?.classList.add('hidden');
  searchResultIndex = -1;
}

function renderSearchResults(data, query) {
  const container = document.getElementById('searchResultsContent');
  if (!container) return;

  const highlight = (text) => {
    if (!text || !query) return text || '';
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return String(text).replace(regex, '<mark class="bg-yellow-500/30 text-yellow-300 rounded px-0.5">$1</mark>');
  };

  let html = '';
  const typeIcons = { asset: 'fa-coins text-blue-400', liability: 'fa-hand-holding-usd text-red-400', equity: 'fa-balance-scale text-yellow-400', revenue: 'fa-chart-line text-green-400', expense: 'fa-receipt text-orange-400' };

  // Accounts
  if (data.accounts?.length > 0) {
    html += `<div class="px-3 py-1.5 text-[10px] text-gray-500 uppercase font-bold tracking-wider">حسابات (${data.accounts.length})</div>`;
    data.accounts.forEach(a => {
      const icon = typeIcons[a.account_type] || 'fa-file text-gray-400';
      html += `<button onclick="hideSearchResults();navigate('/accounts');setTimeout(()=>highlightAccountInTree('${a.code}'),300)" class="search-result-item w-full text-right px-3 py-2.5 hover:bg-dark-700/60 flex items-center gap-3 transition rounded-xl">
        <i class="fas ${icon} w-5 text-center text-sm"></i>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-200">${highlight(a.name_ar)}</div>
          <div class="text-xs text-gray-500 font-mono">${highlight(a.code)}</div>
        </div>
        <span class="text-xs text-gray-600 font-mono">${formatNumber(a.current_balance)}</span>
      </button>`;
    });
  }

  // Journal
  if (data.journal?.length > 0) {
    html += `<div class="px-3 py-1.5 text-[10px] text-gray-500 uppercase font-bold tracking-wider border-t border-dark-700 mt-1 pt-2">قيود (${data.journal.length})</div>`;
    data.journal.forEach(j => {
      html += `<button onclick="hideSearchResults();navigate('/journal');setTimeout(()=>viewJournalEntry(${j.id}),300)" class="search-result-item w-full text-right px-3 py-2.5 hover:bg-dark-700/60 flex items-center gap-3 transition rounded-xl">
        <i class="fas fa-book-open w-5 text-center text-sm text-purple-400"></i>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-200">${highlight(j.description || 'قيد #' + j.entry_number)}</div>
          <div class="text-xs text-gray-500">${j.entry_date} - <span class="badge ${j.status==='posted'?'badge-success':'badge-warning'} text-[9px]">${j.status==='posted'?'مرحّل':'مسودة'}</span></div>
        </div>
        <span class="text-xs text-gray-600 font-mono">${formatNumber(j.total_debit)}</span>
      </button>`;
    });
  }

  // Vouchers
  if (data.vouchers?.length > 0) {
    html += `<div class="px-3 py-1.5 text-[10px] text-gray-500 uppercase font-bold tracking-wider border-t border-dark-700 mt-1 pt-2">سندات (${data.vouchers.length})</div>`;
    data.vouchers.forEach(v => {
      const typeIcon = v.voucher_type === 'receipt' ? 'fa-hand-holding-usd text-green-400' : 'fa-money-bill-wave text-red-400';
      html += `<button onclick="hideSearchResults();navigate('/vouchers/${v.voucher_type}');setTimeout(()=>viewVoucher(${v.id}),300)" class="search-result-item w-full text-right px-3 py-2.5 hover:bg-dark-700/60 flex items-center gap-3 transition rounded-xl">
        <i class="fas ${typeIcon} w-5 text-center text-sm"></i>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-200">${highlight(v.beneficiary || 'سند #' + v.voucher_number)}</div>
          <div class="text-xs text-gray-500">${v.voucher_date}</div>
        </div>
        <span class="text-xs text-gray-600 font-mono">${formatNumber(v.amount)}</span>
      </button>`;
    });
  }

  if (!html) {
    html = '<div class="p-6 text-center text-gray-500"><i class="fas fa-search text-3xl mb-3 block opacity-30"></i><p class="text-sm">لا توجد نتائج</p></div>';
  }

  container.innerHTML = html;
}

function handleSearchKeydown(e) {
  const items = document.querySelectorAll('.search-result-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    searchResultIndex = Math.min(searchResultIndex + 1, items.length - 1);
    items.forEach((item, i) => item.classList.toggle('bg-dark-700/60', i === searchResultIndex));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    searchResultIndex = Math.max(searchResultIndex - 1, 0);
    items.forEach((item, i) => item.classList.toggle('bg-dark-700/60', i === searchResultIndex));
  } else if (e.key === 'Enter' && searchResultIndex >= 0 && items[searchResultIndex]) {
    items[searchResultIndex].click();
  } else if (e.key === 'Escape') {
    hideSearchResults();
    document.getElementById('globalSearchInput').blur();
  }
}

function highlightAccountInTree(code) {
  // Expand tree and scroll to account
  const nodes = document.querySelectorAll('.tree-node');
  nodes.forEach(n => {
    const nameData = n.dataset.name || '';
    if (nameData.includes(code)) {
      n.style.display = '';
      // Expand parents
      let parent = n.parentElement;
      while (parent) {
        if (parent.classList?.contains('tree-node')) parent.classList.remove('tree-closed');
        parent = parent.parentElement;
      }
      // Highlight
      const row = n.querySelector('.flex.items-center');
      if (row) {
        row.classList.add('ring-2', 'ring-primary-500', 'bg-primary-500/10');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-500/10'), 3000);
      }
    }
  });
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
  // Also add as notification for important messages
  if (type === 'success' && message.includes('تم')) {
    addNotification('عملية ناجحة', message, 'success');
  }
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
function formatDate(d) { return d || '-'; }
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
    'fiscal-years': 'السنوات المالية', 'audit-log': 'سجل النشاطات', 'cost-centers': 'مراكز التكلفة'
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
  else if (path === '/cost-centers') renderCostCenters(el);
  else if (path === '/cost-centers/report') renderCostCenterReport(el);
  else el.innerHTML = '<div class="text-center text-gray-500 py-20"><i class="fas fa-hard-hat text-6xl mb-4 block"></i><p class="text-xl">الصفحة قيد الإنشاء</p></div>';
}

// ╔══════════════════════════════════════════════════╗
// ║              DASHBOARD (لوحة التحكم المحسّنة)       ║
// ╚══════════════════════════════════════════════════╝
async function renderDashboard(el) {
  const res = await apiFetch('/dashboard/stats');
  if (!res.success) { el.innerHTML = '<p class="text-red-400 text-center py-10">خطأ في جلب البيانات</p>'; return; }
  const d = res.data;

  el.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">لوحة التحكم</h2>
      <p class="text-gray-500 text-sm mt-1">نظرة عامة على النظام المحاسبي ${d.activeFiscalYear ? '- السنة المالية ' + d.activeFiscalYear.year : ''}</p>
    </div>

    <!-- Stats Cards Row 1 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('fa-vault', 'رصيد الصندوق', formatNumber(d.cashBalance), 'د.ع', 'from-blue-600 to-cyan-700')}
      ${statCard('fa-arrow-down', 'إجمالي القبض', formatNumber(d.totalReceipts), d.receiptCount + ' سند', 'from-emerald-600 to-green-700')}
      ${statCard('fa-arrow-up', 'إجمالي الصرف', formatNumber(d.totalPayments), d.paymentCount + ' سند', 'from-rose-600 to-red-700')}
      ${statCard('fa-book-open', 'القيود', d.postedEntries + '/' + d.totalEntries, d.draftEntries + ' مسودة', 'from-violet-600 to-purple-700')}
    </div>

    <!-- KPI Indicators & Smart Alerts -->
    ${buildKPISection(d)}

    <!-- Bank Balances + Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <!-- Bank Balances -->
      <div class="lg:col-span-1 bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-white font-bold text-sm mb-4"><i class="fas fa-university ml-2 text-blue-400"></i>أرصدة البنوك</h3>
        ${d.bankBalances.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد حسابات بنكية</p>' :
        d.bankBalances.map(b => `<div class="flex justify-between items-center py-2.5 border-b border-dark-700/50 last:border-0">
          <span class="text-gray-300 text-sm">${b.name_ar}</span>
          <span class="font-mono text-sm font-bold ${b.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}">${formatNumber(b.current_balance)}</span>
        </div>`).join('')}
      </div>

      <!-- Quick Actions -->
      <div class="lg:col-span-2">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          ${quickAction('fa-plus-circle', 'قيد جديد', "navigate('/journal')", 'text-blue-400 hover:bg-blue-500/10')}
          ${quickAction('fa-hand-holding-usd', 'سند قبض', "navigate('/vouchers/receipt')", 'text-green-400 hover:bg-green-500/10')}
          ${quickAction('fa-money-bill-wave', 'سند صرف', "navigate('/vouchers/payment')", 'text-red-400 hover:bg-red-500/10')}
          ${quickAction('fa-balance-scale', 'ميزان المراجعة', "navigate('/reports/trial-balance')", 'text-purple-400 hover:bg-purple-500/10')}
        </div>
        <!-- Monthly Chart -->
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <h3 class="text-white font-bold text-sm mb-4"><i class="fas fa-chart-bar ml-2 text-primary-400"></i>الحركة الشهرية</h3>
          <canvas id="monthlyChart" height="180"></canvas>
        </div>
      </div>
    </div>

    <!-- Account Type Pie + Top Accounts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-white font-bold text-sm mb-4"><i class="fas fa-chart-pie ml-2 text-yellow-400"></i>توزيع الحسابات</h3>
        <canvas id="accountPieChart" height="200"></canvas>
      </div>
      <div class="lg:col-span-2 bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h3 class="text-white font-bold text-sm mb-4"><i class="fas fa-sort-amount-down ml-2 text-primary-400"></i>أعلى الأرصدة</h3>
        <div class="space-y-2">
          ${d.topAccounts.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد أرصدة بعد</p>' :
          d.topAccounts.map((a, i) => {
            const maxBal = Math.max(...d.topAccounts.map(x => Math.abs(x.current_balance)));
            const pct = maxBal > 0 ? (Math.abs(a.current_balance) / maxBal * 100) : 0;
            const typeColors = { asset: 'bg-blue-500', liability: 'bg-red-500', equity: 'bg-yellow-500', revenue: 'bg-green-500', expense: 'bg-orange-500' };
            return `<div class="flex items-center gap-3">
              <span class="text-gray-500 text-xs w-4">${i+1}</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between mb-1">
                  <span class="text-gray-300 text-xs truncate"><span class="text-primary-400 font-mono">${a.code}</span> ${a.name_ar}</span>
                  <span class="text-white font-mono text-xs font-bold">${formatNumber(Math.abs(a.current_balance))}</span>
                </div>
                <div class="w-full bg-dark-900 rounded-full h-1.5"><div class="${typeColors[a.account_type] || 'bg-primary-500'} h-1.5 rounded-full" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
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

  // Initialize Charts
  setTimeout(() => initDashboardCharts(d), 100);
}

function initDashboardCharts(data) {
  // Monthly Bar Chart
  const monthlyCtx = document.getElementById('monthlyChart')?.getContext('2d');
  if (monthlyCtx && data.monthlySummary.length > 0) {
    const monthNames = { '01':'يناير','02':'فبراير','03':'مارس','04':'أبريل','05':'مايو','06':'يونيو','07':'يوليو','08':'أغسطس','09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر' };
    new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: data.monthlySummary.map(m => monthNames[m.month.split('-')[1]] || m.month),
        datasets: [
          { label: 'مدين', data: data.monthlySummary.map(m => m.total_debit), backgroundColor: 'rgba(52, 211, 153, 0.7)', borderRadius: 6 },
          { label: 'دائن', data: data.monthlySummary.map(m => m.total_credit), backgroundColor: 'rgba(248, 113, 113, 0.7)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af', font: { family: 'Tajawal', size: 11 } } } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { family: 'Tajawal', size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#6b7280', font: { size: 10 }, callback: v => formatNumber(v) }, grid: { color: 'rgba(55,65,81,0.3)' } }
        }
      }
    });
  }

  // Account Type Pie Chart
  const pieCtx = document.getElementById('accountPieChart')?.getContext('2d');
  if (pieCtx && data.accountTypeTotals.length > 0) {
    const typeNames = { asset: 'أصول', liability: 'خصوم', equity: 'ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
    const typeColorsArr = ['#3b82f6','#ef4444','#eab308','#22c55e','#f97316'];
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: data.accountTypeTotals.map(t => typeNames[t.account_type] || t.account_type),
        datasets: [{ data: data.accountTypeTotals.map(t => t.count), backgroundColor: typeColorsArr.slice(0, data.accountTypeTotals.length), borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Tajawal', size: 11 }, padding: 12 } } },
        cutout: '65%'
      }
    });
  }
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
  return `<div class="text-center py-8 text-gray-500"><i class="fas ${icon} text-4xl mb-3 block opacity-30"></i><p class="text-sm">${msg}</p></div>`;
}

// ===== KPI & Smart Alerts Section =====
function buildKPISection(d) {
  const alerts = [];

  // Smart alerts based on data
  if (d.draftEntries > 0) {
    alerts.push({ type: 'warning', icon: 'fa-exclamation-triangle', message: `يوجد ${d.draftEntries} قيد مسودة بحاجة لترحيل`, action: "navigate('/journal')", actionText: 'عرض القيود' });
  }
  if (d.cashBalance < 0) {
    alerts.push({ type: 'error', icon: 'fa-times-circle', message: 'تحذير: رصيد الصندوق سالب!', action: "navigate('/reports/account-statement')", actionText: 'كشف حساب' });
  }
  if (d.totalReceipts > 0 && d.totalPayments > 0) {
    const ratio = d.totalPayments / d.totalReceipts;
    if (ratio > 0.9) {
      alerts.push({ type: 'warning', icon: 'fa-balance-scale-right', message: `المصروفات تشكل ${(ratio * 100).toFixed(0)}% من الإيرادات`, action: "navigate('/reports/income')", actionText: 'قائمة الدخل' });
    }
  }

  // KPI calculations
  const netFlow = (d.totalReceipts || 0) - (d.totalPayments || 0);
  const postingRate = d.totalEntries > 0 ? ((d.postedEntries / d.totalEntries) * 100).toFixed(0) : 100;
  const avgEntry = d.totalEntries > 0 ? (d.totalReceipts + d.totalPayments) / d.totalEntries : 0;

  let html = '';

  // Alerts
  if (alerts.length > 0) {
    html += `<div class="mb-4 space-y-2">`;
    alerts.forEach(a => {
      const colors = { warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', error: 'bg-red-500/10 border-red-500/30 text-red-400', info: 'bg-blue-500/10 border-blue-500/30 text-blue-400' };
      html += `<div class="${colors[a.type]} border rounded-xl px-4 py-3 flex items-center justify-between text-sm">
        <div class="flex items-center gap-3">
          <i class="fas ${a.icon}"></i>
          <span>${a.message}</span>
        </div>
        <button onclick="${a.action}" class="text-xs underline hover:no-underline">${a.actionText}</button>
      </div>`;
    });
    html += `</div>`;
  }

  // KPI Cards
  html += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
    <div class="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-500 text-xs">صافي التدفق النقدي</span>
        <i class="fas ${netFlow >= 0 ? 'fa-arrow-trend-up text-green-400' : 'fa-arrow-trend-down text-red-400'}"></i>
      </div>
      <div class="text-xl font-bold ${netFlow >= 0 ? 'text-green-400' : 'text-red-400'}">${formatNumber(netFlow)}</div>
      <div class="mt-2 h-1.5 bg-dark-900 rounded-full overflow-hidden">
        <div class="${netFlow >= 0 ? 'bg-green-500' : 'bg-red-500'} h-full rounded-full" style="width:${Math.min(Math.abs(netFlow) / Math.max(d.totalReceipts, d.totalPayments, 1) * 100, 100)}%"></div>
      </div>
    </div>
    <div class="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-500 text-xs">نسبة الترحيل</span>
        <i class="fas fa-check-double ${postingRate >= 80 ? 'text-green-400' : postingRate >= 50 ? 'text-yellow-400' : 'text-red-400'}"></i>
      </div>
      <div class="text-xl font-bold text-white">${postingRate}%</div>
      <div class="mt-2 h-1.5 bg-dark-900 rounded-full overflow-hidden">
        <div class="${postingRate >= 80 ? 'bg-green-500' : postingRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'} h-full rounded-full" style="width:${postingRate}%"></div>
      </div>
    </div>
    <div class="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-gray-500 text-xs">متوسط قيمة القيد</span>
        <i class="fas fa-calculator text-primary-400"></i>
      </div>
      <div class="text-xl font-bold text-white">${formatNumber(avgEntry)}</div>
      <div class="text-gray-600 text-[10px] mt-1">${d.totalEntries} قيد إجمالي</div>
    </div>
  </div>`;

  return html;
}

// ╔══════════════════════════════════════════════════╗
// ║              ACCOUNTS (دليل الحسابات)             ║
// ╚══════════════════════════════════════════════════╝
async function renderAccounts(el) {
  const res = await apiFetch('/accounts');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ في جلب البيانات</p>'; return; }
  accountsCache = res.data;

  // Build lookup maps for performance
  window._accountMap = {};
  window._accountChildren = {};
  accountsCache.forEach(a => {
    window._accountMap[a.id] = a;
    const pid = a.parent_id || 'root';
    if (!window._accountChildren[pid]) window._accountChildren[pid] = [];
    window._accountChildren[pid].push(a);
  });

  const totalBalance = accountsCache.reduce((s, a) => s + (a.is_parent ? 0 : Math.abs(a.current_balance || 0)), 0);
  const typeCount = {};
  accountsCache.forEach(a => { typeCount[a.account_type] = (typeCount[a.account_type] || 0) + 1; });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-white">دليل الحسابات</h2>
        <p class="text-gray-500 text-sm mt-1">${accountsCache.length} حساب مسجل</p>
      </div>
      <div class="flex gap-2">
        <button onclick="toggleAccountView()" id="viewToggleBtn" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm transition" title="تبديل العرض">
          <i class="fas fa-th-list"></i>
        </button>
        <button onclick="expandAllTree()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm transition" title="فتح الكل">
          <i class="fas fa-expand-alt"></i>
        </button>
        <button onclick="collapseAllTree()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm transition" title="إغلاق الكل">
          <i class="fas fa-compress-alt"></i>
        </button>
        <button onclick="showAddAccountModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition">
          <i class="fas fa-plus"></i> إضافة حساب
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      <div class="bg-dark-800 rounded-xl border border-dark-700 p-3 text-center">
        <div class="text-blue-400 text-lg font-bold">${typeCount.asset || 0}</div>
        <div class="text-gray-500 text-[10px]">أصول</div>
      </div>
      <div class="bg-dark-800 rounded-xl border border-dark-700 p-3 text-center">
        <div class="text-red-400 text-lg font-bold">${typeCount.liability || 0}</div>
        <div class="text-gray-500 text-[10px]">خصوم</div>
      </div>
      <div class="bg-dark-800 rounded-xl border border-dark-700 p-3 text-center">
        <div class="text-yellow-400 text-lg font-bold">${typeCount.equity || 0}</div>
        <div class="text-gray-500 text-[10px]">ملكية</div>
      </div>
      <div class="bg-dark-800 rounded-xl border border-dark-700 p-3 text-center">
        <div class="text-green-400 text-lg font-bold">${typeCount.revenue || 0}</div>
        <div class="text-gray-500 text-[10px]">إيرادات</div>
      </div>
      <div class="bg-dark-800 rounded-xl border border-dark-700 p-3 text-center">
        <div class="text-orange-400 text-lg font-bold">${typeCount.expense || 0}</div>
        <div class="text-gray-500 text-[10px]">مصروفات</div>
      </div>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-4 border-b border-dark-700 flex gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="accountSearch" onkeyup="filterAccountsInstant(this.value)" placeholder="بحث لحظي بالرمز أو الاسم..." class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl pr-10 pl-4 py-2.5 w-full text-sm outline-none focus:border-primary-500 transition">
        </div>
        <select id="accountTypeFilter" onchange="filterAccountsInstant(document.getElementById('accountSearch')?.value)" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الأنواع</option>
          <option value="asset">أصول</option><option value="liability">خصوم</option><option value="equity">ملكية</option>
          <option value="revenue">إيرادات</option><option value="expense">مصروفات</option>
        </select>
        <select id="accountLevelFilter" onchange="filterAccountsInstant(document.getElementById('accountSearch')?.value)" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل المستويات</option>
          <option value="1">المستوى 1</option><option value="2">المستوى 2</option>
          <option value="3">المستوى 3</option><option value="4">المستوى 4</option>
        </select>
        <div id="accountSearchCount" class="hidden flex items-center text-xs text-primary-400 bg-primary-500/10 px-3 rounded-xl"></div>
      </div>
      <div id="accountsTreeView" class="p-4 min-h-[200px]">${buildAccountsTree(accountsCache)}</div>
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
  initAccountDragDrop();
}

function buildAccountsTree(accounts) {
  const types = { asset: 'أصول', liability: 'خصوم', equity: 'ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
  const typeColors = { asset: 'text-blue-400', liability: 'text-red-400', equity: 'text-yellow-400', revenue: 'text-green-400', expense: 'text-orange-400' };
  const typeBg = { asset: 'bg-blue-500/10', liability: 'bg-red-500/10', equity: 'bg-yellow-500/10', revenue: 'bg-green-500/10', expense: 'bg-orange-500/10' };

  // Build children map for O(n) performance
  const childrenMap = {};
  accounts.forEach(a => {
    const pid = a.parent_id || 'root';
    if (!childrenMap[pid]) childrenMap[pid] = [];
    childrenMap[pid].push(a);
  });

  function buildNode(parentId, level) {
    const children = childrenMap[parentId || 'root'] || [];
    if (children.length === 0) return '';
    return children.map(a => {
      const hasChildren = childrenMap[a.id] && childrenMap[a.id].length > 0;
      const indent = level * 20;
      const balanceText = a.is_parent ? '' : `<span class="font-mono text-xs ${a.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}">${formatNumber(a.current_balance)}</span>`;
      if (hasChildren) {
        return `<div class="tree-node" data-id="${a.id}" data-type="${a.account_type}" data-level="${a.level}" data-name="${a.name_ar} ${a.code}" data-code="${a.code}" draggable="true">
          <div class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-dark-700/50 cursor-pointer transition group tree-row" style="padding-right:${indent + 12}px" onclick="this.parentElement.classList.toggle('tree-closed')">
            <i class="fas fa-chevron-down text-[10px] text-gray-500 transition-transform tree-chevron"></i>
            <i class="fas fa-folder-open text-yellow-500 text-sm tree-icon-open"></i>
            <i class="fas fa-folder text-yellow-600 text-sm tree-icon-closed hidden"></i>
            <span class="text-primary-400 font-mono text-xs acc-code">${a.code}</span>
            <span class="text-white font-medium text-sm flex-1 acc-name">${a.name_ar}</span>
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
      return `<div class="tree-node" data-id="${a.id}" data-type="${a.account_type}" data-level="${a.level}" data-name="${a.name_ar} ${a.code}" data-code="${a.code}" draggable="true">
        <div class="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-dark-700/50 transition group tree-row" style="padding-right:${indent + 28}px">
          <i class="fas fa-file-invoice text-gray-600 text-xs"></i>
          <span class="text-primary-400 font-mono text-xs acc-code">${a.code}</span>
          <span class="text-gray-300 text-sm flex-1 acc-name">${a.name_ar}</span>
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
    accountViewMode = 'table'; treeView.classList.add('hidden'); tableView.classList.remove('hidden'); btn.innerHTML = '<i class="fas fa-sitemap"></i>';
  } else {
    accountViewMode = 'tree'; treeView.classList.remove('hidden'); tableView.classList.add('hidden'); btn.innerHTML = '<i class="fas fa-th-list"></i>';
  }
}
function expandAllTree() { document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('tree-closed')); }
function collapseAllTree() { document.querySelectorAll('.tree-node').forEach(n => { if (n.querySelector('.tree-children')) n.classList.add('tree-closed'); }); }

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

function filterAccountsInstant(query) {
  const q = (query || '').toLowerCase().trim();
  const typeFilter = document.getElementById('accountTypeFilter')?.value || '';
  const levelFilter = document.getElementById('accountLevelFilter')?.value || '';
  const countEl = document.getElementById('accountSearchCount');
  let matchCount = 0;

  // Reset highlighting
  document.querySelectorAll('.acc-name, .acc-code').forEach(el => {
    el.innerHTML = el.textContent;
  });

  document.querySelectorAll('.tree-node').forEach(n => {
    const name = (n.dataset.name || '').toLowerCase();
    const type = n.dataset.type || '';
    const level = n.dataset.level || '';
    const matchesQuery = !q || name.includes(q);
    const matchesType = !typeFilter || type === typeFilter;
    const matchesLevel = !levelFilter || level === levelFilter;
    const visible = matchesQuery && matchesType && matchesLevel;

    n.style.display = visible ? '' : 'none';

    if (visible && q) {
      matchCount++;
      // Expand parents
      let parent = n.parentElement;
      while (parent) {
        if (parent.classList?.contains('tree-node')) {
          parent.style.display = '';
          parent.classList.remove('tree-closed');
        }
        parent = parent.parentElement;
      }
      // Highlight matching text
      const highlightText = (el) => {
        const text = el.textContent;
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        el.innerHTML = text.replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
      };
      n.querySelectorAll(':scope > .tree-row .acc-name, :scope > .tree-row .acc-code, :scope > div > .tree-row .acc-name, :scope > div > .tree-row .acc-code').forEach(highlightText);
    }
  });

  // Update table too
  document.querySelectorAll('#accountsTableBody tr').forEach(r => {
    const name = (r.dataset.name || '').toLowerCase();
    const type = r.dataset.type || '';
    r.style.display = (!q || name.includes(q)) && (!typeFilter || type === typeFilter) ? '' : 'none';
  });

  // Show count
  if (countEl) {
    if (q) {
      countEl.classList.remove('hidden');
      countEl.textContent = `${matchCount} نتيجة`;
    } else {
      countEl.classList.add('hidden');
    }
  }
}

// Drag & Drop for Account Tree
let draggedAccountId = null;

function initAccountDragDrop() {
  const treeView = document.getElementById('accountsTreeView');
  if (!treeView) return;

  treeView.addEventListener('dragstart', (e) => {
    const node = e.target.closest('.tree-node');
    if (!node) return;
    draggedAccountId = node.dataset.id;
    e.dataTransfer.setData('text/plain', draggedAccountId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => node.classList.add('opacity-40'), 0);
  });

  treeView.addEventListener('dragend', (e) => {
    const node = e.target.closest('.tree-node');
    if (node) node.classList.remove('opacity-40');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedAccountId = null;
  });

  treeView.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.tree-row');
    if (row) {
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      row.classList.add('drag-over');
    }
  });

  treeView.addEventListener('dragleave', (e) => {
    const row = e.target.closest('.tree-row');
    if (row) row.classList.remove('drag-over');
  });

  treeView.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const targetNode = e.target.closest('.tree-node');
    if (!targetNode || !draggedAccountId) return;
    const targetId = targetNode.dataset.id;
    if (targetId === draggedAccountId) return;

    const draggedAcc = accountsCache.find(a => a.id == draggedAccountId);
    const targetAcc = accountsCache.find(a => a.id == targetId);
    if (!draggedAcc || !targetAcc) return;

    showConfirm('نقل حساب',
      `هل تريد نقل "<strong>${draggedAcc.name_ar}</strong>" ليصبح فرعياً من "<strong>${targetAcc.name_ar}</strong>"؟`,
      async () => {
        const res = await apiFetch(`/accounts/${draggedAccountId}/move`, {
          method: 'PUT',
          body: JSON.stringify({ new_parent_id: parseInt(targetId) })
        });
        if (res.success) {
          showToast(res.message);
          navigate('/accounts');
        } else {
          showToast(res.message, 'error');
        }
      }
    );
  });
}

// Keep old function for compatibility
function filterAccounts() {
  filterAccountsInstant(document.getElementById('accountSearch')?.value);
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
        ${selectField('accType', 'نوع الحساب *', [{value:'asset',text:'أصول'},{value:'liability',text:'خصوم'},{value:'equity',text:'ملكية'},{value:'revenue',text:'إيرادات'},{value:'expense',text:'مصروفات'}], autoType)}
        ${selectField('accNature', 'طبيعة الحساب *', [{value:'debit',text:'مدين'},{value:'credit',text:'دائن'}], autoNature)}
      </div>
      ${inputField('accOpenBal', 'الرصيد الافتتاحي', 'number', '0', 'step="0.01"')}
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
    is_parent: document.getElementById('accIsParent').checked,
    opening_balance: parseFloat(document.getElementById('accOpenBal')?.value || 0)
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
        ${selectField('editAccType', 'النوع', [{value:'asset',text:'أصول'},{value:'liability',text:'خصوم'},{value:'equity',text:'ملكية'},{value:'revenue',text:'إيرادات'},{value:'expense',text:'مصروفات'}], a.account_type)}
      </div>
      ${inputField('editAccNameAr', 'اسم الحساب (عربي)', 'text', a.name_ar)}
      ${inputField('editAccNameEn', 'اسم الحساب (إنجليزي)', 'text', a.name_en || '')}
      <div class="grid grid-cols-2 gap-4">
        ${selectField('editAccNature', 'الطبيعة', [{value:'debit',text:'مدين'},{value:'credit',text:'دائن'}], a.account_nature)}
        ${selectField('editAccActive', 'الحالة', [{value:'1',text:'نشط'},{value:'0',text:'معطل'}], a.is_active ? '1' : '0')}
      </div>
      ${inputField('editAccOpenBal', 'الرصيد الافتتاحي', 'number', a.opening_balance || 0, 'step="0.01"')}
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
    if (res.success) { showToast(res.message); navigate('/accounts'); } else showToast(res.message, 'error');
  });
}

// ╔══════════════════════════════════════════════════╗
// ║            JOURNAL ENTRIES (القيود اليومية)        ║
// ╚══════════════════════════════════════════════════╝
async function renderJournal(el) {
  const res = await apiFetch('/journal?page=1&limit=50');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white">القيود اليومية</h2><p class="text-gray-500 text-sm mt-1">${res.total} قيد مسجل</p></div>
      <div class="flex gap-2">
        <button onclick="showJournalTemplates()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition" title="قوالب جاهزة"><i class="fas fa-file-code"></i> قوالب</button>
        <button onclick="showAddJournalModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"><i class="fas fa-plus"></i> قيد جديد</button>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="relative"><i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="jeSearchInput" placeholder="بحث بالوصف أو الرقم..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none focus:border-primary-500" onkeyup="filterJournalTable()"></div>
        ${selectField('jeStatusFilter', '', [{value:'',text:'كل الحالات'},{value:'draft',text:'مسودة'},{value:'posted',text:'مرحّل'}])}
        <input type="date" id="jeFromDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterJournalByDate()">
        <input type="date" id="jeToDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterJournalByDate()">
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th><th class="px-4 py-3 text-right">الوصف</th><th class="px-4 py-3 text-right">المرجع</th>
          <th class="px-4 py-3 text-left">مدين</th><th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-center">الحالة</th><th class="px-4 py-3 text-center">إجراءات</th>
        </tr></thead><tbody id="journalTableBody">${res.data.map(e => journalRow(e)).join('')}</tbody></table>
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
        <button onclick="copyJournalEntry(${e.id})" class="text-cyan-400 hover:text-cyan-300 p-1 mx-0.5" title="نسخ"><i class="fas fa-copy"></i></button>
        <button onclick="deleteJournalEntry(${e.id})" class="text-red-400 hover:text-red-300 p-1 mx-0.5" title="حذف"><i class="fas fa-trash"></i></button>
      `:`<button onclick="viewJournalEntry(${e.id})" class="text-primary-400 hover:text-primary-300 p-1 mx-0.5" title="عرض"><i class="fas fa-eye"></i></button>
         <button onclick="copyJournalEntry(${e.id})" class="text-cyan-400 hover:text-cyan-300 p-1 mx-0.5" title="نسخ"><i class="fas fa-copy"></i></button>
         <button onclick="reverseJournalEntry(${e.id})" class="text-yellow-400 hover:text-yellow-300 p-1 mx-0.5" title="عكس"><i class="fas fa-undo"></i></button>
         <button onclick="exportJournalEntryPDF(${e.id})" class="text-red-400 hover:text-red-300 p-1 mx-0.5" title="PDF"><i class="fas fa-file-pdf"></i></button>`}
    </td></tr>`;
}

function filterJournalTable() {
  const q = (document.getElementById('jeSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('jeStatusFilter')?.value || '';
  document.querySelectorAll('#journalTableBody tr').forEach(r => {
    const desc = (r.dataset.desc || '').toLowerCase();
    const num = r.dataset.num || '';
    const st = r.dataset.status || '';
    r.style.display = (!q || desc.includes(q) || num.includes(q)) && (!status || st === status) ? '' : 'none';
  });
}

function filterJournalByDate() {
  const from = document.getElementById('jeFromDate')?.value || '';
  const to = document.getElementById('jeToDate')?.value || '';
  document.querySelectorAll('#journalTableBody tr').forEach(r => {
    const date = r.dataset.date || '';
    r.style.display = (!from || date >= from) && (!to || date <= to) ? '' : 'none';
  });
}

async function showJournalModal(entryId = null, prefillData = null) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  window._jeAccOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');

  // Load currencies
  if (currenciesCache.length === 0) {
    const currRes = await apiFetch('/admin/currencies');
    if (currRes.success) currenciesCache = currRes.data || currRes.currencies || [];
  }
  window._jeCurrOptions = currenciesCache.map(c => `<option value="${c.id}" data-rate="${c.exchange_rate}" ${c.is_default ? 'selected' : ''}>${c.code} - ${c.name_ar}</option>`).join('');

  // Load cost centers
  if (costCentersCache.length === 0) {
    const ccRes = await apiFetch('/cost-centers');
    if (ccRes.success) costCentersCache = ccRes.data || [];
  }
  window._jeCcOptions = costCentersCache.filter(c => c.is_active).map(c => `<option value="${c.id}">${c.code} - ${c.name_ar}</option>`).join('');

  const title = entryId ? `تعديل القيد #${prefillData?.entry_number || ''}` : 'قيد محاسبي جديد';
  showModal(title, `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        ${inputField('jeDate', 'التاريخ *', 'date', prefillData?.entry_date || todayStr())}
        ${inputField('jeRef', 'المرجع', 'text', prefillData?.reference || '')}
        <div>
          <label class="block text-gray-400 text-xs mb-1.5 font-medium">العملة</label>
          <select id="jeCurrency" onchange="updateCurrencyRate()" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500 transition">
            ${window._jeCurrOptions || '<option value="1">د.ع - دينار عراقي</option>'}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${inputField('jeDesc', 'الوصف / البيان', 'text', prefillData?.description || '')}
        <div id="exchangeRateRow" class="hidden">
          <label class="block text-gray-400 text-xs mb-1.5 font-medium">سعر الصرف</label>
          <input type="number" id="jeExchangeRate" value="1" step="0.0001" min="0" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500 transition">
        </div>
      </div>
      <input type="hidden" id="jeEntryId" value="${entryId || ''}">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-gray-400 text-sm font-medium">أسطر القيد</label>
          <button onclick="addJournalLine()" class="text-primary-400 text-xs hover:text-primary-300 transition"><i class="fas fa-plus ml-1"></i> إضافة سطر</button>
        </div>
        <div class="bg-dark-900 rounded-xl p-3">
          <div class="grid grid-cols-12 gap-2 mb-2 text-[10px] text-gray-500 uppercase font-medium">
            <span class="col-span-4">الحساب</span><span class="col-span-2 text-center">مدين</span>
            <span class="col-span-2 text-center">دائن</span><span class="col-span-2">بيان</span><span class="col-span-1">مركز</span><span class="col-span-1"></span>
          </div>
          <div id="journalLines" class="space-y-2"></div>
        </div>
        <div class="flex justify-between items-center mt-3 p-3 bg-dark-900 rounded-xl text-sm">
          <span class="text-gray-400">المجموع:</span>
          <div class="flex items-center gap-4">
            <span>مدين: <strong id="jeTotalDebit" class="text-green-400 font-mono">0</strong></span>
            <span>دائن: <strong id="jeTotalCredit" class="text-red-400 font-mono">0</strong></span>
            <span id="jeBalance" class="font-bold"></span>
            <span id="jeLocalAmount" class="text-gray-500 text-xs hidden"></span>
          </div>
        </div>
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveJournalEntry()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> ${entryId ? 'حفظ التعديلات' : 'حفظ القيد'}</button>`, 'max-w-3xl');
  updateCurrencyRate();
  if (prefillData?.lines?.length > 0) {
    prefillData.lines.forEach(l => {
      addJournalLine();
      const lastLine = document.querySelector('.journal-line:last-child');
      lastLine.querySelector('.je-account').value = l.account_id;
      lastLine.querySelector('.je-debit').value = l.debit > 0 ? l.debit : '';
      lastLine.querySelector('.je-credit').value = l.credit > 0 ? l.credit : '';
      lastLine.querySelector('.je-line-desc').value = l.description || '';
      if (l.cost_center_id && lastLine.querySelector('.je-cc')) lastLine.querySelector('.je-cc').value = l.cost_center_id;
    });
    calcJournalTotals();
  } else { addJournalLine(); addJournalLine(); }
}

function updateCurrencyRate() {
  const select = document.getElementById('jeCurrency');
  const rateRow = document.getElementById('exchangeRateRow');
  const rateInput = document.getElementById('jeExchangeRate');
  if (!select) return;
  const selectedOption = select.options[select.selectedIndex];
  const rate = parseFloat(selectedOption?.dataset?.rate || 1);
  if (rateInput) rateInput.value = rate;
  if (rateRow) {
    rateRow.classList.toggle('hidden', rate === 1);
  }
  calcJournalTotals();
}

async function showAddJournalModal() { await showJournalModal(); }
async function showEditJournalModal(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات القيد', 'error'); return; }
  if (res.data.status === 'posted') { showToast('لا يمكن تعديل قيد مرحّل', 'error'); return; }
  await showJournalModal(id, res.data);
}

function addJournalLine() {
  const container = document.getElementById('journalLines');
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center journal-line';
  div.innerHTML = `
    <select class="je-account col-span-4 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500"><option value="">اختر الحساب</option>${window._jeAccOptions}</select>
    <input type="number" class="je-debit col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="0" oninput="if(this.value>0)this.closest('.journal-line').querySelector('.je-credit').value='';calcJournalTotals()" min="0" step="0.01">
    <input type="number" class="je-credit col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none focus:border-primary-500 text-left" placeholder="0" oninput="if(this.value>0)this.closest('.journal-line').querySelector('.je-debit').value='';calcJournalTotals()" min="0" step="0.01">
    <input type="text" class="je-line-desc col-span-2 bg-dark-800 border border-dark-600 rounded-lg px-2 py-2 text-gray-200 text-xs outline-none" placeholder="بيان">
    <select class="je-cc col-span-1 bg-dark-800 border border-dark-600 rounded-lg px-1 py-2 text-gray-200 text-[10px] outline-none focus:border-primary-500"><option value="">-</option>${window._jeCcOptions || ''}</select>
    <button onclick="this.closest('.journal-line').remove();calcJournalTotals()" class="col-span-1 text-red-400 hover:text-red-300 text-center"><i class="fas fa-times-circle"></i></button>`;
  container.appendChild(div);
}

function calcJournalTotals() {
  let td = 0, tc = 0;
  document.querySelectorAll('.je-debit').forEach(i => td += parseFloat(i.value || 0));
  document.querySelectorAll('.je-credit').forEach(i => tc += parseFloat(i.value || 0));
  const tdEl = document.getElementById('jeTotalDebit'), tcEl = document.getElementById('jeTotalCredit'), balEl = document.getElementById('jeBalance');
  const localEl = document.getElementById('jeLocalAmount');
  if (tdEl) tdEl.textContent = formatNumber(td);
  if (tcEl) tcEl.textContent = formatNumber(tc);
  const diff = Math.abs(td - tc);
  if (balEl) { balEl.textContent = diff < 0.01 ? '✓ متوازن' : `فرق: ${formatNumber(diff)}`; balEl.className = diff < 0.01 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'; }
  // Show local equivalent if not default currency
  const rate = parseFloat(document.getElementById('jeExchangeRate')?.value || 1);
  if (localEl && rate !== 1 && rate > 0) {
    localEl.classList.remove('hidden');
    localEl.textContent = `≈ ${formatNumber(td * rate)} بالعملة المحلية`;
  } else if (localEl) {
    localEl.classList.add('hidden');
  }
}

async function saveJournalEntry() {
  const currencyId = parseInt(document.getElementById('jeCurrency')?.value || 1);
  const exchangeRate = parseFloat(document.getElementById('jeExchangeRate')?.value || 1);
  const lines = [];
  document.querySelectorAll('.journal-line').forEach(row => {
    const acc = row.querySelector('.je-account').value;
    const debit = parseFloat(row.querySelector('.je-debit').value || 0);
    const credit = parseFloat(row.querySelector('.je-credit').value || 0);
    const desc = row.querySelector('.je-line-desc').value;
    if (acc && (debit > 0 || credit > 0)) lines.push({ account_id: parseInt(acc), debit, credit, description: desc, currency_id: currencyId, exchange_rate: exchangeRate, cost_center_id: parseInt(row.querySelector('.je-cc')?.value) || null });
  });
  const entryId = document.getElementById('jeEntryId')?.value;
  const data = { entry_date: document.getElementById('jeDate').value, description: document.getElementById('jeDesc').value, reference: document.getElementById('jeRef').value, lines, created_by: getUser()?.id, currency_id: currencyId, exchange_rate: exchangeRate };
  let res;
  if (entryId) res = await apiFetch(`/journal/${entryId}`, { method: 'PUT', body: JSON.stringify(data) });
  else res = await apiFetch('/journal', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/journal'); } else showToast(res.message, 'error');
}

async function viewJournalEntry(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast(res.message, 'error'); return; }
  const e = res.data;
  showModal(`قيد رقم #${e.entry_number}`, `
    <div id="printableJournalEntry" class="space-y-4">
      <div class="print-only text-center mb-4 pb-3 border-b-2 border-gray-300">
        <h2 class="text-xl font-bold">قيد محاسبي</h2><p>رقم: ${e.entry_number} | تاريخ: ${e.entry_date} | الحالة: ${e.status === 'posted' ? 'مرحّل' : 'مسودة'}</p>
      </div>
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">التاريخ</span><span class="text-white font-medium">${e.entry_date}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">الحالة</span><span class="badge ${e.status==='posted'?'badge-success':'badge-warning'}">${e.status==='posted'?'مرحّل':'مسودة'}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">المرجع</span><span class="text-white">${e.reference||'-'}</span></div>
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs block mb-1">النوع</span><span class="text-white">${e.entry_type==='manual'?'يدوي':e.entry_type==='voucher'?'سند':'تلقائي'}</span></div>
      </div>
      ${e.description ? `<div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">الوصف:</span><p class="text-white mt-1">${e.description}</p></div>` : ''}
      <table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs">
        <th class="px-3 py-2.5 text-right w-8">#</th><th class="px-3 py-2.5 text-right">الحساب</th>
        <th class="px-3 py-2.5 text-right">البيان</th><th class="px-3 py-2.5 text-right">مركز التكلفة</th><th class="px-3 py-2.5 text-left">مدين</th><th class="px-3 py-2.5 text-left">دائن</th>
      </tr></thead><tbody>${e.lines.map((l,i) => `
        <tr class="border-b border-dark-700/50">
          <td class="px-3 py-2.5 text-gray-500 text-xs">${i+1}</td>
          <td class="px-3 py-2.5"><span class="text-primary-400 font-mono text-xs">${l.account_code}</span> <span class="text-gray-300">${l.account_name}</span></td>
          <td class="px-3 py-2.5 text-gray-400 text-xs">${l.description||''}</td>
          <td class="px-3 py-2.5 text-gray-400 text-xs">${l.cost_center_name ? `<span class="text-orange-400">${l.cost_center_code}</span> ${l.cost_center_name}` : '-'}</td>
          <td class="px-3 py-2.5 text-left font-mono ${l.debit>0?'text-green-400':'text-gray-600'}">${l.debit>0?formatNumber(l.debit):''}</td>
          <td class="px-3 py-2.5 text-left font-mono ${l.credit>0?'text-red-400':'text-gray-600'}">${l.credit>0?formatNumber(l.credit):''}</td>
        </tr>`).join('')}
        <tr class="bg-primary-900/20 font-bold text-white">
          <td class="px-3 py-3" colspan="4">المجموع</td>
          <td class="px-3 py-3 text-left font-mono text-green-400">${formatNumber(e.total_debit)}</td>
          <td class="px-3 py-3 text-left font-mono text-red-400">${formatNumber(e.total_credit)}</td>
        </tr></tbody></table>
      <div class="print-only mt-8 grid grid-cols-3 gap-4 text-center text-sm"><div><p class="border-t border-black pt-2">المحاسب</p></div><div><p class="border-t border-black pt-2">المدقق</p></div><div><p class="border-t border-black pt-2">المدير المالي</p></div></div>
    </div>`,
    `${e.status==='draft'?`<button onclick="closeModal();showEditJournalModal(${e.id})" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm"><i class="fas fa-edit ml-1"></i> تعديل</button>`:''}
     <button onclick="closeModal();copyJournalEntry(${e.id})" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm" title="نسخ القيد"><i class="fas fa-copy ml-1"></i> نسخ</button>
     ${e.status==='posted'?`<button onclick="closeModal();reverseJournalEntry(${e.id})" class="px-5 py-2.5 rounded-xl bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 text-sm" title="عكس القيد"><i class="fas fa-undo ml-1"></i> عكس</button>`:''}
     <button onclick="window.print()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
     <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`, 'max-w-3xl');
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

// ===== Journal: Copy, Reverse, Templates =====
async function copyJournalEntry(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات القيد', 'error'); return; }
  const entry = res.data;
  // Create a copy with today's date
  const copyData = {
    entry_date: todayStr(),
    description: 'نسخة من: ' + (entry.description || 'قيد #' + entry.entry_number),
    reference: entry.reference || '',
    lines: entry.lines.map(l => ({
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description
    }))
  };
  await showJournalModal(null, copyData);
  showToast('تم نسخ القيد - عدّل وأحفظ', 'info');
}

async function reverseJournalEntry(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات القيد', 'error'); return; }
  const entry = res.data;
  showConfirm('عكس القيد', `سيتم إنشاء قيد عكسي للقيد #${entry.entry_number}. هل تريد المتابعة؟`, async () => {
    const reverseData = {
      entry_date: todayStr(),
      description: 'عكس قيد رقم ' + entry.entry_number + (entry.description ? ' - ' + entry.description : ''),
      reference: 'REV-' + entry.entry_number,
      lines: entry.lines.map(l => ({
        account_id: l.account_id,
        debit: l.credit,
        credit: l.debit,
        description: 'عكس: ' + (l.description || '')
      })),
      created_by: getUser()?.id
    };
    const saveRes = await apiFetch('/journal', { method: 'POST', body: JSON.stringify(reverseData) });
    if (saveRes.success) {
      showToast('تم إنشاء القيد العكسي بنجاح');
      addNotification('قيد عكسي', `تم عكس القيد رقم ${entry.entry_number}`, 'info');
      navigate('/journal');
    } else {
      showToast(saveRes.message, 'error');
    }
  });
}

// Journal Entry Templates
const journalTemplates = [
  {
    name: 'مصاريف رواتب',
    icon: 'fa-users',
    description: 'قيد صرف رواتب الموظفين',
    data: { description: 'صرف رواتب شهر', reference: 'SAL', lines: [
      { debit: 0, credit: 0, description: 'مصروف رواتب - مدين' },
      { debit: 0, credit: 0, description: 'الصندوق/البنك - دائن' }
    ]}
  },
  {
    name: 'إيجار مدفوع',
    icon: 'fa-building',
    description: 'قيد دفع إيجار',
    data: { description: 'دفع إيجار', reference: 'RENT', lines: [
      { debit: 0, credit: 0, description: 'مصروف إيجار' },
      { debit: 0, credit: 0, description: 'الصندوق/البنك' }
    ]}
  },
  {
    name: 'مبيعات نقدية',
    icon: 'fa-cash-register',
    description: 'قيد مبيعات نقدية',
    data: { description: 'مبيعات نقدية', reference: 'SALE', lines: [
      { debit: 0, credit: 0, description: 'الصندوق - مدين' },
      { debit: 0, credit: 0, description: 'إيرادات مبيعات - دائن' }
    ]}
  },
  {
    name: 'شراء بضاعة',
    icon: 'fa-boxes-stacked',
    description: 'قيد شراء بضاعة',
    data: { description: 'شراء بضاعة', reference: 'PUR', lines: [
      { debit: 0, credit: 0, description: 'مشتريات - مدين' },
      { debit: 0, credit: 0, description: 'الصندوق/الموردين - دائن' }
    ]}
  },
  {
    name: 'مصاريف عامة',
    icon: 'fa-receipt',
    description: 'قيد مصاريف عامة',
    data: { description: 'مصاريف عامة', reference: 'EXP', lines: [
      { debit: 0, credit: 0, description: 'مصروف - مدين' },
      { debit: 0, credit: 0, description: 'الصندوق - دائن' }
    ]}
  }
];

function showJournalTemplates() {
  const content = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${journalTemplates.map((t, i) => `
        <button onclick="closeModal();applyJournalTemplate(${i})" class="text-right p-4 bg-dark-900 rounded-xl border border-dark-700 hover:border-primary-500/50 hover:bg-dark-800 transition group">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition">
              <i class="fas ${t.icon} text-primary-400"></i>
            </div>
            <div>
              <h4 class="text-white font-bold text-sm">${t.name}</h4>
              <p class="text-gray-500 text-xs">${t.description}</p>
            </div>
          </div>
        </button>
      `).join('')}
    </div>`;
  showModal('قوالب القيود الجاهزة', content, '', 'max-w-2xl');
}

async function applyJournalTemplate(index) {
  const template = journalTemplates[index];
  if (!template) return;
  await showJournalModal(null, { ...template.data, entry_date: todayStr() });
  showToast(`تم تحميل قالب "${template.name}" - عدّل المبالغ والحسابات`, 'info');
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
      <div><h2 class="text-2xl font-bold text-white"><i class="fas ${typeIcon} ml-2 text-${typeColor}-400"></i>سندات ${typeLabel}</h2><p class="text-gray-500 text-sm mt-1">${res.total} سند</p></div>
      <div class="flex gap-2">
        <button onclick="showAddVoucherModal('${type}')" class="bg-${typeColor}-600 hover:bg-${typeColor}-700 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"><i class="fas fa-plus"></i> سند ${typeLabel === 'القبض' ? 'قبض' : 'صرف'} جديد</button>
        <button onclick="showVoucherTemplates('${type}')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"><i class="fas fa-file-code"></i> قوالب</button>
      </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="relative"><i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="vSearchInput" placeholder="بحث بالرقم أو المستفيد..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none focus:border-primary-500" onkeyup="filterVoucherTable()"></div>
        <select id="vStatusFilter" onchange="filterVoucherTable()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مرحّل</option></select>
        <input type="date" id="vDateFilter" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none" onchange="filterVoucherTable()">
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرقم</th><th class="px-4 py-3 text-right">التاريخ</th><th class="px-4 py-3 text-right">الحساب</th><th class="px-4 py-3 text-right">المستفيد</th>
          <th class="px-4 py-3 text-right">الدفع</th><th class="px-4 py-3 text-left">المبلغ</th><th class="px-4 py-3 text-center">الحالة</th><th class="px-4 py-3 text-center">إجراءات</th>
        </tr></thead><tbody id="voucherTableBody">${res.data.map(v => `
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
                <button onclick="showEditVoucherModal(${v.id},'${type}')" class="text-primary-400 hover:text-primary-300 p-1" title="تعديل"><i class="fas fa-edit"></i></button>
                <button onclick="copyVoucher(${v.id},'${type}')" class="text-cyan-400 hover:text-cyan-300 p-1" title="نسخ"><i class="fas fa-copy"></i></button>
                <button onclick="deleteVoucher(${v.id},'${type}')" class="text-red-400 hover:text-red-300 p-1" title="حذف"><i class="fas fa-trash"></i></button>
              `:`<button onclick="viewVoucher(${v.id})" class="text-primary-400 hover:text-primary-300 p-1" title="عرض"><i class="fas fa-eye"></i></button>
                 <button onclick="copyVoucher(${v.id},'${type}')" class="text-cyan-400 hover:text-cyan-300 p-1" title="نسخ"><i class="fas fa-copy"></i></button>
                 <button onclick="reverseVoucher(${v.id},'${type}')" class="text-yellow-400 hover:text-yellow-300 p-1" title="عكس"><i class="fas fa-undo"></i></button>
                 <button onclick="exportVoucherPDF(${v.id})" class="text-red-400 hover:text-red-300 p-1" title="PDF"><i class="fas fa-file-pdf"></i></button>`}
            </td></tr>`).join('')}</tbody></table>
      </div>
      ${res.data.length === 0 ? emptyState('لا توجد سندات بعد', typeIcon) : ''}
    </div>`;
}

function filterVoucherTable() {
  const q = (document.getElementById('vSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('vStatusFilter')?.value || '';
  const date = document.getElementById('vDateFilter')?.value || '';
  document.querySelectorAll('#voucherTableBody tr').forEach(r => {
    const num = r.dataset.num || '', ben = (r.dataset.ben || '').toLowerCase(), st = r.dataset.status || '', dt = r.dataset.date || '';
    r.style.display = (!q || num.includes(q) || ben.includes(q)) && (!status || st === status) && (!date || dt === date) ? '' : 'none';
  });
}

async function showVoucherForm(type, editData = null) {
  const accRes = await apiFetch('/accounts/leaf/all');
  const accounts = accRes.success ? accRes.data : [];
  window._vAccOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name_ar}</option>`).join('');
  
  // Load cost centers
  if (costCentersCache.length === 0) {
    const ccRes = await apiFetch('/cost-centers');
    if (ccRes.success) costCentersCache = ccRes.data || [];
  }
  const ccOpts = costCentersCache.filter(c => c.is_active).map(c => ({value: c.id, text: `${c.code} - ${c.name_ar}`}));

  const label = type === 'receipt' ? 'قبض' : 'صرف';
  const isEdit = !!editData;
  const title = isEdit ? `تعديل سند ${label} #${editData.voucher_number}` : `سند ${label} جديد`;

  showModal(title, `
    <div class="space-y-4">
      <input type="hidden" id="vEditId" value="${editData?.id || ''}">
      <div class="grid grid-cols-2 gap-4">
        ${inputField('vDate', 'التاريخ *', 'date', editData?.voucher_date || todayStr())}
        ${inputField('vAmount', 'المبلغ الإجمالي *', 'number', editData?.amount || '', 'step="0.01" min="0"')}
      </div>
      ${selectField('vAccount', type==='receipt'?'الحساب المدين (الصندوق/البنك) *':'الحساب الدائن (الصندوق/البنك) *',
        [{value:'',text:'اختر الحساب'}, ...accounts.map(a => ({value: a.id, text: `${a.code} - ${a.name_ar}`}))], editData?.account_id || '')}
      <div class="grid grid-cols-2 gap-4">
        ${inputField('vBeneficiary', 'المستفيد / الجهة', 'text', editData?.beneficiary || '')}
        ${selectField('vPayment', 'طريقة الدفع', [{value:'cash',text:'نقداً'},{value:'check',text:'شيك'},{value:'transfer',text:'تحويل بنكي'}], editData?.payment_method || 'cash')}
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${inputField('vDesc', 'الوصف / البيان', 'text', editData?.description || '')}
        ${selectField('vCostCenter', 'مركز التكلفة', [{value:'',text:'-- بدون مركز --'}, ...ccOpts], editData?.cost_center_id || '')}
      </div>
      <div id="checkDetails" class="${editData?.payment_method === 'check' ? '' : 'hidden'} grid grid-cols-3 gap-3">
        ${inputField('vCheckNum', 'رقم الشيك', 'text', editData?.check_number || '')}
        ${inputField('vCheckDate', 'تاريخ الشيك', 'date', editData?.check_date || '')}
        ${inputField('vBankName', 'اسم البنك', 'text', editData?.bank_name || '')}
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
     <button onclick="saveVoucher('${type}')" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> ${isEdit ? 'حفظ التعديلات' : 'حفظ'}</button>`, 'max-w-2xl');

  document.getElementById('vPayment').addEventListener('change', function() {
    document.getElementById('checkDetails').classList.toggle('hidden', this.value !== 'check');
  });

  if (editData?.details?.length > 0) {
    editData.details.forEach(d => {
      addVoucherLine();
      const lastLine = document.querySelector('.voucher-line:last-child');
      lastLine.querySelector('.vl-account').value = d.account_id;
      lastLine.querySelector('.vl-amount').value = d.amount;
      lastLine.querySelector('.vl-desc').value = d.description || '';
    });
  } else {
    addVoucherLine();
  }
}

async function showAddVoucherModal(type) { await showVoucherForm(type); }

async function showEditVoucherModal(id, type) {
  const res = await apiFetch(`/vouchers/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات السند', 'error'); return; }
  if (res.data.status === 'posted') { showToast('لا يمكن تعديل سند مرحّل', 'error'); return; }
  await showVoucherForm(type, res.data);
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

  const editId = document.getElementById('vEditId')?.value;
  const data = {
    voucher_type: type, voucher_date: document.getElementById('vDate').value,
    account_id: parseInt(accountId), amount, description: document.getElementById('vDesc').value,
    beneficiary: document.getElementById('vBeneficiary').value, payment_method: document.getElementById('vPayment').value,
    check_number: document.getElementById('vCheckNum')?.value || null, check_date: document.getElementById('vCheckDate')?.value || null,
    bank_name: document.getElementById('vBankName')?.value || null, details, created_by: getUser()?.id,
    cost_center_id: parseInt(document.getElementById('vCostCenter')?.value) || null
  };

  let res;
  if (editId) res = await apiFetch(`/vouchers/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
  else res = await apiFetch('/vouchers', { method: 'POST', body: JSON.stringify(data) });
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
      <div class="print-only text-center mb-6 pb-3 border-b-2 border-gray-300">
        <h2 class="text-xl font-bold">${typeLabel}</h2><p>رقم: ${v.voucher_number} | تاريخ: ${v.voucher_date}</p>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">المبلغ</span><strong class="text-${typeColor}-400 text-xl font-mono">${formatNumber(v.amount)}</strong></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">التاريخ</span><span class="text-white">${v.voucher_date}</span></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">الحالة</span><span class="badge ${v.status==='posted'?'badge-success':'badge-warning'}">${v.status==='posted'?'مرحّل':'مسودة'}</span></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">طريقة الدفع</span><span class="text-white">${v.payment_method==='cash'?'نقداً':v.payment_method==='check'?'شيك':'تحويل'}</span></div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">الحساب:</span><br><span class="text-primary-400 font-mono">${v.account_code}</span> ${v.account_name}</div>
        ${v.beneficiary ? `<div class="bg-dark-900 rounded-xl p-3"><span class="text-gray-500 text-xs">المستفيد:</span><br><span class="text-white">${v.beneficiary}</span></div>` : ''}
      </div>
      ${v.description ? `<div class="bg-dark-900 rounded-xl p-3 mb-4 text-sm"><span class="text-gray-500 text-xs">الوصف:</span><br><span class="text-white">${v.description}</span></div>` : ''}
      ${v.details && v.details.length > 0 ? `<table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs">
        <th class="px-3 py-2 text-right">#</th><th class="px-3 py-2 text-right">الحساب</th><th class="px-3 py-2 text-right">البيان</th><th class="px-3 py-2 text-left">المبلغ</th>
      </tr></thead><tbody>${v.details.map((d,i) => `<tr class="border-b border-dark-700/50">
        <td class="px-3 py-2 text-gray-500 text-xs">${i+1}</td><td class="px-3 py-2"><span class="text-primary-400 font-mono text-xs">${d.account_code}</span> ${d.account_name}</td>
        <td class="px-3 py-2 text-gray-400 text-xs">${d.description||''}</td><td class="px-3 py-2 text-left font-mono font-bold">${formatNumber(d.amount)}</td>
      </tr>`).join('')}<tr class="bg-dark-900 font-bold"><td class="px-3 py-2" colspan="3">المجموع</td><td class="px-3 py-2 text-left font-mono text-${typeColor}-400">${formatNumber(v.amount)}</td></tr></tbody></table>` : ''}
      <div class="print-only mt-10 grid grid-cols-3 gap-4 text-center text-sm"><div><p class="border-t border-black pt-2">المحاسب</p></div><div><p class="border-t border-black pt-2">المدقق</p></div><div><p class="border-t border-black pt-2">المدير المالي</p></div></div>
    </div>`,
    `<button onclick="window.print()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
     <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`, 'max-w-2xl');
}

function printVoucher(id) { viewVoucher(id); setTimeout(() => window.print(), 500); }

async function copyVoucher(id, type) {
  const res = await apiFetch(`/vouchers/${id}`);
  if (!res.success) { showToast('خطأ في جلب بيانات السند', 'error'); return; }
  const v = res.data;
  const copyData = {
    voucher_date: todayStr(),
    account_id: v.account_id,
    amount: v.amount,
    description: 'نسخة من سند #' + v.voucher_number + ' - ' + (v.description || ''),
    beneficiary: v.beneficiary,
    payment_method: v.payment_method,
    check_number: '',
    check_date: '',
    bank_name: v.bank_name,
    details: v.details || []
  };
  await showVoucherForm(type, copyData);
  showToast('تم نسخ السند - عدّل وأحفظ', 'info');
}

async function reverseVoucher(id, type) {
  const res = await apiFetch(`/vouchers/${id}`);
  if (!res.success) { showToast('خطأ في جلب البيانات', 'error'); return; }
  const v = res.data;
  const reverseType = type === 'receipt' ? 'payment' : 'receipt';
  const typeLabel = reverseType === 'receipt' ? 'قبض' : 'صرف';
  showConfirm('عكس السند', `سيتم إنشاء سند ${typeLabel} عكسي للسند #${v.voucher_number}. هل تريد المتابعة؟`, async () => {
    const reverseData = {
      voucher_type: reverseType,
      voucher_date: todayStr(),
      account_id: v.account_id,
      amount: v.amount,
      description: 'عكس سند ' + (type === 'receipt' ? 'قبض' : 'صرف') + ' رقم ' + v.voucher_number,
      beneficiary: v.beneficiary,
      payment_method: v.payment_method,
      details: v.details || [],
      created_by: getUser()?.id
    };
    const saveRes = await apiFetch('/vouchers', { method: 'POST', body: JSON.stringify(reverseData) });
    if (saveRes.success) {
      showToast('تم إنشاء السند العكسي بنجاح');
      addNotification('سند عكسي', `تم عكس السند رقم ${v.voucher_number}`, 'info');
      navigate(`/vouchers/${reverseType}`);
    } else {
      showToast(saveRes.message, 'error');
    }
  });
}

// قوالب السندات
const voucherTemplates = [
  { name: 'إيداع نقدي', icon: 'fa-piggy-bank', type: 'receipt', data: { description: 'إيداع نقدي', payment_method: 'cash' } },
  { name: 'تحصيل شيك', icon: 'fa-money-check', type: 'receipt', data: { description: 'تحصيل شيك', payment_method: 'check' } },
  { name: 'تحويل بنكي وارد', icon: 'fa-university', type: 'receipt', data: { description: 'تحويل بنكي وارد', payment_method: 'transfer' } },
  { name: 'صرف رواتب', icon: 'fa-users', type: 'payment', data: { description: 'صرف رواتب الموظفين', payment_method: 'transfer' } },
  { name: 'دفع فاتورة', icon: 'fa-file-invoice', type: 'payment', data: { description: 'دفع فاتورة', payment_method: 'cash' } },
  { name: 'سحب نقدي', icon: 'fa-hand-holding-usd', type: 'payment', data: { description: 'سحب نقدي', payment_method: 'cash' } },
];

function showVoucherTemplates(type) {
  const filtered = voucherTemplates.filter(t => t.type === type);
  const content = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${filtered.map((t, i) => `
        <button onclick="closeModal();applyVoucherTemplate('${type}', ${JSON.stringify(t.data).replace(/"/g, '&quot;')})" class="text-right p-4 bg-dark-900 rounded-xl border border-dark-700 hover:border-primary-500/50 hover:bg-dark-800 transition group">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition">
              <i class="fas ${t.icon} text-primary-400"></i>
            </div>
            <div><h4 class="text-white font-bold text-sm">${t.name}</h4><p class="text-gray-500 text-xs">${t.data.description}</p></div>
          </div>
        </button>
      `).join('')}
    </div>`;
  showModal('قوالب السندات الجاهزة', content, '', 'max-w-2xl');
}

async function applyVoucherTemplate(type, data) {
  await showVoucherForm(type, { ...data, voucher_date: todayStr() });
  showToast(`تم تحميل القالب - أكمل البيانات`, 'info');
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
        <button onclick="exportTrialBalancePDF()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-pdf ml-1 text-red-400"></i> PDF</button>
        <button onclick="exportTableExcel('trialBalanceTable','ميزان_المراجعة','ميزان المراجعة')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-excel ml-1 text-green-400"></i> Excel</button>
        <button onclick="exportTableCSV('trialBalanceTable','ميزان_المراجعة')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-csv ml-1"></i> CSV</button>
        <button onclick="printTrialBalance()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label class="text-gray-400 text-xs mb-1 block">من تاريخ</label><input type="date" id="tbFromDate" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none"></div>
        <div><label class="text-gray-400 text-xs mb-1 block">إلى تاريخ</label><input type="date" id="tbDate" value="${todayStr()}" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none"></div>
        <div><label class="text-gray-400 text-xs mb-1 block">مستوى العرض</label>
          <select id="tbLevel" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 w-full text-sm text-gray-200 outline-none">
            <option value="0">كل المستويات</option><option value="1">المستوى 1</option><option value="2">المستوى 2</option><option value="3">المستوى 3</option>
          </select></div>
        <div class="flex items-end"><button onclick="loadTrialBalance()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button></div>
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
        <table class="w-full text-sm" id="trialBalanceTable"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
          <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">الحساب</th><th class="px-4 py-3 text-left">حركة مدين</th><th class="px-4 py-3 text-left">حركة دائن</th><th class="px-4 py-3 text-left">رصيد مدين</th><th class="px-4 py-3 text-left">رصيد دائن</th>
        </tr></thead><tbody>${data.map(a => `
          <tr class="table-row border-b border-dark-700/50 ${a.is_parent?'bg-dark-900/40':''}">
            <td class="px-4 py-2.5 font-mono text-primary-400 text-xs">${a.code}</td>
            <td class="px-4 py-2.5 ${a.is_parent?'font-bold text-white':'text-gray-300'} text-sm" style="padding-right:${(a.level-1)*16+16}px">${a.name_ar}</td>
            <td class="px-4 py-2.5 text-left font-mono text-xs">${a.total_debit>0?formatNumber(a.total_debit):''}</td>
            <td class="px-4 py-2.5 text-left font-mono text-xs">${a.total_credit>0?formatNumber(a.total_credit):''}</td>
            <td class="px-4 py-2.5 text-left font-mono text-xs text-green-400">${a.debit_balance>0?formatNumber(a.debit_balance):''}</td>
            <td class="px-4 py-2.5 text-left font-mono text-xs text-red-400">${a.credit_balance>0?formatNumber(a.credit_balance):''}</td>
          </tr>`).join('')}
          <tr class="bg-primary-900/30 font-bold text-white text-sm"><td class="px-4 py-3" colspan="2">المجموع</td>
            <td class="px-4 py-3 text-left font-mono">${formatNumber(sumDebit)}</td><td class="px-4 py-3 text-left font-mono">${formatNumber(sumCredit)}</td>
            <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(sumDbBal)}</td><td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(sumCrBal)}</td>
          </tr></tbody></table>
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
        <div><label class="block text-gray-400 text-xs mb-1.5 font-medium">الحساب *</label><select id="stmtAccount" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 w-full text-gray-200 text-sm outline-none focus:border-primary-500"><option value="">اختر الحساب</option>${accOpts}</select></div>
        ${inputField('stmtFrom', 'من تاريخ', 'date')} ${inputField('stmtTo', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end gap-2">
          <button onclick="loadAccountStatement()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm flex-1 transition">عرض</button>
          <button onclick="exportTableExcel('stmtTable','كشف_حساب','كشف حساب')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2.5 rounded-xl text-sm" title="Excel"><i class="fas fa-file-excel text-green-400"></i></button>
          <button onclick="exportTableCSV('stmtTable','كشف_حساب')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2.5 rounded-xl text-sm" title="CSV"><i class="fas fa-file-csv"></i></button>
          <button onclick="exportAccountStatementPDF()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2.5 rounded-xl text-sm" title="PDF"><i class="fas fa-file-pdf text-red-400"></i></button>
        </div>
      </div>
    </div><div id="stmtResult"></div>`;
}

async function loadAccountStatement() {
  const accId = document.getElementById('stmtAccount').value;
  if (!accId) { showToast('اختر حساباً', 'error'); return; }
  const from = document.getElementById('stmtFrom').value, to = document.getElementById('stmtTo').value;
  let url = `/reports/account-statement/${accId}?`;
  if (from) url += `from=${from}&`; if (to) url += `to=${to}`;
  const resultEl = document.getElementById('stmtResult');
  resultEl.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';
  const res = await apiFetch(url);
  if (!res.success) { showToast(res.message, 'error'); resultEl.innerHTML = ''; return; }
  const d = res.data;
  resultEl.innerHTML = `
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div class="p-5 border-b border-dark-700 flex justify-between items-center">
        <div><span class="text-white font-bold text-lg">${d.account.name_ar}</span><span class="text-gray-500 text-sm mr-3">(${d.account.code})</span></div>
        <button onclick="window.print()" class="text-gray-400 hover:text-white text-sm transition"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
      <div class="grid grid-cols-4 gap-3 p-4">
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block">الرصيد الافتتاحي</span><strong class="text-white font-mono">${formatNumber(d.opening_balance)}</strong></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block">إجمالي المدين</span><strong class="text-green-400 font-mono">${formatNumber(d.total_debit)}</strong></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block">إجمالي الدائن</span><strong class="text-red-400 font-mono">${formatNumber(d.total_credit)}</strong></div>
        <div class="bg-primary-900/30 rounded-xl p-3 text-center border border-primary-700"><span class="text-gray-400 text-xs block">الرصيد الختامي</span><strong class="text-primary-400 font-mono text-lg">${formatNumber(d.closing_balance)}</strong></div>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-sm" id="stmtTable"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
        <th class="px-4 py-3 text-right">التاريخ</th><th class="px-4 py-3 text-right">رقم القيد</th><th class="px-4 py-3 text-right">البيان</th>
        <th class="px-4 py-3 text-left">مدين</th><th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-left">الرصيد</th>
      </tr></thead><tbody>
        <tr class="bg-dark-900/50 border-b border-dark-700 text-gray-400 text-sm"><td class="px-4 py-2.5" colspan="5">رصيد مرحّل</td><td class="px-4 py-2.5 text-left font-mono font-bold text-white">${formatNumber(d.opening_balance)}</td></tr>
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
      </tbody></table></div>
      ${d.lines.length === 0 ? emptyState('لا توجد حركات على هذا الحساب', 'fa-file-invoice-dollar') : ''}
    </div>`;
}

// -- قائمة الدخل --
async function renderIncomeStatement(el) {
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-chart-line ml-2 text-green-400"></i>قائمة الدخل</h2>
      <div class="flex gap-2">
        <button onclick="exportIncomeStatementPDF()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-pdf ml-1 text-red-400"></i> PDF</button>
        <button onclick="exportTableExcel('incomeTable','قائمة_الدخل','قائمة الدخل')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-excel ml-1 text-green-400"></i> Excel</button>
        <button onclick="exportTableCSV('incomeTable','قائمة_الدخل')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-csv"></i></button>
        <button onclick="printIncomeStatement()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${inputField('incFrom', 'من تاريخ', 'date')} ${inputField('incTo', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end"><button onclick="loadIncomeStatement()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button></div>
      </div>
    </div><div id="incomeResult"></div>`;
  loadIncomeStatement();
}

async function loadIncomeStatement() {
  const from = document.getElementById('incFrom')?.value || '', to = document.getElementById('incTo')?.value || '';
  let url = '/reports/income-statement?';
  if (from) url += `from=${from}&`; if (to) url += `to=${to}`;
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
        <div class="flex justify-between py-3 font-bold text-green-400 border-t-2 border-green-800/50 mt-3 text-lg"><span>إجمالي الإيرادات</span><span class="font-mono">${formatNumber(d.totalRevenue)}</span></div>
      </div>
      <div class="p-5 border-b border-dark-700">
        <h3 class="text-red-400 font-bold text-lg mb-4"><i class="fas fa-arrow-trend-up ml-2"></i>المصروفات</h3>
        ${d.expenses.length === 0 ? '<p class="text-gray-500 text-sm">لا توجد مصروفات</p>' :
        d.expenses.map(e => `<div class="flex justify-between py-2.5 border-b border-dark-700/30 text-sm hover:bg-dark-700/30 px-2 rounded transition">
          <span class="text-gray-300"><span class="text-primary-400 font-mono text-xs ml-2">${e.code}</span>${e.name_ar}</span>
          <span class="text-red-400 font-mono font-bold">${formatNumber(e.balance)}</span>
        </div>`).join('')}
        <div class="flex justify-between py-3 font-bold text-red-400 border-t-2 border-red-800/50 mt-3 text-lg"><span>إجمالي المصروفات</span><span class="font-mono">${formatNumber(d.totalExpenses)}</span></div>
      </div>
      <div class="p-5 ${d.netIncome>=0?'bg-green-900/20':'bg-red-900/20'}">
        <div class="flex justify-between items-center text-xl font-bold">
          <span class="text-white flex items-center gap-2"><i class="fas ${d.netIncome>=0?'fa-trending-up text-green-400':'fa-trending-down text-red-400'}"></i>${d.netIncome>=0?'صافي الربح':'صافي الخسارة'}</span>
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
      <div class="flex gap-2"><button onclick="exportBalanceSheetPDF()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-pdf ml-1 text-red-400"></i> PDF</button><button onclick="exportBalanceSheetExcel()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-excel ml-1 text-green-400"></i> Excel</button><button onclick="exportBalanceSheetCSV()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-csv ml-1"></i> CSV</button><button onclick="printBalanceSheet()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-print ml-1"></i> طباعة</button></div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${inputField('bsDate', 'إلى تاريخ', 'date', todayStr())}
        <div class="flex items-end"><button onclick="loadBalanceSheet()" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl text-sm w-full transition">عرض</button></div>
      </div>
    </div><div id="bsResult"></div>`;
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
          d.assets.map(a => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${a.name_ar}</span><span class="font-mono text-white">${formatNumber(a.balance)}</span></div>`).join('')}
          <div class="flex justify-between py-3 font-bold text-blue-400 border-t-2 border-blue-800/50 mt-3 text-lg"><span>إجمالي الأصول</span><span class="font-mono">${formatNumber(d.totalAssets)}</span></div>
        </div>
      </div>
      <div class="space-y-6">
        <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-dark-700"><h3 class="text-red-400 font-bold text-lg"><i class="fas fa-file-invoice-dollar ml-2"></i>الخصوم</h3></div>
          <div class="p-5">
            ${d.liabilities.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد خصوم</p>' :
            d.liabilities.map(l => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${l.name_ar}</span><span class="font-mono text-white">${formatNumber(Math.abs(l.balance))}</span></div>`).join('')}
            <div class="flex justify-between py-3 font-bold text-red-400 border-t border-dark-600 mt-2"><span>إجمالي الخصوم</span><span class="font-mono">${formatNumber(d.totalLiabilities)}</span></div>
          </div>
        </div>
        <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-dark-700"><h3 class="text-yellow-400 font-bold text-lg"><i class="fas fa-landmark ml-2"></i>حقوق الملكية</h3></div>
          <div class="p-5">
            ${d.equity.length === 0 ? '<p class="text-gray-500 text-sm text-center py-3">لا توجد بيانات</p>' :
            d.equity.map(e => `<div class="flex justify-between py-2 border-b border-dark-700/30 text-sm"><span class="text-gray-300">${e.name_ar}</span><span class="font-mono text-white">${formatNumber(Math.abs(e.balance))}</span></div>`).join('')}
            <div class="flex justify-between py-3 font-bold text-yellow-400 border-t border-dark-600 mt-2"><span>إجمالي حقوق الملكية</span><span class="font-mono">${formatNumber(d.totalEquity)}</span></div>
          </div>
        </div>
        <div class="bg-primary-900/30 border border-primary-700 rounded-2xl p-5">
          <div class="flex justify-between font-bold text-lg"><span class="text-white">الخصوم + حقوق الملكية</span><span class="text-primary-400 font-mono text-xl">${formatNumber(d.totalLiabilitiesAndEquity)}</span></div>
          ${Math.abs(d.totalAssets - d.totalLiabilitiesAndEquity) < 0.01 ?
            '<p class="text-green-400 text-xs mt-2"><i class="fas fa-check-circle ml-1"></i> الميزانية متوازنة</p>' :
            '<p class="text-red-400 text-xs mt-2"><i class="fas fa-exclamation-triangle ml-1"></i> الميزانية غير متوازنة</p>'}
        </div>
      </div>
    </div>`;
}

// ╔══════════════════════════════════════════════════╗
// ║           COST CENTERS (مراكز التكلفة)             ║
// ╚══════════════════════════════════════════════════╝
let ccViewMode = 'list'; // 'list' or 'report'

async function renderCostCenters(el) {
  const res = await apiFetch('/cost-centers');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const centers = res.data;
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white"><i class="fas fa-bullseye ml-2 text-orange-400"></i>مراكز التكلفة</h2><p class="text-gray-500 text-sm mt-1">${centers.length} مركز</p></div>
      <div class="flex gap-2">
        <button onclick="ccViewMode='report';renderCostCenterReport(document.getElementById('mainContent'))" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"><i class="fas fa-chart-bar"></i> تقرير الأرصدة</button>
        <button onclick="showAddCostCenterModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm transition"><i class="fas fa-plus ml-1"></i> مركز تكلفة جديد</button>
      </div>
    </div>
    <!-- بطاقات إحصائية -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 text-center">
        <div class="text-3xl font-bold text-orange-400 mb-1">${centers.length}</div>
        <div class="text-gray-500 text-sm">إجمالي المراكز</div>
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 text-center">
        <div class="text-3xl font-bold text-green-400 mb-1">${centers.filter(c => c.is_active).length}</div>
        <div class="text-gray-500 text-sm">مراكز نشطة</div>
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 text-center">
        <div class="text-3xl font-bold text-red-400 mb-1">${centers.filter(c => !c.is_active).length}</div>
        <div class="text-gray-500 text-sm">مراكز معطلة</div>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      ${centers.length === 0 ? emptyState('لا توجد مراكز تكلفة بعد', 'fa-bullseye') : `
      <table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
        <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">اسم المركز</th><th class="px-4 py-3 text-right">الاسم الإنجليزي</th>
        <th class="px-4 py-3 text-center">الحالة</th><th class="px-4 py-3 text-center">إجراءات</th>
      </tr></thead><tbody>${centers.map(cc => `<tr class="table-row border-b border-dark-700/50 cursor-pointer" onclick="showCostCenterTransactions(${cc.id})">
        <td class="px-4 py-3 font-mono text-primary-400 text-sm">${cc.code}</td>
        <td class="px-4 py-3 text-gray-200">${cc.name_ar}</td>
        <td class="px-4 py-3 text-gray-400 text-sm">${cc.name_en || '-'}</td>
        <td class="px-4 py-3 text-center"><span class="badge ${cc.is_active?'badge-success':'badge-danger'}">${cc.is_active?'نشط':'معطل'}</span></td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <button onclick="showCostCenterTransactions(${cc.id})" class="text-yellow-400 hover:text-yellow-300 p-1" title="عرض الحركات"><i class="fas fa-list text-xs"></i></button>
          <button onclick="showEditCostCenterModal(${cc.id},'${cc.code}','${cc.name_ar}','${cc.name_en||''}',${cc.is_active})" class="text-primary-400 hover:text-primary-300 p-1"><i class="fas fa-edit text-xs"></i></button>
          <button onclick="deleteCostCenter(${cc.id})" class="text-red-400 hover:text-red-300 p-1"><i class="fas fa-trash text-xs"></i></button>
        </td></tr>`).join('')}</tbody></table>`}
    </div>`;
}

// تقرير أرصدة مراكز التكلفة
async function renderCostCenterReport(el) {
  el.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';
  const res = await apiFetch('/cost-centers/report');
  if (!res.success) { el.innerHTML = '<p class="text-red-400">خطأ</p>'; return; }
  const data = res.data;
  const totalDebit = data.reduce((s, c) => s + (c.total_debit || 0), 0);
  const totalCredit = data.reduce((s, c) => s + (c.total_credit || 0), 0);
  
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white"><i class="fas fa-chart-bar ml-2 text-orange-400"></i>تقرير أرصدة مراكز التكلفة</h2></div>
      <div class="flex gap-2">
        <button onclick="exportTableExcel('ccReportTable','تقرير_مراكز_التكلفة','مراكز التكلفة')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-excel ml-1 text-green-400"></i> Excel</button>
        <button onclick="exportCostCenterReportPDF()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-2 rounded-xl text-sm"><i class="fas fa-file-pdf ml-1 text-red-400"></i> PDF</button>
        <button onclick="navigate('/cost-centers')" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2 rounded-xl text-sm"><i class="fas fa-arrow-right ml-1"></i> العودة</button>
      </div>
    </div>
    <!-- بطاقات إجمالية -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 text-center">
        <div class="text-2xl font-bold text-orange-400 mb-1">${data.length}</div>
        <div class="text-gray-500 text-xs">المراكز النشطة</div>
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 text-center">
        <div class="text-lg font-bold text-green-400 mb-1 font-mono">${formatNumber(totalDebit)}</div>
        <div class="text-gray-500 text-xs">إجمالي المدين</div>
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 text-center">
        <div class="text-lg font-bold text-red-400 mb-1 font-mono">${formatNumber(totalCredit)}</div>
        <div class="text-gray-500 text-xs">إجمالي الدائن</div>
      </div>
      <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 text-center">
        <div class="text-lg font-bold ${totalDebit - totalCredit >= 0 ? 'text-primary-400' : 'text-red-400'} mb-1 font-mono">${formatNumber(totalDebit - totalCredit)}</div>
        <div class="text-gray-500 text-xs">صافي الرصيد</div>
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      ${data.length === 0 ? emptyState('لا توجد حركات على مراكز التكلفة', 'fa-bullseye') : `
      <table class="w-full text-sm" id="ccReportTable"><thead><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
        <th class="px-4 py-3 text-right">الرمز</th><th class="px-4 py-3 text-right">المركز</th>
        <th class="px-4 py-3 text-left">مدين</th><th class="px-4 py-3 text-left">دائن</th><th class="px-4 py-3 text-left">صافي الرصيد</th>
        <th class="px-4 py-3 text-center">عدد القيود</th><th class="px-4 py-3 text-center">سندات قبض</th><th class="px-4 py-3 text-center">سندات صرف</th>
        <th class="px-4 py-3 text-center">تفاصيل</th>
      </tr></thead><tbody>${data.map(cc => `<tr class="table-row border-b border-dark-700/50">
        <td class="px-4 py-2.5 font-mono text-primary-400 text-xs">${cc.code}</td>
        <td class="px-4 py-2.5 text-gray-200">${cc.name_ar}</td>
        <td class="px-4 py-2.5 text-left font-mono text-xs text-green-400">${cc.total_debit > 0 ? formatNumber(cc.total_debit) : '-'}</td>
        <td class="px-4 py-2.5 text-left font-mono text-xs text-red-400">${cc.total_credit > 0 ? formatNumber(cc.total_credit) : '-'}</td>
        <td class="px-4 py-2.5 text-left font-mono text-xs font-bold ${cc.net_balance >= 0 ? 'text-white' : 'text-red-400'}">${formatNumber(cc.net_balance)}</td>
        <td class="px-4 py-2.5 text-center text-gray-400">${cc.entry_count || 0}</td>
        <td class="px-4 py-2.5 text-center"><span class="text-green-400 font-mono text-xs">${cc.receipt_count ? formatNumber(cc.receipt_total) + ' ('+cc.receipt_count+')' : '-'}</span></td>
        <td class="px-4 py-2.5 text-center"><span class="text-red-400 font-mono text-xs">${cc.payment_count ? formatNumber(cc.payment_total) + ' ('+cc.payment_count+')' : '-'}</span></td>
        <td class="px-4 py-2.5 text-center"><button onclick="showCostCenterTransactions(${cc.id})" class="text-primary-400 hover:text-primary-300 text-xs"><i class="fas fa-external-link-alt"></i></button></td>
      </tr>`).join('')}
      <tr class="bg-primary-900/30 font-bold text-white text-sm"><td class="px-4 py-3" colspan="2">المجموع</td>
        <td class="px-4 py-3 text-left font-mono text-green-400">${formatNumber(totalDebit)}</td>
        <td class="px-4 py-3 text-left font-mono text-red-400">${formatNumber(totalCredit)}</td>
        <td class="px-4 py-3 text-left font-mono">${formatNumber(totalDebit - totalCredit)}</td>
        <td class="px-4 py-3 text-center">${data.reduce((s,c) => s + (c.entry_count||0), 0)}</td>
        <td class="px-4 py-3" colspan="3"></td>
      </tr></tbody></table>`}
    </div>`;
}

function exportCostCenterReportPDF() {
  const table = document.getElementById('ccReportTable');
  if (!table) { showToast('لا توجد بيانات', 'warning'); return; }
  exportPDF('تقرير أرصدة مراكز التكلفة', table.outerHTML);
}

// عرض حركات مركز تكلفة
async function showCostCenterTransactions(id) {
  const res = await apiFetch(`/cost-centers/${id}/transactions`);
  if (!res.success) { showToast('خطأ في جلب البيانات', 'error'); return; }
  const d = res.data;
  
  showModal(`حركات مركز التكلفة: ${d.center.name_ar}`, `
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">إجمالي المدين</span><strong class="text-green-400 font-mono">${formatNumber(d.total_debit)}</strong></div>
      <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">إجمالي الدائن</span><strong class="text-red-400 font-mono">${formatNumber(d.total_credit)}</strong></div>
      <div class="bg-primary-900/30 rounded-xl p-3 text-center border border-primary-700"><span class="text-gray-400 text-xs block mb-1">صافي الرصيد</span><strong class="text-primary-400 font-mono text-lg">${formatNumber(d.net_balance)}</strong></div>
    </div>
    ${d.lines.length === 0 ? emptyState('لا توجد حركات على هذا المركز', 'fa-bullseye') : `
    <div class="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table class="w-full text-sm"><thead class="sticky top-0"><tr class="bg-dark-900 text-gray-400 text-xs uppercase">
        <th class="px-3 py-2 text-right">التاريخ</th><th class="px-3 py-2 text-right">رقم القيد</th><th class="px-3 py-2 text-right">الحساب</th>
        <th class="px-3 py-2 text-right">البيان</th><th class="px-3 py-2 text-left">مدين</th><th class="px-3 py-2 text-left">دائن</th>
      </tr></thead><tbody>
      ${d.lines.map(l => `<tr class="border-b border-dark-700/50 text-xs">
        <td class="px-3 py-2 text-gray-400">${l.entry_date}</td>
        <td class="px-3 py-2 font-mono text-primary-400 cursor-pointer hover:text-primary-300" onclick="closeModal();viewJournalEntry(${l.journal_entry_id})">#${l.entry_number}</td>
        <td class="px-3 py-2"><span class="text-primary-400 font-mono">${l.account_code}</span> ${l.account_name}</td>
        <td class="px-3 py-2 text-gray-400 max-w-[200px] truncate">${l.description || l.entry_description || ''}</td>
        <td class="px-3 py-2 text-left font-mono text-green-400">${l.debit > 0 ? formatNumber(l.debit) : ''}</td>
        <td class="px-3 py-2 text-left font-mono text-red-400">${l.credit > 0 ? formatNumber(l.credit) : ''}</td>
      </tr>`).join('')}
      </tbody></table>
    </div>`}`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`, 'max-w-4xl');
}

function showAddCostCenterModal() {
  showModal('مركز تكلفة جديد', `<div class="space-y-4">
    ${inputField('ccCode', 'رمز المركز *')} ${inputField('ccNameAr', 'اسم المركز (عربي) *')} ${inputField('ccNameEn', 'اسم المركز (إنجليزي)')}
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="saveCostCenter()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function saveCostCenter() {
  const data = { code: document.getElementById('ccCode').value.trim(), name_ar: document.getElementById('ccNameAr').value.trim(), name_en: document.getElementById('ccNameEn').value.trim() };
  if (!data.code || !data.name_ar) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return; }
  const res = await apiFetch('/cost-centers', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/cost-centers'); } else showToast(res.message, 'error');
}

function showEditCostCenterModal(id, code, nameAr, nameEn, isActive) {
  showModal('تعديل مركز التكلفة', `<div class="space-y-4">
    ${inputField('editCcCode', 'الرمز', 'text', code)} ${inputField('editCcNameAr', 'الاسم (عربي)', 'text', nameAr)} ${inputField('editCcNameEn', 'الاسم (إنجليزي)', 'text', nameEn)}
    ${selectField('editCcActive', 'الحالة', [{value:'1',text:'نشط'},{value:'0',text:'معطل'}], isActive?'1':'0')}
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="updateCostCenter(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateCostCenter(id) {
  const data = { code: document.getElementById('editCcCode').value, name_ar: document.getElementById('editCcNameAr').value, name_en: document.getElementById('editCcNameEn').value, is_active: document.getElementById('editCcActive').value === '1' };
  const res = await apiFetch(`/cost-centers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/cost-centers'); } else showToast(res.message, 'error');
}

async function deleteCostCenter(id) {
  showConfirm('حذف مركز التكلفة', 'هل أنت متأكد من الحذف؟', async () => {
    const res = await apiFetch(`/cost-centers/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); navigate('/cost-centers'); } else showToast(res.message, 'error');
  });
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
      <div><h2 class="text-2xl font-bold text-white"><i class="fas fa-users-cog ml-2 text-purple-400"></i>إدارة المستخدمين</h2><p class="text-gray-500 text-sm mt-1">${res.data.length} مستخدم</p></div>
      <button onclick="showAddUserModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm transition"><i class="fas fa-plus ml-1"></i> مستخدم جديد</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${res.data.map(u => `
        <div class="bg-dark-800 rounded-2xl border border-dark-700 p-5 hover:border-dark-500 transition">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">${u.full_name.charAt(0)}</div>
            <div class="flex-1 min-w-0"><h4 class="text-white font-bold truncate">${u.full_name}</h4><p class="text-gray-500 text-xs">@${u.username}</p></div>
            <span class="badge ${u.is_active?'badge-success':'badge-danger'}">${u.is_active?'نشط':'معطل'}</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center"><span class="text-gray-500">الدور:</span><span class="badge ${roleColors[u.role]||'badge-info'}">${roles[u.role]||u.role}</span></div>
            ${u.email?`<div class="flex justify-between"><span class="text-gray-500">البريد:</span><span class="text-gray-400 text-xs">${u.email}</span></div>`:''}
          </div>
          <div class="mt-4 pt-3 border-t border-dark-700 flex gap-2">
            <button onclick="showEditUserModal(${u.id}, ${JSON.stringify(u).replace(/"/g, '&quot;')})" class="flex-1 text-center text-primary-400 hover:text-primary-300 text-xs py-1.5 rounded-lg hover:bg-dark-700 transition"><i class="fas fa-edit ml-1"></i> تعديل</button>
            <button onclick="showUserPermissions(${u.id}, '${u.full_name}')" class="flex-1 text-center text-yellow-400 hover:text-yellow-300 text-xs py-1.5 rounded-lg hover:bg-dark-700 transition"><i class="fas fa-key ml-1"></i> صلاحيات</button>
          </div>
        </div>`).join('')}
    </div>`;
}

function showAddUserModal() {
  showModal('مستخدم جديد', `<div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">${inputField('newUsername', 'اسم المستخدم *')} ${inputField('newPassword', 'كلمة المرور *', 'password')}</div>
    ${inputField('newFullName', 'الاسم الكامل *')}
    <div class="grid grid-cols-2 gap-4">${inputField('newEmail', 'البريد الإلكتروني', 'email')} ${inputField('newPhone', 'رقم الهاتف', 'tel')}</div>
    ${selectField('newRole', 'الدور', [{value:'user',text:'مستخدم'},{value:'accountant',text:'محاسب'},{value:'manager',text:'مدير قسم'},{value:'admin',text:'مدير النظام'},{value:'viewer',text:'مشاهد فقط'}])}
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="saveNewUser()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function saveNewUser() {
  const data = { username: document.getElementById('newUsername').value.trim(), password: document.getElementById('newPassword').value, full_name: document.getElementById('newFullName').value.trim(), email: document.getElementById('newEmail').value, phone: document.getElementById('newPhone').value, role: document.getElementById('newRole').value };
  if (!data.username || !data.password || !data.full_name) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return; }
  const res = await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/users'); } else showToast(res.message, 'error');
}

function showEditUserModal(id, user) {
  showModal('تعديل المستخدم: ' + user.full_name, `<div class="space-y-4">
    ${inputField('editFullName', 'الاسم الكامل', 'text', user.full_name)}
    <div class="grid grid-cols-2 gap-4">${inputField('editEmail', 'البريد', 'email', user.email || '')} ${inputField('editPhone', 'الهاتف', 'tel', user.phone || '')}</div>
    <div class="grid grid-cols-2 gap-4">
      ${selectField('editRole', 'الدور', [{value:'user',text:'مستخدم'},{value:'accountant',text:'محاسب'},{value:'manager',text:'مدير قسم'},{value:'admin',text:'مدير النظام'},{value:'viewer',text:'مشاهد'}], user.role)}
      ${selectField('editActive', 'الحالة', [{value:'1',text:'نشط'},{value:'0',text:'معطل'}], user.is_active?'1':'0')}
    </div>
    ${inputField('editPassword', 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)', 'password')}
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="updateUser(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateUser(id) {
  const data = { full_name: document.getElementById('editFullName').value, email: document.getElementById('editEmail').value, phone: document.getElementById('editPhone').value, role: document.getElementById('editRole').value, is_active: document.getElementById('editActive').value === '1', password: document.getElementById('editPassword').value || undefined };
  const res = await apiFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/users'); } else showToast(res.message, 'error');
}

// -- User Permissions --
async function showUserPermissions(userId, userName) {
  const res = await apiFetch(`/admin/users/${userId}/permissions`);
  if (!res.success) { showToast('خطأ في جلب الصلاحيات', 'error'); return; }
  const { modules, permissions } = res.data;
  const permRows = modules.map(m => {
    const p = permissions[m.id] || {};
    return `<tr class="border-b border-dark-700/50"><td class="px-3 py-2 text-gray-300 text-sm">${m.name_ar}</td>
      <td class="px-3 py-2 text-center"><input type="checkbox" class="perm-cb" data-mid="${m.id}" data-perm="view" ${p.can_view?'checked':''}></td>
      <td class="px-3 py-2 text-center"><input type="checkbox" class="perm-cb" data-mid="${m.id}" data-perm="create" ${p.can_create?'checked':''}></td>
      <td class="px-3 py-2 text-center"><input type="checkbox" class="perm-cb" data-mid="${m.id}" data-perm="edit" ${p.can_edit?'checked':''}></td>
      <td class="px-3 py-2 text-center"><input type="checkbox" class="perm-cb" data-mid="${m.id}" data-perm="delete" ${p.can_delete?'checked':''}></td>
      <td class="px-3 py-2 text-center"><input type="checkbox" class="perm-cb" data-mid="${m.id}" data-perm="print" ${p.can_print?'checked':''}></td></tr>`;
  }).join('');

  showModal(`صلاحيات: ${userName}`, `
    <div class="flex gap-2 mb-3">
      <button onclick="document.querySelectorAll('.perm-cb').forEach(c=>c.checked=true)" class="text-xs bg-green-600/20 text-green-400 px-3 py-1 rounded-lg">تحديد الكل</button>
      <button onclick="document.querySelectorAll('.perm-cb').forEach(c=>c.checked=false)" class="text-xs bg-red-600/20 text-red-400 px-3 py-1 rounded-lg">إلغاء الكل</button>
    </div>
    <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-dark-900 text-gray-400 text-xs">
      <th class="px-3 py-2 text-right">الوحدة</th><th class="px-3 py-2 text-center">عرض</th><th class="px-3 py-2 text-center">إنشاء</th>
      <th class="px-3 py-2 text-center">تعديل</th><th class="px-3 py-2 text-center">حذف</th><th class="px-3 py-2 text-center">طباعة</th>
    </tr></thead><tbody>${permRows}</tbody></table></div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
     <button onclick="saveUserPermissions(${userId})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ الصلاحيات</button>`, 'max-w-3xl');
}

async function saveUserPermissions(userId) {
  const permMap = {};
  document.querySelectorAll('.perm-cb').forEach(cb => {
    const mid = cb.dataset.mid;
    if (!permMap[mid]) permMap[mid] = { module_id: parseInt(mid), can_view: false, can_create: false, can_edit: false, can_delete: false, can_print: false };
    permMap[mid][`can_${cb.dataset.perm}`] = cb.checked;
  });
  const permissions = Object.values(permMap).filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_print);
  const res = await apiFetch(`/admin/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
  if (res.success) { showToast(res.message); closeModal(); } else showToast(res.message, 'error');
}

// -- Settings (شاشة إعدادات شاملة) --
let settingsActiveTab = 'company';

async function renderSettings(el) {
  const res = await apiFetch('/admin/settings');
  if (!res.success) return;
  const s = {}; res.data.forEach(item => s[item.key] = item.value);
  window._currentSettings = s;

  el.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white"><i class="fas fa-sliders-h ml-2 text-gray-400"></i>إعدادات النظام</h2>
      <p class="text-gray-500 text-sm mt-1">إدارة إعدادات الشركة والنظام المالي</p>
    </div>

    <!-- Settings Tabs -->
    <div class="flex gap-1 mb-6 bg-dark-800 p-1 rounded-2xl border border-dark-700 overflow-x-auto">
      <button onclick="switchSettingsTab('company')" id="tab-company" class="settings-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap">
        <i class="fas fa-building"></i> الشركة
      </button>
      <button onclick="switchSettingsTab('financial')" id="tab-financial" class="settings-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap">
        <i class="fas fa-calculator"></i> مالية
      </button>
      <button onclick="switchSettingsTab('numbering')" id="tab-numbering" class="settings-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap">
        <i class="fas fa-hashtag"></i> الترقيم
      </button>
      <button onclick="switchSettingsTab('printing')" id="tab-printing" class="settings-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap">
        <i class="fas fa-print"></i> الطباعة
      </button>
      <button onclick="switchSettingsTab('system')" id="tab-system" class="settings-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap">
        <i class="fas fa-server"></i> النظام
      </button>
    </div>

    <!-- Tab Content -->
    <div id="settingsContent"></div>`;

  switchSettingsTab(settingsActiveTab);
}

function switchSettingsTab(tab) {
  settingsActiveTab = tab;
  document.querySelectorAll('.settings-tab').forEach(t => {
    t.classList.remove('bg-primary-600', 'text-white', 'shadow-lg');
    t.classList.add('text-gray-400', 'hover:text-gray-200', 'hover:bg-dark-700');
  });
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-primary-600', 'text-white', 'shadow-lg');
    activeBtn.classList.remove('text-gray-400', 'hover:text-gray-200', 'hover:bg-dark-700');
  }
  const s = window._currentSettings || {};
  const el = document.getElementById('settingsContent');

  switch (tab) {
    case 'company':
      el.innerHTML = `
        <div class="max-w-3xl mx-auto">
          <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <h3 class="text-white font-bold"><i class="fas fa-building ml-2 text-primary-400"></i>معلومات الشركة</h3>
              <p class="text-gray-500 text-xs mt-1">البيانات الأساسية للشركة التي تظهر في التقارير والطباعة</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${inputField('setCompanyName', 'اسم الشركة (عربي) *', 'text', s.company_name || '')}
                ${inputField('setCompanyNameEn', 'اسم الشركة (إنجليزي)', 'text', s.company_name_en || '')}
              </div>
              ${inputField('setCompanyAddress', 'العنوان', 'text', s.company_address || '')}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${inputField('setCompanyPhone', 'رقم الهاتف', 'tel', s.company_phone || '')}
                ${inputField('setCompanyEmail', 'البريد الإلكتروني', 'email', s.company_email || '')}
                ${inputField('setCompanyWebsite', 'الموقع الإلكتروني', 'url', s.company_website || '')}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${inputField('setCompanyTaxNo', 'الرقم الضريبي', 'text', s.tax_number || '')}
                ${inputField('setCompanyRegNo', 'رقم السجل التجاري', 'text', s.registration_number || '')}
              </div>
              ${textareaField('setCompanyNotes', 'ملاحظات إضافية (تظهر في ذيل التقارير)', s.company_notes || '', 2)}
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button onclick="saveAllSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>`;
      break;

    case 'financial':
      el.innerHTML = `
        <div class="max-w-3xl mx-auto">
          <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <h3 class="text-white font-bold"><i class="fas fa-calculator ml-2 text-green-400"></i>الإعدادات المالية</h3>
              <p class="text-gray-500 text-xs mt-1">ضبط السلوك المالي للنظام</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${selectField('setDefaultCurrency', 'العملة الأساسية', [{value:'IQD',text:'دينار عراقي (IQD)'},{value:'USD',text:'دولار أمريكي (USD)'},{value:'EUR',text:'يورو (EUR)'},{value:'SAR',text:'ريال سعودي (SAR)'}], s.default_currency || 'IQD')}
                ${inputField('setDecimals', 'الخانات العشرية', 'number', s.decimal_places || '2', 'min="0" max="6"')}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${selectField('setAutoPost', 'ترحيل السندات تلقائياً', [{value:'0',text:'لا - يتطلب ترحيل يدوي'},{value:'1',text:'نعم - ترحيل عند الإنشاء'}], s.voucher_auto_post || '0')}
                ${selectField('setAutoPostJournal', 'ترحيل القيود تلقائياً', [{value:'0',text:'لا - حفظ كمسودة'},{value:'1',text:'نعم - ترحيل عند الإنشاء'}], s.journal_auto_post || '0')}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${selectField('setBalanceValidation', 'فحص توازن القيد', [{value:'strict',text:'صارم - لا يسمح بقيد غير متوازن'},{value:'warn',text:'تحذير فقط'},{value:'none',text:'بدون فحص'}], s.balance_validation || 'strict')}
                ${selectField('setNegativeBalance', 'السماح بالأرصدة السالبة', [{value:'0',text:'لا - رفض العملية'},{value:'1',text:'نعم - تحذير فقط'}], s.allow_negative_balance || '0')}
              </div>
              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-lock-open ml-2 text-yellow-400"></i>حسابات افتراضية</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  ${inputField('setDefaultCashAccount', 'حساب الصندوق الافتراضي (رمز)', 'text', s.default_cash_account || '111')}
                  ${inputField('setDefaultBankAccount', 'حساب البنك الافتراضي (رمز)', 'text', s.default_bank_account || '112')}
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button onclick="saveAllSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>`;
      break;

    case 'numbering':
      el.innerHTML = `
        <div class="max-w-3xl mx-auto">
          <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <h3 class="text-white font-bold"><i class="fas fa-hashtag ml-2 text-blue-400"></i>إعدادات الترقيم التلقائي</h3>
              <p class="text-gray-500 text-xs mt-1">ضبط نمط ترقيم القيود والسندات</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-book ml-2 text-blue-400"></i>ترقيم القيود</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  ${inputField('setJePrefix', 'بادئة القيد', 'text', s.journal_prefix || '', 'placeholder="JE-"')}
                  ${selectField('setJeNumbering', 'نوع الترقيم', [{value:'sequential',text:'تسلسلي مستمر'},{value:'yearly',text:'يبدأ من 1 كل سنة'},{value:'monthly',text:'يبدأ من 1 كل شهر'}], s.journal_numbering || 'sequential')}
                  ${inputField('setJeDigits', 'عدد الخانات', 'number', s.journal_digits || '4', 'min="1" max="10"')}
                </div>
                <p class="text-gray-500 text-xs mt-2">مثال: <span class="text-primary-400 font-mono" id="jeNumPreview"></span></p>
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-hand-holding-usd ml-2 text-green-400"></i>ترقيم سندات القبض</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  ${inputField('setRvPrefix', 'بادئة سند القبض', 'text', s.receipt_prefix || '', 'placeholder="RV-"')}
                  ${selectField('setRvNumbering', 'نوع الترقيم', [{value:'sequential',text:'تسلسلي مستمر'},{value:'yearly',text:'يبدأ من 1 كل سنة'}], s.receipt_numbering || 'sequential')}
                  ${inputField('setRvDigits', 'عدد الخانات', 'number', s.receipt_digits || '4', 'min="1" max="10"')}
                </div>
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-money-bill-wave ml-2 text-red-400"></i>ترقيم سندات الصرف</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  ${inputField('setPvPrefix', 'بادئة سند الصرف', 'text', s.payment_prefix || '', 'placeholder="PV-"')}
                  ${selectField('setPvNumbering', 'نوع الترقيم', [{value:'sequential',text:'تسلسلي مستمر'},{value:'yearly',text:'يبدأ من 1 كل سنة'}], s.payment_numbering || 'sequential')}
                  ${inputField('setPvDigits', 'عدد الخانات', 'number', s.payment_digits || '4', 'min="1" max="10"')}
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button onclick="saveAllSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>`;
      updateNumberPreview();
      break;

    case 'printing':
      el.innerHTML = `
        <div class="max-w-3xl mx-auto">
          <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <h3 class="text-white font-bold"><i class="fas fa-print ml-2 text-purple-400"></i>إعدادات الطباعة</h3>
              <p class="text-gray-500 text-xs mt-1">تخصيص مظهر التقارير والسندات المطبوعة</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-file-alt ml-2 text-purple-400"></i>رأس التقارير</h4>
                ${inputField('setPrintHeader1', 'السطر الأول (اسم الشركة)', 'text', s.print_header_1 || s.company_name || '')}
                ${inputField('setPrintHeader2', 'السطر الثاني (العنوان)', 'text', s.print_header_2 || s.company_address || '')}
                ${inputField('setPrintHeader3', 'السطر الثالث (معلومات إضافية)', 'text', s.print_header_3 || '')}
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-shoe-prints ml-2 text-purple-400"></i>ذيل التقارير</h4>
                ${inputField('setPrintFooter', 'نص الذيل', 'text', s.print_footer || '')}
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-signature ml-2 text-purple-400"></i>التوقيعات</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  ${inputField('setPrintSig1', 'التوقيع الأول', 'text', s.print_signature_1 || 'المحاسب')}
                  ${inputField('setPrintSig2', 'التوقيع الثاني', 'text', s.print_signature_2 || 'المدقق')}
                  ${inputField('setPrintSig3', 'التوقيع الثالث', 'text', s.print_signature_3 || 'المدير المالي')}
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${selectField('setPrintPageSize', 'حجم الورق', [{value:'A4',text:'A4'},{value:'A5',text:'A5'},{value:'Letter',text:'Letter'}], s.print_page_size || 'A4')}
                ${selectField('setPrintOrientation', 'اتجاه الطباعة', [{value:'portrait',text:'عمودي (Portrait)'},{value:'landscape',text:'أفقي (Landscape)'}], s.print_orientation || 'portrait')}
              </div>

              <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
                <input type="checkbox" id="setPrintShowLogo" ${(s.print_show_logo === '1' || !s.print_show_logo) ? 'checked' : ''} class="rounded bg-dark-900 border-dark-600">
                عرض شعار الشركة في التقارير
              </label>
              <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
                <input type="checkbox" id="setPrintShowSignatures" ${(s.print_show_signatures === '1' || !s.print_show_signatures) ? 'checked' : ''} class="rounded bg-dark-900 border-dark-600">
                عرض حقول التوقيع في الطباعة
              </label>
            </div>
          </div>

          <!-- Print Preview -->
          <div class="mt-4 bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
              <h3 class="text-white font-bold text-sm"><i class="fas fa-eye ml-2 text-gray-400"></i>معاينة</h3>
              <button onclick="testPrint()" class="text-primary-400 hover:text-primary-300 text-xs"><i class="fas fa-print ml-1"></i> طباعة تجريبية</button>
            </div>
            <div class="p-6">
              <div class="bg-white text-black rounded-xl p-8 max-w-md mx-auto text-center" style="font-family:Tajawal,sans-serif" dir="rtl">
                <h3 class="text-lg font-bold mb-1" id="previewHeader1">${s.print_header_1 || s.company_name || 'اسم الشركة'}</h3>
                <p class="text-sm text-gray-500 mb-0" id="previewHeader2">${s.print_header_2 || s.company_address || 'العنوان'}</p>
                <p class="text-xs text-gray-400 mb-3" id="previewHeader3">${s.print_header_3 || ''}</p>
                <hr class="border-t-2 border-black mb-3">
                <p class="text-sm font-bold mb-2">عنوان التقرير</p>
                <p class="text-xs text-gray-500">محتوى التقرير...</p>
                <hr class="border-t border-gray-300 my-3">
                <div class="grid grid-cols-3 gap-4 text-xs mt-6">
                  <div class="border-t border-black pt-1" id="previewSig1">${s.print_signature_1 || 'المحاسب'}</div>
                  <div class="border-t border-black pt-1" id="previewSig2">${s.print_signature_2 || 'المدقق'}</div>
                  <div class="border-t border-black pt-1" id="previewSig3">${s.print_signature_3 || 'المدير المالي'}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <button onclick="saveAllSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>`;
      // Live preview updates
      ['setPrintHeader1','setPrintHeader2','setPrintHeader3','setPrintSig1','setPrintSig2','setPrintSig3'].forEach(id => {
        const preview = id.replace('set','preview').replace('Print','');
        document.getElementById(id)?.addEventListener('input', function() {
          const target = document.getElementById(preview);
          if (target) target.textContent = this.value || '';
        });
      });
      break;

    case 'system':
      el.innerHTML = `
        <div class="max-w-3xl mx-auto">
          <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <h3 class="text-white font-bold"><i class="fas fa-server ml-2 text-orange-400"></i>إعدادات النظام</h3>
              <p class="text-gray-500 text-xs mt-1">إعدادات عامة للنظام والأمان</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${selectField('setLanguage', 'اللغة الافتراضية', [{value:'ar',text:'العربية'},{value:'en',text:'English'}], s.default_language || 'ar')}
                ${selectField('setDateFormat', 'تنسيق التاريخ', [{value:'yyyy-mm-dd',text:'2026-04-07 (ISO)'},{value:'dd/mm/yyyy',text:'07/04/2026'},{value:'dd-mm-yyyy',text:'07-04-2026'}], s.date_format || 'yyyy-mm-dd')}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${inputField('setSessionTimeout', 'مدة الجلسة (بالساعات)', 'number', s.session_timeout || '24', 'min="1" max="720"')}
                ${inputField('setMaxLoginAttempts', 'أقصى محاولات دخول فاشلة', 'number', s.max_login_attempts || '5', 'min="1" max="20"')}
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-shield-alt ml-2 text-orange-400"></i>الأمان</h4>
                <div class="space-y-3">
                  <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
                    <input type="checkbox" id="setRequireStrongPass" ${s.require_strong_password === '1' ? 'checked' : ''} class="rounded bg-dark-900 border-dark-600">
                    فرض كلمة مرور قوية (أحرف كبيرة وصغيرة وأرقام)
                  </label>
                  <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
                    <input type="checkbox" id="setAuditEnabled" ${(s.audit_enabled === '1' || !s.audit_enabled) ? 'checked' : ''} class="rounded bg-dark-900 border-dark-600">
                    تفعيل سجل التدقيق (تسجيل كل العمليات)
                  </label>
                  <label class="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-gray-300">
                    <input type="checkbox" id="setIpRestriction" ${s.ip_restriction === '1' ? 'checked' : ''} class="rounded bg-dark-900 border-dark-600">
                    تقييد الدخول بعناوين IP محددة
                  </label>
                </div>
              </div>

              <div class="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                <h4 class="text-white font-medium text-sm mb-3"><i class="fas fa-database ml-2 text-orange-400"></i>معلومات النظام</h4>
                <div class="grid grid-cols-2 gap-y-2 text-sm">
                  <span class="text-gray-500">إصدار النظام:</span><span class="text-gray-200 font-mono">${APP_VERSION}</span>
                  <span class="text-gray-500">آخر تحديث:</span><span class="text-gray-200">${new Date().toLocaleDateString('ar-IQ')}</span>
                  <span class="text-gray-500">بيئة العمل:</span><span class="text-gray-200">Cloudflare Workers + D1</span>
                  <span class="text-gray-500">الخادم:</span><span class="text-gray-200">Hono v4</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4 flex justify-end gap-3">
            <button onclick="resetSettingsConfirm()" class="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-undo"></i> استعادة الافتراضي</button>
            <button onclick="saveAllSettings()" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm transition flex items-center gap-2"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>`;
      break;
  }
}

function updateNumberPreview() {
  const prefix = document.getElementById('setJePrefix')?.value || '';
  const digits = parseInt(document.getElementById('setJeDigits')?.value || 4);
  const num = '1'.padStart(digits, '0');
  const preview = document.getElementById('jeNumPreview');
  if (preview) preview.textContent = `${prefix}${num}`;
}

function testPrint() {
  const h1 = document.getElementById('setPrintHeader1')?.value || 'اسم الشركة';
  const h2 = document.getElementById('setPrintHeader2')?.value || '';
  const s1 = document.getElementById('setPrintSig1')?.value || 'المحاسب';
  const s2 = document.getElementById('setPrintSig2')?.value || 'المدقق';
  const s3 = document.getElementById('setPrintSig3')?.value || 'المدير المالي';
  printReport('طباعة تجريبية', `
    <p style="text-align:center;font-size:12pt;margin:30px 0;">هذه طباعة تجريبية للتحقق من إعدادات الطباعة</p>
    <table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead>
    <tbody><tr><td>الصندوق</td><td style="text-align:left">1,000,000</td><td></td></tr>
    <tr><td>رأس المال</td><td></td><td style="text-align:left">1,000,000</td></tr>
    <tr class="total-row"><td>المجموع</td><td style="text-align:left">1,000,000</td><td style="text-align:left">1,000,000</td></tr></tbody></table>`);
}

function resetSettingsConfirm() {
  showConfirm('استعادة الإعدادات الافتراضية', 'سيتم إعادة جميع الإعدادات إلى قيمها الافتراضية. هل أنت متأكد؟', async () => {
    window._currentSettings = {};
    switchSettingsTab(settingsActiveTab);
    showToast('تم استعادة الإعدادات الافتراضية - اضغط حفظ لتأكيد', 'info');
  });
}

async function saveAllSettings() {
  const data = {};
  // Collect all visible settings fields
  const fields = {
    // Company tab
    'company_name': 'setCompanyName', 'company_name_en': 'setCompanyNameEn',
    'company_address': 'setCompanyAddress', 'company_phone': 'setCompanyPhone',
    'company_email': 'setCompanyEmail', 'company_website': 'setCompanyWebsite',
    'tax_number': 'setCompanyTaxNo', 'registration_number': 'setCompanyRegNo',
    'company_notes': 'setCompanyNotes',
    // Financial tab
    'default_currency': 'setDefaultCurrency', 'decimal_places': 'setDecimals',
    'voucher_auto_post': 'setAutoPost', 'journal_auto_post': 'setAutoPostJournal',
    'balance_validation': 'setBalanceValidation', 'allow_negative_balance': 'setNegativeBalance',
    'default_cash_account': 'setDefaultCashAccount', 'default_bank_account': 'setDefaultBankAccount',
    // Numbering tab
    'journal_prefix': 'setJePrefix', 'journal_numbering': 'setJeNumbering', 'journal_digits': 'setJeDigits',
    'receipt_prefix': 'setRvPrefix', 'receipt_numbering': 'setRvNumbering', 'receipt_digits': 'setRvDigits',
    'payment_prefix': 'setPvPrefix', 'payment_numbering': 'setPvNumbering', 'payment_digits': 'setPvDigits',
    // Printing tab
    'print_header_1': 'setPrintHeader1', 'print_header_2': 'setPrintHeader2', 'print_header_3': 'setPrintHeader3',
    'print_footer': 'setPrintFooter', 'print_signature_1': 'setPrintSig1', 'print_signature_2': 'setPrintSig2', 'print_signature_3': 'setPrintSig3',
    'print_page_size': 'setPrintPageSize', 'print_orientation': 'setPrintOrientation',
    // System tab
    'default_language': 'setLanguage', 'date_format': 'setDateFormat',
    'session_timeout': 'setSessionTimeout', 'max_login_attempts': 'setMaxLoginAttempts'
  };

  const checkboxFields = {
    'print_show_logo': 'setPrintShowLogo', 'print_show_signatures': 'setPrintShowSignatures',
    'require_strong_password': 'setRequireStrongPass', 'audit_enabled': 'setAuditEnabled', 'ip_restriction': 'setIpRestriction'
  };

  for (const [key, id] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) data[key] = el.value;
  }
  for (const [key, id] of Object.entries(checkboxFields)) {
    const el = document.getElementById(id);
    if (el) data[key] = el.checked ? '1' : '0';
  }

  // Merge with existing settings to avoid losing data from other tabs
  Object.assign(window._currentSettings || {}, data);

  const res = await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) {
    showToast('تم حفظ الإعدادات بنجاح');
    addNotification('إعدادات النظام', 'تم تحديث إعدادات النظام بنجاح', 'success');
  } else {
    showToast(res.message || 'خطأ في الحفظ', 'error');
  }
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
          <h4 class="text-white font-bold">${c.name_ar}</h4><p class="text-gray-500 text-xs mb-3">${c.name_en || c.code}</p>
          <p class="text-primary-400 font-mono text-2xl font-bold">${formatNumber(c.exchange_rate)}</p><p class="text-gray-500 text-xs">سعر الصرف</p>
          ${c.is_default ? '<span class="badge badge-success mt-3">العملة الأساسية</span>' : ''}
          <button onclick="showEditCurrencyModal(${c.id}, '${c.name_ar}', '${c.name_en||''}', '${c.symbol||''}', ${c.exchange_rate}, ${c.is_active})" class="absolute top-3 left-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition p-1" title="تعديل"><i class="fas fa-edit"></i></button>
        </div>`).join('')}
    </div>`;
}

function showAddCurrencyModal() {
  showModal('عملة جديدة', `<div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">${inputField('newCurCode', 'رمز العملة (مثل USD)', 'text')} ${inputField('newCurSymbol', 'الرمز (مثل $)', 'text')}</div>
    ${inputField('newCurNameAr', 'الاسم (عربي)')} ${inputField('newCurNameEn', 'الاسم (إنجليزي)')}
    ${inputField('newCurRate', 'سعر الصرف', 'number', '1', 'step="0.01" min="0"')}
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="saveNewCurrency()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function saveNewCurrency() {
  const data = { code: document.getElementById('newCurCode').value.toUpperCase(), name_ar: document.getElementById('newCurNameAr').value, name_en: document.getElementById('newCurNameEn').value, symbol: document.getElementById('newCurSymbol').value, exchange_rate: parseFloat(document.getElementById('newCurRate').value) || 1 };
  const res = await apiFetch('/admin/currencies', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/currencies'); } else showToast(res.message, 'error');
}

function showEditCurrencyModal(id, nameAr, nameEn, symbol, rate, isActive) {
  showModal('تعديل العملة', `<div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">${inputField('editCurNameAr', 'الاسم (عربي)', 'text', nameAr)} ${inputField('editCurNameEn', 'الاسم (إنجليزي)', 'text', nameEn)}</div>
    <div class="grid grid-cols-3 gap-4">${inputField('editCurSymbol', 'الرمز', 'text', symbol)} ${inputField('editCurRate', 'سعر الصرف', 'number', rate, 'step="0.01"')}
      ${selectField('editCurActive', 'الحالة', [{value:'1',text:'نشطة'},{value:'0',text:'معطلة'}], isActive?'1':'0')}</div>
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="updateCurrency(${id})" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
}

async function updateCurrency(id) {
  const data = { name_ar: document.getElementById('editCurNameAr').value, name_en: document.getElementById('editCurNameEn').value, symbol: document.getElementById('editCurSymbol').value, exchange_rate: parseFloat(document.getElementById('editCurRate').value), is_active: document.getElementById('editCurActive').value === '1' };
  const res = await apiFetch(`/admin/currencies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/currencies'); } else showToast(res.message, 'error');
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
          ${!fy.is_closed ? `<div class="flex gap-2 mt-3">
            ${!fy.is_active ? `<button onclick="activateFiscalYear(${fy.id}, ${fy.year})" class="flex-1 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 py-2 rounded-xl text-xs transition"><i class="fas fa-power-off ml-1"></i> تفعيل</button>` : ''}
            <button onclick="closeFiscalYear(${fy.id}, ${fy.year})" class="flex-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 py-2 rounded-xl text-xs transition"><i class="fas fa-lock ml-1"></i> إغلاق</button>
          </div>` : ''}
        </div>`).join('')}
    </div>`;
}

function showAddFiscalYearModal() {
  const nextYear = new Date().getFullYear() + 1;
  showModal('سنة مالية جديدة', `<div class="space-y-4">
    ${inputField('fyYear', 'السنة', 'number', nextYear)}
    <div class="grid grid-cols-2 gap-4">${inputField('fyStart', 'تاريخ البداية', 'date', `${nextYear}-01-01`)} ${inputField('fyEnd', 'تاريخ النهاية', 'date', `${nextYear}-12-31`)}</div>
  </div>`,
  `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-dark-600 text-gray-300 text-sm">إلغاء</button>
   <button onclick="saveFiscalYear()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm"><i class="fas fa-save ml-1"></i> حفظ</button>`);
  document.getElementById('fyYear').addEventListener('change', function() { const y = this.value; document.getElementById('fyStart').value = `${y}-01-01`; document.getElementById('fyEnd').value = `${y}-12-31`; });
}

async function saveFiscalYear() {
  const data = { year: parseInt(document.getElementById('fyYear').value), start_date: document.getElementById('fyStart').value, end_date: document.getElementById('fyEnd').value };
  const res = await apiFetch('/admin/fiscal-years', { method: 'POST', body: JSON.stringify(data) });
  if (res.success) { showToast(res.message); closeModal(); navigate('/admin/fiscal-years'); } else showToast(res.message, 'error');
}

function activateFiscalYear(id, year) {
  showConfirm('تفعيل السنة المالية', `سيتم تفعيل السنة ${year} وإلغاء تفعيل السنة الحالية.`, async () => {
    const res = await apiFetch(`/admin/fiscal-years/${id}/activate`, { method: 'POST' });
    if (res.success) { showToast(res.message); navigate('/admin/fiscal-years'); } else showToast(res.message, 'error');
  });
}

function closeFiscalYear(id, year) {
  showConfirm('إغلاق السنة المالية', `
    <div class="text-right text-sm text-gray-300 space-y-2">
      <p>سيتم تنفيذ الخطوات التالية:</p>
      <ol class="list-decimal list-inside space-y-1 text-gray-400 text-xs">
        <li>إقفال حسابات الإيرادات والمصروفات</li>
        <li>ترحيل صافي الربح/الخسارة إلى حساب الأرباح المحتجزة</li>
        <li>تحديث الأرصدة الافتتاحية لحسابات الميزانية</li>
        <li>إغلاق السنة نهائياً (لا يمكن التراجع)</li>
      </ol>
      <p class="text-yellow-400 text-xs mt-3"><i class="fas fa-exclamation-triangle ml-1"></i> تأكد من ترحيل جميع القيود والسندات قبل الإغلاق</p>
    </div>`, async () => {
    showToast('جاري إغلاق السنة المالية وترحيل الأرصدة...', 'info');
    const res = await apiFetch(`/admin/fiscal-years/${id}/close`, { method: 'POST' });
    if (res.success) {
      const d = res.data || {};
      showModal('نتائج إغلاق السنة المالية ' + year, `
        <div class="space-y-4">
          <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <i class="fas fa-check-circle text-green-400 text-3xl mb-2"></i>
            <h3 class="text-green-400 font-bold text-lg">${res.message}</h3>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block">إجمالي الإيرادات</span><strong class="text-green-400 font-mono">${formatNumber(d.totalRevenue || 0)}</strong></div>
            <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block">إجمالي المصروفات</span><strong class="text-red-400 font-mono">${formatNumber(d.totalExpenses || 0)}</strong></div>
          </div>
          <div class="bg-primary-900/30 border border-primary-700 rounded-xl p-4 text-center">
            <span class="text-gray-400 text-sm block mb-1">${(d.netIncome || 0) >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</span>
            <strong class="text-primary-400 font-mono text-2xl">${formatNumber(Math.abs(d.netIncome || 0))}</strong>
          </div>
          <div class="bg-dark-900 rounded-xl p-3 text-sm text-gray-400">
            <div class="flex justify-between py-1"><span>حسابات تم إقفالها:</span><span class="text-white font-bold">${d.accountsClosed || 0}</span></div>
            <div class="flex justify-between py-1"><span>أرصدة تم ترحيلها:</span><span class="text-white font-bold">${d.balancesCarriedForward || 0}</span></div>
          </div>
        </div>`,
        `<button onclick="closeModal();navigate('/admin/fiscal-years')" class="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm">موافق</button>`, 'max-w-lg');
      addNotification('إغلاق سنة مالية', `تم إغلاق السنة ${year} بنجاح`, 'success');
    } else {
      showToast(res.message, 'error');
    }
  });
}

// -- Audit Log --
async function renderAuditLog(el) {
  const res = await apiFetch('/admin/audit-log?limit=100');
  const actionLabels = { 'create': { text: 'إنشاء', icon: 'fa-plus-circle', color: 'text-green-400', bg: 'bg-green-500/10' }, 'update': { text: 'تعديل', icon: 'fa-edit', color: 'text-blue-400', bg: 'bg-blue-500/10' }, 'delete': { text: 'حذف', icon: 'fa-trash', color: 'text-red-400', bg: 'bg-red-500/10' }, 'post': { text: 'ترحيل', icon: 'fa-check-circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }, 'activate': { text: 'تفعيل', icon: 'fa-power-off', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }, 'close': { text: 'إغلاق', icon: 'fa-lock', color: 'text-red-400', bg: 'bg-red-500/10' } };
  const tableLabels = { 'accounts': 'دليل الحسابات', 'journal_entries': 'القيود', 'vouchers': 'السندات', 'users': 'المستخدمين', 'currencies': 'العملات', 'fiscal_years': 'السنوات المالية', 'settings': 'الإعدادات', 'cost_centers': 'مراكز التكلفة', 'user_permissions': 'الصلاحيات' };
  el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div><h2 class="text-2xl font-bold text-white"><i class="fas fa-history ml-2 text-gray-400"></i>سجل النشاطات</h2><p class="text-gray-500 text-sm mt-1">تتبع جميع العمليات على النظام</p></div>
      <button onclick="exportAuditCSV()" class="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2 rounded-xl text-sm transition"><i class="fas fa-file-csv ml-1"></i> تصدير CSV</button>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select id="auditTableFilter" onchange="filterAuditLog()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل الجداول</option><option value="accounts">دليل الحسابات</option><option value="journal_entries">القيود</option><option value="vouchers">السندات</option>
          <option value="users">المستخدمين</option><option value="currencies">العملات</option><option value="settings">الإعدادات</option><option value="cost_centers">مراكز التكلفة</option></select>
        <select id="auditActionFilter" onchange="filterAuditLog()" class="bg-dark-900 border border-dark-600 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">كل العمليات</option><option value="create">إنشاء</option><option value="update">تعديل</option><option value="delete">حذف</option><option value="post">ترحيل</option><option value="activate">تفعيل</option><option value="close">إغلاق</option></select>
        <div class="relative"><i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          <input type="text" id="auditSearch" onkeyup="filterAuditLog()" placeholder="بحث..." class="bg-dark-900 border border-dark-600 rounded-xl pr-10 pl-3 py-2 w-full text-sm text-gray-200 outline-none"></div>
        <input type="date" id="auditDateFilter" onchange="filterAuditLog()" class="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none">
      </div>
    </div>
    <div class="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      ${!res.success || !res.data || res.data.length === 0 ? emptyState('لا توجد نشاطات مسجلة بعد', 'fa-clipboard-list') : `
      <div class="divide-y divide-dark-700" id="auditLogList">
        ${res.data.map(log => {
          const a = actionLabels[log.action] || { text: log.action, icon: 'fa-circle', color: 'text-gray-400', bg: 'bg-gray-500/10' };
          const t = tableLabels[log.table_name] || log.table_name;
          let details = '';
          try { const d = log.new_data ? JSON.parse(log.new_data) : (log.old_data ? JSON.parse(log.old_data) : {}); details = Object.values(d).filter(v => v && typeof v === 'string').slice(0, 2).join(' - '); } catch {}
          const hasData = log.old_data || log.new_data;
          return `<div class="audit-row flex items-start gap-3 p-4 hover:bg-dark-700/30 transition cursor-pointer" data-table="${log.table_name}" data-action="${log.action}" data-text="${t} ${details}" data-date="${(log.created_at||'').split(' ')[0]}" onclick="${hasData ? `showAuditDetail(${JSON.stringify(log).replace(/'/g, "\\'").replace(/"/g, '&quot;')})` : ''}">
            <div class="w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0"><i class="fas ${a.icon} ${a.color} text-sm"></i></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-sm ${a.color}">${a.text}</span>
                <span class="text-gray-300 text-sm">${t}</span>
                ${log.record_id ? `<span class="text-gray-600 font-mono text-xs">#${log.record_id}</span>` : ''}
                ${hasData ? '<i class="fas fa-external-link-alt text-gray-600 text-[10px]" title="انقر لعرض التفاصيل"></i>' : ''}
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

function showAuditDetail(log) {
  let oldData = null, newData = null;
  try { oldData = log.old_data ? JSON.parse(log.old_data) : null; } catch {}
  try { newData = log.new_data ? JSON.parse(log.new_data) : null; } catch {}

  const formatData = (data, label, color) => {
    if (!data) return '';
    return `<div class="bg-dark-900 rounded-xl p-4">
      <h4 class="text-${color} font-bold text-sm mb-3"><i class="fas fa-${label === 'قبل' ? 'arrow-circle-right' : 'arrow-circle-left'} ml-1"></i> ${label} التعديل</h4>
      <div class="space-y-1.5">${Object.entries(data).map(([k, v]) => 
        `<div class="flex justify-between text-xs"><span class="text-gray-500">${k}</span><span class="text-gray-300 font-mono">${typeof v === 'object' ? JSON.stringify(v) : v}</span></div>`
      ).join('')}</div></div>`;
  };

  const diff = (oldData && newData) ? Object.keys(newData).filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) : [];

  showModal(`تفاصيل العملية #${log.id || ''}`, `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-3 text-sm">
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">العملية</span><span class="font-bold text-white">${log.action}</span></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">الجدول</span><span class="font-bold text-white">${log.table_name}</span></div>
        <div class="bg-dark-900 rounded-xl p-3 text-center"><span class="text-gray-500 text-xs block mb-1">التاريخ</span><span class="text-white text-xs">${log.created_at}</span></div>
      </div>
      ${diff.length > 0 ? `<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <h4 class="text-yellow-400 font-bold text-sm mb-3"><i class="fas fa-exchange-alt ml-1"></i> التغييرات</h4>
        <div class="space-y-2">${diff.map(k => `<div class="flex items-center gap-2 text-xs">
          <span class="text-gray-400 min-w-[80px]">${k}:</span>
          <span class="text-red-400 line-through font-mono">${oldData[k] ?? '-'}</span>
          <i class="fas fa-arrow-left text-gray-600 text-[10px]"></i>
          <span class="text-green-400 font-mono font-bold">${newData[k] ?? '-'}</span>
        </div>`).join('')}</div></div>` : ''}
      <div class="grid grid-cols-1 ${oldData && newData ? 'md:grid-cols-2' : ''} gap-4">
        ${formatData(oldData, 'قبل', 'red-400')}
        ${formatData(newData, 'بعد', 'green-400')}
      </div>
    </div>`,
    `<button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm">إغلاق</button>`, 'max-w-2xl');
}

function exportAuditCSV() {
  const rows = document.querySelectorAll('.audit-row');
  if (!rows.length) { showToast('لا توجد بيانات', 'warning'); return; }
  let csv = '\uFEFF"العملية","الجدول","التاريخ","التفاصيل"\n';
  rows.forEach(r => {
    if (r.style.display === 'none') return;
    csv += `"${r.dataset.action}","${r.dataset.table}","${r.dataset.date}","${(r.dataset.text||'').replace(/"/g,'""')}"\n`;
  });
  downloadCSV(csv, 'سجل_النشاطات');
}

function filterAuditLog() {
  const table = document.getElementById('auditTableFilter')?.value || '';
  const action = document.getElementById('auditActionFilter')?.value || '';
  const q = (document.getElementById('auditSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('auditDateFilter')?.value || '';
  document.querySelectorAll('.audit-row').forEach(r => {
    r.style.display = (!table || r.dataset.table === table) && (!action || r.dataset.action === action) && (!q || (r.dataset.text || '').toLowerCase().includes(q)) && (!dateFilter || (r.dataset.date || '') === dateFilter) ? '' : 'none';
  });
}

// ╔══════════════════════════════════════════════════╗
// ║               EXPORT UTILITIES (CSV + Excel)      ║
// ╚══════════════════════════════════════════════════╝
function exportTableCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) { showToast('لا توجد بيانات للتصدير', 'warning'); return; }
  let csv = '\uFEFF';
  table.querySelectorAll('tr').forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(col => rowData.push('"' + col.textContent.trim().replace(/"/g, '""') + '"'));
    csv += rowData.join(',') + '\n';
  });
  downloadCSV(csv, filename);
}

function exportTableExcel(tableId, filename, sheetName = 'Sheet1') {
  const table = document.getElementById(tableId);
  if (!table) { showToast('لا توجد بيانات للتصدير', 'warning'); return; }
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel غير متوفرة', 'error'); return; }
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table, { raw: false });
    // Set RTL
    if (!ws['!cols']) ws['!cols'] = [];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(wb, `${filename}_${todayStr()}.xlsx`);
    showToast('تم تصدير الملف بنجاح', 'success');
  } catch (e) {
    showToast('خطأ في التصدير: ' + e.message, 'error');
  }
}

function exportDataExcel(data, headers, filename, sheetName = 'Sheet1') {
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel غير متوفرة', 'error'); return; }
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(wb, `${filename}_${todayStr()}.xlsx`);
    showToast('تم تصدير الملف بنجاح', 'success');
  } catch (e) {
    showToast('خطأ في التصدير: ' + e.message, 'error');
  }
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${todayStr()}.csv`;
  link.click();
  showToast('تم تصدير الملف بنجاح', 'success');
}

// ╔══════════════════════════════════════════════════╗
// ║           PDF EXPORT (تصدير PDF احترافي)          ║
// ╚══════════════════════════════════════════════════╝
async function exportPDF(title, contentHtml, orientation = 'portrait') {
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    showToast('مكتبات PDF غير متوفرة بعد، يرجى الانتظار...', 'warning');
    return;
  }

  showToast('جاري إنشاء ملف PDF...', 'info');

  // Create a temporary container for the PDF content
  const container = document.createElement('div');
  container.id = 'pdfContainer';
  container.style.cssText = 'position:fixed; top:-9999px; left:0; width:794px; background:white; padding:40px; direction:rtl; font-family:Tajawal,sans-serif; color:#111;';
  
  const user = getUser();
  const dateStr = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  container.innerHTML = `
    <div style="text-align:center; border-bottom:3px double #1e3a5f; padding-bottom:15px; margin-bottom:20px;">
      <h1 style="font-size:20pt; font-weight:bold; color:#1e3a5f; margin:0 0 5px;">النظام المحاسبي الحديث</h1>
      <h2 style="font-size:14pt; color:#333; margin:0 0 5px;">${title}</h2>
      <p style="font-size:9pt; color:#888;">التاريخ: ${dateStr} | المستخدم: ${user?.fullName || 'مدير'} | ${new Date().toLocaleTimeString('ar-IQ')}</p>
    </div>
    <div style="font-size:10pt; line-height:1.8;">${contentHtml}</div>
    <div style="margin-top:50px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:40px; text-align:center; font-size:10pt;">
      <div style="padding-top:10px; border-top:1px solid #333;">المحاسب</div>
      <div style="padding-top:10px; border-top:1px solid #333;">المدقق</div>
      <div style="padding-top:10px; border-top:1px solid #333;">المدير المالي</div>
    </div>
    <div style="text-align:center; margin-top:30px; font-size:7pt; color:#aaa; border-top:1px solid #ddd; padding-top:8px;">
      النظام المحاسبي الحديث &copy; ${new Date().getFullYear()} - تم الإنشاء في ${new Date().toLocaleString('ar-IQ')}
    </div>
  `;
  
  // Style tables inside PDF
  container.querySelectorAll('table').forEach(table => {
    table.style.cssText = 'width:100%; border-collapse:collapse; margin:10px 0;';
    table.querySelectorAll('th').forEach(th => {
      th.style.cssText = 'background:#f0f4f8; color:#1e3a5f; padding:8px 10px; border:1px solid #ccc; text-align:right; font-size:9pt; font-weight:bold;';
    });
    table.querySelectorAll('td').forEach(td => {
      td.style.cssText = 'padding:6px 10px; border:1px solid #ddd; text-align:right; font-size:9pt; color:#333;';
    });
  });

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794
    });

    const { jsPDF } = jspdf;
    const isLandscape = orientation === 'landscape';
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 10;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Handle multi-page
    if (imgHeight <= pageHeight - (margin * 2)) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      let yOffset = 0;
      const contentHeight = pageHeight - (margin * 2);
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin - yOffset, imgWidth, imgHeight);
        yOffset += contentHeight;
      }
    }

    pdf.save(`${title}_${todayStr()}.pdf`);
    showToast('تم تصدير PDF بنجاح', 'success');
    addNotification('تصدير PDF', `تم تصدير "${title}" بصيغة PDF`, 'success');
  } catch (e) {
    console.error('PDF Export Error:', e);
    showToast('خطأ في تصدير PDF: ' + e.message, 'error');
  } finally {
    document.body.removeChild(container);
  }
}

// PDF export for specific reports
function exportTrialBalancePDF() {
  const table = document.getElementById('trialBalanceTable');
  if (!table) { showToast('لا توجد بيانات', 'warning'); return; }
  exportPDF('ميزان المراجعة', table.outerHTML);
}

function exportAccountStatementPDF() {
  const header = document.getElementById('accStmtHeader');
  const table = document.getElementById('accStmtTable');
  if (!table) { showToast('لا توجد بيانات', 'warning'); return; }
  const html = (header ? header.outerHTML : '') + table.outerHTML;
  exportPDF('كشف حساب', html);
}

function exportIncomeStatementPDF() {
  const el = document.getElementById('incomeTable');
  if (!el) { showToast('لا توجد بيانات', 'warning'); return; }
  exportPDF('قائمة الدخل', el.innerHTML);
}

function exportBalanceSheetPDF() {
  const el = document.getElementById('bsResult');
  if (!el) { showToast('لا توجد بيانات', 'warning'); return; }
  exportPDF('الميزانية العمومية', el.innerHTML);
}

async function exportJournalEntryPDF(id) {
  const res = await apiFetch(`/journal/${id}`);
  if (!res.success) { showToast('خطأ', 'error'); return; }
  const e = res.data;
  const html = `
    <div style="margin-bottom:15px;">
      <table style="width:100%;"><tr>
        <td style="border:none;padding:5px;"><strong>رقم القيد:</strong> ${e.entry_number}</td>
        <td style="border:none;padding:5px;"><strong>التاريخ:</strong> ${e.entry_date}</td>
        <td style="border:none;padding:5px;"><strong>الحالة:</strong> ${e.status==='posted'?'مرحّل':'مسودة'}</td>
        <td style="border:none;padding:5px;"><strong>المرجع:</strong> ${e.reference||'-'}</td>
      </tr></table>
      ${e.description ? `<p style="margin:10px 0;"><strong>الوصف:</strong> ${e.description}</p>` : ''}
    </div>
    <table>
      <thead><tr><th>#</th><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead>
      <tbody>
        ${e.lines.map((l,i) => `<tr>
          <td>${i+1}</td>
          <td>${l.account_code} - ${l.account_name}</td>
          <td>${l.description||''}</td>
          <td style="text-align:left;font-family:monospace;">${l.debit > 0 ? formatNumber(l.debit) : ''}</td>
          <td style="text-align:left;font-family:monospace;">${l.credit > 0 ? formatNumber(l.credit) : ''}</td>
        </tr>`).join('')}
        <tr style="background:#e8f0fe;font-weight:bold;">
          <td colspan="3">المجموع</td>
          <td style="text-align:left;font-family:monospace;">${formatNumber(e.total_debit)}</td>
          <td style="text-align:left;font-family:monospace;">${formatNumber(e.total_credit)}</td>
        </tr>
      </tbody>
    </table>`;
  exportPDF(`قيد محاسبي رقم ${e.entry_number}`, html);
}

async function exportVoucherPDF(id) {
  const res = await apiFetch(`/vouchers/${id}`);
  if (!res.success) { showToast('خطأ', 'error'); return; }
  const v = res.data;
  const typeLabel = v.voucher_type === 'receipt' ? 'قبض' : 'صرف';
  const html = `
    <div style="margin-bottom:15px;">
      <h3 style="text-align:center; font-size:14pt; color:#1e3a5f; margin-bottom:10px;">سند ${typeLabel} رقم ${v.voucher_number}</h3>
      <table style="width:100%;"><tr>
        <td style="border:none;padding:5px;"><strong>التاريخ:</strong> ${v.voucher_date}</td>
        <td style="border:none;padding:5px;"><strong>المبلغ:</strong> ${formatNumber(v.amount)}</td>
        <td style="border:none;padding:5px;"><strong>المستفيد:</strong> ${v.beneficiary||'-'}</td>
        <td style="border:none;padding:5px;"><strong>طريقة الدفع:</strong> ${v.payment_method==='cash'?'نقد':v.payment_method==='check'?'شيك':'تحويل'}</td>
      </tr></table>
      ${v.description ? `<p style="margin:10px 0;"><strong>البيان:</strong> ${v.description}</p>` : ''}
      ${v.check_number ? `<p style="margin:5px 0;"><strong>رقم الشيك:</strong> ${v.check_number} | <strong>تاريخ الشيك:</strong> ${v.check_date||'-'} | <strong>البنك:</strong> ${v.bank_name||'-'}</p>` : ''}
    </div>
    ${v.details && v.details.length > 0 ? `
    <table>
      <thead><tr><th>#</th><th>الحساب</th><th>المبلغ</th><th>البيان</th></tr></thead>
      <tbody>
        ${v.details.map((d,i) => `<tr>
          <td>${i+1}</td>
          <td>${d.account_code||''} - ${d.account_name||''}</td>
          <td style="text-align:left;font-family:monospace;">${formatNumber(d.amount)}</td>
          <td>${d.description||''}</td>
        </tr>`).join('')}
        <tr style="background:#e8f0fe;font-weight:bold;">
          <td colspan="2">المجموع</td>
          <td style="text-align:left;font-family:monospace;">${formatNumber(v.amount)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>` : ''}`;
  exportPDF(`سند ${typeLabel} رقم ${v.voucher_number}`, html);
}

// Print with company header
function printReport(title, contentHtml) {
  const printWindow = window.open('', '_blank');
  const user = getUser();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { font-family: 'Tajawal', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
  body { padding: 20mm; color: #333; font-size: 11pt; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 16pt; margin-bottom: 3px; }
  .header h2 { font-size: 14pt; color: #555; margin-bottom: 5px; }
  .header .meta { font-size: 9pt; color: #777; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: right; font-size: 10pt; }
  th { background: #f0f0f0; font-weight: bold; }
  .total-row { background: #e8f0fe; font-weight: bold; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; }
  .signatures > div { padding-top: 8px; border-top: 1px solid #333; font-size: 10pt; }
  .footer { text-align: center; margin-top: 30px; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { @page { margin: 10mm; } }
</style></head>
<body>
  <div class="header">
    <h1>النظام المحاسبي</h1>
    <h2>${title}</h2>
    <p class="meta">التاريخ: ${new Date().toLocaleDateString('ar-IQ')} | المستخدم: ${user?.fullName || 'مدير'} | الوقت: ${new Date().toLocaleTimeString('ar-IQ')}</p>
  </div>
  ${contentHtml}
  <div class="signatures"><div>المحاسب</div><div>المدقق</div><div>المدير المالي</div></div>
  <div class="footer">النظام المحاسبي الحديث &copy; ${new Date().getFullYear()} - طُبع في ${new Date().toLocaleString('ar-IQ')}</div>
  <script>setTimeout(()=>{window.print();window.close()},500)</script>
</body></html>`);
  printWindow.document.close();
}

// ╔══════════════════════════════════════════════════╗
// ║                 PRINT HELPERS                      ║
// ╚══════════════════════════════════════════════════╝
function printTrialBalance() {
  const table = document.getElementById('trialBalanceTable');
  if (!table) { showToast('لا توجد بيانات', 'warning'); return; }
  printReport('ميزان المراجعة', table.outerHTML);
}

function printIncomeStatement() {
  const el = document.getElementById('incomeTable');
  if (!el) return;
  printReport('قائمة الدخل', el.innerHTML);
}

function printBalanceSheet() {
  const el = document.getElementById('bsResult');
  if (!el) { showToast('لا توجد بيانات', 'warning'); return; }
  printReport('الميزانية العمومية', el.innerHTML);
}

function exportBalanceSheetCSV() {
  const el = document.getElementById('bsResult');
  if (!el) { showToast('لا توجد بيانات', 'warning'); return; }
  let csv = '\uFEFF"القسم","الحساب","الرصيد"\n';
  el.querySelectorAll('.flex.justify-between.py-2').forEach(row => {
    const tds = row.querySelectorAll('span');
    if (tds.length >= 2) csv += `"","${tds[0].textContent.trim()}","${tds[1].textContent.trim()}"\n`;
  });
  downloadCSV(csv, 'الميزانية_العمومية');
}

function exportBalanceSheetExcel() {
  const el = document.getElementById('bsResult');
  if (!el) { showToast('لا توجد بيانات', 'warning'); return; }
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel غير متوفرة', 'error'); return; }
  try {
    const data = [];
    el.querySelectorAll('.flex.justify-between.py-2').forEach(row => {
      const tds = row.querySelectorAll('span');
      if (tds.length >= 2) data.push({ 'الحساب': tds[0].textContent.trim(), 'الرصيد': tds[1].textContent.trim() });
    });
    exportDataExcel(data, ['الحساب', 'الرصيد'], 'الميزانية_العمومية', 'الميزانية');
  } catch (e) { showToast('خطأ في التصدير', 'error'); }
}

// ╔══════════════════════════════════════════════════╗
// ║                 INITIALIZATION                    ║
// ╚══════════════════════════════════════════════════╝
(function init() {
  currentUser = getUser();
  if (!currentUser && !window.location.pathname.includes('/login')) { window.location.href = '/login'; return; }
  if (currentUser) {
    const nameEl = document.getElementById('userFullName'), roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = currentUser.fullName;
    const roles = { admin:'مدير النظام', manager:'مدير قسم', accountant:'محاسب', user:'مستخدم', viewer:'مشاهد' };
    if (roleEl) roleEl.textContent = roles[currentUser.role] || currentUser.role;
    // Set avatar initial
    const avatar = document.getElementById('userAvatar');
    if (avatar && currentUser.fullName) {
      avatar.innerHTML = `<span class="text-white font-bold text-sm">${currentUser.fullName.charAt(0)}</span>`;
    }
  }
  const now = new Date();
  const dateEl = document.getElementById('currentDate'), fyEl = document.getElementById('fiscalYearBadge');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (fyEl) fyEl.innerHTML = `<span class="badge badge-info">السنة المالية ${now.getFullYear()}</span>`;
  
  // Init notifications
  updateNotifBadge();

  buildSidebar().then(() => {
    const path = window.location.pathname.replace('/app', '') || '/dashboard';
    loadPage(path); updateActiveLink(path); updateBreadcrumb(path);
  });
  window.addEventListener('popstate', () => { const path = window.location.pathname.replace('/app', '') || '/dashboard'; loadPage(path); updateActiveLink(path); updateBreadcrumb(path); });
  
  // Close panels on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    if (menu && !menu.parentElement.contains(e.target)) menu.classList.add('hidden');
    const notifPanel = document.getElementById('notifPanel');
    const notifContainer = document.getElementById('notifContainer');
    if (notifPanel && notifContainer && !notifContainer.contains(e.target)) notifPanel.classList.add('hidden');
    // Close search results on outside click
    const searchContainer = document.getElementById('globalSearchContainer');
    const searchResults = document.getElementById('globalSearchResults');
    if (searchResults && searchContainer && !searchContainer.contains(e.target)) searchResults.classList.add('hidden');
  });

  // Keyboard shortcut Ctrl+K for global search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('globalSearchInput');
      if (input) { input.focus(); input.select(); }
    }
  });
})();
