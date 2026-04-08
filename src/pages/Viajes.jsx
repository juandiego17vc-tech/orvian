import { useState, useEffect } from 'react'
import { Plus, MapPin, Calendar, DollarSign, Check, X, Car, Settings, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Viajes() {
  const { tenantId } = useAuth()
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [modoCliente, setModoCliente] = useState('existente')
  const [clientesList, setClientesList] = useState([])
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [precio, setPrecio] = useState('')
  const [fecha, setFecha] = useState('')
  const [validacionManual, setValidacionManual] = useState(false)
  const [tarifasList, setTarifasList] = useState([])
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState('')

  // Manage State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [choferesList, setChoferesList] = useState([])
  const [manageChoferId, setManageChoferId] = useState('')
  const [manageEstado, setManageEstado] = useState('')
  const [managePrecio, setManagePrecio] = useState('')

  useEffect(() => {
    if (tenantId) {
      fetchViajes()
      fetchClientesList()
      fetchTarifasList()
    }
  }, [tenantId])

  const fetchTarifasList = async () => {
    const { data } = await supabase.from('tarifario').select('*').order('nombre_servicio', { ascending: true })
    if (data) setTarifasList(data)
  }

  const handleTarifaSelect = (e) => {
    const tId = e.target.value
    setTarifaSeleccionadaId(tId)
    if (tId) {
      const tarifa = tarifasList.find(t => t.id === tId)
      if (tarifa) {
        setOrigen(tarifa.nombre_servicio)
        setDestino('') // Se deja vacío intencionalmente porque el Origen absorbe toda la ruta
        setPrecio(tarifa.precio_fijo.toString())
        setValidacionManual(false)
      }
    } else {
      setOrigen('')
      setDestino('')
      setPrecio('')
    }
  }

  const fetchClientesList = async () => {
    const { data } = await supabase.from('clientes').select('id, nombre_completo, telefono').order('nombre_completo', { ascending: true })
    if (data && data.length > 0) {
      setClientesList(data)
      setClienteSeleccionadoId(data[0].id)
    } else {
      setModoCliente('nuevo')
    }
  }

  const fetchChoferesList = async () => {
    const { data } = await supabase.from('choferes').select('id, nombre_completo, disponibilidad').order('nombre_completo', { ascending: true })
    if (data) setChoferesList(data)
  }

  const abrirGestion = (viaje) => {
    setViajeSeleccionado(viaje)
    setManageChoferId(viaje.chofer_id || '')
    setManageEstado(viaje.estado)
    setManagePrecio(viaje.precio_estimado || '')
    if (choferesList.length === 0) fetchChoferesList() // Cargar on demand
    setIsManageModalOpen(true)
  }

  const handleManageSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('viajes').update({
        chofer_id: manageChoferId || null,
        estado: manageEstado,
        precio_estimado: managePrecio ? parseFloat(managePrecio) : null,
        validacion_precio_manual: false // Si lo edita, asumimos que ya lo cotizó
      }).eq('id', viajeSeleccionado.id)
      
      if (error) throw error

      // Auto-actualizar el estado del chofer (Magia Operativa)
      if (manageChoferId) {
        let nuevaDispo = 'Disponible'
        if (manageEstado === 'En Curso') nuevaDispo = 'En Viaje'
        await supabase.from('choferes').update({ disponibilidad: nuevaDispo }).eq('id', manageChoferId)
      }

      setIsManageModalOpen(false)
      fetchViajes()
    } catch (err) {
      console.error(err)
      alert("Hubo un error al actualizar el viaje")
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchViajes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        clientes(nombre_completo),
        choferes(nombre_completo)
      `)
      .order('created_at', { ascending: false })
    
    if (data) setViajes(data)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenantId) return
    setIsSubmitting(true)

    try {
      let finalClienteId = clienteSeleccionadoId

      if (modoCliente === 'nuevo') {
        const { data: cliente, error: cliError } = await supabase
          .from('clientes')
          .insert([{ nombre_completo: clienteNombre, telefono: clienteTelefono || null, tenant_id: tenantId }])
          .select()
          .single()

        if (cliError) throw cliError
        finalClienteId = cliente.id
      }

      // 2. Crear el viaje asociado a ese cliente
      const { error: viajeError } = await supabase
        .from('viajes')
        .insert([{
          tenant_id: tenantId,
          cliente_id: finalClienteId,
          origen,
          destino,
          precio_estimado: precio ? parseFloat(precio) : null,
          fecha_programada: fecha ? new Date(fecha).toISOString() : null,
          validacion_precio_manual: validacionManual
        }])

      if (viajeError) throw viajeError

      // Reset form and UI
      setIsModalOpen(false)
      setClienteNombre('')
      setClienteTelefono('')
      setClienteSearch('')
      setShowClientDropdown(false)
      setOrigen('')
      setDestino('')
      setPrecio('')
      setFecha('')
      setValidacionManual(false)
      setTarifaSeleccionadaId('')
      
      // Refresh list
      fetchViajes()
      fetchClientesList()
    } catch (err) {
      console.error(err)
      alert("Hubo un error al crear el viaje")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper para el color del badge de estado
  const getEstadoColor = (estado) => {
    const colors = {
      'Pendiente': 'rgba(245, 158, 11, 0.15)', // Ámbar
      'En Curso': 'rgba(63, 169, 245, 0.15)',  // Azul ORVIAN
      'Finalizado': 'rgba(34, 197, 94, 0.15)', // Verde
      'Cancelado': 'rgba(239, 68, 68, 0.15)'   // Rojo
    }
    const txtColors = {
      'Pendiente': '#F59E0B',
      'En Curso': '#3FA9F5',
      'Finalizado': '#22C55E',
      'Cancelado': '#EF4444'
    }
    return { bg: colors[estado] || colors.Pendiente, txt: txtColors[estado] || txtColors.Pendiente }
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Tablero de Viajes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
        >
          <Plus size={16} /> Nuevo Viaje
        </button>
      </div>

      {/* TABLA */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Cargando viajes...</div>
        ) : viajes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
            <Car size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            Aún no tienes viajes registrados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Cliente</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Ruta</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Fecha Prog.</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Precio</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map((v) => {
                const badge = getEstadoColor(v.estado)
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>{v.clientes?.nombre_completo}</td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3FA9F5' }} />
                        {v.origen}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                        {v.destino}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>
                      {v.fecha_programada ? new Date(v.fecha_programada).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Inmediato'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.txt, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {v.estado}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {v.validacion_precio_manual ? (
                        <span style={{ color: '#F59E0B', fontSize: 12 }}>A cotizar</span>
                      ) : (
                        v.precio_estimado ? `$${v.precio_estimado}` : '-'
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button 
                        onClick={() => abrirGestion(v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(63,169,245,0.1)', color: '#3FA9F5', border: '1px solid rgba(63,169,245,0.2)', padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                      >
                        <Settings size={14} /> Gestionar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL NUEVO VIAJE */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 500, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Crear Nuevo Viaje</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: '#9CA3AF' }}>Cliente</label>
                  <button 
                    type="button" 
                    onClick={() => setModoCliente(modoCliente === 'existente' ? 'nuevo' : 'existente')} 
                    style={{ fontSize: 11, background: 'none', border: 'none', color: '#3FA9F5', cursor: 'pointer', padding: 0 }}
                  >
                    {modoCliente === 'existente' ? '+ Crear Nuevo Cliente' : 'Seleccionar Existente'}
                  </button>
                </div>
                
                {modoCliente === 'existente' && clientesList.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      required 
                      value={clienteSearch} 
                      onChange={e => {
                        setClienteSearch(e.target.value)
                        setClienteSeleccionadoId('') // Reset ID until they select one
                        setShowClientDropdown(true)
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Escribe para buscar cliente..."
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                    />
                    {showClientDropdown && clienteSearch.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 6, maxHeight: 150, overflowY: 'auto', zIndex: 10 }}>
                        {clientesList.filter(c => 
                            c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                            (c.telefono && c.telefono.includes(clienteSearch))
                          ).map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setClienteSeleccionadoId(c.id)
                              setClienteSearch(`${c.nombre_completo}${c.telefono ? ` - ${c.telefono}` : ''}`)
                              setShowClientDropdown(false)
                            }}
                            style={{ padding: '10px 12px', color: '#E5E7EB', cursor: 'pointer', borderBottom: '1px solid #2A2F36', fontSize: 13 }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(63,169,245,0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'transparent'}
                          >
                            <strong>{c.nombre_completo}</strong> {c.telefono ? `- ${c.telefono}` : ''}
                          </div>
                        ))}
                        {clientesList.filter(c => c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>No hay coincidencias.</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input 
                      type="text" required value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                      style={{ flex: 1, background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                    />
                    <input 
                      type="tel" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                      placeholder="Celular (Opcional)"
                      style={{ width: '150px', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Selector de Tarifa (Opcional) */}
              {tarifasList.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: 'rgba(63, 169, 245, 0.05)', border: '1px solid rgba(63, 169, 245, 0.2)', borderRadius: 6 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#3FA9F5', marginBottom: 6, fontWeight: 600 }}>Cargar desde Tarifario (Auto-cotizador)</label>
                  <select 
                    value={tarifaSeleccionadaId} onChange={handleTarifaSelect}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="">-- Tarifas estándar o Rutas predefinidas --</option>
                    {tarifasList.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre_servicio} - ${t.precio_fijo}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
                    {tarifaSeleccionadaId ? 'Servicio / Origen' : 'Origen'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} color="#3FA9F5" style={{ position: 'absolute', left: 10, top: 12 }} />
                    <input 
                      type="text" required value={origen} onChange={e => setOrigen(e.target.value)}
                      placeholder="Dirección origen"
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                    />
                  </div>
                </div>
                {!tarifaSeleccionadaId && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Destino</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} color="#22C55E" style={{ position: 'absolute', left: 10, top: 12 }} />
                      <input 
                        type="text" required value={destino} onChange={e => setDestino(e.target.value)}
                        placeholder="Dirección destino"
                        style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Fecha Programada (Opcional)</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                    <input 
                      type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)}
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Precio Estimado ($)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                    <input 
                      type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                      disabled={validacionManual}
                      placeholder={validacionManual ? "Por cotizar" : "0.00"}
                      style={{ width: '100%', background: validacionManual ? '#1A1F26' : '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', opacity: validacionManual ? 0.5 : 1 }}
                    />
                  </div>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 24, background: '#0B0F14', padding: '10px 14px', borderRadius: 6, border: '1px solid #2A2F36' }}>
                <input 
                  type="checkbox" 
                  checked={validacionManual} 
                  onChange={e => {
                    setValidacionManual(e.target.checked)
                    if(e.target.checked) setPrecio('')
                  }}
                  style={{ accentColor: '#3FA9F5', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, color: '#E5E7EB' }}>El precio requiere cotización manual / Viaje futuro lejano</span>
              </label>

               <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #2A2F36', paddingTop: 16 }}>
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', color: '#E5E7EB', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Guardando...' : <><Check size={16} /> Crear Viaje</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIONAR VIAJE */}
      {isManageModalOpen && viajeSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Panel Operativo del Viaje</h2>
              <button 
                onClick={() => setIsManageModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleManageSubmit} style={{ padding: 20 }}>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Opciones de Chofer</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <select 
                    value={manageChoferId} onChange={e => setManageChoferId(e.target.value)}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="">-- Asignar Chofer --</option>
                    {choferesList.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo} ({c.disponibilidad})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Estado Actual</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={manageEstado} onChange={e => setManageEstado(e.target.value)}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Precio Final de Cotización ($)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="number" value={managePrecio} onChange={e => setManagePrecio(e.target.value)}
                    placeholder="Escribir monto"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #2A2F36', paddingTop: 16 }}>
                <button 
                  type="button" onClick={() => setIsManageModalOpen(false)}
                  style={{ background: 'transparent', color: '#E5E7EB', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Descartar
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Salvando...' : 'Aplicar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
