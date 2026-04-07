import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const adminRoutes = new Hono<{ Bindings: Bindings }>()

// === المستخدمين ===
adminRoutes.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, username, full_name, email, phone, role, is_active, last_login, created_at FROM users ORDER BY id').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.post('/users', async (c) => {
  try {
    const { username, password, full_name, email, phone, role } = await c.req.json()
    if (!username || !password || !full_name) return c.json({ success: false, message: 'يرجى ملء الحقول المطلوبة' }, 400)
    const exists = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (exists) return c.json({ success: false, message: 'اسم المستخدم مستخدم مسبقاً' }, 400)
    const result = await c.env.DB.prepare('INSERT INTO users (username, password_hash, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)').bind(username, password, full_name, email || null, phone || null, role || 'user').run()
    return c.json({ success: true, message: 'تم إنشاء المستخدم بنجاح', id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { full_name, email, phone, role, is_active, password } = await c.req.json()
    if (password) {
      await c.env.DB.prepare('UPDATE users SET full_name=?, email=?, phone=?, role=?, is_active=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(full_name, email, phone, role, is_active ? 1 : 0, password, id).run()
    } else {
      await c.env.DB.prepare('UPDATE users SET full_name=?, email=?, phone=?, role=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(full_name, email, phone, role, is_active ? 1 : 0, id).run()
    }
    return c.json({ success: true, message: 'تم تعديل المستخدم بنجاح' })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === الإعدادات ===
adminRoutes.get('/settings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM settings ORDER BY key').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/settings', async (c) => {
  try {
    const settings = await c.req.json()
    for (const [key, value] of Object.entries(settings)) {
      await c.env.DB.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').bind(value as string, key).run()
    }
    return c.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === العملات ===
adminRoutes.get('/currencies', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM currencies ORDER BY id').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.post('/currencies', async (c) => {
  try {
    const { code, name_ar, name_en, symbol, exchange_rate } = await c.req.json()
    const result = await c.env.DB.prepare('INSERT INTO currencies (code, name_ar, name_en, symbol, exchange_rate) VALUES (?, ?, ?, ?, ?)').bind(code, name_ar, name_en || null, symbol || null, exchange_rate || 1).run()
    return c.json({ success: true, message: 'تمت إضافة العملة بنجاح', id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/currencies/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name_ar, name_en, symbol, exchange_rate, is_active } = await c.req.json()
    await c.env.DB.prepare('UPDATE currencies SET name_ar=?, name_en=?, symbol=?, exchange_rate=?, is_active=? WHERE id=?').bind(name_ar, name_en, symbol, exchange_rate, is_active ? 1 : 0, id).run()
    return c.json({ success: true, message: 'تم تعديل العملة بنجاح' })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === السنوات المالية ===
adminRoutes.get('/fiscal-years', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM fiscal_years ORDER BY year DESC').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === الوحدات (القائمة) ===
adminRoutes.get('/modules', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM modules ORDER BY sort_order').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})
