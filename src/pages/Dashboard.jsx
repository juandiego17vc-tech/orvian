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
