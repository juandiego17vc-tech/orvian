import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTenantId = async (userId) => {
    const { data } = await supabase.from('usuarios_tenant').select('tenant_id').eq('id', userId).single()
    if (data) setTenantId(data.tenant_id)
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
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    tenantId,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => {
      setTenantId(null)
      return supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
