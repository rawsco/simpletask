import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Session } from '../types'
import { apiClient } from '../services/api'

interface AuthContextType {
  session: Session | null
  isAuthenticated: boolean
  login: (sessionToken: string, expiresAt: number) => void
  logout: () => Promise<void>
  checkSession: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Load session from localStorage on mount
    const sessionData = localStorage.getItem('session')
    if (sessionData) {
      try {
        const parsedSession: Session = JSON.parse(sessionData)
        // Check if session is expired
        if (parsedSession.expiresAt > Date.now()) {
          setSession(parsedSession)
        } else {
          localStorage.removeItem('session')
        }
      } catch (error) {
        console.error('Failed to parse session data:', error)
        localStorage.removeItem('session')
      }
    }
  }, [])

  const login = (sessionToken: string, expiresAt: number) => {
    const newSession: Session = { sessionToken, expiresAt }
    setSession(newSession)
    localStorage.setItem('session', JSON.stringify(newSession))
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setSession(null)
      localStorage.removeItem('session')
    }
  }

  const checkSession = (): boolean => {
    if (!session) return false
    if (session.expiresAt <= Date.now()) {
      setSession(null)
      localStorage.removeItem('session')
      return false
    }
    return true
  }

  const isAuthenticated = session !== null && session.expiresAt > Date.now()

  return (
    <AuthContext.Provider value={{ session, isAuthenticated, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
