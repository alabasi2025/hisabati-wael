export function mainLayout(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>النظام المحاسبي</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Tajawal', 'sans-serif'] },
          colors: {
            primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a5f' },
            dark: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' }
          }
        }
      }
    }
  </script>
  <style>
    * { font-family: 'Tajawal', sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #1e293b; }
    ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #64748b; }
    .sidebar-link { transition: all 0.2s; }
    .sidebar-link:hover { background: rgba(59,130,246,0.1); }
    .sidebar-link.active { background: rgba(59,130,246,0.15); border-right: 3px solid #3b82f6; color: #60a5fa; }
    .sidebar-group > .sidebar-children { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
    .sidebar-group.open > .sidebar-children { max-height: 500px; }
    .sidebar-group > button .chevron { transition: transform 0.3s; }
    .sidebar-group.open > button .chevron { transform: rotate(90deg); }
    .stat-card { transition: all 0.3s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    .table-row { transition: background 0.15s; }
    .table-row:hover { background: rgba(59,130,246,0.05); }
    .modal-overlay { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .toast { animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge-warning { background: rgba(234,179,8,0.15); color: #eab308; }
    .badge-danger { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-info { background: rgba(59,130,246,0.15); color: #3b82f6; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      body { background: white !important; }
    }
  </style>
</head>
<body class="bg-dark-950 text-gray-200 min-h-screen">
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside id="sidebar" class="w-64 bg-dark-900 border-l border-dark-700 flex flex-col fixed h-full z-30 transition-all duration-300">
      <!-- Logo -->
      <div class="p-4 border-b border-dark-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <i class="fas fa-building-columns text-white text-lg"></i>
          </div>
          <div>
            <h1 class="font-bold text-white text-sm">النظام المحاسبي</h1>
            <p class="text-[10px] text-gray-500">الإصدار 2.0</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-1" id="sidebarNav">
        <!-- Will be populated by JS -->
      </nav>

      <!-- User Info -->
      <div class="p-3 border-t border-dark-700">
        <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 cursor-pointer" onclick="toggleUserMenu()">
          <div class="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center">
            <i class="fas fa-user text-white text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate" id="userFullName">مدير النظام</p>
            <p class="text-[10px] text-gray-500" id="userRole">مدير</p>
          </div>
          <i class="fas fa-ellipsis-v text-gray-500 text-xs"></i>
        </div>
        <div id="userMenu" class="hidden mt-2 bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
          <button onclick="navigate('/admin/settings')" class="w-full text-right px-4 py-2 text-sm text-gray-300 hover:bg-dark-700 flex items-center gap-2">
            <i class="fas fa-cog w-4"></i> الإعدادات
          </button>
          <button onclick="handleLogout()" class="w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-dark-700 flex items-center gap-2">
            <i class="fas fa-sign-out-alt w-4"></i> تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 mr-64 transition-all duration-300">
      <!-- Top Bar -->
      <header class="bg-dark-900/80 backdrop-blur-lg border-b border-dark-700 px-6 py-3 sticky top-0 z-20 no-print">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white lg:hidden">
              <i class="fas fa-bars text-lg"></i>
            </button>
            <div id="breadcrumb" class="flex items-center gap-2 text-sm">
              <span class="text-gray-500"><i class="fas fa-home"></i></span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500" id="currentDate"></span>
            <span class="text-xs text-gray-500" id="fiscalYearBadge"></span>
            <button onclick="window.print()" class="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-800" title="طباعة">
              <i class="fas fa-print text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div id="pageContent" class="p-6">
        <!-- Dynamic content loads here -->
      </div>
    </main>
  </div>

  <!-- Toast Container -->
  <div id="toastContainer" class="fixed top-4 left-4 z-50 space-y-2"></div>

  <!-- Modal Container -->
  <div id="modalContainer"></div>

  <script src="/static/js/app.js"></script>
</body>
</html>`
}
