"use client"

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Verificar si hay cookie de autenticación
      const response = await fetch('/api/auth/verify', {
        credentials: 'include', // Incluir cookies
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        // Limpiar estado si no está autenticado
        setUser(null)
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante para cookies
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        // NO guardar datos sensibles en localStorage
        // La cookie HttpOnly ya maneja la autenticación
        return true
      } else {
        throw new Error(data.error || 'Error de autenticación')
      }
    } catch (error) {
      console.error('Error en login:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      // Llamar API para limpiar cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      
      // Limpiar solo el estado del usuario (NO las preferencias de "Recordarme")
      setUser(null)
      
      // NO eliminar sime_remember ni sime_email para que se conserve la preferencia
      
      // Redirigir usando window.location para forzar recarga completa
      window.location.href = '/'
    } catch (error) {
      console.error('Error en logout:', error)
      // Aún así redirigir al login aunque haya error
      window.location.href = '/'
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
