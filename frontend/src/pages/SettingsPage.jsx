import React, { useState, useEffect } from 'react'
import { Settings, Globe, Plus, Trash2, Tag, Scale } from 'lucide-react'
import { getJurisdictions, createJurisdiction, updateJurisdiction, deleteJurisdiction, getTaxRules, createTaxRule, deleteTaxRule, getCategories, createCategory, deleteCategory } from '../api'

const TRANSFER_TYPES = [
  { value: 'dividend', label: 'Dividende' },
  { value: 'salary', label: 'Gehalt' },
  { value: 'loan', label: 'Darlehen' },
  { value: 'loan_repayment', label: 'Darlehensrückzahlung' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'intercompany', label: 'Intercompany' },
  { value: 'other', label: 'Sonstiges' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('jurisdictions')
  const [jurisdictions, setJurisdictions] = useState([])
  const [taxRules, setTaxRules] = useState([])
  const [categories, setCategories] = useState([])
  const [showJForm, setShowJForm] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  const [jForm, setJForm] = useState({ name: '', country_code: '', corporate_tax_rate: 0, personal_income_tax_rate: 0, dividend_withholding_tax: 0, vat_rate: 0, notes: '' })
  const [ruleForm, setRuleForm] = useState({ jurisdiction_id: '', transfer_type: 'dividend', tax_rate: 0, description: '' })
  const [catForm, setCatForm] = useState({ name: '', icon: '', color: '#6B7280', keywords: '' })

  const load = () => {
    Promise.all([getJurisdictions(), getTaxRules(), getCategories()]).then(([j, r, c]) => {
      setJurisdictions(j)
      setTaxRules(r)
      setCategories(c)
    })
  }

  useEffect(() => { load() }, [])

  const handleJSubmit = async (e) => {
    e.preventDefault()
    await createJurisdiction({
      ...jForm,
      corporate_tax_rate: parseFloat(jForm.corporate_tax_rate) / 100,
      personal_income_tax_rate: parseFloat(jForm.personal_income_tax_rate) / 100,
      dividend_withholding_tax: parseFloat(jForm.dividend_withholding_tax) / 100,
      vat_rate: parseFloat(jForm.vat_rate) / 100,
    })
    setShowJForm(false)
    setJForm({ name: '', country_code: '', corporate_tax_rate: 0, personal_income_tax_rate: 0, dividend_withholding_tax: 0, vat_rate: 0, notes: '' })
    load()
  }

  const handleRuleSubmit = async (e) => {
    e.preventDefault()
    await createTaxRule({
      ...ruleForm,
      jurisdiction_id: parseInt(ruleForm.jurisdiction_id),
      tax_rate: parseFloat(ruleForm.tax_rate) / 100,
    })
    setShowRuleForm(false)
    setRuleForm({ jurisdiction_id: '', transfer_type: 'dividend', tax_rate: 0, description: '' })
    load()
  }

  const handleCatSubmit = async (e) => {
    e.preventDefault()
    await createCategory({
      ...catForm,
      keywords: catForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
    })
    setShowCatForm(false)
    setCatForm({ name: '', icon: '', color: '#6B7280', keywords: '' })
    load()
  }

  const tabs = [
    { id: 'jurisdictions', label: 'Jurisdiktionen', icon: Globe },
    { id: 'taxrules', label: 'Steuerregeln', icon: Scale },
    { id: 'categories', label: 'Kategorien', icon: Tag },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-gray-500 text-sm mt-1">Jurisdiktionen, Steuerregeln und Kategorien verwalten</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Jurisdictions */}
      {tab === 'jurisdictions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="font-semibold">Jurisdiktionen</h2>
            <button onClick={() => setShowJForm(!showJForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neue Jurisdiktion</button>
          </div>

          {showJForm && (
            <form onSubmit={handleJSubmit} className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={jForm.name} onChange={e => setJForm({ ...jForm, name: e.target.value })} placeholder="z.B. Singapur" required />
                </div>
                <div>
                  <label className="label">Länderkürzel</label>
                  <input className="input" value={jForm.country_code} onChange={e => setJForm({ ...jForm, country_code: e.target.value })} placeholder="z.B. SG" maxLength={3} />
                </div>
                <div>
                  <label className="label">Corp Tax (%)</label>
                  <input type="number" step="0.1" className="input" value={jForm.corporate_tax_rate} onChange={e => setJForm({ ...jForm, corporate_tax_rate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Personal Income Tax (%)</label>
                  <input type="number" step="0.1" className="input" value={jForm.personal_income_tax_rate} onChange={e => setJForm({ ...jForm, personal_income_tax_rate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Dividenden WHT (%)</label>
                  <input type="number" step="0.1" className="input" value={jForm.dividend_withholding_tax} onChange={e => setJForm({ ...jForm, dividend_withholding_tax: e.target.value })} />
                </div>
                <div>
                  <label className="label">MwSt (%)</label>
                  <input type="number" step="0.1" className="input" value={jForm.vat_rate} onChange={e => setJForm({ ...jForm, vat_rate: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Notizen</label>
                  <input className="input" value={jForm.notes} onChange={e => setJForm({ ...jForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Erstellen</button>
                <button type="button" onClick={() => setShowJForm(false)} className="btn-secondary">Abbrechen</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {jurisdictions.map(j => (
              <div key={j.id} className="card-hover">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{j.name} <span className="text-gray-500 text-sm">({j.country_code})</span></p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                      <span>Corp Tax: <span className="text-white">{(j.corporate_tax_rate * 100).toFixed(1)}%</span></span>
                      <span>PIT: <span className="text-white">{(j.personal_income_tax_rate * 100).toFixed(1)}%</span></span>
                      <span>Div WHT: <span className="text-white">{(j.dividend_withholding_tax * 100).toFixed(1)}%</span></span>
                      <span>MwSt: <span className="text-white">{(j.vat_rate * 100).toFixed(1)}%</span></span>
                    </div>
                    {j.notes && <p className="text-xs text-gray-500 mt-1">{j.notes}</p>}
                  </div>
                  <button onClick={async () => { if (confirm('Jurisdiktion löschen?')) { await deleteJurisdiction(j.id); load() } }} className="p-1.5 hover:bg-gray-800 rounded">
                    <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Rules */}
      {tab === 'taxrules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="font-semibold">Steuerregeln</h2>
            <button onClick={() => setShowRuleForm(!showRuleForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neue Regel</button>
          </div>

          {showRuleForm && (
            <form onSubmit={handleRuleSubmit} className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">Jurisdiktion</label>
                  <select className="input" value={ruleForm.jurisdiction_id} onChange={e => setRuleForm({ ...ruleForm, jurisdiction_id: e.target.value })} required>
                    <option value="">Wählen...</option>
                    {jurisdictions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Transfer-Typ</label>
                  <select className="input" value={ruleForm.transfer_type} onChange={e => setRuleForm({ ...ruleForm, transfer_type: e.target.value })}>
                    {TRANSFER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Steuersatz (%)</label>
                  <input type="number" step="0.1" className="input" value={ruleForm.tax_rate} onChange={e => setRuleForm({ ...ruleForm, tax_rate: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Beschreibung</label>
                  <input className="input" value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Erstellen</button>
                <button type="button" onClick={() => setShowRuleForm(false)} className="btn-secondary">Abbrechen</button>
              </div>
            </form>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">Jurisdiktion</th>
                  <th className="text-left py-2 px-3">Transfer-Typ</th>
                  <th className="text-right py-2 px-3">Steuersatz</th>
                  <th className="text-left py-2 px-3">Beschreibung</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {taxRules.map(r => (
                  <tr key={r.id} className="border-b border-gray-800/50">
                    <td className="py-2 px-3">{jurisdictions.find(j => j.id === r.jurisdiction_id)?.name || '?'}</td>
                    <td className="py-2 px-3">{TRANSFER_TYPES.find(t => t.value === r.transfer_type)?.label || r.transfer_type}</td>
                    <td className="py-2 px-3 text-right font-medium">{(r.tax_rate * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-gray-400">{r.description}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={async () => { await deleteTaxRule(r.id); load() }} className="p-1 hover:bg-gray-800 rounded">
                        <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="font-semibold">Kategorien</h2>
            <button onClick={() => setShowCatForm(!showCatForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neue Kategorie</button>
          </div>

          {showCatForm && (
            <form onSubmit={handleCatSubmit} className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Icon (Emoji)</label>
                  <input className="input" value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} placeholder="z.B. 🏠" />
                </div>
                <div>
                  <label className="label">Farbe</label>
                  <input type="color" className="input h-10" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })} />
                </div>
                <div>
                  <label className="label">Keywords (kommagetrennt)</label>
                  <input className="input" value={catForm.keywords} onChange={e => setCatForm({ ...catForm, keywords: e.target.value })} placeholder="amazon, zalando, online" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Erstellen</button>
                <button type="button" onClick={() => setShowCatForm(false)} className="btn-secondary">Abbrechen</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(c => (
              <div key={c.id} className="card-hover flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: c.color + '20' }}>
                    {c.icon || '📋'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.keywords?.length > 0 && (
                      <p className="text-xs text-gray-500">{c.keywords.join(', ')}</p>
                    )}
                  </div>
                </div>
                <button onClick={async () => { if (confirm('Kategorie löschen?')) { await deleteCategory(c.id); load() } }} className="p-1.5 hover:bg-gray-800 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
