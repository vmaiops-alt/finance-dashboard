import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Building2,
  Upload, PieChart, TrendingUp, Settings, Receipt, Globe, CreditCard, LogOut,
  Menu, X
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Companies from './pages/Companies'
import Transfers from './pages/Transfers'
import TaxOverview from './pages/TaxOverview'
import Runway from './pages/Runway'
import ImportPage from './pages/ImportPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/accounts', icon: CreditCard, label: 'Konten' },
  { path: '/transactions', icon: Receipt, label: 'Transaktionen' },
  { path: '/companies', icon: Building2, label: 'Firmen' },
  { path: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { path: '/tax', icon: Globe, label: 'Steuern' },
  { path: '/runway', icon: TrendingUp, label: 'Runway' },
  { path: '/import', icon: Upload, label: 'Import' },
  { path: '/settings', icon: Settings, label: 'Einstellungen' },
]

function AppLayout() {
  const { logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-500" />
              <span>FinanceHQ</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">Personal Finance Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-gray-800 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-sm">FinanceHQ</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/tax" element={<TaxOverview />} />
              <Route path="/runway" element={<Runway />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  )
}
