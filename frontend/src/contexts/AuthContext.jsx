import { createContext, useContext, useState, useEffect } from 'react'
import { authApi, persistSession, clearSession } from '../services/api'
import * as analytics from '../services/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [ready,   setReady]   = useState(false) // true once we've checked localStorage

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cm_user')
      if (saved) {
        const savedUser = JSON.parse(saved)
        setUser(savedUser)
        // A page refresh with an existing session doesn't go through
        // login()/signup() above — re-identify here so a returning visitor
        // (not just a fresh login) still gets attributed and recorded.
        analytics.identify(savedUser)
        analytics.startSessionRecording()
      }
    } catch {
      clearSession()
    } finally {
      setReady(true)
    }
  }, [])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    persistSession(data)
    setUser(data.user)
    analytics.identify(data.user)
    analytics.startSessionRecording()
    return data
  }

  const signup = async (name, email, password) => {
    const data = await authApi.signup(name, email, password)
    persistSession(data)
    setUser(data.user)
    analytics.identify(data.user)
    analytics.startSessionRecording()
    return data
  }

  const logout = async () => {
    // Best-effort — the session should look logged-out locally even if the
    // network call fails, rather than leaving the user stuck.
    try { await authApi.logout() } catch { /* ignore */ }
    clearSession()
    setUser(null)
    analytics.reset()
  }

  const resendVerification = async () => {
    return authApi.resendVerification()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        login,
        signup,
        logout,
        resendVerification,
        emailVerified: !!user?.email_verified,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
