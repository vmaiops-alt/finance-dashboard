import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Globe, Building2, User } from 'lucide-react'
import { getTaxOverview } from '../api'

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function TaxOverview() {
  const [overview, setOverview] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getTaxOverview(year).then(setOverview).finally(() => setLoading(false))
  }, [year])

  const totalRevenue = overview.reduce((s, e) => s + e.revenue, 0)
  const totalExpenses = overview.reduce((s, e) => s + e.expenses, 0)
  const totalProfit = overview.reduce((s, e) => s + e.profit, 0)
  const totalTax = overview.reduce((s, e) => s + e.total_tax_burden, 0)
  const effectiveRate = totalProfit > 0 ? (totalTax / totalProfit * 100).toFixed(1) : 0

  const chartData = overview.map(e => ({
    name: e.entity_name,
    Umsatz: e.revenue,
    Kosten: e.expenses,
    Gewinn: e.profit,
    Steuern: e.total_tax_burden,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Steuerübersicht</h1>
          <p className="text-gray-500 text-sm mt-1">Effektive Steuerbelastung: <span className="text-yellow-400 font-medium">{effectiveRate}%</span></p>
        </div>
        <select className="select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400">Gesamtumsatz</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Gesamtkosten</p>
          <p className="text-xl font-bold mt-1 text-red-400">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Gesamtgewinn</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">{formatCurrency(totalProfit)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Gesamtsteuern</p>
          <p className="text-xl font-bold mt-1 text-yellow-400">{formatCurrency(totalTax)}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Vergleich nach Entität</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="Umsatz" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gewinn" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Steuern" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Entity Detail Cards */}
      <div className="space-y-4">
        {overview.map(entity => (
          <div key={entity.entity_id} className="card">
            <div className="flex items-center gap-3 mb-4">
              {entity.entity_type === 'company' ? (
                <Building2 className="w-5 h-5 text-blue-400" />
              ) : (
                <User className="w-5 h-5 text-emerald-400" />
              )}
              <h3 className="font-semibold text-lg">{entity.entity_name}</h3>
              <span className="badge-blue">{entity.jurisdiction}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500">Umsatz</p>
                <p className="font-semibold">{formatCurrency(entity.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kosten</p>
                <p className="font-semibold text-red-400">{formatCurrency(entity.expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gewinn</p>
                <p className="font-semibold text-emerald-400">{formatCurrency(entity.profit)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Corp Tax ({(entity.corporate_tax_rate * 100).toFixed(1)}%)</p>
                <p className="font-semibold text-yellow-400">{formatCurrency(entity.corporate_tax_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dividenden ausgez.</p>
                <p className="font-semibold">{formatCurrency(entity.dividends_paid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Transfer-Steuern</p>
                <p className="font-semibold text-yellow-400">{formatCurrency(entity.transfer_tax_paid)}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-sm text-gray-400">Netto nach Steuern</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(entity.net_profit)}</p>
            </div>
          </div>
        ))}
      </div>

      {overview.length === 0 && !loading && (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Keine Steuerdaten für {year}.</p>
          <p className="text-gray-500 text-sm mt-1">Füge Firmen mit Jurisdiktionen hinzu und erstelle Transaktionen.</p>
        </div>
      )}
    </div>
  )
}
