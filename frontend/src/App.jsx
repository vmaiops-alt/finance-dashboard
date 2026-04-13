import React from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Building2,
  Upload, PieChart, TrendingUp, Settings, Receipt, Globe, CreditCard
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

export default function App() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-500" />
            <span>FinanceHQ</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Personal Finance Dashboard</p>
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
          <div className="text-xs text-gray-600">FinanceHQ v1.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
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
  )
}
