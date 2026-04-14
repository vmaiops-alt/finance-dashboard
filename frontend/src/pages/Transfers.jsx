import React, { useState, useEffect } from 'react'
import { ArrowLeftRight, Plus, Trash2, ArrowRight } from 'lucide-react'
import { getTransfers, createTransfer, deleteTransfer, getEntities, getAccounts } from '../api'

const TRANSFER_TYPES = [
  { value: 'dividend', label: 'Dividende' },
  { value: 'salary', label: 'Gehalt' },
  { value: 'loan', label: 'Darlehen' },
  { value: 'loan_repayment', label: 'Darlehensrückzahlung' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'intercompany', label: 'Intercompany' },
  { value: 'other', label: 'Sonstiges' },
]
const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CHF']

function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

export default function Transfers() {
  const [transfers, setTransfers] = useState([])
  const [entities, setEntities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    from_entity_id: '', to_entity_id: '', from_account_id: '', to_account_id: '',
    transfer_type: 'dividend', amount: '', currency: 'EUR',
    transfer_date: new Date().toISOString().split('T')[0], description: '', notes: '',
  })

  const load = () => {
    Promise.all([getTransfers(), getEntities(), getAccounts()]).then(([t, e, a]) => {
      setTransfers(t)
      setEntities(e)
      setAccounts(a)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createTransfer({
      ...form,
      from_entity_id: parseInt(form.from_entity_id),
      to_entity_id: parseInt(form.to_entity_id),
      from_account_id: form.from_account_id ? parseInt(form.from_account_id) : null,
      to_account_id: form.to_account_id ? parseInt(form.to_account_id) : null,
      amount: parseFloat(form.amount),
    })
    setShowForm(false)
    setForm({
      from_entity_id: '', to_entity_id: '', from_account_id: '', to_account_id: '',
      transfer_type: 'dividend', amount: '', currency: 'EUR',
      transfer_date: new Date().toISOString().split('T')[0], description: '', notes: '',
    })
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('Transfer löschen?')) {
      await deleteTransfer(id)
      load()
    }
  }

  const getEntityName = (id) => entities.find(e => e.id === id)?.name || '?'
  const getEntityColor = (id) => entities.find(e => e.id === id)?.color || '#6B7280'
  const getTypeName = (v) => TRANSFER_TYPES.find(t => t.value === v)?.label || v

  const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0)
  const totalTax = transfers.reduce((s, t) => s + t.tax_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transfers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gesamt: {formatCurrency(totalTransferred)} · Steuern: <span className="text-red-400">{formatCurrency(totalTax)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neuer Transfer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">Neuer Transfer (Firma ↔ Privat / Firma ↔ Firma)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Von (Entität)</label>
              <select className="input" value={form.from_entity_id} onChange={e => setForm({ ...form, from_entity_id: e.target.value })} required>
                <option value="">Wählen...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">An (Entität)</label>
              <select className="input" value={form.to_entity_id} onChange={e => setForm({ ...form, to_entity_id: e.target.value })} required>
                <option value="">Wählen...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.transfer_type} onChange={e => setForm({ ...form, transfer_type: e.target.value })}>
                {TRANSFER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Von Konto</label>
              <select className="input" value={form.from_account_id} onChange={e => setForm({ ...form, from_account_id: e.target.value })}>
                <option value="">Optional</option>
                {accounts.filter(a => !form.from_entity_id || a.entity_id === parseInt(form.from_entity_id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">An Konto</label>
              <select className="input" value={form.to_account_id} onChange={e => setForm({ ...form, to_account_id: e.target.value })}>
                <option value="">Optional</option>
                {accounts.filter(a => !form.to_entity_id || a.entity_id === parseInt(form.to_entity_id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
              <input type="date" className="input" value={form.transfer_date} onChange={e => setForm({ ...form, transfer_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Beschreibung</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Transfer erstellen</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Transfers List */}
      <div className="space-y-3">
        {transfers.map(t => (
          <div key={t.id} className="card-hover">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                {/* From → To */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: getEntityColor(t.from_entity_id) + '20', color: getEntityColor(t.from_entity_id) }}>
                    {getEntityName(t.from_entity_id)}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                  <div className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: getEntityColor(t.to_entity_id) + '20', color: getEntityColor(t.to_entity_id) }}>
                    {getEntityName(t.to_entity_id)}
                  </div>
                </div>
                {/* Type badge */}
                <span className="badge-blue">{getTypeName(t.transfer_type)}</span>
                {/* Date */}
                <span className="text-sm text-gray-500">{new Date(t.transfer_date).toLocaleDateString('de-DE')}</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(t.amount, t.currency)}</p>
                  {t.tax_amount > 0 && (
                    <p className="text-xs text-red-400">
                      Steuer: {formatCurrency(t.tax_amount)} ({(t.tax_rate_applied * 100).toFixed(1)}%) → Netto: {formatCurrency(t.net_amount)}
                    </p>
                  )}
                  {t.tax_amount === 0 && (
                    <p className="text-xs text-emerald-400">Steuerfrei</p>
                  )}
                </div>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-gray-800 rounded">
                  <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                </button>
              </div>
            </div>
            {t.description && <p className="text-sm text-gray-500 mt-2">{t.description}</p>}
          </div>
        ))}
      </div>

      {transfers.length === 0 && !showForm && (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Noch keine Transfers.</p>
          <p className="text-gray-500 text-sm mt-1">Erstelle Transfers zwischen Firmen und deinem Privatkonto (Dividende, Gehalt, Loan...)</p>
        </div>
      )}
    </div>
  )
}
