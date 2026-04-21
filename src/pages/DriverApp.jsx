import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CarFront, MapPin, Navigation, CheckCircle2, AlertCircle } from 'lucide-react'

export default function DriverApp() {
  const { id } = useParams()
  const [chofer, setChofer] = useState(null)
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDriverData()
  }, [id])

  const fetchDriverData = async () => {
    setLoading(true)
    setError(null)
    
    // Usamos las RPC porque el chofer no está logueado en Auth de Supabase (Magic Link)
    const { data: choferData, error: choferError } = await supabase.rpc('rpc_get_chofer', { p_id: id })
    
    if (choferError || !choferData || choferData.length === 0) {
      setError("Código de chofer inválido o inactivo.")
      setLoading(false)
      return
    }

    setChofer(choferData[0])

    // Buscar viajes asignados NO finalizados
    const { data: viajesData } = await supabase.rpc('rpc_get_viajes_chofer', { p_chofer_id: id })
    if (viajesData) {
      setViajes(viajesData)
    }

    setLoading(false)
  }

  const handleUpdateStatus = async (viajeId, nuevoEstado) => {
    if (!window.confirm(`¿Confirmas que el viaje pasa a estado: ${nuevoEstado}?`)) return
    
    // Optimistic Update
    setViajes(viajes.map(v => v.id === viajeId ? { ...v, estado: nuevoEstado } : v))
    if (nuevoEstado === 'Finalizado') {
       setViajes(viajes.filter(v => v.id !== viajeId))
    }

    await supabase.rpc('rpc_update_viaje_estado', { p_viaje_id: viajeId, p_estado: nuevoEstado })
    fetchDriverData() // recargar para consistencia
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3FA9F5' }}>Iniciando Consola Móvil...</div>
  
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EF4444', padding: 20, textAlign: 'center' }}>
      <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.8 }} />
      <h2>Acceso Denegado</h2>
      <p style={{ marginTop: 8, color: '#9CA3AF' }}>{error}</p>
    </div>
  )

  const activeTrip = viajes.length > 0 ? viajes[0] : null // Tomamos el más urgente

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', margin: '0 auto', maxWidth: 480, borderLeft: '1px solid #2A2F36', borderRight: '1px solid #2A2F36', display: 'flex', flexDirection: 'column' }}>
      
      {/* APP BAR */}
      <header style={{ background: '#1A1F26', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #2A2F36', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3FA9F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <CarFront size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{chofer?.nombre_completo}</div>
          <div style={{ color: '#4ADE80', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
             <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }}></div>
             En Servicio ({chofer?.vehiculo_placa})
          </div>
        </div>
        <button onClick={fetchDriverData} style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}>↻</button>
      </header>

      {/* CONTENT */}
      <main style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {viajes.length > 0 ? (
          <>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 12, color: '#3FA9F5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Tu Agenda de Viajes</div>
              <h2 style={{ color: 'white', fontSize: 18, margin: 0 }}>Tienes {viajes.length} servicios asignados</h2>
            </div>

            {viajes.map((activeTrip, index) => (
              <div key={activeTrip.id} style={{ background: '#1A1F26', borderRadius: 16, border: index === 0 ? '2px solid #3FA9F5' : '1px solid #2A2F36', boxShadow: index === 0 ? '0 8px 30px rgba(63, 169, 245, 0.15)' : 'none', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ background: index === 0 ? 'rgba(63, 169, 245, 0.1)' : '#151921', padding: '16px 20px', borderBottom: '1px solid rgba(63, 169, 245, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#E5E7EB', fontWeight: 600, fontSize: 13 }}>Estado Actual:</span>
                    <div style={{ color: index === 0 ? '#3FA9F5' : '#9CA3AF', fontWeight: 800 }}>{activeTrip.estado}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{activeTrip.fecha_programada ? new Date(activeTrip.fecha_programada).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Inmediato'}</div>
                  </div>
                </div>
                
                <div style={{ padding: 20 }}>
                  {/* ROUTES */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 9, top: 18, bottom: 20, width: 2, background: '#2A2F36' }}></div>
                    
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0B0F14', border: '3px solid #3FA9F5', zIndex: 2, flexShrink: 0, marginTop: 2 }}></div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>ORIGEN (RECOGER AQUÍ)</div>
                        <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>{activeTrip.origen}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0B0F14', border: '3px solid #EF4444', zIndex: 2, flexShrink: 0, marginTop: 2 }}></div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>DESTINO (DEJAR AQUÍ)</div>
                        <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>{activeTrip.destino}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* DETAILS */}
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed #2A2F36', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>Cliente Pasajero</div>
                      <div style={{ color: 'white', fontWeight: 600 }}>{activeTrip.nombre_pasajero || 'Corporativo'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>Cobro a realizar</div>
                      <div style={{ color: '#4ADE80', fontWeight: 600 }}>
                        {activeTrip.quien_cobro === 'Chofer' ? `$${activeTrip.precio_estimado || 0} Efectivo` : 'NO COBRAR (Cta.Cte.)'}
                      </div>
                    </div>
                  </div>

                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeTrip.origen)}&destination=${encodeURIComponent(activeTrip.destino)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#2A2F36', color: 'white', padding: 12, borderRadius: 8, marginTop: 20, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
                  >
                    <MapPin size={18} /> Abrir trayecto en GPS
                  </a>

                  {/* ACTION BUTTONS (Solo se habilita para el viaje prioritario o actual) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 20 }}>
                    {activeTrip.estado === 'Pendiente' && (
                      <button onClick={() => handleUpdateStatus(activeTrip.id, 'En Curso')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: 18, borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <Navigation size={18}/> Iniciar Viaje (Voy en camino)
                      </button>
                    )}
                    {activeTrip.estado === 'En Curso' && (
                      <button onClick={() => handleUpdateStatus(activeTrip.id, 'Pasajero a Bordo')} style={{ background: '#F59E0B', color: 'white', border: 'none', padding: 18, borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          🚙 Recogí al Pasajero
                      </button>
                    )}
                    {(activeTrip.estado === 'Pasajero a Bordo' || activeTrip.estado === 'En Curso') && (
                      <button onClick={() => handleUpdateStatus(activeTrip.id, 'Finalizado')} style={{ background: '#10B981', color: 'white', border: 'none', padding: 18, borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <CheckCircle2 size={20}/> Terminar Viaje Oficialmente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ background: '#1A1F26', borderRadius: 16, border: '1px solid #2A2F36', padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9CA3AF' }}>
             <CheckCircle2 size={64} color="#2A2F36" style={{ marginBottom: 20 }} />
             <h3 style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>Estás Libre</h3>
             <p style={{ fontSize: 14, lineHeight: 1.5 }}>No tienes ningún viaje asignado en este momento. Mantén esta pantalla abierta para nuevas asignaciones.</p>
          </div>
        )}

      </main>

    </div>
  )
}
