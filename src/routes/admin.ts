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

    // سجل المراجعة
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'users', result.meta.last_row_id, JSON.stringify({ username, full_name, role })).run()

    return c.json({ success: true, message: 'تم إنشاء المستخدم بنجاح', id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { full_name, email, phone, role, is_active, password } = await c.req.json()

    // Get old data for audit
    const old = await c.env.DB.prepare('SELECT full_name, email, phone, role, is_active FROM users WHERE id = ?').bind(id).first()

    if (password) {
      await c.env.DB.prepare('UPDATE users SET full_name=?, email=?, phone=?, role=?, is_active=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(full_name, email, phone, role, is_active ? 1 : 0, password, id).run()
    } else {
      await c.env.DB.prepare('UPDATE users SET full_name=?, email=?, phone=?, role=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(full_name, email, phone, role, is_active ? 1 : 0, id).run()
    }

    // سجل المراجعة
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?)').bind('update', 'users', id, JSON.stringify(old), JSON.stringify({ full_name, email, phone, role, is_active })).run()

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
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, new_data) VALUES (?, ?, ?)').bind('update', 'settings', JSON.stringify(settings)).run()
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
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'currencies', result.meta.last_row_id, JSON.stringify({ code, name_ar, exchange_rate })).run()
    return c.json({ success: true, message: 'تمت إضافة العملة بنجاح', id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/currencies/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name_ar, name_en, symbol, exchange_rate, is_active } = await c.req.json()
    await c.env.DB.prepare('UPDATE currencies SET name_ar=?, name_en=?, symbol=?, exchange_rate=?, is_active=? WHERE id=?').bind(name_ar, name_en, symbol, exchange_rate, is_active ? 1 : 0, id).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'currencies', id, JSON.stringify({ name_ar, exchange_rate })).run()
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

adminRoutes.post('/fiscal-years', async (c) => {
  try {
    const { year, start_date, end_date } = await c.req.json()
    if (!year || !start_date || !end_date) return c.json({ success: false, message: 'يرجى ملء جميع الحقول' }, 400)

    const exists = await c.env.DB.prepare('SELECT id FROM fiscal_years WHERE year = ?').bind(year).first()
    if (exists) return c.json({ success: false, message: 'هذه السنة المالية موجودة مسبقاً' }, 400)

    const result = await c.env.DB.prepare('INSERT INTO fiscal_years (year, start_date, end_date, is_active, is_closed) VALUES (?, ?, ?, 0, 0)').bind(year, start_date, end_date).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'fiscal_years', result.meta.last_row_id, JSON.stringify({ year, start_date, end_date })).run()

    return c.json({ success: true, message: 'تم إنشاء السنة المالية بنجاح', id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.post('/fiscal-years/:id/activate', async (c) => {
  try {
    const id = c.req.param('id')
    const fy = await c.env.DB.prepare('SELECT * FROM fiscal_years WHERE id = ?').bind(id).first()
    if (!fy) return c.json({ success: false, message: 'السنة المالية غير موجودة' }, 404)
    if (fy.is_closed) return c.json({ success: false, message: 'لا يمكن تفعيل سنة مالية مغلقة' }, 400)

    // Deactivate all others first
    await c.env.DB.prepare('UPDATE fiscal_years SET is_active = 0').run()
    await c.env.DB.prepare('UPDATE fiscal_years SET is_active = 1 WHERE id = ?').bind(id).run()

    // Update settings
    await c.env.DB.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'fiscal_year'").bind(String(fy.year)).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('activate', 'fiscal_years', id, JSON.stringify({ year: fy.year })).run()

    return c.json({ success: true, message: `تم تفعيل السنة المالية ${fy.year} بنجاح` })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.post('/fiscal-years/:id/close', async (c) => {
  try {
    const id = c.req.param('id')
    const fy = await c.env.DB.prepare('SELECT * FROM fiscal_years WHERE id = ?').bind(id).first()
    if (!fy) return c.json({ success: false, message: 'السنة المالية غير موجودة' }, 404)
    if (fy.is_closed) return c.json({ success: false, message: 'السنة المالية مغلقة بالفعل' }, 400)

    // Check for draft entries in this fiscal year
    const draftCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM journal_entries WHERE fiscal_year_id = ? AND status = 'draft'").bind(id).first()
    if (draftCount && (draftCount.cnt as number) > 0) {
      return c.json({ success: false, message: `لا يمكن إغلاق السنة، يوجد ${draftCount.cnt} قيد مسودة يجب ترحيله أو حذفه` }, 400)
    }

    // Check for draft vouchers
    const draftVouchers = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM vouchers WHERE fiscal_year_id = ? AND status = 'draft'").bind(id).first()
    if (draftVouchers && (draftVouchers.cnt as number) > 0) {
      return c.json({ success: false, message: `لا يمكن إغلاق السنة، يوجد ${draftVouchers.cnt} سند مسودة يجب ترحيله أو حذفه` }, 400)
    }

    await c.env.DB.prepare('UPDATE fiscal_years SET is_closed = 1, is_active = 0 WHERE id = ?').bind(id).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('close', 'fiscal_years', id, JSON.stringify({ year: fy.year })).run()

    return c.json({ success: true, message: `تم إغلاق السنة المالية ${fy.year} بنجاح` })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === سجل المراجعة ===
adminRoutes.get('/audit-log', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const table = c.req.query('table') || ''
    const action = c.req.query('action') || ''
    const offset = (page - 1) * limit

    let where = '1=1'
    const params: any[] = []
    if (table) { where += ' AND a.table_name = ?'; params.push(table) }
    if (action) { where += ' AND a.action = ?'; params.push(action) }

    // Count
    const countStmt = c.env.DB.prepare(`SELECT COUNT(*) as total FROM audit_log a WHERE ${where}`)
    const countResult = await (params.length > 0 ? countStmt.bind(...params) : countStmt).first()

    // Data
    const dataStmt = c.env.DB.prepare(`SELECT a.*, u.full_name as user_name FROM audit_log a LEFT JOIN users u ON a.user_id = u.id WHERE ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`)
    const allParams = [...params, limit, offset]
    const { results } = await (allParams.length > 0 ? dataStmt.bind(...allParams) : dataStmt).all()

    return c.json({ success: true, data: results, total: countResult?.total || 0, page, limit })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === صلاحيات المستخدمين ===
adminRoutes.get('/users/:id/permissions', async (c) => {
  try {
    const userId = c.req.param('id')
    const { results: modules } = await c.env.DB.prepare("SELECT * FROM modules WHERE module_type != 'group' ORDER BY sort_order").all()
    const { results: permissions } = await c.env.DB.prepare('SELECT * FROM user_permissions WHERE user_id = ?').bind(userId).all()
    const permMap: any = {}
    permissions.forEach((p: any) => { permMap[p.module_id] = p })
    return c.json({ success: true, data: { modules, permissions: permMap } })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

adminRoutes.put('/users/:id/permissions', async (c) => {
  try {
    const userId = c.req.param('id')
    const { permissions } = await c.req.json()
    // حذف الصلاحيات القديمة
    await c.env.DB.prepare('DELETE FROM user_permissions WHERE user_id = ?').bind(userId).run()
    // إدراج الجديدة
    for (const perm of permissions) {
      await c.env.DB.prepare(
        'INSERT INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, can_print) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(userId, perm.module_id, perm.can_view ? 1 : 0, perm.can_create ? 1 : 0, perm.can_edit ? 1 : 0, perm.can_delete ? 1 : 0, perm.can_print ? 1 : 0).run()
    }
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'user_permissions', userId, JSON.stringify({ count: permissions.length })).run()
    return c.json({ success: true, message: 'تم تحديث الصلاحيات بنجاح' })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})

// === الوحدات (القائمة) ===
adminRoutes.get('/modules', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM modules ORDER BY sort_order').all()
    return c.json({ success: true, data: results })
  } catch (e: any) { return c.json({ success: false, message: e.message }, 500) }
})
