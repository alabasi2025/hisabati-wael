export function loginPage(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تسجيل الدخول - النظام المحاسبي</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Tajawal', sans-serif; }
    .login-bg {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
      min-height: 100vh;
    }
    .glass-card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .input-field {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      transition: all 0.3s;
    }
    .input-field:focus {
      background: rgba(255,255,255,0.12);
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
    }
    .btn-login {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      transition: all 0.3s;
    }
    .btn-login:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(37,99,235,0.3);
    }
    .floating-shapes div {
      position: absolute;
      border-radius: 50%;
      opacity: 0.03;
      animation: float 20s infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      33% { transform: translateY(-30px) rotate(120deg); }
      66% { transform: translateY(20px) rotate(240deg); }
    }
  </style>
</head>
<body class="login-bg flex items-center justify-center relative overflow-hidden">
  <div class="floating-shapes">
    <div class="w-96 h-96 bg-blue-500" style="top:-10%;right:-5%;"></div>
    <div class="w-72 h-72 bg-cyan-500" style="bottom:-5%;left:-3%;animation-delay:-7s;"></div>
    <div class="w-64 h-64 bg-indigo-500" style="top:40%;right:30%;animation-delay:-14s;"></div>
  </div>

  <div class="w-full max-w-md mx-4 relative z-10">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card mb-4">
        <i class="fas fa-building-columns text-3xl text-blue-400"></i>
      </div>
      <h1 class="text-3xl font-bold text-white mb-2">النظام المحاسبي</h1>
      <p class="text-gray-400 text-sm">نظام إدارة مالية ومحاسبية متكامل</p>
    </div>

    <!-- Login Card -->
    <div class="glass-card rounded-2xl p-8">
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div id="errorMsg" class="hidden bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
          <i class="fas fa-exclamation-circle ml-2"></i>
          <span id="errorText"></span>
        </div>

        <!-- Username -->
        <div class="mb-5">
          <label class="block text-gray-300 text-sm font-medium mb-2">
            <i class="fas fa-user ml-1"></i> اسم المستخدم
          </label>
          <input type="text" id="username" name="username"
            class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
            placeholder="أدخل اسم المستخدم" required autocomplete="username">
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label class="block text-gray-300 text-sm font-medium mb-2">
            <i class="fas fa-lock ml-1"></i> كلمة المرور
          </label>
          <div class="relative">
            <input type="password" id="password" name="password"
              class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
              placeholder="أدخل كلمة المرور" required autocomplete="current-password">
            <button type="button" onclick="togglePassword()" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <i class="fas fa-eye" id="eyeIcon"></i>
            </button>
          </div>
        </div>

        <!-- Remember Me -->
        <div class="flex items-center justify-between mb-6">
          <label class="flex items-center text-gray-400 text-sm cursor-pointer">
            <input type="checkbox" id="remember" class="ml-2 rounded bg-gray-700 border-gray-600">
            تذكرني
          </label>
        </div>

        <!-- Login Button -->
        <button type="submit" id="loginBtn"
          class="btn-login w-full py-3 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2">
          <span id="loginText">تسجيل الدخول</span>
          <i class="fas fa-spinner fa-spin hidden" id="loginSpinner"></i>
        </button>
      </form>
    </div>

    <p class="text-center text-gray-600 text-xs mt-6">
      النظام المحاسبي الحديث &copy; 2026 - جميع الحقوق محفوظة
    </p>
  </div>

  <script>
    function togglePassword() {
      const input = document.getElementById('password');
      const icon = document.getElementById('eyeIcon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const spinner = document.getElementById('loginSpinner');
      const text = document.getElementById('loginText');
      const errorDiv = document.getElementById('errorMsg');
      const errorText = document.getElementById('errorText');

      spinner.classList.remove('hidden');
      text.textContent = 'جاري الدخول...';
      btn.disabled = true;
      errorDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
          })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/app';
        } else {
          errorText.textContent = data.message || 'خطأ في اسم المستخدم أو كلمة المرور';
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorText.textContent = 'خطأ في الاتصال بالخادم';
        errorDiv.classList.remove('hidden');
      } finally {
        spinner.classList.add('hidden');
        text.textContent = 'تسجيل الدخول';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`
}
