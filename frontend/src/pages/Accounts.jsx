import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { getAccounts, createAccount, updateAccount, deleteAccount, getEntities } from '../api'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CHF']

function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [entities, setEntities] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', bank_name: '', entity_id: '', currency: 'EUR', current_balance: 0, notes: '' })

  const load = () => {
    Promise.all([getAccounts(), getEntities()]).then(([a, e]) => {
      setAccounts(a)
      setEntities(e)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, entity_id: parseInt(form.entity_id), current_balance: parseFloat(form.current_balance) }
    if (editId) {
      await updateAccount(editId, data)
    } else {
      await createAccount(data)
    }
    setShowForm(false)
    setEditId(null)
    setForm({ name: '', bank_name: '', entity_id: '', currency: 'EUR', current_balance: 0, notes: '' })
    load()
  }

  const handleEdit = (acc) => {
    setForm({ name: acc.name, bank_name: acc.bank_name, entity_id: acc.entity_id, currency: acc.currency, current_balance: acc.current_balance, notes: acc.notes || '' })
    setEditId(acc.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Konto wirklich deaktivieren?')) {
      await deleteAccount(id)
      load()
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)
  const groupedByEntity = entities.map(e => ({
    entity: e,
    accounts: accounts.filter(a => a.entity_id === e.id),
    total: accounts.filter(a => a.entity_id === e.id).reduce((s, a) => s + a.current_balance, 0),
  })).filter(g => g.accounts.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Konten</h1>
          <p className="text-gray-500 text-sm mt-1">Gesamtvermögen: <span className="text-white font-semibold">{formatCurrency(totalBalance)}</span></p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', bank_name: '', entity_id: entities[0]?.id || '', currency: 'EUR', current_balance: 0, notes: '' }) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Konto hinzufügen
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{editId ? 'Konto bearbeiten' : 'Neues Konto'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Kontoname</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Sparkasse Girokonto" required />
            </div>
            <div>
              <label className="label">Bank</label>
              <input className="input" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="z.B. Sparkasse" />
            </div>
            <div>
              <label className="label">Zugehörigkeit</label>
              <select className="input" value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} required>
                <option value="">Wählen...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.entity_type})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Währung</label>
              <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Aktueller Stand</label>
              <input type="number" step="0.01" className="input" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })} />
            </div>
            <div>
              <label className="label">Notizen</label>
              <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">{editId ? 'Speichern' : 'Erstellen'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Grouped Accounts */}
      {groupedByEntity.map(group => (
        <div key={group.entity.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: group.entity.color }} />
            <h2 className="font-semibold">{group.entity.name}</h2>
            <span className="text-sm text-gray-500">({group.entity.entity_type === 'company' ? 'Firma' : 'Privat'})</span>
            <span className="ml-auto text-sm font-medium">{formatCurrency(group.total)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.accounts.map(acc => (
              <div key={acc.id} className="card-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-gray-500">{acc.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(acc)} className="p-1.5 hover:bg-gray-800 rounded">
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="p-1.5 hover:bg-gray-800 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                <p className={`text-xl font-bold mt-4 ${acc.current_balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(acc.current_balance, acc.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {accounts.length === 0 && !showForm && (
        <div className="text-center py-16">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Noch keine Konten angelegt.</p>
          <p className="text-gray-500 text-sm">Füge zuerst eine Firma oder Person unter "Firmen" hinzu.</p>
        </div>
      )}
    </div>
  )
}
