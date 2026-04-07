import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const reportRoutes = new Hono<{ Bindings: Bindings }>()

// ميزان المراجعة
reportRoutes.get('/trial-balance', async (c) => {
  try {
    const date = c.req.query('date')
    const level = parseInt(c.req.query('level') || '0')

    let where = ''
    const params: any[] = []
    if (date) { where = 'AND je.entry_date <= ?'; params.push(date) }

    const { results } = await c.env.DB.prepare(`
      SELECT 
        a.id, a.code, a.name_ar, a.account_type, a.account_nature, a.level, a.is_parent, a.parent_id,
        a.opening_balance,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit
      FROM accounts a
      LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${where}
      ${level > 0 ? 'WHERE a.level <= ?' : ''}
      GROUP BY a.id
      ORDER BY a.code
    `).bind(...params, ...(level > 0 ? [level] : [])).all()

    // Calculate balances
    const data = results.map((r: any) => {
      const movement = r.total_debit - r.total_credit
      const balance = r.opening_balance + movement
      const debitBalance = balance > 0 ? balance : 0
      const creditBalance = balance < 0 ? Math.abs(balance) : 0
      return { ...r, balance, debit_balance: debitBalance, credit_balance: creditBalance }
    })

    return c.json({ success: true, data })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// كشف حساب
reportRoutes.get('/account-statement/:accountId', async (c) => {
  try {
    const accountId = c.req.param('accountId')
    const from = c.req.query('from')
    const to = c.req.query('to')

    const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(accountId).first()
    if (!account) return c.json({ success: false, message: 'الحساب غير موجود' }, 404)

    let where = "WHERE jl.account_id = ? AND je.status = 'posted'"
    const params: any[] = [accountId]
    if (from) { where += ' AND je.entry_date >= ?'; params.push(from) }
    if (to) { where += ' AND je.entry_date <= ?'; params.push(to) }

    // Opening balance (before 'from' date)
    let openingBalance = (account as any).opening_balance || 0
    if (from) {
      const ob = await c.env.DB.prepare(`
        SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
        FROM journal_entry_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE jl.account_id = ? AND je.status = 'posted' AND je.entry_date < ?
      `).bind(accountId, from).first() as any
      openingBalance += ob?.balance || 0
    }

    const { results } = await c.env.DB.prepare(`
      SELECT jl.*, je.entry_number, je.entry_date, je.description as entry_description, je.reference
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      ${where}
      ORDER BY je.entry_date, je.entry_number, jl.line_number
    `).bind(...params).all()

    // Calculate running balance
    let runningBalance = openingBalance
    const lines = results.map((r: any) => {
      runningBalance += (r.debit || 0) - (r.credit || 0)
      return { ...r, running_balance: runningBalance }
    })

    return c.json({
      success: true,
      data: {
        account,
        opening_balance: openingBalance,
        closing_balance: runningBalance,
        total_debit: results.reduce((s: number, r: any) => s + (r.debit || 0), 0),
        total_credit: results.reduce((s: number, r: any) => s + (r.credit || 0), 0),
        lines
      }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// قائمة الدخل
reportRoutes.get('/income-statement', async (c) => {
  try {
    const from = c.req.query('from')
    const to = c.req.query('to')

    let dateCond = ''
    const params: any[] = []
    if (from) { dateCond += ' AND je.entry_date >= ?'; params.push(from) }
    if (to) { dateCond += ' AND je.entry_date <= ?'; params.push(to) }

    // Revenue accounts
    const { results: revenues } = await c.env.DB.prepare(`
      SELECT a.id, a.code, a.name_ar,
        COALESCE(SUM(jl.credit - jl.debit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${dateCond}
      WHERE a.account_type = 'revenue' AND a.is_parent = 0
      GROUP BY a.id HAVING balance != 0
      ORDER BY a.code
    `).bind(...params).all()

    // Expense accounts
    const { results: expenses } = await c.env.DB.prepare(`
      SELECT a.id, a.code, a.name_ar,
        COALESCE(SUM(jl.debit - jl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${dateCond}
      WHERE a.account_type = 'expense' AND a.is_parent = 0
      GROUP BY a.id HAVING balance != 0
      ORDER BY a.code
    `).bind(...params).all()

    const totalRevenue = revenues.reduce((s: number, r: any) => s + r.balance, 0)
    const totalExpenses = expenses.reduce((s: number, r: any) => s + r.balance, 0)

    return c.json({
      success: true,
      data: { revenues, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// الميزانية العمومية
reportRoutes.get('/balance-sheet', async (c) => {
  try {
    const date = c.req.query('date')
    let dateCond = ''
    const params: any[] = []
    if (date) { dateCond = ' AND je.entry_date <= ?'; params.push(date) }

    const getAccounts = async (type: string) => {
      const { results } = await c.env.DB.prepare(`
        SELECT a.id, a.code, a.name_ar, a.level, a.is_parent,
          a.opening_balance + COALESCE(SUM(jl.debit - jl.credit), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id
        LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${dateCond}
        WHERE a.account_type = ? AND a.is_parent = 0
        GROUP BY a.id HAVING balance != 0
        ORDER BY a.code
      `).bind(...params, type).all()
      return results
    }

    const assets = await getAccounts('asset')
    const liabilities = await getAccounts('liability')
    const equity = await getAccounts('equity')

    const totalAssets = assets.reduce((s: number, r: any) => s + r.balance, 0)
    const totalLiabilities = liabilities.reduce((s: number, r: any) => s + Math.abs(r.balance), 0)
    const totalEquity = equity.reduce((s: number, r: any) => s + Math.abs(r.balance), 0)

    return c.json({
      success: true,
      data: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity: totalLiabilities + totalEquity }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})
