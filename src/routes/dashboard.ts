import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const dashboardRoutes = new Hono<{ Bindings: Bindings }>()

dashboardRoutes.get('/stats', async (c) => {
  try {
    const totalAccounts = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM accounts').first() as any
    const totalEntries = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM journal_entries').first() as any
    const postedEntries = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM journal_entries WHERE status = 'posted'").first() as any
    const draftEntries = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM journal_entries WHERE status = 'draft'").first() as any
    const totalVouchers = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM vouchers').first() as any
    const totalReceipts = await c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM vouchers WHERE voucher_type = 'receipt' AND status = 'posted'").first() as any
    const totalPayments = await c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM vouchers WHERE voucher_type = 'payment' AND status = 'posted'").first() as any
    const receiptCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM vouchers WHERE voucher_type = 'receipt'").first() as any
    const paymentCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM vouchers WHERE voucher_type = 'payment'").first() as any

    // Cash balance
    const cashBalance = await c.env.DB.prepare("SELECT COALESCE(current_balance, 0) as balance FROM accounts WHERE code = '111'").first() as any

    // Bank balances
    const { results: bankBalances } = await c.env.DB.prepare(`
      SELECT a.code, a.name_ar, a.current_balance 
      FROM accounts a WHERE a.parent_id = (SELECT id FROM accounts WHERE code = '112') AND a.is_active = 1
      ORDER BY a.code
    `).all()

    // Active fiscal year
    const activeFY = await c.env.DB.prepare('SELECT * FROM fiscal_years WHERE is_active = 1').first()

    // Recent transactions
    const { results: recentEntries } = await c.env.DB.prepare(`
      SELECT je.id, je.entry_number, je.entry_date, je.description, je.total_debit, je.status
      FROM journal_entries je ORDER BY je.created_at DESC LIMIT 5
    `).all()

    const { results: recentVouchers } = await c.env.DB.prepare(`
      SELECT v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.amount, v.status, a.name_ar as account_name
      FROM vouchers v JOIN accounts a ON v.account_id = a.id
      ORDER BY v.created_at DESC LIMIT 5
    `).all()

    // Monthly summary (last 12 months)
    const { results: monthlySummary } = await c.env.DB.prepare(`
      SELECT strftime('%Y-%m', entry_date) as month,
        SUM(total_debit) as total_debit, SUM(total_credit) as total_credit, COUNT(*) as count
      FROM journal_entries WHERE status = 'posted'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `).all()

    // Account type totals
    const { results: accountTypeTotals } = await c.env.DB.prepare(`
      SELECT account_type, COUNT(*) as count, SUM(current_balance) as total_balance
      FROM accounts WHERE is_parent = 0 AND is_active = 1
      GROUP BY account_type
    `).all()

    // Top accounts by balance
    const { results: topAccounts } = await c.env.DB.prepare(`
      SELECT code, name_ar, current_balance, account_type 
      FROM accounts WHERE is_parent = 0 AND is_active = 1 AND current_balance != 0
      ORDER BY ABS(current_balance) DESC LIMIT 10
    `).all()

    return c.json({
      success: true,
      data: {
        totalAccounts: totalAccounts?.cnt || 0,
        totalEntries: totalEntries?.cnt || 0,
        postedEntries: postedEntries?.cnt || 0,
        draftEntries: draftEntries?.cnt || 0,
        totalVouchers: totalVouchers?.cnt || 0,
        receiptCount: receiptCount?.cnt || 0,
        paymentCount: paymentCount?.cnt || 0,
        totalReceipts: totalReceipts?.total || 0,
        totalPayments: totalPayments?.total || 0,
        cashBalance: cashBalance?.balance || 0,
        bankBalances: bankBalances || [],
        activeFiscalYear: activeFY,
        recentEntries,
        recentVouchers,
        monthlySummary: (monthlySummary || []).reverse(),
        accountTypeTotals: accountTypeTotals || [],
        topAccounts: topAccounts || []
      }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
