import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const costCenterRoutes = new Hono<{ Bindings: Bindings }>()

// جلب مراكز التكلفة
costCenterRoutes.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM cost_centers ORDER BY code'
    ).all()
    return c.json({ success: true, data: results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// إنشاء مركز تكلفة
costCenterRoutes.post('/', async (c) => {
  try {
    const { code, name_ar, name_en, parent_id } = await c.req.json()
    if (!code || !name_ar) return c.json({ success: false, message: 'يرجى ملء الحقول المطلوبة' }, 400)

    const exists = await c.env.DB.prepare('SELECT id FROM cost_centers WHERE code = ?').bind(code).first()
    if (exists) return c.json({ success: false, message: 'رمز مركز التكلفة موجود مسبقاً' }, 400)

    const result = await c.env.DB.prepare(
      'INSERT INTO cost_centers (code, name_ar, name_en, parent_id) VALUES (?, ?, ?, ?)'
    ).bind(code, name_ar, name_en || null, parent_id || null).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'cost_centers', result.meta.last_row_id, JSON.stringify({ code, name_ar })).run()

    return c.json({ success: true, message: 'تم إنشاء مركز التكلفة بنجاح', id: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// تعديل مركز تكلفة
costCenterRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { code, name_ar, name_en, is_active } = await c.req.json()

    await c.env.DB.prepare(
      'UPDATE cost_centers SET code=?, name_ar=?, name_en=?, is_active=? WHERE id=?'
    ).bind(code, name_ar, name_en || null, is_active ? 1 : 0, id).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'cost_centers', id, JSON.stringify({ code, name_ar })).run()

    return c.json({ success: true, message: 'تم تعديل مركز التكلفة بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// حذف مركز تكلفة
costCenterRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const children = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM cost_centers WHERE parent_id = ?').bind(id).first() as any
    if (children?.cnt > 0) return c.json({ success: false, message: 'لا يمكن حذف مركز له فروع' }, 400)

    const cc = await c.env.DB.prepare('SELECT code, name_ar FROM cost_centers WHERE id = ?').bind(id).first()
    await c.env.DB.prepare('DELETE FROM cost_centers WHERE id = ?').bind(id).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, old_data) VALUES (?, ?, ?, ?)').bind('delete', 'cost_centers', id, JSON.stringify(cc)).run()
    return c.json({ success: true, message: 'تم حذف مركز التكلفة بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
