import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const voucherRoutes = new Hono<{ Bindings: Bindings }>()

// جلب السندات
voucherRoutes.get('/', async (c) => {
  try {
    const type = c.req.query('type')
    const status = c.req.query('status')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (type) { where += ' AND v.voucher_type = ?'; params.push(type) }
    if (status) { where += ' AND v.status = ?'; params.push(status) }

    const countQ = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM vouchers v ${where}`).bind(...params).first() as any

    const { results } = await c.env.DB.prepare(`
      SELECT v.*, a.name_ar as account_name, a.code as account_code, u.full_name as created_by_name, cur.symbol as currency_symbol
      FROM vouchers v
      JOIN accounts a ON v.account_id = a.id
      LEFT JOIN users u ON v.created_by = u.id
      LEFT JOIN currencies cur ON v.currency_id = cur.id
      ${where} ORDER BY v.voucher_date DESC, v.voucher_number DESC LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all()

    return c.json({ success: true, data: results, total: countQ?.total || 0, page, limit })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// جلب سند واحد مع التفاصيل
voucherRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const voucher = await c.env.DB.prepare(`
      SELECT v.*, a.name_ar as account_name, a.code as account_code, cur.symbol as currency_symbol
      FROM vouchers v JOIN accounts a ON v.account_id = a.id LEFT JOIN currencies cur ON v.currency_id = cur.id
      WHERE v.id = ?
    `).bind(id).first()
    if (!voucher) return c.json({ success: false, message: 'السند غير موجود' }, 404)

    const { results: details } = await c.env.DB.prepare(`
      SELECT vd.*, a.code as account_code, a.name_ar as account_name
      FROM voucher_details vd JOIN accounts a ON vd.account_id = a.id
      WHERE vd.voucher_id = ? ORDER BY vd.line_number
    `).bind(id).all()

    return c.json({ success: true, data: { ...voucher, details } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// إنشاء سند جديد
voucherRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { voucher_type, voucher_date, account_id, amount, currency_id, exchange_rate, description, beneficiary, payment_method, check_number, check_date, bank_name, reference, details, created_by, cost_center_id } = body

    if (!voucher_type || !voucher_date || !account_id || !amount) {
      return c.json({ success: false, message: 'يرجى ملء الحقول المطلوبة' }, 400)
    }

    const fy = await c.env.DB.prepare('SELECT id FROM fiscal_years WHERE is_active = 1').first() as any
    if (!fy) return c.json({ success: false, message: 'لا توجد سنة مالية نشطة' }, 400)

    // Get next voucher number
    const last = await c.env.DB.prepare(
      'SELECT MAX(voucher_number) as max_num FROM vouchers WHERE voucher_type = ? AND fiscal_year_id = ?'
    ).bind(voucher_type, fy.id).first() as any
    const voucherNumber = (last?.max_num || 0) + 1

    const result = await c.env.DB.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, voucher_date, fiscal_year_id, account_id, amount, currency_id, exchange_rate, description, beneficiary, payment_method, check_number, check_date, bank_name, reference, status, created_by, cost_center_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(voucherNumber, voucher_type, voucher_date, fy.id, account_id, amount, currency_id || 1, exchange_rate || 1, description || null, beneficiary || null, payment_method || 'cash', check_number || null, check_date || null, bank_name || null, reference || null, created_by || null, cost_center_id || null).run()

    const voucherId = result.meta.last_row_id

    // Insert details
    if (details && details.length > 0) {
      for (let i = 0; i < details.length; i++) {
        const d = details[i]
        await c.env.DB.prepare(`
          INSERT INTO voucher_details (voucher_id, line_number, account_id, amount, description)
          VALUES (?, ?, ?, ?, ?)
        `).bind(voucherId, i + 1, d.account_id, d.amount, d.description || null).run()
      }
    }

    return c.json({ success: true, message: 'تم إنشاء السند بنجاح', id: voucherId, voucher_number: voucherNumber })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// تعديل سند (draft only)
voucherRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const v = await c.env.DB.prepare('SELECT * FROM vouchers WHERE id = ?').bind(id).first() as any
    if (!v) return c.json({ success: false, message: 'السند غير موجود' }, 404)
    if (v.status === 'posted') return c.json({ success: false, message: 'لا يمكن تعديل سند مرحّل' }, 400)

    const body = await c.req.json()
    const { voucher_date, account_id, amount, description, beneficiary, payment_method, check_number, check_date, bank_name, details, cost_center_id } = body

    if (!voucher_date || !account_id || !amount) {
      return c.json({ success: false, message: 'يرجى ملء الحقول المطلوبة' }, 400)
    }

    await c.env.DB.prepare(`
      UPDATE vouchers SET voucher_date=?, account_id=?, amount=?, description=?, beneficiary=?, payment_method=?, check_number=?, check_date=?, bank_name=?, cost_center_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(voucher_date, account_id, amount, description || null, beneficiary || null, payment_method || 'cash', check_number || null, check_date || null, bank_name || null, cost_center_id || null, id).run()

    // Update details
    await c.env.DB.prepare('DELETE FROM voucher_details WHERE voucher_id = ?').bind(id).run()
    if (details && details.length > 0) {
      for (let i = 0; i < details.length; i++) {
        const d = details[i]
        await c.env.DB.prepare(`
          INSERT INTO voucher_details (voucher_id, line_number, account_id, amount, description) VALUES (?, ?, ?, ?, ?)
        `).bind(id, i + 1, d.account_id, d.amount, d.description || null).run()
      }
    }

    await c.env.DB.prepare('INSERT INTO audit_log (action, table_name, record_id, new_data) VALUES (?, ?, ?, ?)').bind('update', 'vouchers', id, JSON.stringify({ amount, description })).run()

    return c.json({ success: true, message: 'تم تعديل السند بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ترحيل سند (إنشاء قيد تلقائي)
voucherRoutes.post('/:id/post', async (c) => {
  try {
    const id = c.req.param('id')
    const v = await c.env.DB.prepare('SELECT * FROM vouchers WHERE id = ?').bind(id).first() as any
    if (!v) return c.json({ success: false, message: 'السند غير موجود' }, 404)
    if (v.status === 'posted') return c.json({ success: false, message: 'السند مرحّل مسبقاً' }, 400)

    // Get details
    const { results: details } = await c.env.DB.prepare('SELECT * FROM voucher_details WHERE voucher_id = ?').bind(id).all() as any

    // Create journal entry
    const last = await c.env.DB.prepare(
      'SELECT MAX(entry_number) as max_num FROM journal_entries WHERE fiscal_year_id = ?'
    ).bind(v.fiscal_year_id).first() as any
    const entryNumber = (last?.max_num || 0) + 1

    const typeName = v.voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف'
    const jeResult = await c.env.DB.prepare(`
      INSERT INTO journal_entries (entry_number, entry_date, fiscal_year_id, description, reference, entry_type, total_debit, total_credit, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'voucher', ?, ?, 'posted', ?)
    `).bind(entryNumber, v.voucher_date, v.fiscal_year_id, `${typeName} رقم ${v.voucher_number} - ${v.description || ''}`, `V-${v.voucher_number}`, v.amount, v.amount, v.created_by).run()

    const jeId = jeResult.meta.last_row_id

    if (v.voucher_type === 'receipt') {
      // سند قبض: مدين الحساب الرئيسي (مثلاً الصندوق)، دائن الحسابات التفصيلية
      await c.env.DB.prepare(`
        INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, cost_center_id) VALUES (?, 1, ?, ?, ?, 0, ?)
      `).bind(jeId, v.account_id, v.description, v.amount, v.cost_center_id || null).run()

      if (details.length > 0) {
        for (let i = 0; i < details.length; i++) {
          await c.env.DB.prepare(`
            INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, cost_center_id) VALUES (?, ?, ?, ?, 0, ?, ?)
          `).bind(jeId, i + 2, details[i].account_id, details[i].description, details[i].amount, details[i].cost_center_id || v.cost_center_id || null).run()
        }
      }
    } else {
      // سند صرف: دائن الحساب الرئيسي، مدين الحسابات التفصيلية
      await c.env.DB.prepare(`
        INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, cost_center_id) VALUES (?, 1, ?, ?, 0, ?, ?)
      `).bind(jeId, v.account_id, v.description, v.amount, v.cost_center_id || null).run()

      if (details.length > 0) {
        for (let i = 0; i < details.length; i++) {
          await c.env.DB.prepare(`
            INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit, credit, cost_center_id) VALUES (?, ?, ?, ?, ?, 0, ?)
          `).bind(jeId, i + 2, details[i].account_id, details[i].description, details[i].amount, details[i].cost_center_id || v.cost_center_id || null).run()
        }
      }
    }

    // Update account balances
    const { results: jeLines } = await c.env.DB.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').bind(jeId).all() as any
    for (const line of jeLines) {
      const amt = (line.debit || 0) - (line.credit || 0)
      await c.env.DB.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').bind(amt, line.account_id).run()
    }

    // Update voucher
    await c.env.DB.prepare("UPDATE vouchers SET status = 'posted', journal_entry_id = ? WHERE id = ?").bind(jeId, id).run()
    await c.env.DB.prepare("UPDATE journal_entries SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?").bind(jeId).run()

    return c.json({ success: true, message: 'تم ترحيل السند وإنشاء القيد بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// حذف سند
voucherRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const v = await c.env.DB.prepare('SELECT status FROM vouchers WHERE id = ?').bind(id).first() as any
    if (!v) return c.json({ success: false, message: 'السند غير موجود' }, 404)
    if (v.status === 'posted') return c.json({ success: false, message: 'لا يمكن حذف سند مرحّل' }, 400)

    await c.env.DB.prepare('DELETE FROM voucher_details WHERE voucher_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM vouchers WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'تم حذف السند بنجاح' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
