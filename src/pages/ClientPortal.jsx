import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Building, MapPin, Send, AlertCircle, Clock, CheckCircle } from 'lucide-react'

export default function ClientPortal() {
  const { id } = useParams()
  const [cliente, setCliente] = useState(null)
  const [resumen, setResumen] = useState({ total_viajes: 0, deuda_actual: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [pasajero, setPasajero] = useState('')
  const [solicitando, setSolicitando] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    const { data: clienteData, error: cError } = await supabase.rpc('rpc_get_cliente', { p_id: id })
    if (cError || !clienteData || clienteData.length === 0) {
      setError("Enlace Corporativo Inválido.")
      setLoading(false)
      return
    }
    setCliente(clienteData[0])

    const { data: resumenData } = await supabase.rpc('rpc_get_resumen_cliente', { p_cliente_id: id })
    if (resumenData && resumenData[0]) {
      setResumen(resumenData[0])
    }

    setLoading(false)
  }

  const handleSolicitar = async (e) => {
    e.preventDefault()
    setSolicitando(true)
    
    await supabase.rpc('rpc_crear_viaje_cliente', { 
      p_cliente_id: id,
      p_origen: origen,
      p_destino: destino,
      p_pasajero: pasajero 
    })
    
    setSuccess(true)
    setSolicitando(false)
    setOrigen(''); setDestino(''); setPasajero('')
    fetchData()
    
    setTimeout(() => setSuccess(false), 5000)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>Cargando Portal...</div>
  
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EF4444', padding: 20 }}>
      <AlertCircle size={48} style={{ marginBottom: 16 }} />
      <h2>No Autorizado</h2>
      <p>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER CORPORATIVO (Limpio y formal para clientes) */}
      <header style={{ background: 'white', padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Building size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 700 }}>{cliente?.nombre_empresa}</h1>
            <div style={{ color: '#6B7280', fontSize: 12 }}>Portal de Autogestión de Reservas</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
        
        {/* FORMULARIO DE RESERVA */}
        <div>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              Solicitar Vehículo
            </h2>
            
            {success && (
              <div style={{ background: '#ECFCCB', border: '1px solid #BEF264', color: '#4D7C0F', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <CheckCircle size={18} />
                Agencia notificada. Un móvil irá en camino pronto.
              </div>
            )}

            <form onSubmit={handleSolicitar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4B5563', marginBottom: 6, fontWeight: 600 }}>Punto de Recogida</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input 
                    type="text" required placeholder="Ej. Puerta Principal del Hotel"
                    value={origen} onChange={e => setOrigen(e.target.value)}
                    style={{ width: '100%', border: '1px solid #D1D5DB', background: '#F9FAFB', borderRadius: 8, padding: '10px 12px 10px 36px', fontSize: 14, outlineColor: '#8B5CF6' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4B5563', marginBottom: 6, fontWeight: 600 }}>Destino</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input 
                    type="text" required placeholder="Ej. Aeropuerto"
                    value={destino} onChange={e => setDestino(e.target.value)}
                    style={{ width: '100%', border: '1px solid #D1D5DB', background: '#F9FAFB', borderRadius: 8, padding: '10px 12px 10px 36px', fontSize: 14, outlineColor: '#8B5CF6' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4B5563', marginBottom: 6, fontWeight: 600 }}>¿Para quién es el viaje?</label>
                <input 
                  type="text" required placeholder="Nombre del huésped / ejecutivo"
                  value={pasajero} onChange={e => setPasajero(e.target.value)}
                  style={{ width: '100%', border: '1px solid #D1D5DB', background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', fontSize: 14, outlineColor: '#8B5CF6' }}
                />
              </div>

              <button 
                type="submit" disabled={solicitando}
                style={{ background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: solicitando ? 'not-allowed' : 'pointer', marginTop: 8 }}
              >
                {solicitando ? 'Enviando Orden...' : <><Send size={18} /> Pedir Auto Ahora</>}
              </button>
            </form>
          </div>
        </div>

        {/* FACTURACIÓN Y ESTADO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: 16, padding: 24 }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
               <Clock size={16} /> Frecuencia Mensual
             </h3>
             <div style={{ fontSize: 32, fontWeight: 800, color: '#4C1D95' }}>{resumen.total_viajes}</div>
             <p style={{ color: '#7C3AED', fontSize: 13, marginTop: 4 }}>Viajes consumidos sin cancelar.</p>
          </div>

          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4B5563', marginBottom: 12 }}>Cuenta Corriente</h3>
             <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>${resumen.deuda_actual.toLocaleString()}</div>
             <p style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>Deuda pendiente a liquidar con la agencia proveedora.</p>
          </div>

        </div>

      </main>
    </div>
  )
}
