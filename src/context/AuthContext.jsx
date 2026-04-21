import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [tenantId, setTenantId] = useState(null)
  const [rol, setRol] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTenantId = async (userId) => {
    const { data } = await supabase.from('usuarios_tenant').select('tenant_id, rol').eq('id', userId).single()
    if (data) {
      setTenantId(data.tenant_id)
      setRol(data.rol)
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchTenantId(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTenantId(session.user.id)
      else {
        setTenantId(null)
        setRol(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    tenantId,
    rol,
    loading,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => {
      setTenantId(null)
      setRol(null)
      return supabase.auth.signOut()
    },
    reloadTenant: () => {
      if (session) fetchTenantId(session.user.id)
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
