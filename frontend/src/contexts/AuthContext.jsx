import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [ready,   setReady]   = useState(false) // true once we've checked localStorage

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cm_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {
      localStorage.removeItem('cm_user')
      localStorage.removeItem('cm_token')
    } finally {
      setReady(true)
    }
  }, [])

  const persist = (token, userData) => {
    localStorage.setItem('cm_token',  token)
    localStorage.setItem('cm_user',   JSON.stringify(userData))
    setUser(userData)
  }

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    persist(data.access_token, data.user)
    return data
  }

  const signup = async (name, email, password) => {
    const data = await authApi.signup(name, email, password)
    persist(data.access_token, data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('cm_token')
    localStorage.removeItem('cm_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
