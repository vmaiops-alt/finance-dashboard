import React, { useState, useEffect } from 'react'
import { Building2, User, Plus, Trash2, Edit2 } from 'lucide-react'
import { getEntities, createEntity, updateEntity, deleteEntity, getJurisdictions } from '../api'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CHF']

export default function Companies() {
  const [entities, setEntities] = useState([])
  const [jurisdictions, setJurisdictions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    name: '', entity_type: 'company', jurisdiction_id: '', default_currency: 'EUR', notes: '', color: '#3B82F6'
  })

  const load = () => {
    Promise.all([getEntities(), getJurisdictions()]).then(([e, j]) => {
      setEntities(e)
      setJurisdictions(j)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, jurisdiction_id: form.jurisdiction_id ? parseInt(form.jurisdiction_id) : null }
    if (editId) {
      await updateEntity(editId, data)
    } else {
      await createEntity(data)
    }
    setShowForm(false)
    setEditId(null)
    setForm({ name: '', entity_type: 'company', jurisdiction_id: '', default_currency: 'EUR', notes: '', color: '#3B82F6' })
    load()
  }

  const handleEdit = (entity) => {
    setForm({
      name: entity.name, entity_type: entity.entity_type,
      jurisdiction_id: entity.jurisdiction_id || '', default_currency: entity.default_currency,
      notes: entity.notes || '', color: entity.color || '#3B82F6'
    })
    setEditId(entity.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Entität wirklich löschen? Alle zugehörigen Daten gehen verloren.')) {
      await deleteEntity(id)
      load()
    }
  }

  const companies = entities.filter(e => e.entity_type === 'company')
  const personal = entities.filter(e => e.entity_type === 'personal')

  const getJurisdictionName = (id) => jurisdictions.find(j => j.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firmen & Personen</h1>
          <p className="text-gray-500 text-sm mt-1">{companies.length} Firmen, {personal.length} Privat</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', entity_type: 'company', jurisdiction_id: '', default_currency: 'EUR', notes: '', color: COLORS[entities.length % COLORS.length] }) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Hinzufügen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{editId ? 'Bearbeiten' : 'Neue Entität'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Meine GmbH oder Vincent (Privat)" required />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}>
                <option value="company">Firma</option>
                <option value="personal">Privat</option>
              </select>
            </div>
            <div>
              <label className="label">Jurisdiktion</label>
              <select className="input" value={form.jurisdiction_id} onChange={e => setForm({ ...form, jurisdiction_id: e.target.value })}>
                <option value="">Keine</option>
                {jurisdictions.map(j => <option key={j.id} value={j.id}>{j.name} ({(j.corporate_tax_rate * 100).toFixed(1)}% Corp Tax)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Standardwährung</label>
              <select className="input" value={form.default_currency} onChange={e => setForm({ ...form, default_currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Farbe</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-lg ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Notizen</label>
              <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="z.B. HRB-Nummer, Registrierung..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">{editId ? 'Speichern' : 'Erstellen'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Companies */}
      {companies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-400" /> Firmen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(entity => (
              <div key={entity.id} className="card-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: entity.color + '20' }}>
                      <Building2 className="w-5 h-5" style={{ color: entity.color }} />
                    </div>
                    <div>
                      <p className="font-semibold">{entity.name}</p>
                      <p className="text-xs text-gray-500">{getJurisdictionName(entity.jurisdiction_id)} · {entity.default_currency}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(entity)} className="p-1.5 hover:bg-gray-800 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => handleDelete(entity.id)} className="p-1.5 hover:bg-gray-800 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
                {entity.notes && <p className="text-xs text-gray-500 mt-3">{entity.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal */}
      {personal.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><User className="w-5 h-5 text-emerald-400" /> Privat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personal.map(entity => (
              <div key={entity.id} className="card-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: entity.color + '20' }}>
                      <User className="w-5 h-5" style={{ color: entity.color }} />
                    </div>
                    <div>
                      <p className="font-semibold">{entity.name}</p>
                      <p className="text-xs text-gray-500">{getJurisdictionName(entity.jurisdiction_id)} · {entity.default_currency}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(entity)} className="p-1.5 hover:bg-gray-800 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => handleDelete(entity.id)} className="p-1.5 hover:bg-gray-800 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
                {entity.notes && <p className="text-xs text-gray-500 mt-3">{entity.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.length === 0 && !showForm && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Noch keine Firmen oder Personen angelegt.</p>
          <p className="text-gray-500 text-sm mt-1">Starte mit dem Hinzufügen deiner Firmen und deinem Privat-Profil.</p>
        </div>
      )}
    </div>
  )
}
