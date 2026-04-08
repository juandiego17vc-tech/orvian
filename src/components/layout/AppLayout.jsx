import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⬡' },
  { to: '/viajes', label: 'Viajes', icon: '↗' },
  { to: '/tarifario', label: 'Tarifario', icon: '☰' },
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
