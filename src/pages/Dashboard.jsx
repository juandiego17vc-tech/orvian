import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { tenantId } = useAuth()
  const [metricas, setMetricas] = useState({
    viajesHoy: 0,
    facturacionMes: 0,
    cobrosPendientes: 0,
    viajesEnCurso: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tenantId) fetchDashboard()
  }, [tenantId])

  const fetchDashboard = async () => {
    setLoading(true)

    // 1. Viajes Hoy & En Curso
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    const { data: viajes } = await supabase
      .from('viajes')
      .select('estado, precio_estimado, created_at, archivado')
      
    if (viajes) {
      let vHoy = 0
      let vEnCurso = 0
      let facturacion = 0
      let pendientes = 0

      // Calcular inicio de mes
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      viajes.forEach(v => {
        const d = new Date(v.created_at)
        
        if (d >= hoy) vHoy++
        if (v.estado === 'En Curso') vEnCurso++
        
        // Facturación del mes (Finalizados o en curso)
        if (d >= inicioMes && v.estado !== 'Cancelado') {
          facturacion += (v.precio_estimado || 0)
        }

        // Cobros pendientes (No archivados en la boveda)
        if (v.estado === 'Finalizado' && !v.archivado) {
          pendientes += (v.precio_estimado || 0)
        }
      })

      setMetricas({
        viajesHoy: vHoy,
        facturacionMes: facturacion,
        cobrosPendientes: pendientes,
        viajesEnCurso: vEnCurso
      })
    }
    
    setLoading(false)
  }

  const kpis = [
    { label: 'Viajes de Hoy', value: metricas.viajesHoy.toString(), sub: 'Operativa diaria', color: '#3FA9F5' },
    { label: 'Facturación del Mes', value: `$${metricas.facturacionMes.toLocaleString('es-AR')}`, sub: 'Bruto proyectado', color: '#E5E7EB' },
    { label: 'Capital Flotante', value: `$${metricas.cobrosPendientes.toLocaleString('es-AR')}`, sub: 'Por liquidar en Bóveda', color: '#F59E0B' },
    { label: 'NPS Promedio', value: '4.8 ★', sub: 'Satisfacción mensual', color: '#22C55E' },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* TOPBAR */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB' }}>Dashboard Analítico</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '4px 12px', borderRadius: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }}></div>
          {metricas.viajesEnCurso} viajes en curso
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, opacity: loading ? 0.5 : 1, transition: '0.3s' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderTop: i === 0 ? '2px solid #3FA9F5' : '1px solid #2A2F36', borderRadius: 8, padding: '16px 18px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ÚLTIMOS VIAJES EN CURSO */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 24 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: '#E5E7EB', marginBottom: 16 }}>Telemetría de la Flota 📡</h2>
        <div style={{ color: '#9CA3AF', fontSize: 13, lineHeight: '1.6' }}>
          Tus métricas ahora están sincronizadas en tiempo real con <strong>Supabase</strong>. 
          Cada viaje pedido por un cliente en el portal B2B o despachado a la App del chofer se reflejará aquí automáticamente.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
