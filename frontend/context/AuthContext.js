// NeuroStride — Auth Context
import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { authApi } from '../lib/api'
import axios from 'axios'

const AuthContext = createContext(null)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('ns_user')
    const token  = localStorage.getItem('ns_token')
    if (stored && token) {
      const u = JSON.parse(stored)
      setUser(u)
      // Re-fetch profile_id if missing (patient only)
      if (u.role === 'patient' && !u.profile_id) {
        axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const updated = { ...u, profile_id: res.data.profile_id }
          localStorage.setItem('ns_user', JSON.stringify(updated))
          setUser(updated)
        }).catch(() => {})
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    const { access_token, user: u } = res.data
    localStorage.setItem('ns_token', access_token)

    // For patients — fetch profile_id immediately after login
    let enriched = { ...u }
    if (u.role === 'patient') {
      try {
        const meRes = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        enriched.profile_id = meRes.data.profile_id
      } catch {}
    }

    localStorage.setItem('ns_user', JSON.stringify(enriched))
    setUser(enriched)

    if (u.role === 'doctor')          router.push('/doctor')
    else if (u.role === 'pharmacist') router.push('/pharmacy')
    else                              router.push('/patient')
  }

  const logout = () => {
    localStorage.removeItem('ns_token')
    localStorage.removeItem('ns_user')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
