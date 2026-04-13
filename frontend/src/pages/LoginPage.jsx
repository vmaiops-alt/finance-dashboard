import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Falsches Passwort')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 mb-4">
            <Wallet className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">FinanceHQ</h1>
          <p className="text-gray-500 text-sm mt-1">Bitte melde dich an</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Passwort eingeben"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || \!password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Wird geprüft...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
