import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const journalRoutes = new Hono<{ Bindings: Bindings }>()

// جلب القيود مع فلاتر
journalRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const status = c.req.query('status')
    const from = c.req.query('from')
    const to = c.req.query('to')
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (status) { where += ' AND je.status = ?'; params.push(status) }
    if (from) { where += ' AND je.entry_date >= ?'; params.push(from) }
    if (to) { where += ' AND je.entry_date <= ?'; params.push(to) }

    const countQuery = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM journal_entries je ${where}`).bind(...params).first() as any

    const { results } = await c.env.DB.prepare(`
      SELECT je.*, u.full_name as created_by_name
      FROM journal_entries je
      LEFT JOIN users u ON je.created_by = u.id
      ${where}
      ORDER BY je.entry_date DESC, je.entry_number DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all()

    return c.json({ success: true, data: results, total: countQuery?.total || 0, page, limit })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// جلب قيد مع تفاصيله
journalRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const entry = await c.env.DB.prepare(`
      SELECT je.*, u.full_name as created_by_name
      FROM journal_entries je LEFT JOIN users u ON je.created_by = u.id
      WHERE je.id = ?
    `).bind(id).first()
    if (!entry) return c.json({ success: false, message: 'القيد غير موجود' }, 404)

    const { results: lines } = await c.env.DB.prepare(`
      SELECT jl.*, a.code as account_code, a.name_ar as account_name, cur.symbol as currency_symbol
      FROM journal_entry_lines jl
      JOIN accounts a ON jl.account_id = a.id
      LEFT JOIN currencies cur ON jl.currency_id = cur.id
      WHERE jl.journal_entry_id = ?
      ORDER BY jl.line_number
    `).bind(id).all()

    return c.json({ success: true, data: { ...entry, lines } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// إنشاء قيد جديد
journalRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { entry_date, description, reference, entry_type, lines, created_by } = body

    if (!entry_date || !lines || lines.length < 2) {
      return c.json({ success: false, message: 'يجب أن يحتوي القيد على سطرين على الأقل' }, 400)
    }

    // Calculate totals
    let totalDebit = 0, totalCredit = 0
    for (const line of lines) {
      totalDebit += parseFloat(line.debit || 0)
      totalCredit += parseFloat(line.credit || 0)
    }

    // Check balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return c.json({ success: false, message: `القيد غير متوازن: مدين ${totalDebit} ≠ دائن ${totalCredit}` }, 400)
    }

    // Get fiscal year
    const fy = await c.env.DB.prepare('SELECT id FROM fiscal_years WHERE is_active = 1').first() as any
    if (!fy) return c.json({ success: false, message: 'لا توجد سنة مالية نشطة' }, 400)

    // Get next entry number
    const last = await c.env.DB.prepare(
      'SELECT MAX(entry_number) as max_num FROM journal_entries WHERE fiscal_year_id = ?'
    ).bind(fy.id).first() as any
    const entryNumber = (last?.max_num || 0) + 1

    // Insert entry
    const result = await c.env.DB.prepare(`
      INSERT INTO journal_entries (entry_number, entry_date, fiscal_year_id, description, reference, entry_type, total_debit, total_credit, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).bind(entryNumber, entry_date, fy.id, description || null, reference || null, entry_type || 'manual', totalDebit, totalCredit, created_by || null).run()

    const entryId = result.meta.last_row_id

    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      await c.env.DB.prepare(`
        INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, currency_id, exchange_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(entryId, i + 1, line.account_id, line.description || null, parseFloat(line.debit || 0), parseFloat(line.credit || 0), line.currency_id || 1, line.exchange_rate || 1).run()
    }

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('create', 'journal_entries', entryId, JSON.stringify({ entry_number: entryNumber, description, total: totalDebit })).run()

    return c.json({ success: true, message: 'تم إنشاء القيد بنجاح', id: entryId, entry_number: entryNumber })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// تعديل قيد (draft only)
journalRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const entry = await c.env.DB.prepare('SELECT * FROM journal_entries WHERE id = ?').bind(id).first() as any
    if (!entry) return c.json({ success: false, message: 'القيد غير موجود' }, 404)
    if (entry.status === 'posted') return c.json({ success: false, message: 'لا يمكن تعديل قيد مرحّل' }, 400)

    const body = await c.req.json()
    const { entry_date, description, reference, lines } = body

    if (!entry_date || !lines || lines.length < 2) {
      return c.json({ success: false, message: 'يجب أن يحتوي القيد على سطرين على الأقل' }, 400)
    }

    let totalDebit = 0, totalCredit = 0
    for (const line of lines) {
      totalDebit += parseFloat(line.debit || 0)
      totalCredit += parseFloat(line.credit || 0)
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return c.json({ success: false, message: `القيد غير متوازن: مدين ${totalDebit} ≠ دائن ${totalCredit}` }, 400)
    }

    // Update header
    await c.env.DB.prepare(`
      UPDATE journal_entries SET entry_date=?, description=?, reference=?, total_debit=?, total_credit=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(entry_date, description || null, reference || null, totalDebit, totalCredit, id).run()

    // Delete old lines
    await c.env.DB.prepare('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?').bind(id).run()

    // Insert new lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      await c.env.DB.prepare(`
        INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, currency_id, exchange_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, i + 1, line.account_id, line.description || null, parseFloat(line.debit || 0), parseFloat(line.credit || 0), line.currency_id || 1, line.exchange_rate || 1).run()
    }

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'journal_entries', id, JSON.stringify({ description, total: totalDebit })).run()

    return c.json({ success: true, message: 'تم تعديل القيد بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ترحيل قيد
journalRoutes.post('/:id/post', async (c) => {
  try {
    const id = c.req.param('id')
    const entry = await c.env.DB.prepare('SELECT * FROM journal_entries WHERE id = ?').bind(id).first() as any
    if (!entry) return c.json({ success: false, message: 'القيد غير موجود' }, 404)
    if (entry.status === 'posted') return c.json({ success: false, message: 'القيد مرحّل مسبقاً' }, 400)

    // Update account balances
    const { results: lines } = await c.env.DB.prepare(
      'SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?'
    ).bind(id).all() as any

    for (const line of lines) {
      const amount = (line.debit || 0) - (line.credit || 0)
      await c.env.DB.prepare(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?'
      ).bind(amount, line.account_id).run()
    }

    await c.env.DB.prepare(
      "UPDATE journal_entries SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run()

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('post', 'journal_entries', id, JSON.stringify({ entry_number: entry.entry_number })).run()

    return c.json({ success: true, message: 'تم ترحيل القيد بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// حذف قيد (draft only)
journalRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const entry = await c.env.DB.prepare('SELECT status FROM journal_entries WHERE id = ?').bind(id).first() as any
    if (!entry) return c.json({ success: false, message: 'القيد غير موجود' }, 404)
    if (entry.status === 'posted') return c.json({ success: false, message: 'لا يمكن حذف قيد مرحّل' }, 400)

    await c.env.DB.prepare('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM journal_entries WHERE id = ?').bind(id).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, old_data) VALUES (?, ?, ?, ?)').bind('delete', 'journal_entries', id, JSON.stringify({ entry_number: entry.status })).run()
    return c.json({ success: true, message: 'تم حذف القيد بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
