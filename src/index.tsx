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
import { mainLayout } from './views/layout'
import { loginPage } from './views/login'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('/api/*', cors())

// ===== API Routes =====
app.route('/api/auth', authRoutes)
app.route('/api/accounts', accountRoutes)
app.route('/api/journal', journalRoutes)
app.route('/api/vouchers', voucherRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/dashboard', dashboardRoutes)

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
