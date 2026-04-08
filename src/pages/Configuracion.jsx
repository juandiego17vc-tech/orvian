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
