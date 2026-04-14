import React, { useState, useEffect, useRef } from 'react'
import { Receipt, Plus, Trash2, Filter, Tag, Sparkles, RefreshCw, ChevronDown, X, Check, Building2 } from 'lucide-react'
import { getTransactions, createTransaction, deleteTransaction, getEntities, getAccounts, getCategories, patchTransaction, autoCategorize } from '../api'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CHF']

function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

function CategoryPicker({ categories, currentCategoryId, onSelect, onClose }) {
  const ref = useRef(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} className="absolute z-50 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden" style={{right: 0}}>
      <div className="p-2">
        <input
          autoFocus
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 flex items-center gap-2 ${!currentCategoryId ? 'bg-gray-700' : ''}`}
        >
          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
          <span className="text-gray-400">Keine Kategorie</span>
        </button>
        {filtered.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 flex items-center gap-2 ${currentCategoryId === cat.id ? 'bg-gray-700' : ''}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
            <span>{cat.name}</span>
            {currentCategoryId === cat.id && <Check className="w-3 h-3 ml-auto text-blue-400" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [entities, setEntities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({ entity_id: '', tx_type: '', category_id: '', account_id: '' })
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [autoCategorizingStatus, setAutoCategorizingStatus] = useState(null)
  const [form, setForm] = useState({
    entity_id: '', account_id: '', category_id: '', transaction_type: 'expense',
    amount: '', currency: 'EUR', description: '', counterparty: '',
    transaction_date: new Date().toISOString().split('T')[0], tags: [],
  })

  const load = () => {
    const params = {}
    if (filters.entity_id) params.entity_id = filters.entity_id
    if (filters.tx_type) params.tx_type = filters.tx_type
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.account_id) params.account_id = filters.account_id
    Promise.all([
      getTransactions(params),
      getEntities(),
      getAccounts(),
      getCategories(),
    ]).then(([t, e, a, c]) => {
      setTransactions(t)
      setEntities(e)
      setAccounts(a)
      setCategories(c)
    })
  }

  useEffect(() => { load() }, [filters])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createTransaction({
      ...form,
      entity_id: parseInt(form.entity_id),
      account_id: form.account_id ? parseInt(form.account_id) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      amount: parseFloat(form.amount),
    })
    setShowForm(false)
    setForm({
      entity_id: '', account_id: '', category_id: '', transaction_type: 'expense',
      amount: '', currency: 'EUR', description: '', counterparty: '',
      transaction_date: new Date().toISOString().split('T')[0], tags: [],
    })
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('Transaktion löschen?')) {
      await deleteTransaction(id)
      load()
    }
  }

  const handleCategoryChange = async (txId, categoryId) => {
    setEditingCategoryId(null)
    await patchTransaction(txId, { category_id: categoryId })
    load()
  }

  const handleAutoCategorize = async () => {
    setAutoCategorizingStatus('running')
    try {
      const result = await autoCategorize(filters.entity_id || null, true)
      setAutoCategorizingStatus(`${result.categorized} von ${result.total_checked} kategorisiert`)
      load()
      setTimeout(() => setAutoCategorizingStatus(null), 4000)
    } catch (err) {
      console.error('Auto-categorize error:', err)
      setAutoCategorizingStatus('Fehler: ' + (err.response?.data?.detail || err.message))
      setTimeout(() => setAutoCategorizingStatus(null), 5000)
    }
  }

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || ''
  const getCategoryColor = (id) => categories.find(c => c.id === id)?.color || '#6B7280'
  const getEntityName = (id) => entities.find(e => e.id === id)?.name || ''

  // Build unique bank list from accounts
  const bankList = [...new Set(accounts.map(a => a.bank_name).filter(Boolean))]

  const totalIncome = transactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0)
  const uncategorizedCount = transactions.filter(t => !t.category_id).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transaktionen</h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-emerald-400">+{formatCurrency(totalIncome)}</span>
            {' / '}
            <span className="text-red-400">-{formatCurrency(totalExpenses)}</span>
            {' = '}
            <span className="text-white font-medium">{formatCurrency(totalIncome - totalExpenses)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {uncategorizedCount > 0 && (
            <button
              onClick={handleAutoCategorize}
              disabled={autoCategorizingStatus === 'running'}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {autoCategorizingStatus === 'running' ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /> Kategorisiere...</>
              ) : autoCategorizingStatus ? (
                autoCategorizingStatus
              ) : (
                `${uncategorizedCount} auto-kategorisieren`
              )}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Neue Transaktion
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="select text-sm" value={filters.entity_id} onChange={e => setFilters({ ...filters, entity_id: e.target.value })}>
          <option value="">Alle Entitäten</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="select text-sm" value={filters.tx_type} onChange={e => setFilters({ ...filters, tx_type: e.target.value })}>
          <option value="">Alle Typen</option>
          <option value="income">Einnahmen</option>
          <option value="expense">Ausgaben</option>
        </select>
        <select className="select text-sm" value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">Alle Kategorien</option>
          <option value="uncategorized">Unkategorisiert</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select text-sm" value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value })}>
          <option value="">Alle Konten / Banken</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` (${a.bank_name})` : ''}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">Neue Transaktion</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.transaction_type} onChange={e => setForm({ ...form, transaction_type: e.target.value })}>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
            </div>
            <div>
              <label className="label">Betrag</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Währung</label>
              <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Entität</label>
              <select className="input" value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} required>
                <option value="">Wählen...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Konto</label>
              <select className="input" value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>
                <option value="">Optional</option>
                {accounts.filter(a => !form.entity_id || a.entity_id === parseInt(form.entity_id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Wählen...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Empfänger/Auftraggeber</label>
              <input className="input" value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Beschreibung</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Speichern</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Transactions Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-3 px-2">Datum</th>
              <th className="text-left py-3 px-2">Beschreibung</th>
              <th className="text-left py-3 px-2">Kategorie</th>
              <th className="text-left py-3 px-2">Konto / Bank</th>
              <th className="text-left py-3 px-2">Entität</th>
              <th className="text-right py-3 px-2">Betrag</th>
              <th className="text-right py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">
                  {new Date(tx.transaction_date).toLocaleDateString('de-DE')}
                  {tx.is_recurring && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <RefreshCw className="w-2.5 h-2.5 mr-0.5" />{tx.recurring_interval === 'monthly' ? 'Mtl.' : tx.recurring_interval === 'weekly' ? 'Wtl.' : tx.recurring_interval}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2">
                  <p className="font-medium">{tx.description || tx.counterparty || '—'}</p>
                  {tx.counterparty && tx.description && <p className="text-xs text-gray-500">{tx.counterparty}</p>}
                </td>
                <td className="py-2.5 px-2 relative">
                  <button
                    onClick={() => setEditingCategoryId(editingCategoryId === tx.id ? null : tx.id)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                      tx.category_id
                        ? 'hover:bg-gray-700'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.category_id ? getCategoryColor(tx.category_id) : '#EAB308' }}></span>
                    {tx.category_id ? getCategoryName(tx.category_id) : 'Kategorisieren'}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                  {editingCategoryId === tx.id && (
                    <CategoryPicker
                      categories={categories}
                      currentCategoryId={tx.category_id}
                      onSelect={(catId) => handleCategoryChange(tx.id, catId)}
                      onClose={() => setEditingCategoryId(null)}
                    />
                  )}
                </td>
                <td className="py-2.5 px-2">
                  {tx.account_name ? (
                    <div>
                      <p className="text-sm text-gray-300">{tx.account_name}</p>
                      {tx.bank_name && <p className="text-xs text-gray-500">{tx.bank_name}</p>}
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-gray-400">{getEntityName(tx.entity_id)}</td>
                <td className={`py-2.5 px-2 text-right font-semibold whitespace-nowrap ${tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                </td>
                <td className="py-2.5 px-2 text-right">
                  <button onClick={() => handleDelete(tx.id)} className="p-1 hover:bg-gray-800 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="text-gray-500 text-center py-8">Keine Transaktionen gefunden</p>
        )}
      </div>
    </div>
  )
}
