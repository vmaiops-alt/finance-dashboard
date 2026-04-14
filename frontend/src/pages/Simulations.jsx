import React, { useState } from 'react'
import { TrendingUp, Plus, Trash2, Play, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { runSimulation } from '../api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function formatCurrency(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val)
}

function EntryRow({ entry, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <input className="col-span-3 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        placeholder="Bezeichnung" value={entry.label} onChange={e => onChange({ ...entry, label: e.target.value })} />
      <input className="col-span-2 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        type="number" placeholder="Betrag" value={entry.amount} onChange={e => onChange({ ...entry, amount: e.target.value })} />
      <input className="col-span-2 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        type="month" value={entry.month} onChange={e => onChange({ ...entry, month: e.target.value })} />
      <select className="col-span-2 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        value={entry.type} onChange={e => onChange({ ...entry, type: e.target.value })}>
        <option value="income">Einnahme</option>
        <option value="expense">Ausgabe</option>
      </select>
      <label className="col-span-2 flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
        <input type="checkbox" checked={entry.recurring} onChange={e => onChange({ ...entry, recurring: e.target.checked })}
          className="accent-blue-500" />
        Wiederkehrend
      </label>
      <button onClick={onRemove} className="col-span-1 text-gray-500 hover:text-red-400 flex justify-center">
        <X className="w-4 h-4" />
      </button>
      {entry.recurring && (
        <div className="col-span-12 ml-0 mb-1">
          <label className="text-xs text-gray-500 mr-2">Bis:</label>
          <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            type="month" value={entry.recur_until || ''} onChange={e => onChange({ ...entry, recur_until: e.target.value || null })} />
        </div>
      )}
    </div>
  )
}

function ScenarioCard({ scenario, index, onChange, onRemove }) {
  const addEntry = () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`
    onChange({
      ...scenario,
      entries: [...scenario.entries, { label: '', amount: '', month, type: 'expense', recurring: false, recur_until: null }],
    })
  }

  const updateEntry = (i, entry) => {
    const entries = [...scenario.entries]
    entries[i] = entry
    onChange({ ...scenario, entries })
  }

  const removeEntry = (i) => {
    onChange({ ...scenario, entries: scenario.entries.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <input className="bg-transparent text-lg font-semibold text-white border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1 py-0.5"
          value={scenario.name} onChange={e => onChange({ ...scenario, name: e.target.value })}
          placeholder="Szenario Name" />
        <button onClick={onRemove} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2">
        {scenario.entries.map((entry, i) => (
          <EntryRow key={i} entry={entry} onChange={e => updateEntry(i, e)} onRemove={() => removeEntry(i)} />
        ))}
      </div>
      <button onClick={addEntry}
        className="mt-3 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
      </button>
    </div>
  )
}

export default function Simulations() {
  const now = new Date()
  const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`

  const [scenarios, setScenarios] = useState([
    { name: 'Szenario 1', entries: [{ label: '', amount: '', month: nextMonth, type: 'expense', recurring: false, recur_until: null }] },
  ])
  const [months, setMonths] = useState(24)
  const [includeBaseline, setIncludeBaseline] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addScenario = () => {
    setScenarios([...scenarios, {
      name: `Szenario ${scenarios.length + 1}`,
      entries: [{ label: '', amount: '', month: nextMonth, type: 'expense', recurring: false, recur_until: null }],
    }])
  }

  const runSim = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        scenarios: scenarios.map(s => ({
          ...s,
          entries: s.entries.filter(e => e.label && e.amount).map(e => ({ ...e, amount: parseFloat(e.amount) })),
        })).filter(s => s.entries.length > 0),
        months,
        include_baseline: includeBaseline,
      }
      if (payload.scenarios.length === 0) {
        setError('Bitte mindestens einen Eintrag mit Bezeichnung und Betrag ausfüllen.')
        setLoading(false)
        return
      }
      const data = await runSimulation(payload)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Simulation fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const scenarioNames = result ? Object.keys(result.months_data[0]?.scenarios || {}) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-500" /> Simulationen</h2>
          <p className="text-sm text-gray-500 mt-1">Erstelle Szenarien und simuliere deine finanzielle Zukunft</p>
        </div>
        <button onClick={runSim} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Berechne...</> : <><Play className="w-4 h-4" /> Simulation starten</>}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Monate:</label>
          <input type="number" min="1" max="120" value={months} onChange={e => setMonths(parseInt(e.target.value) || 24)}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
          <input type="checkbox" checked={includeBaseline} onChange={e => setIncludeBaseline(e.target.checked)} className="accent-blue-500" />
          Baseline anzeigen
        </label>
        <button onClick={addScenario}
          className="ml-auto flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Szenario hinzufügen
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {/* Scenario cards */}
      <div className="space-y-4 mb-6">
        {scenarios.map((sc, i) => (
          <ScenarioCard key={i} scenario={sc} index={i}
            onChange={updated => { const s = [...scenarios]; s[i] = updated; setScenarios(s) }}
            onRemove={() => setScenarios(scenarios.filter((_, idx) => idx !== i))} />
        ))}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Aktueller Kontostand</p>
              <p className="text-lg font-bold text-white">{formatCurrency(result.current_balance)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Ø Monatl. Einnahmen</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(result.avg_monthly_income)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Ø Monatl. Ausgaben</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(result.avg_monthly_expenses)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Ø Monatl. Netto</p>
              <p className={`text-lg font-bold ${result.avg_monthly_income - result.avg_monthly_expenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(result.avg_monthly_income - result.avg_monthly_expenses)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Projektion</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={result.months_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(v) => formatCurrency(v)} labelStyle={{ color: '#9ca3af' }} />
                <Legend />
                {includeBaseline && result.months_data[0]?.baseline != null && (
                  <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                )}
                {scenarioNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={d => d.scenarios[name]} name={name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.scenario_summaries.map((s, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <h4 className="font-semibold text-white">{s.name}</h4>
                </div>
                <p className="text-sm text-gray-400 mb-1">Endguthaben: <span className="text-white font-medium">{formatCurrency(s.final_balance)}</span></p>
                <p className={`text-sm ${s.delta_vs_baseline >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.delta_vs_baseline >= 0 ? '+' : ''}{formatCurrency(s.delta_vs_baseline)} vs. Baseline
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-16 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Noch keine Simulation durchgeführt</p>
          <p className="text-sm mt-1">Füge Szenarien hinzu und klicke auf "Simulation starten"</p>
        </div>
      )}
    </div>
  )
}

function RefreshCw(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
}
