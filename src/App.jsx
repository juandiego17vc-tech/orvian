import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Join from './pages/Join'
import DriverApp from './pages/DriverApp'
import ClientPortal from './pages/ClientPortal'
import Dashboard from './pages/Dashboard'
import Viajes from './pages/Viajes'
import Clientes from './pages/Clientes'
import Choferes from './pages/Choferes'
import Finanzas from './pages/Finanzas'
import Configuracion from './pages/Configuracion'

import Tarifario from './pages/Tarifario'
import Liquidaciones from './pages/Liquidaciones'
import Proveedores from './pages/Proveedores'

const queryClient = new QueryClient()

function PrivateRoute({ children }) {
  const { session, loading, tenantId, signOut } = useAuth()
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0B0F14', color: '#3fa9f5' }}>Cargando Espacio de Trabajo...</div>
  if (!session) return <Navigate to="/login" />
  
  if (session && !tenantId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0B0F14', color: '#E5E7EB', textAlign: 'center', padding: 20 }}>
        <h3>Base de datos no sincronizada</h3>
        <p style={{ color: '#9CA3AF', fontSize: 14, maxWidth: 400 }}>Tu cuenta fue creada, pero no tienes ninguna Agencia (Tenant) asignada. Esto suele ocurrir con cuentas viejas o si el proceso de registro se interrumpió.</p>
        <button 
          onClick={async () => await signOut()}
          style={{ background: 'transparent', border: '1px solid #3FA9F5', color: '#3FA9F5', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}
        >
          Cerrar Sesión para Registrar Agencia Nueva
        </button>
      </div>
    )
  }
  
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Join />} />
            <Route path="/driver/:id" element={<DriverApp />} />
            <Route path="/portal/:id" element={<ClientPortal />} />
            <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="viajes" element={<Viajes />} />
              <Route path="tarifario" element={<Tarifario />} />
              <Route path="liquidaciones" element={<Liquidaciones />} />
              <Route path="proveedores" element={<Proveedores />} />
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

