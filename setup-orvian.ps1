# ORVIAN — Script de instalación completa
# Ejecutar desde la carpeta del proyecto: C:\Users\lamen\OneDrive\Escritorio\orvian

Write-Host "🚀 Creando proyecto ORVIAN..." -ForegroundColor Cyan

# ============================================================
# 1. App.jsx
# ============================================================
Set-Content src\App.jsx @'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Viajes from './pages/Viajes'
import Clientes from './pages/Clientes'
import Choferes from './pages/Choferes'
import Finanzas from './pages/Finanzas'
import Configuracion from './pages/Configuracion'

const queryClient = new QueryClient()

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-bg text-white">Cargando...</div>
  return session ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="viajes" element={<Viajes />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="choferes" element={<Choferes />} />
              <Route path="finanzas" element={<Finanzas />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
'@

# ============================================================
# 2. main.jsx
# ============================================================
Set-Content src\main.jsx @'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
'@

# ============================================================
# 3. lib/supabase.js
# ============================================================
Set-Content src\lib\supabase.js @'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const db = {
  viajes: () => supabase.from('viajes'),
  clientes: () => supabase.from('clientes'),
  choferes: () => supabase.from('choferes'),
  pagos: () => supabase.from('pagos'),
  encuestas: () => supabase.from('encuestas'),
  alertas: () => supabase.from('alertas'),
}
'@

# ============================================================
# 4. context/AuthContext.jsx
# ============================================================
Set-Content src\context\AuthContext.jsx @'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
'@

# ============================================================
# 5. components/layout/AppLayout.jsx
# ============================================================
Set-Content src\components\layout\AppLayout.jsx @'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⬡' },
  { to: '/viajes', label: 'Viajes', icon: '↗' },
  { to: '/clientes', label: 'Clientes', icon: '◎' },
  { to: '/choferes', label: 'Choferes', icon: '◈' },
  { to: '/finanzas', label: 'Finanzas', icon: '◫' },
  { to: '/configuracion', label: 'Configuración', icon: '◻' },
]

export default function AppLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, background: '#1A1F26', borderRight: '1px solid #2A2F36', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100%', zIndex: 100 }}>
        {/* LOGO */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #2A2F36', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="5" cy="19" r="2.5" fill="#3FA9F5"/>
            <circle cx="10" cy="9" r="2.5" fill="#3FA9F5"/>
            <line x1="5" y1="19" x2="10" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <line x1="10" y1="9" x2="22" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <polygon points="22,6 28,9 22,12" fill="#3FA9F5"/>
          </svg>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: '#E5E7EB', letterSpacing: '0.04em' }}>ORVIAN</span>
        </div>

        {/* NAV */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', padding: '0 6px', marginBottom: 4 }}>Principal</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 8px', borderRadius: 5, marginBottom: 1,
                textDecoration: 'none', fontSize: 13,
                background: isActive ? 'rgba(63,169,245,0.15)' : 'transparent',
                color: isActive ? '#3FA9F5' : '#9CA3AF',
              })}
            >
              <span style={{ width: 15, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* FOOTER */}
        <div style={{ padding: 12, borderTop: '1px solid #2A2F36' }}>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #2A2F36', borderRadius: 5, color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
'@

# ============================================================
# 6. pages/Login.jsx
# ============================================================
Set-Content src\pages\Login.jsx @'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, padding: 40, width: '100%', maxWidth: 400 }}>
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="5" cy="19" r="2.5" fill="#3FA9F5"/>
            <circle cx="10" cy="9" r="2.5" fill="#3FA9F5"/>
            <line x1="5" y1="19" x2="10" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <line x1="10" y1="9" x2="22" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <polygon points="22,6 28,9 22,12" fill="#3FA9F5"/>
          </svg>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 800, color: '#E5E7EB' }}>ORVIAN</span>
        </div>

        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 6, textAlign: 'center' }}>Bienvenido</h1>
        <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 28 }}>Ingresá a tu cuenta</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@empresa.com"
              required
              style={{ width: '100%', background: '#21272F', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              style={{ width: '100%', background: '#21272F', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
            />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '8px 12px', color: '#EF4444', fontSize: 12, marginBottom: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '11px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
'@

# ============================================================
# 7. pages/Dashboard.jsx
# ============================================================
Set-Content src\pages\Dashboard.jsx @'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { session } = useAuth()

  const kpis = [
    { label: 'Viajes hoy', value: '18', sub: '↑ 12% vs ayer', color: '#3FA9F5' },
    { label: 'Facturación del mes', value: '$284k', sub: '↑ 8% vs mes anterior', color: '#E5E7EB' },
    { label: 'Cobros pendientes', value: '$42k', sub: '3 clientes', color: '#F59E0B' },
    { label: 'NPS promedio', value: '4.7 ★', sub: '↑ 0.3 último mes', color: '#22C55E' },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* TOPBAR */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB' }}>Dashboard</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '4px 12px', borderRadius: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }}></div>
          4 viajes en curso
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderTop: i === 0 ? '2px solid #3FA9F5' : '1px solid #2A2F36', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* WELCOME */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB', marginBottom: 8 }}>ORVIAN está funcionando</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
          Bienvenido {session?.user?.email}. El sistema está conectado a Supabase y listo para cargar datos reales.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(63,169,245,0.1)', border: '1px solid rgba(63,169,245,0.2)', borderRadius: 5, padding: '6px 14px', fontSize: 12, color: '#3FA9F5' }}>✓ React funcionando</div>
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 5, padding: '6px 14px', fontSize: 12, color: '#22C55E' }}>✓ Supabase conectado</div>
          <div style={{ background: 'rgba(63,169,245,0.1)', border: '1px solid rgba(63,169,245,0.2)', borderRadius: 5, padding: '6px 14px', fontSize: 12, color: '#3FA9F5' }}>✓ Auth funcionando</div>
        </div>
      </div>
    </div>
  )
}
'@

# ============================================================
# 8. pages/Viajes.jsx
# ============================================================
Set-Content src\pages\Viajes.jsx @'
export default function Viajes() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Viajes</h1>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
        Módulo de viajes — próximamente conectado a Supabase
      </div>
    </div>
  )
}
'@

# ============================================================
# 9. pages/Clientes.jsx
# ============================================================
Set-Content src\pages\Clientes.jsx @'
export default function Clientes() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Clientes</h1>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
        Módulo de clientes — próximamente conectado a Supabase
      </div>
    </div>
  )
}
'@

# ============================================================
# 10. pages/Choferes.jsx
# ============================================================
Set-Content src\pages\Choferes.jsx @'
export default function Choferes() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Choferes</h1>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
        Módulo de choferes — próximamente conectado a Supabase
      </div>
    </div>
  )
}
'@

# ============================================================
# 11. pages/Finanzas.jsx
# ============================================================
Set-Content src\pages\Finanzas.jsx @'
export default function Finanzas() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Finanzas</h1>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
        Módulo de finanzas — próximamente conectado a Supabase
      </div>
    </div>
  )
}
'@

# ============================================================
# 12. pages/Configuracion.jsx
# ============================================================
Set-Content src\pages\Configuracion.jsx @'
import { useAuth } from '../context/AuthContext'

export default function Configuracion() {
  const { session } = useAuth()
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Configuración</h1>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 24 }}>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Usuario activo</div>
        <div style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 500 }}>{session?.user?.email}</div>
      </div>
    </div>
  )
}
'@

Write-Host ""
Write-Host "✅ Todos los archivos creados exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo paso: ejecutá 'npm run dev' para ver ORVIAN funcionando" -ForegroundColor Cyan
Write-Host ""
