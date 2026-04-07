import { Context, Next } from 'hono'

type Bindings = { DB: D1Database }

// استخراج معلومات المستخدم من التوكن
export async function getUserFromToken(c: Context<{ Bindings: Bindings }>) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = atob(token)
    const [userId] = decoded.split(':')
    const user = await c.env.DB.prepare(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = ? AND is_active = 1'
    ).bind(userId).first()
    return user
  } catch {
    return null
  }
}

// Middleware للتحقق من المصادقة
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = await getUserFromToken(c)
  if (!user) {
    return c.json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' }, 401)
  }
  c.set('user' as any, user)
  await next()
}

// Middleware للتحقق من دور المستخدم
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = c.get('user' as any) as any
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, message: 'غير مصرح - ليس لديك صلاحية لهذه العملية' }, 403)
    }
    await next()
  }
}
