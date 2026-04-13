import axios from 'axios'

const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return '/api'
  }
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      sessionStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Dashboard ──────────────────────────────────────────────────────────
export const getDashboardSummary = (year, month) =>
  api.get('/dashboard/summary', { params: { year, month } }).then(r => r.data)

export const getCashflowProjection = (months = 12) =>
  api.get('/dashboard/cashflow-projection', { params: { months } }).then(r => r.data)

export const getRunwayAnalysis = (targetDate) =>
  api.get('/dashboard/runway', { params: { target_date: targetDate } }).then(r => r.data)

export const getTaxOverview = (year) =>
  api.get('/dashboard/tax-overview', { params: { year } }).then(r => r.data)

export const getMonthlyTrend = (months = 12, entityId) =>
  api.get('/dashboard/monthly-trend', { params: { months, entity_id: entityId } }).then(r => r.data)

// ── Entities ───────────────────────────────────────────────────────────
export const getEntities = (entityType) =>
  api.get('/entities', { params: { entity_type: entityType } }).then(r => r.data)

export const createEntity = (data) =>
  api.post('/entities', data).then(r => r.data)

export const updateEntity = (id, data) =>
  api.put(`/entities/${id}`, data).then(r => r.data)

export const deleteEntity = (id) =>
  api.delete(`/entities/${id}`).then(r => r.data)

// ── Accounts ───────────────────────────────────────────────────────────
export const getAccounts = (entityId) =>
  api.get('/accounts', { params: { entity_id: entityId } }).then(r => r.data)

export const createAccount = (data) =>
  api.post('/accounts', data).then(r => r.data)

export const updateAccount = (id, data) =>
  api.put(`/accounts/${id}`, data).then(r => r.data)

export const deleteAccount = (id) =>
  api.delete(`/accounts/${id}`).then(r => r.data)

// ── Categories ─────────────────────────────────────────────────────────
export const getCategories = () =>
  api.get('/categories').then(r => r.data)

export const createCategory = (data) =>
  api.post('/categories', data).then(r => r.data)

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}`).then(r => r.data)

// ── Transactions ───────────────────────────────────────────────────────
export const getTransactions = (params) =>
  api.get('/transactions', { params }).then(r => r.data)

export const createTransaction = (data) =>
  api.post('/transactions', data).then(r => r.data)

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data).then(r => r.data)

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`).then(r => r.data)

// ── Transfers ──────────────────────────────────────────────────────────
export const getTransfers = (params) =>
  api.get('/transfers', { params }).then(r => r.data)

export const createTransfer = (data) =>
  api.post('/transfers', data).then(r => r.data)

export const deleteTransfer = (id) =>
  api.delete(`/transfers/${id}`).then(r => r.data)

// ── Jurisdictions ──────────────────────────────────────────────────────
export const getJurisdictions = () =>
  api.get('/jurisdictions').then(r => r.data)

export const createJurisdiction = (data) =>
  api.post('/jurisdictions', data).then(r => r.data)

export const updateJurisdiction = (id, data) =>
  api.put(`/jurisdictions/${id}`, data).then(r => r.data)

export const deleteJurisdiction = (id) =>
  api.delete(`/jurisdictions/${id}`).then(r => r.data)

// ── Tax Rules ──────────────────────────────────────────────────────────
export const getTaxRules = (jurisdictionId) =>
  api.get('/tax-rules', { params: { jurisdiction_id: jurisdictionId } }).then(r => r.data)

export const createTaxRule = (data) =>
  api.post('/tax-rules', data).then(r => r.data)

export const deleteTaxRule = (id) =>
  api.delete(`/tax-rules/${id}`).then(r => r.data)

// ── Loans ──────────────────────────────────────────────────────────────
export const getLoans = (entityId) =>
  api.get('/loans', { params: { entity_id: entityId } }).then(r => r.data)

export const createLoan = (data) =>
  api.post('/loans', data).then(r => r.data)

export const createLoanRepayment = (data) =>
  api.post('/loan-repayments', data).then(r => r.data)

// ── Budgets ────────────────────────────────────────────────────────────
export const getBudgets = (year) =>
  api.get('/budgets', { params: { year } }).then(r => r.data)

export const createBudget = (data) =>
  api.post('/budgets', data).then(r => r.data)

export const deleteBudget = (id) =>
  api.delete(`/budgets/${id}`).then(r => r.data)

// ── Import ─────────────────────────────────────────────────────────────
export const importFile = (formData) =>
  api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export default api
