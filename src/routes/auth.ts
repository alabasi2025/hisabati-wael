import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// Helper: Encode UTF-8 string to base64
function encodeBase64(str: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary)
}

// Helper: Decode base64 to UTF-8 string
function decodeBase64(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

// تسجيل الدخول
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) {
    return c.json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, 400)
  }
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, full_name, role, is_active FROM users WHERE username = ? AND password_hash = ?'
    ).bind(username, password).first()

    if (!user) {
      return c.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401)
    }
    if (!user.is_active) {
      return c.json({ success: false, message: 'هذا الحساب معطل - تواصل مع مدير النظام' }, 403)
    }

    // Update last login
    await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()

    // Generate token (supports Arabic usernames)
    const token = encodeBase64(`${user.id}:${user.username}:${Date.now()}`)

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    })
  } catch (e: any) {
    return c.json({ success: false, message: 'خطأ في الخادم' }, 500)
  }
})

// التحقق من الجلسة
authRoutes.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ success: false, message: 'غير مصرح' }, 401)
  }
  try {
    const decoded = decodeBase64(token)
    const [userId] = decoded.split(':')
    const user = await c.env.DB.prepare(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active = 1'
    ).bind(userId).first()

    if (!user) {
      return c.json({ success: false, message: 'جلسة غير صالحة' }, 401)
    }
    return c.json({ success: true, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } })
  } catch {
    return c.json({ success: false, message: 'جلسة غير صالحة' }, 401)
  }
})
