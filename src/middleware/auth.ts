import { Context, Next } from 'hono'

type Bindings = { DB: D1Database }
type Variables = { user: any; userId: number }

// Helper: Decode base64 to UTF-8 string
function decodeBase64(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

// استخراج معلومات المستخدم من التوكن
export async function getUserFromToken(c: Context<{ Bindings: Bindings }>) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = decodeBase64(token)
    const [userId, username, timestamp] = decoded.split(':')
    if (!userId || !username) return null
    
    // Token expiry check (24 hours)
    const tokenTime = parseInt(timestamp)
    if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) return null

    const user = await c.env.DB.prepare(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = ? AND is_active = 1'
    ).bind(userId).first()
    return user
  } catch {
    return null
  }
}

// Middleware للتحقق من المصادقة
export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const user = await getUserFromToken(c)
  if (!user) {
    return c.json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' }, 401)
  }
  c.set('user', user)
  c.set('userId', user.id as number)
  await next()
}

// Middleware للتحقق من دور المستخدم
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as any
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, message: 'غير مصرح - ليس لديك صلاحية لهذه العملية' }, 403)
    }
    await next()
  }
}

// Middleware للتحقق من صلاحية معينة على وحدة
export function requirePermission(moduleRoute: string, permission: string) {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as any
    if (!user) return c.json({ success: false, message: 'غير مصرح' }, 401)
    
    // Admin has all permissions
    if (user.role === 'admin') {
      await next()
      return
    }

    try {
      const module = await c.env.DB.prepare(
        'SELECT id FROM modules WHERE route = ?'
      ).bind(moduleRoute).first() as any
      
      if (!module) { await next(); return }

      const perm = await c.env.DB.prepare(
        `SELECT can_${permission} as has_perm FROM user_permissions WHERE user_id = ? AND module_id = ?`
      ).bind(user.id, module.id).first() as any

      if (!perm || !perm.has_perm) {
        return c.json({ success: false, message: 'ليس لديك صلاحية لهذه العملية' }, 403)
      }
    } catch {
      // If permission check fails, allow admin to proceed
    }
    await next()
  }
}
