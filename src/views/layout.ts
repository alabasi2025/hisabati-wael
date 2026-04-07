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
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
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
  <link href="/static/css/style.css" rel="stylesheet">
</head>
<body class="bg-dark-950 text-gray-200 min-h-screen">
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside id="sidebar" class="w-64 bg-dark-900 border-l border-dark-700 flex flex-col fixed h-full z-30 transition-all duration-300">
      <!-- Logo -->
      <div class="p-4 border-b border-dark-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <i class="fas fa-building-columns text-white text-lg"></i>
          </div>
          <div>
            <h1 class="font-bold text-white text-sm">النظام المحاسبي</h1>
            <p class="text-[10px] text-gray-500">الإصدار 3.0</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-1" id="sidebarNav"></nav>

      <!-- User Info -->
      <div class="p-3 border-t border-dark-700">
        <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 cursor-pointer transition" onclick="toggleUserMenu()">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md" id="userAvatar">
            <i class="fas fa-user text-white text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate" id="userFullName">مدير النظام</p>
            <p class="text-[10px] text-gray-500" id="userRole">مدير</p>
          </div>
          <i class="fas fa-ellipsis-v text-gray-500 text-xs"></i>
        </div>
        <div id="userMenu" class="hidden mt-2 bg-dark-800 rounded-xl border border-dark-600 overflow-hidden shadow-xl">
          <button onclick="navigate('/admin/settings')" class="w-full text-right px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 flex items-center gap-2 transition">
            <i class="fas fa-cog w-4 text-gray-500"></i> الإعدادات
          </button>
          <button onclick="navigate('/admin/users')" class="w-full text-right px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 flex items-center gap-2 transition">
            <i class="fas fa-users w-4 text-gray-500"></i> المستخدمين
          </button>
          <div class="border-t border-dark-700"></div>
          <button onclick="handleLogout()" class="w-full text-right px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition">
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
            <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white lg:hidden transition">
              <i class="fas fa-bars text-lg"></i>
            </button>
            <div id="breadcrumb" class="flex items-center gap-2 text-sm">
              <span class="text-gray-500"><i class="fas fa-home"></i></span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500" id="currentDate"></span>
            <span id="fiscalYearBadge"></span>
            <!-- Notifications -->
            <div class="relative" id="notifContainer">
              <button onclick="toggleNotifications()" class="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-800 transition relative" title="الإشعارات">
                <i class="fas fa-bell text-sm"></i>
                <span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">0</span>
              </button>
              <div id="notifPanel" class="hidden absolute left-0 top-full mt-2 w-80 bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
                  <span class="text-white font-bold text-sm">الإشعارات</span>
                  <button onclick="clearNotifications()" class="text-gray-500 text-xs hover:text-gray-300 transition">مسح الكل</button>
                </div>
                <div id="notifList" class="max-h-64 overflow-y-auto">
                  <div class="p-4 text-center text-gray-500 text-sm"><i class="fas fa-bell-slash text-2xl mb-2 block opacity-40"></i>لا توجد إشعارات</div>
                </div>
              </div>
            </div>
            <button onclick="window.print()" class="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-800 transition" title="طباعة">
              <i class="fas fa-print text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div id="pageContent" class="p-6"></div>
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
