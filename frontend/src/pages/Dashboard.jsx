import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Clock, AlertTriangle, RefreshCw, Repeat
} from 'lucide-react'
import { getDashboardSummary, getMonthlyTrend, getRecurringTransactions } from '../api'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16']

function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(trend).toFixed(1)}% vs. Vormonat</span>
        </div>
      )}
      {/* Recurring Payments */}
      {recurring && recurring.recurring_payments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Wiederkehrende Zahlungen
              <span className="text-xs font-normal text-gray-500">
                ({recurring.count} erkannt · ~{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(recurring.total_monthly_recurring)}/Monat)
              </span>
            </h3>
          </div>
          <div className="space-y-2">
            {recurring.recurring_payments.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.counterparty}</p>
                    <p className="text-xs text-gray-500">
                      {r.interval === 'monthly' ? 'Monatlich' : r.interval === 'weekly' ? 'Wöchentlich' : r.interval === 'yearly' ? 'Jährlich' : r.interval === 'quarterly' ? 'Quartalsweise' : r.interval}
                      {' · '}{r.occurrences}x erkannt
                      {r.category && ` · ${r.category}`}
                    </p>
                  </div>
                </div>
                <span className="text-red-400 font-semibold text-sm">
                  -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: r.currency }).format(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [recurring, setRecurring] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getMonthlyTrend(12),
      getRecurringTransactions().catch(() => null),
    ]).then(([s, t, r]) => {
      setSummary(s)
      setTrend(t)
      setRecurring(r)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-20">
        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-400">Willkommen bei FinanceHQ</h2>
        <p className="text-gray-500 mt-2">Starte, indem du Firmen, Konten und Transaktionen hinzufügst.</p>
      </div>
    )
  }

  const pieData = summary.top_expense_categories?.map((c, i) => ({
    name: c.category,
    value: c.amount,
    color: COLORS[i % COLORS.length],
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Finanzübersicht — {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gesamtvermögen"
          value={formatCurrency(summary.total_balance)}
          subtitle={Object.entries(summary.total_balance_by_currency || {}).map(([c, v]) => `${formatCurrency(v, c)}`).join(' · ')}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Einnahmen (Monat)"
          value={formatCurrency(summary.monthly_income)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Ausgaben (Monat)"
          value={formatCurrency(summary.monthly_expenses)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Runway"
          value={summary.runway_months >= 999 ? '∞' : `${summary.runway_months} Monate`}
          subtitle={summary.runway_months < 6 && summary.runway_months < 999 ? 'Vorsicht: weniger als 6 Monate' : undefined}
          icon={summary.runway_months < 6 && summary.runway_months < 999 ? AlertTriangle : Clock}
          color={summary.runway_months < 6 && summary.runway_months < 999 ? 'yellow' : 'purple'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Einnahmen vs. Ausgaben (12 Monate)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#colorIncome)" name="Einnahmen" />
              <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#colorExpenses)" name="Ausgaben" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Categories Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Ausgaben nach Kategorie</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-gray-400">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">Keine Ausgaben diesen Monat</p>
          )}
        </div>
      </div>

      {/* Account Balances + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accounts */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Konten</h3>
          {summary.account_balances?.length > 0 ? (
            <div className="space-y-3">
              {summary.account_balances.map(acc => (
                <div key={acc.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.bank}</p>
                  </div>
                  <span className={`font-semibold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(acc.balance, acc.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-6">Noch keine Konten angelegt</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Letzte Transaktionen</h3>
          {summary.recent_transactions?.length > 0 ? (
            <div className="space-y-2">
              {summary.recent_transactions.slice(0, 8).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{tx.description || tx.counterparty || 'Transaktion'}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('de-DE')} · {tx.category || 'Unkategorisiert'}</p>
                  </div>
                  <span className={`font-semibold text-sm ml-4 ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-6">Noch keine Transaktionen</p>
          )}
        </div>
      </div>

      {/* Income by Entity */}
      {(summary.income_by_entity?.length > 0 || summary.expenses_by_entity?.length > 0) && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Einnahmen & Ausgaben nach Firma/Person</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary.income_by_entity?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Einnahmen</p>
                {summary.income_by_entity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.entity}</span>
                    </div>
                    <span className="text-sm text-emerald-400 font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {summary.expenses_by_entity?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Ausgaben</p>
                {summary.expenses_by_entity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.entity}</span>
                    </div>
                    <span className="text-sm text-red-400 font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Recurring Payments */}
      {recurring && recurring.recurring_payments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Wiederkehrende Zahlungen
              <span className="text-xs font-normal text-gray-500">
                ({recurring.count} erkannt · ~{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(recurring.total_monthly_recurring)}/Monat)
              </span>
            </h3>
          </div>
          <div className="space-y-2">
            {recurring.recurring_payments.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.counterparty}</p>
                    <p className="text-xs text-gray-500">
                      {r.interval === 'monthly' ? 'Monatlich' : r.interval === 'weekly' ? 'Wöchentlich' : r.interval === 'yearly' ? 'Jährlich' : r.interval === 'quarterly' ? 'Quartalsweise' : r.interval}
                      {' · '}{r.occurrences}x erkannt
                      {r.category && ` · ${r.category}`}
                    </p>
                  </div>
                </div>
                <span className="text-red-400 font-semibold text-sm">
                  -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: r.currency }).format(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
