import React, { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import { importFile, getEntities, getAccounts, autoCategorize, getRecurringTransactions } from '../api'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CHF']

export default function ImportPage() {
  const [entities, setEntities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [entityId, setEntityId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    Promise.all([getEntities(), getAccounts()]).then(([e, a]) => {
      setEntities(e)
      setAccounts(a)
    })
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !entityId) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_id', entityId)
    if (accountId) formData.append('account_id', accountId)
    formData.append('currency', currency)

    try {
      const res = await importFile(formData)
      // After import: auto-categorize + detect recurring
      let catResult = null
      let recurResult = null
      try {
        catResult = await autoCategorize(entityId || null, true)
        recurResult = await getRecurringTransactions(entityId || null)
      } catch (e) { /* non-critical */ }
      setResult({ ...res, categorization: catResult, recurring: recurResult })
    } catch (err) {
      setResult({ error: err.response?.data?.detail || 'Import fehlgeschlagen' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kontoauszüge importieren</h1>
        <p className="text-gray-500 text-sm mt-1">Unterstützt CSV, Excel (.xlsx) und PDF Kontoauszüge</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag & Drop */}
        <div
          className={`card border-2 border-dashed transition-colors cursor-pointer ${
            dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-gray-600'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="text-center py-8">
            <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-gray-500'}`} />
            {file ? (
              <>
                <p className="font-medium text-blue-400">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-300">Datei hierher ziehen</p>
                <p className="text-sm text-gray-500 mt-1">oder klicken zum Auswählen (CSV, XLSX, PDF)</p>
              </>
            )}
          </div>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls,.pdf,.tsv"
            onChange={e => setFile(e.target.files[0])}
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Zugehörigkeit *</label>
            <select className="input" value={entityId} onChange={e => setEntityId(e.target.value)} required>
              <option value="">Wählen...</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.entity_type === 'company' ? 'Firma' : 'Privat'})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Konto (optional)</label>
            <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Kein bestimmtes Konto</option>
              {accounts.filter(a => !entityId || a.entity_id === parseInt(entityId)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Währung</label>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || !entityId || loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Importiere...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importieren
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`card ${result.error ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.error ? (
              <AlertCircle className="w-6 h-6 text-red-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            )}
            <h3 className="font-semibold">{result.error ? 'Import fehlgeschlagen' : 'Import erfolgreich'}</h3>
          </div>

          {result.error ? (
            <p className="text-red-400 text-sm">{result.error}</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-400">{result.imported} Transaktionen importiert</p>
              {result.skipped > 0 && <p className="text-yellow-400">{result.skipped} Zeilen übersprungen</p>}
              <p className="text-gray-500">Gesamt: {result.total_rows} Zeilen in der Datei</p>
              {result.categorization && (
                <div className="mt-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400">{result.categorization.categorized} Transaktionen automatisch kategorisiert</span>
                  {result.categorization.remaining_uncategorized > 0 && (
                    <span className="text-gray-500">({result.categorization.remaining_uncategorized} noch offen)</span>
                  )}
                </div>
              )}
              {result.recurring && result.recurring.count > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">{result.recurring.count} wiederkehrende Zahlungen erkannt</span>
                </div>
              )}
              {result.errors?.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-400 font-medium">Fehler:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-red-400 text-xs">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="card">
        <h3 className="font-semibold mb-3">Unterstützte Formate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-400 mb-1">CSV / TSV</p>
            <p className="text-gray-500">Standard Bank-Exporte mit Spalten für Datum, Betrag, Beschreibung. Automatische Erkennung von Trennzeichen und Datumsformaten.</p>
          </div>
          <div>
            <p className="font-medium text-emerald-400 mb-1">Excel (.xlsx)</p>
            <p className="text-gray-500">Excel-Dateien direkt von der Bank. Spalten werden automatisch erkannt (deutsch & englisch).</p>
          </div>
          <div>
            <p className="font-medium text-purple-400 mb-1">PDF</p>
            <p className="text-gray-500">PDF Kontoauszüge werden geparst. Funktioniert am besten mit tabellarischen Auszügen.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
