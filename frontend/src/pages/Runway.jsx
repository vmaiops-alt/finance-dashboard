import React, { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, AlertTriangle, Target, Calendar } from 'lucide-react'
import { getRunwayAnalysis, getCashflowProjection } from '../api'

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function Runway() {
  const [runway, setRunway] = useState(null)
  const [projection, setProjection] = useState([])
  const [targetDate, setTargetDate] = useState('')
  const [projMonths, setProjMonths] = useState(24)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      getRunwayAnalysis(targetDate || undefined),
      getCashflowProjection(projMonths),
    ]).then(([r, p]) => {
      setRunway(r)
      setProjection(p)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [targetDate, projMonths])

  if (loading || !runway) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
  }

  const isInfinite = runway.runway_months >= 999
  const isDanger = !isInfinite && runway.runway_months < 6
  const isWarning = !isInfinite && !isDanger && runway.runway_months < 12

  // Find where balance goes to 0 for chart
  const zeroMonth = projection.findIndex(p => p.cumulative_balance <= 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Runway & Cashflow-Prognose</h1>
        <p className="text-gray-500 text-sm mt-1">Wie lange reicht dein Geld?</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`card border-l-4 ${isDanger ? 'border-l-red-500' : isWarning ? 'border-l-yellow-500' : 'border-l-emerald-500'}`}>
          <div className="flex items-center gap-2">
            {isDanger ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <TrendingUp className="w-5 h-5 text-emerald-400" />}
            <p className="text-sm text-gray-400">Runway</p>
          </div>
          <p className="text-3xl font-bold mt-2">
            {isInfinite ? '∞' : `${runway.runway_months} Monate`}
          </p>
          {runway.runway_until_date && (
            <p className="text-xs text-gray-500 mt-1">
              Bis {new Date(runway.runway_until_date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="card">
          <p className="text-sm text-gray-400">Gesamtvermögen</p>
          <p className="text-2xl font-bold mt-2 text-blue-400">{formatCurrency(runway.current_total_balance)}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-400">Ø Monatliche Ausgaben</p>
          <p className="text-2xl font-bold mt-2 text-red-400">{formatCurrency(runway.avg_monthly_burn)}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-400">Ø Monatliche Einnahmen</p>
          <p className="text-2xl font-bold mt-2 text-emerald-400">{formatCurrency(runway.avg_monthly_income)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Net Burn: <span className={runway.net_monthly_burn > 0 ? 'text-red-400' : 'text-emerald-400'}>
              {formatCurrency(runway.net_monthly_burn)}/Monat
            </span>
          </p>
        </div>
      </div>

      {/* Target Date */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Zieldatum:</span>
          </div>
          <input
            type="date"
            className="input w-auto"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            placeholder="Bis wann musst du überleben?"
          />
          {runway.amount_needed_for_target !== undefined && (
            <div className="sm:ml-auto">
              {runway.amount_needed_for_target > 0 ? (
                <p className="text-red-400">
                  Du brauchst noch <span className="font-bold">{formatCurrency(runway.amount_needed_for_target)}</span> um bis {new Date(targetDate).toLocaleDateString('de-DE')} zu überleben
                </p>
              ) : (
                <p className="text-emerald-400 font-medium">Du bist sicher bis {new Date(targetDate).toLocaleDateString('de-DE')}!</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cashflow Projection Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400">Cashflow-Prognose</h3>
          <select className="select text-sm" value={projMonths} onChange={e => setProjMonths(parseInt(e.target.value))}>
            <option value={12}>12 Monate</option>
            <option value={24}>24 Monate</option>
            <option value={36}>36 Monate</option>
            <option value={48}>48 Monate</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={projection}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 10 }} interval={Math.max(0, Math.floor(projection.length / 12))} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              formatter={(value) => formatCurrency(value)}
            />
            <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="cumulative_balance" stroke="#3B82F6" fill="url(#colorBalance)" name="Vermögen" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">Monatliche Prognose</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-2 px-3">Monat</th>
              <th className="text-right py-2 px-3">Einnahmen</th>
              <th className="text-right py-2 px-3">Ausgaben</th>
              <th className="text-right py-2 px-3">Netto</th>
              <th className="text-right py-2 px-3">Vermögen</th>
            </tr>
          </thead>
          <tbody>
            {projection.slice(0, 24).map((p, i) => (
              <tr key={i} className={`border-b border-gray-800/50 ${p.cumulative_balance < 0 ? 'bg-red-500/5' : ''}`}>
                <td className="py-2 px-3 text-gray-400">{p.month}</td>
                <td className="py-2 px-3 text-right text-emerald-400">{formatCurrency(p.projected_income)}</td>
                <td className="py-2 px-3 text-right text-red-400">{formatCurrency(p.projected_expenses)}</td>
                <td className={`py-2 px-3 text-right font-medium ${p.projected_net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(p.projected_net)}
                </td>
                <td className={`py-2 px-3 text-right font-semibold ${p.cumulative_balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(p.cumulative_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
