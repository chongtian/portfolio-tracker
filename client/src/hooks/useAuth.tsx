import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { login as cognitoLogin, logout as cognitoLogout, validateOrRefreshSession } from '../services/cognitoAuth'

interface AuthContextValue {
  userName: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  loading: boolean
  fullName: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const login = useCallback(async (username: string, password: string) => {
    const result = await cognitoLogin(username, password)
    console.debug(result)
    if (result.success) {
      setUserName(username)
      localStorage.setItem('username', username)
      const fullName = result.session?.getIdToken().payload['name']
      localStorage.setItem('fullname', fullName)
    }
    return result
  }, [])

  const logout = useCallback(() => {
    cognitoLogout()
    localStorage.removeItem('username')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('idToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('fullname')
    setUserName(null)
  }, [])

  useEffect(() => {

    const checkSession = async () => {
      try {

        const storedUsername = localStorage.getItem('username')

        if (storedUsername) {
          const valid = await validateOrRefreshSession()

          if (valid) {
            setUserName(storedUsername)
          } else {
            logout()
          }

        }
      } catch (error) {
        console.error('Session check failed:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [logout])

  const value = useMemo(
    () => ({
      userName,
      isAuthenticated: Boolean(userName),
      login,
      logout,
      loading,
      fullName: localStorage.getItem('fullname')
    }),
    [userName, login, logout, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

