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

import Tarifario from './pages/Tarifario'

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
              <Route path="tarifario" element={<Tarifario />} />
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

