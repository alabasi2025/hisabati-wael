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

// تقرير رصيد مراكز التكلفة (مع حركات القيود والسندات)
costCenterRoutes.get('/report', async (c) => {
  try {
    const from = c.req.query('from')
    const to = c.req.query('to')
    const centerId = c.req.query('center_id')

    // Get all cost centers
    const { results: centers } = await c.env.DB.prepare(
      'SELECT * FROM cost_centers WHERE is_active = 1 ORDER BY code'
    ).all()

    // Get journal lines with cost center info
    let dateCond = ''
    const params: any[] = []
    if (from) { dateCond += " AND je.entry_date >= ?"; params.push(from) }
    if (to) { dateCond += " AND je.entry_date <= ?"; params.push(to) }

    // Get movements per cost center from journal entry lines
    const { results: movements } = await c.env.DB.prepare(`
      SELECT 
        jl.cost_center_id,
        cc.code as center_code,
        cc.name_ar as center_name,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit,
        COUNT(DISTINCT jl.journal_entry_id) as entry_count
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
      LEFT JOIN cost_centers cc ON cc.id = jl.cost_center_id
      WHERE jl.cost_center_id IS NOT NULL ${dateCond}
      ${centerId ? ' AND jl.cost_center_id = ?' : ''}
      GROUP BY jl.cost_center_id
      ORDER BY cc.code
    `).bind(...params, ...(centerId ? [centerId] : [])).all()

    // Get voucher summary per cost center
    const { results: voucherMovements } = await c.env.DB.prepare(`
      SELECT 
        v.cost_center_id,
        v.voucher_type,
        COALESCE(SUM(v.amount), 0) as total_amount,
        COUNT(*) as voucher_count
      FROM vouchers v
      WHERE v.status = 'posted' AND v.cost_center_id IS NOT NULL ${dateCond.replace(/je\./g, 'v.').replace('entry_date', 'voucher_date')}
      ${centerId ? ' AND v.cost_center_id = ?' : ''}
      GROUP BY v.cost_center_id, v.voucher_type
    `).bind(...params, ...(centerId ? [centerId] : [])).all()

    // Build per-center summary
    const centerReport = centers.map((cc: any) => {
      const mov = movements.find((m: any) => m.cost_center_id === cc.id) || { total_debit: 0, total_credit: 0, entry_count: 0 }
      const receipts = voucherMovements.find((v: any) => v.cost_center_id === cc.id && v.voucher_type === 'receipt') || { total_amount: 0, voucher_count: 0 }
      const payments = voucherMovements.find((v: any) => v.cost_center_id === cc.id && v.voucher_type === 'payment') || { total_amount: 0, voucher_count: 0 }
      return {
        ...cc,
        total_debit: mov.total_debit,
        total_credit: mov.total_credit,
        net_balance: (mov.total_debit as number) - (mov.total_credit as number),
        entry_count: mov.entry_count,
        receipt_total: receipts.total_amount,
        receipt_count: receipts.voucher_count,
        payment_total: payments.total_amount,
        payment_count: payments.voucher_count
      }
    })

    return c.json({ success: true, data: centerReport })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// تفاصيل حركات مركز تكلفة
costCenterRoutes.get('/:id/transactions', async (c) => {
  try {
    const id = c.req.param('id')
    const from = c.req.query('from')
    const to = c.req.query('to')

    const center = await c.env.DB.prepare('SELECT * FROM cost_centers WHERE id = ?').bind(id).first()
    if (!center) return c.json({ success: false, message: 'مركز التكلفة غير موجود' }, 404)

    let dateCond = ''
    const params: any[] = [id]
    if (from) { dateCond += " AND je.entry_date >= ?"; params.push(from) }
    if (to) { dateCond += " AND je.entry_date <= ?"; params.push(to) }

    const { results: lines } = await c.env.DB.prepare(`
      SELECT 
        jl.*, 
        je.entry_number, je.entry_date, je.description as entry_description,
        a.code as account_code, a.name_ar as account_name
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
      JOIN accounts a ON a.id = jl.account_id
      WHERE jl.cost_center_id = ? ${dateCond}
      ORDER BY je.entry_date DESC, je.entry_number DESC
    `).bind(...params).all()

    const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0)
    const totalCredit = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0)

    return c.json({
      success: true,
      data: {
        center,
        lines,
        total_debit: totalDebit,
        total_credit: totalCredit,
        net_balance: totalDebit - totalCredit
      }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// إنشاء مركز تكلفة
costCenterRoutes.post('/', async (c) => {
  try {
    const { code, name_ar, name_en, parent_id, description, budget } = await c.req.json()
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

    // Check for journal lines linked to this cost center
    const linked = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM journal_entry_lines WHERE cost_center_id = ?').bind(id).first() as any
    if (linked?.cnt > 0) return c.json({ success: false, message: 'لا يمكن حذف مركز تكلفة مرتبط بقيود محاسبية' }, 400)

    const cc = await c.env.DB.prepare('SELECT code, name_ar FROM cost_centers WHERE id = ?').bind(id).first()
    await c.env.DB.prepare('DELETE FROM cost_centers WHERE id = ?').bind(id).run()
    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, old_data) VALUES (?, ?, ?, ?)').bind('delete', 'cost_centers', id, JSON.stringify(cc)).run()
    return c.json({ success: true, message: 'تم حذف مركز التكلفة بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
