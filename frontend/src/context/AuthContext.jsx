import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token')
    if (token) {
      api.get('/auth/check')
        .then(() => setIsAuthenticated(true))
        .catch(() => { sessionStorage.removeItem('auth_token'); setIsAuthenticated(false) })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (password) => {
    const res = await api.post('/auth/login', { password })
    sessionStorage.setItem('auth_token', res.data.token)
    setIsAuthenticated(true)
    return res.data
  }

  const logout = () => {
    sessionStorage.removeItem('auth_token')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
