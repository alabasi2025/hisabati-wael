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
    .input-field.error {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.2);
    }
    .btn-login {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      transition: all 0.3s;
    }
    .btn-login:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(37,99,235,0.3);
    }
    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
    .shake { animation: shake 0.4s ease; }
    .field-error { color: #f87171; font-size: 0.75rem; margin-top: 4px; display: none; }
    .field-error.visible { display: block; }
    @keyframes fadeSlide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-slide { animation: fadeSlide 0.3s ease; }
    .caps-warning { display: none; color: #fbbf24; font-size: 0.75rem; margin-top: 4px; }
    .caps-warning.visible { display: flex; align-items: center; gap: 4px; }
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
      <form id="loginForm" onsubmit="handleLogin(event)" novalidate>
        <div id="errorMsg" class="hidden bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm fade-slide">
          <i class="fas fa-exclamation-circle ml-2"></i>
          <span id="errorText"></span>
        </div>

        <div id="successMsg" class="hidden bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-xl mb-4 text-sm fade-slide">
          <i class="fas fa-check-circle ml-2"></i>
          <span id="successText">تم تسجيل الدخول بنجاح! جاري التحويل...</span>
        </div>

        <!-- Username -->
        <div class="mb-5">
          <label class="block text-gray-300 text-sm font-medium mb-2">
            <i class="fas fa-user ml-1"></i> اسم المستخدم
          </label>
          <input type="text" id="username" name="username"
            class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
            placeholder="أدخل اسم المستخدم" required autocomplete="username"
            oninput="clearFieldError('username')" onblur="validateField('username')">
          <p class="field-error" id="usernameError">يرجى إدخال اسم المستخدم</p>
        </div>

        <!-- Password -->
        <div class="mb-5">
          <label class="block text-gray-300 text-sm font-medium mb-2">
            <i class="fas fa-lock ml-1"></i> كلمة المرور
          </label>
          <div class="relative">
            <input type="password" id="password" name="password"
              class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
              placeholder="أدخل كلمة المرور" required autocomplete="current-password"
              oninput="clearFieldError('password')" onblur="validateField('password')"
              onkeyup="checkCapsLock(event)">
            <button type="button" onclick="togglePassword()" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
              <i class="fas fa-eye" id="eyeIcon"></i>
            </button>
          </div>
          <p class="field-error" id="passwordError">يرجى إدخال كلمة المرور</p>
          <div class="caps-warning" id="capsWarning"><i class="fas fa-exclamation-triangle text-xs"></i> <span>مفتاح Caps Lock مفعّل</span></div>
        </div>

        <!-- Remember Me + Attempts -->
        <div class="flex items-center justify-between mb-6">
          <label class="flex items-center text-gray-400 text-sm cursor-pointer hover:text-gray-300 transition">
            <input type="checkbox" id="remember" class="ml-2 rounded bg-gray-700 border-gray-600">
            تذكرني
          </label>
          <span id="attemptsInfo" class="text-gray-600 text-xs hidden"></span>
        </div>

        <!-- Login Button -->
        <button type="submit" id="loginBtn"
          class="btn-login w-full py-3.5 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2">
          <i class="fas fa-sign-in-alt" id="loginIcon"></i>
          <span id="loginText">تسجيل الدخول</span>
          <i class="fas fa-spinner fa-spin hidden" id="loginSpinner"></i>
        </button>
      </form>

      <!-- Demo credentials -->
      <div class="mt-6 pt-4 border-t border-white/10">
        <p class="text-gray-500 text-xs text-center mb-3">تسجيل دخول سريع:</p>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="quickLogin('admin','admin123')" class="glass-card px-3 py-2 rounded-lg text-gray-400 text-xs hover:text-white hover:border-blue-500/30 transition flex items-center gap-2 justify-center">
            <i class="fas fa-user-shield text-blue-400"></i> مدير النظام
          </button>
          <button onclick="quickLogin('محاسب','user123')" class="glass-card px-3 py-2 rounded-lg text-gray-400 text-xs hover:text-white hover:border-green-500/30 transition flex items-center gap-2 justify-center">
            <i class="fas fa-calculator text-green-400"></i> محاسب
          </button>
        </div>
      </div>
    </div>

    <p class="text-center text-gray-600 text-xs mt-6">
      النظام المحاسبي الحديث &copy; 2026 - الإصدار 3.0
    </p>
  </div>

  <script>
    let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
    let lockUntil = parseInt(localStorage.getItem('lockUntil') || '0');

    // Check if locked
    function checkLock() {
      const now = Date.now();
      if (lockUntil > now) {
        const remaining = Math.ceil((lockUntil - now) / 1000);
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        document.getElementById('loginText').textContent = 'محاولة بعد ' + remaining + ' ثانية';
        document.getElementById('loginIcon').className = 'fas fa-lock';
        setTimeout(checkLock, 1000);
        return true;
      } else if (lockUntil > 0) {
        lockUntil = 0;
        loginAttempts = 0;
        localStorage.removeItem('lockUntil');
        localStorage.setItem('loginAttempts', '0');
        const btn = document.getElementById('loginBtn');
        btn.disabled = false;
        document.getElementById('loginText').textContent = 'تسجيل الدخول';
        document.getElementById('loginIcon').className = 'fas fa-sign-in-alt';
      }
      return false;
    }
    checkLock();

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

    function checkCapsLock(e) {
      const warning = document.getElementById('capsWarning');
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        warning.classList.add('visible');
      } else {
        warning.classList.remove('visible');
      }
    }

    function validateField(field) {
      const el = document.getElementById(field);
      const errEl = document.getElementById(field + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error');
        errEl.classList.add('visible');
        return false;
      }
      el.classList.remove('error');
      errEl.classList.remove('visible');
      return true;
    }

    function clearFieldError(field) {
      const el = document.getElementById(field);
      const errEl = document.getElementById(field + 'Error');
      el.classList.remove('error');
      errEl.classList.remove('visible');
      document.getElementById('errorMsg').classList.add('hidden');
    }

    function quickLogin(user, pass) {
      document.getElementById('username').value = user;
      document.getElementById('password').value = pass;
      clearFieldError('username');
      clearFieldError('password');
      document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
    }

    async function handleLogin(e) {
      e.preventDefault();
      if (checkLock()) return;

      // Validate fields
      const userValid = validateField('username');
      const passValid = validateField('password');
      if (!userValid || !passValid) {
        document.querySelector('.glass-card').classList.add('shake');
        setTimeout(() => document.querySelector('.glass-card').classList.remove('shake'), 400);
        return;
      }

      const btn = document.getElementById('loginBtn');
      const spinner = document.getElementById('loginSpinner');
      const icon = document.getElementById('loginIcon');
      const text = document.getElementById('loginText');
      const errorDiv = document.getElementById('errorMsg');
      const errorText = document.getElementById('errorText');
      const successDiv = document.getElementById('successMsg');

      spinner.classList.remove('hidden');
      icon.classList.add('hidden');
      text.textContent = 'جاري التحقق...';
      btn.disabled = true;
      errorDiv.classList.add('hidden');
      successDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value
          })
        });
        const data = await res.json();
        if (data.success) {
          // Reset attempts
          loginAttempts = 0;
          localStorage.setItem('loginAttempts', '0');
          localStorage.removeItem('lockUntil');

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Show success
          successDiv.classList.remove('hidden');
          text.textContent = 'تم بنجاح!';
          icon.className = 'fas fa-check';
          icon.classList.remove('hidden');
          spinner.classList.add('hidden');
          btn.className = btn.className.replace('btn-login', '') + ' bg-green-600 cursor-default';

          setTimeout(() => { window.location.href = '/app'; }, 800);
        } else {
          loginAttempts++;
          localStorage.setItem('loginAttempts', String(loginAttempts));

          // Lock after 5 attempts
          if (loginAttempts >= 5) {
            lockUntil = Date.now() + 30000; // 30 seconds
            localStorage.setItem('lockUntil', String(lockUntil));
            errorText.textContent = 'تم قفل الحساب مؤقتاً بسبب محاولات متكررة. انتظر 30 ثانية.';
            checkLock();
          } else {
            errorText.textContent = data.message || 'خطأ في اسم المستخدم أو كلمة المرور';
            const remaining = 5 - loginAttempts;
            const attInfo = document.getElementById('attemptsInfo');
            attInfo.textContent = 'متبقي ' + remaining + ' محاولات';
            attInfo.classList.remove('hidden');
          }

          errorDiv.classList.remove('hidden');
          document.querySelector('.glass-card').classList.add('shake');
          setTimeout(() => document.querySelector('.glass-card').classList.remove('shake'), 400);
        }
      } catch (err) {
        errorText.textContent = 'خطأ في الاتصال بالخادم - تحقق من اتصالك بالإنترنت';
        errorDiv.classList.remove('hidden');
      } finally {
        if (!document.getElementById('successMsg').classList.contains('hidden')) return;
        spinner.classList.add('hidden');
        icon.className = 'fas fa-sign-in-alt';
        icon.classList.remove('hidden');
        text.textContent = 'تسجيل الدخول';
        btn.disabled = false;
      }
    }

    // Auto-focus username
    document.getElementById('username').focus();

    // Enter key navigation
    document.getElementById('username').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('password').focus(); }
    });
  </script>
</body>
</html>`
}
