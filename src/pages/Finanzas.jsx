import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Finanzas() {
  const { tenantId } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // KPIs
  const [ingresosProyectados, setIngresosProyectados] = useState(0)
  const [viajesPorCotizar, setViajesPorCotizar] = useState(0)
  const [viajesTop, setViajesTop] = useState([])

  useEffect(() => {
    if (tenantId) fetchFinanzas()
  }, [tenantId])

  const fetchFinanzas = async () => {
    setLoading(true)
    
    // Obtenemos todos los viajes para calcular finanzas
    const { data: viajes, error } = await supabase
      .from('viajes')
      .select('precio_estimado, validacion_precio_manual, origen, destino, created_at, clientes(nombre_completo)')
      .order('created_at', { ascending: false })

    if (viajes) {
      let acumulado = 0
      let porCotizar = 0
      
      viajes.forEach(v => {
        if (v.precio_estimado && !v.validacion_precio_manual) {
          acumulado += parseFloat(v.precio_estimado)
        }
        if (v.validacion_precio_manual) {
          porCotizar++
        }
      })

      setIngresosProyectados(acumulado)
      setViajesPorCotizar(porCotizar)
      setViajesTop(viajes.slice(0, 5)) // Solo los últimos 5 para la tablita rápida
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* HEADER */}
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB', marginBottom: 24 }}>Centro Financiero</h1>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Calculando billetes...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            
            <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderTop: '2px solid #22C55E', borderRadius: 8, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
              <DollarSign size={80} color="rgba(34, 197, 94, 0.05)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9CA3AF', marginBottom: 12, fontWeight: 500 }}>
                <TrendingUp size={16} color="#22C55E" /> Ingresos Proyectados Totales
              </div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: 700, color: '#4ADE80', lineHeight: 1 }}>
                ${ingresosProyectados.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderTop: '2px solid #F59E0B', borderRadius: 8, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
              <AlertCircle size={80} color="rgba(245, 158, 11, 0.05)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9CA3AF', marginBottom: 12, fontWeight: 500 }}>
                Viajes Pendientes de Cotizar
              </div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: 700, color: '#FCD34D', lineHeight: 1 }}>
                {viajesPorCotizar}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Requieren atención manual</div>
            </div>

            <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderTop: '2px solid #3FA9F5', borderRadius: 8, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
              <CreditCard size={80} color="rgba(63, 169, 245, 0.05)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9CA3AF', marginBottom: 12, fontWeight: 500 }}>
                Costo Promedio (Ticket)
              </div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: 700, color: '#93C5FD', lineHeight: 1 }}>
                ${ingresosProyectados > 0 && viajesTop.length > 0 ? (ingresosProyectados / (viajesTop.length - viajesPorCotizar)).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Monto promedio por viaje tasado</div>
            </div>

          </div>

          {/* ÚLTIMOS MOVIMIENTOS FINANCIEROS */}
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
             <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36' }}>
               <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB' }}>Últimas Cotizaciones Aprobadas</h3>
             </div>
             
             {viajesTop.length === 0 ? (
               <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No hay movimientos financieros aún.</div>
             ) : (
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                      <th style={{ padding: '12px 20px', fontWeight: 500 }}>Fecha Transacción</th>
                      <th style={{ padding: '12px 20px', fontWeight: 500 }}>Cliente</th>
                      <th style={{ padding: '12px 20px', fontWeight: 500 }}>Ruta Comercial</th>
                      <th style={{ padding: '12px 20px', fontWeight: 500, textAlign: 'right' }}>Monto Emitido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajesTop.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                        <td style={{ padding: '14px 20px', color: '#9CA3AF' }}>
                          {new Date(v.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                          {v.clientes?.nombre_completo}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#9CA3AF' }}>
                          <span style={{ color: '#E5E7EB' }}>{v.origen}</span> → {v.destino}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: v.validacion_precio_manual ? '#F59E0B' : '#4ADE80' }}>
                          {v.validacion_precio_manual ? 'A COTIZAR' : `$${v.precio_estimado}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             )}
          </div>
        </>
      )}
    </div>
  )
}
