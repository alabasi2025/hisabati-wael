import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const accountRoutes = new Hono<{ Bindings: Bindings }>()

// جلب كل الحسابات (شجري)
accountRoutes.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM accounts ORDER BY code'
    ).all()
    return c.json({ success: true, data: results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// جلب حساب واحد
accountRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first()
    if (!account) return c.json({ success: false, message: 'الحساب غير موجود' }, 404)
    return c.json({ success: true, data: account })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// إنشاء حساب جديد
accountRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { code, name_ar, name_en, parent_id, account_type, account_nature, is_parent, currency_id, notes } = body

    if (!code || !name_ar || !account_type || !account_nature) {
      return c.json({ success: false, message: 'يرجى ملء الحقول المطلوبة' }, 400)
    }

    // Check duplicate code
    const exists = await c.env.DB.prepare('SELECT id FROM accounts WHERE code = ?').bind(code).first()
    if (exists) return c.json({ success: false, message: 'رمز الحساب موجود مسبقاً' }, 400)

    // Calculate level
    let level = 1
    if (parent_id) {
      const parent = await c.env.DB.prepare('SELECT level FROM accounts WHERE id = ?').bind(parent_id).first() as any
      if (parent) level = parent.level + 1
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO accounts (code, name_ar, name_en, parent_id, account_type, account_nature, level, is_parent, currency_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(code, name_ar, name_en || null, parent_id || null, account_type, account_nature, level, is_parent ? 1 : 0, currency_id || 1, notes || null).run()

    // Mark parent as parent account
    if (parent_id) {
      await c.env.DB.prepare('UPDATE accounts SET is_parent = 1 WHERE id = ?').bind(parent_id).run()
    }

    // سجل المراجعة
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'accounts', result.meta.last_row_id, JSON.stringify({ code, name_ar, account_type })).run()

    return c.json({ success: true, message: 'تم إنشاء الحساب بنجاح', id: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// تعديل حساب
accountRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { code, name_ar, name_en, account_type, account_nature, is_parent, is_active, currency_id, notes } = body

    await c.env.DB.prepare(`
      UPDATE accounts SET code=?, name_ar=?, name_en=?, account_type=?, account_nature=?, 
      is_parent=?, is_active=?, currency_id=?, notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(code, name_ar, name_en || null, account_type, account_nature, is_parent ? 1 : 0, is_active ? 1 : 0, currency_id || 1, notes || null, id).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'accounts', id, JSON.stringify({ code, name_ar })).run()

    return c.json({ success: true, message: 'تم تعديل الحساب بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// حذف حساب
accountRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    // Check if account has children
    const children = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM accounts WHERE parent_id = ?').bind(id).first() as any
    if (children?.cnt > 0) {
      return c.json({ success: false, message: 'لا يمكن حذف حساب له حسابات فرعية' }, 400)
    }
    // Check if account has transactions
    const transactions = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM journal_entry_lines WHERE account_id = ?').bind(id).first() as any
    if (transactions?.cnt > 0) {
      return c.json({ success: false, message: 'لا يمكن حذف حساب له قيود محاسبية' }, 400)
    }

    const acc = await c.env.DB.prepare('SELECT code, name_ar FROM accounts WHERE id = ?').bind(id).first()
    await c.env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, old_data) VALUES (?, ?, ?, ?)').bind('delete', 'accounts', id, JSON.stringify(acc)).run()
    return c.json({ success: true, message: 'تم حذف الحساب بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// البحث في الحسابات
accountRoutes.get('/search/:query', async (c) => {
  try {
    const query = c.req.param('query')
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM accounts WHERE name_ar LIKE ? OR code LIKE ? OR name_en LIKE ? ORDER BY code LIMIT 20"
    ).bind(`%${query}%`, `%${query}%`, `%${query}%`).all()
    return c.json({ success: true, data: results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// جلب الحسابات الفرعية فقط (غير أب)
accountRoutes.get('/leaf/all', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, code, name_ar FROM accounts WHERE is_parent = 0 AND is_active = 1 ORDER BY code'
    ).all()
    return c.json({ success: true, data: results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
