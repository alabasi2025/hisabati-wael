import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const searchRoutes = new Hono<{ Bindings: Bindings }>()

// البحث الشامل في جميع الوحدات
searchRoutes.get('/', async (c) => {
  try {
    const q = c.req.query('q') || ''
    if (!q || q.length < 2) {
      return c.json({ success: true, data: { accounts: [], journal: [], vouchers: [] } })
    }

    const searchTerm = `%${q}%`

    // البحث في الحسابات
    const { results: accounts } = await c.env.DB.prepare(
      `SELECT id, code, name_ar, name_en, account_type, current_balance 
       FROM accounts 
       WHERE name_ar LIKE ? OR code LIKE ? OR name_en LIKE ?
       ORDER BY code LIMIT 10`
    ).bind(searchTerm, searchTerm, searchTerm).all()

    // البحث في القيود
    const { results: journal } = await c.env.DB.prepare(
      `SELECT id, entry_number, entry_date, description, reference, status, total_debit 
       FROM journal_entries 
       WHERE description LIKE ? OR reference LIKE ? OR CAST(entry_number AS TEXT) LIKE ?
       ORDER BY entry_date DESC LIMIT 10`
    ).bind(searchTerm, searchTerm, searchTerm).all()

    // البحث في السندات
    const { results: vouchers } = await c.env.DB.prepare(
      `SELECT id, voucher_number, voucher_type, voucher_date, beneficiary, amount, status
       FROM vouchers 
       WHERE beneficiary LIKE ? OR CAST(voucher_number AS TEXT) LIKE ? OR description LIKE ?
       ORDER BY voucher_date DESC LIMIT 10`
    ).bind(searchTerm, searchTerm, searchTerm).all()

    return c.json({
      success: true,
      data: { accounts, journal, vouchers },
      total: (accounts?.length || 0) + (journal?.length || 0) + (vouchers?.length || 0)
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
