import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { accountRoutes } from './routes/accounts'
import { journalRoutes } from './routes/journal'
import { voucherRoutes } from './routes/vouchers'
import { reportRoutes } from './routes/reports'
import { adminRoutes } from './routes/admin'
import { dashboardRoutes } from './routes/dashboard'
import { costCenterRoutes } from './routes/costcenters'
import { searchRoutes } from './routes/search'
import { authMiddleware, requireRole } from './middleware/auth'
import { mainLayout } from './views/layout'
import { loginPage } from './views/login'

type Bindings = {
  DB: D1Database
}
type Variables = {
  user: any
  userId: number
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', logger())
app.use('/api/*', cors())

// ===== Public API Routes (no auth required) =====
app.route('/api/auth', authRoutes)

// ===== Protected API Routes (auth required) =====
app.use('/api/accounts/*', authMiddleware)
app.use('/api/journal/*', authMiddleware)
app.use('/api/vouchers/*', authMiddleware)
app.use('/api/reports/*', authMiddleware)
app.use('/api/dashboard/*', authMiddleware)
app.use('/api/cost-centers/*', authMiddleware)
app.use('/api/search/*', authMiddleware)
app.use('/api/admin/*', authMiddleware)

// Admin routes require admin or manager role
app.use('/api/admin/users/*', requireRole('admin'))
app.use('/api/admin/fiscal-years/*', requireRole('admin', 'manager'))

app.route('/api/accounts', accountRoutes)
app.route('/api/journal', journalRoutes)
app.route('/api/vouchers', voucherRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/cost-centers', costCenterRoutes)
app.route('/api/search', searchRoutes)

// ===== Pages =====
app.get('/login', (c) => {
  return c.html(loginPage())
})

app.get('/', (c) => {
  return c.redirect('/app')
})

app.get('/app', (c) => {
  return c.html(mainLayout())
})

app.get('/app/*', (c) => {
  return c.html(mainLayout())
})

export default app
