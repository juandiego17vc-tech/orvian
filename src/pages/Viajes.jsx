import { useState, useEffect } from 'react'
import { Plus, MapPin, Calendar, DollarSign, Check, X, Car, Settings, User, Building, Banknote, CreditCard, MessageCircle, Users, RefreshCw, ArrowDownUp, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'

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
  const [origenCoords, setOrigenCoords] = useState(null)
  const [destinoCoords, setDestinoCoords] = useState(null)
  const [fecha, setFecha] = useState('')
  
  const [nombrePasajero, setNombrePasajero] = useState('')
  const [pasajerosQty, setPasajerosQty] = useState(1)
  const [valijasQty, setValijasQty] = useState(0)
  
  const [tarifasList, setTarifasList] = useState([])
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState('')
  
  // Financiero & Subcontratos
  const [precio, setPrecio] = useState('')
  const [validacionManual, setValidacionManual] = useState(false)
  const [tipoServicio, setTipoServicio] = useState('Propio')
  const [proveedorId, setProveedorId] = useState('')
  const [proveedoresList, setProveedoresList] = useState([])
  const [costoProveedor, setCostoProveedor] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [formaPago, setFormaPago] = useState('Efectivo')
  const [quienCobro, setQuienCobro] = useState('Agencia')

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
      fetchProveedoresList()
    }
  }, [tenantId])

  const fetchProveedoresList = async () => {
    const { data } = await supabase.from('proveedores').select('id, nombre_fantasia').order('nombre_fantasia', { ascending: true })
    if (data) setProveedoresList(data)
  }

  const fetchTarifasList = async () => {
    const { data } = await supabase.from('tarifario').select('*').order('nombre_servicio', { ascending: true })
    if (data) setTarifasList(data)
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
    const { data, error } = await supabase.from('choferes').select('id, nombre_completo, disponibilidad, vehiculo_placa').order('nombre_completo', { ascending: true })
    if (error) console.error("Error cargando choferes on demand:", error)
    if (data) setChoferesList(data)
  }

  const fetchViajes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('viajes')
      .select(`
        *,
        clientes(nombre_completo, telefono, preferencias),
        choferes(nombre_completo, vehiculo_placa, telefono),
        proveedores(nombre_fantasia)
      `)
      .order('created_at', { ascending: false })
    
    if (data) setViajes(data)
    setLoading(false)
  }

  const handleTarifaSelect = (e) => {
    const tId = e.target.value
    setTarifaSeleccionadaId(tId)
    if (tId) {
      const tarifa = tarifasList.find(t => t.id === tId)
      if (tarifa) {
        setOrigen(tarifa.nombre_servicio)
        setDestino('')
        setPrecio(tarifa.precio_fijo.toString())
        setValidacionManual(false)
      }
    } else {
      setOrigen('')
      setDestino('')
      setPrecio('')
    }
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
        validacion_precio_manual: false
      }).eq('id', viajeSeleccionado.id)
      
      if (error) throw error

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

      let finalNombrePasajero = nombrePasajero
      if (pasajerosQty > 1 || valijasQty > 0) {
          if(!finalNombrePasajero) finalNombrePasajero = 'Pasajero'
          finalNombrePasajero += ` [${pasajerosQty} Pasajeros, ${valijasQty} Valijas]`
      }

      const payload = {
        tenant_id: tenantId,
        cliente_id: finalClienteId,
        origen,
        destino,
        precio_estimado: precio && !validacionManual ? parseFloat(precio) : null,
        fecha_programada: fecha ? new Date(fecha).toISOString() : null,
        validacion_precio_manual: validacionManual,
        // Nuevos campos fase 3
        tipo_servicio: tipoServicio,
        moneda,
        forma_pago: formaPago,
        quien_cobro: quienCobro,
        nombre_pasajero: finalNombrePasajero || null,
      }

      if (tipoServicio !== 'Propio') {
        payload.proveedor_id = proveedorId || null
        payload.costo_proveedor = costoProveedor ? parseFloat(costoProveedor) : null
      }

      const { error: viajeError } = await supabase.from('viajes').insert([payload])
      if (viajeError) throw viajeError

      // Reset form
      setIsModalOpen(false)
      setModoCliente('existente')
      setClienteNombre(''); setClienteTelefono(''); setClienteSearch(''); setShowClientDropdown(false);
      setOrigen(''); setDestino(''); setPrecio(''); setFecha(''); setValidacionManual(false); setTarifaSeleccionadaId('');
      setNombrePasajero(''); setPasajerosQty(1); setValijasQty(0);
      setTipoServicio('Propio'); setProveedorId(''); setCostoProveedor(''); 
      setMoneda('ARS'); setFormaPago('Efectivo'); setQuienCobro('Agencia');
      
      fetchViajes()
      fetchClientesList()
    } catch (err) {
      console.error(err)
      alert("Hubo un error al crear el viaje. Asegúrate de haber corrido los comandos SQL en la DB.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsApp = (viaje) => {
    let telefono = viaje.clientes?.telefono
    if (!telefono) {
      alert("Este cliente no tiene número de teléfono registrado.")
      return
    }
    // Formatear si hace falta
    telefono = telefono.replace(/[^0-9]/g, '')
    
    let mensaje = `¡Hola *${viaje.clientes?.nombre_completo}*! Somos de la Agencia ORVIAN. `
    
    if (viaje.estado === 'Pendiente') {
      mensaje += `Tu coche está reservado. Estamos asignando una unidad a la brevedad.`
    } else if (viaje.estado === 'En Curso' || viaje.chofer_id) {
      mensaje += `Te confirmamos que tu viaje está asignado.\n🚗 *Chofer:* ${viaje.choferes?.nombre_completo || 'Asignado'}\n`
      if (viaje.choferes?.vehiculo_placa) {
        mensaje += `🚙 *Vehículo Patente:* ${viaje.choferes?.vehiculo_placa}\n`
      }
      mensaje += `¡Te avisa cuando esté en la puerta!`
    } else {
      mensaje += `Tu viaje figura como ${viaje.estado}. Gracias por viajar con nosotros.`
    }

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const handleWhatsAppChofer = (viaje) => {
    let telefono = viaje.choferes?.telefono
    if (!telefono) {
      alert("Este chofer no tiene número de WhatsApp registrado en su ficha.")
      return
    }
    telefono = telefono.replace(/[^0-9]/g, '')
    
    let mensaje = `¡Hola *${viaje.choferes?.nombre_completo}*! Tienes una nueva OFERTA de viaje.\n\n`
    mensaje += `📍 *Origen:* ${viaje.origen}\n`
    if (viaje.destino) mensaje += `🏁 *Destino:* ${viaje.destino}\n`
    mensaje += `👤 *Pasajero:* ${viaje.nombre_pasajero || viaje.clientes?.nombre_completo || 'Corporativo'}\n`
    
    if (viaje.clientes?.preferencias) {
      mensaje += `\nℹ️ *PREFERENCIAS DEL PASAJERO:*\n_${viaje.clientes.preferencias}_\n\n`
    } else {
      mensaje += `\n`
    }

    mensaje += `👉 *TOCA AQUÍ para ver tu agenda y ACEPTAR el viaje:* ${window.location.origin}/driver/${viaje.chofer_id}`

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const handleWhatsAppBroadcast = (viaje) => {
    let mensaje = `🚨 *NUEVO VIAJE DISPONIBLE EN BOLSA* 🚨\n\n`
    mensaje += `📍 *Origen:* ${viaje.origen}\n`
    if (viaje.destino) mensaje += `🏁 *Destino:* ${viaje.destino}\n`
    mensaje += `⏰ *Fecha:* ${viaje.fecha_programada ? new Date(viaje.fecha_programada).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Lo antes posible'}\n\n`
    mensaje += `⚠️ *Instrucciones:* Ingresa a tu App de Conductor para RECIBIR este viaje.\nEl primero que lo acepte se lo queda.`

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const handleSurveyWhatsApp = (viaje) => {
    let telefono = viaje.clientes?.telefono
    if (!telefono) {
      alert("Este cliente no tiene número registrado para enviar encuesta.")
      return
    }
    telefono = telefono.replace(/[^0-9]/g, '')
    
    const urlEncuesta = `${window.location.origin}/rate/${viaje.id}`
    const mensaje = `Hola *${viaje.clientes?.nombre_completo.split(' ')[0]}* 👋, esperamos que hayas tenido un excelente viaje.\n\nPor favor, ayúdanos a mejorar contándonos qué te pareció el servicio y tu conductor ingresando aquí:\n👉 ${urlEncuesta}\n\n¡Gracias por elegirnos! ⭐`
    
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const getEstadoColor = (estado) => {
    const colors = {
      'Ofrecido': 'rgba(168, 85, 247, 0.15)', // Púrpura
      'Pendiente': 'rgba(245, 158, 11, 0.15)', // Ámbar
      'En Curso': 'rgba(63, 169, 245, 0.15)',  // Azul
      'Finalizado': 'rgba(34, 197, 94, 0.15)', // Verde
      'Cancelado': 'rgba(239, 68, 68, 0.15)',  // Rojo
      'Liquidado': 'rgba(139, 92, 246, 0.15)' // Violeta
    }
    const txtColors = {
      'Ofrecido': '#A855F7',
      'Pendiente': '#F59E0B',
      'En Curso': '#3FA9F5',
      'Finalizado': '#22C55E',
      'Cancelado': '#EF4444',
      'Liquidado': '#8B5CF6'
    }
    return { bg: colors[estado] || colors.Pendiente, txt: txtColors[estado] || txtColors.Pendiente }
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Tablero de Viajes</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Centro de control de despachos y asignaciones</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchViajes}
            title="Sincronizar Datos"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 6, color: '#9CA3AF', cursor: 'pointer' }}
          >
            <RefreshCw size={18} className={loading ? "spin-animation" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
          >
            <Plus size={16} /> Nuevo Viaje Contable
          </button>
        </div>
      </div>

      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Cargando viajes...</div>
        ) : viajes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
            <Car size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            Aún no tienes viajes registrados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 500 }}>Cliente</th>
                  <th style={{ padding: '14px 16px', fontWeight: 500 }}>Ruta</th>
                  <th style={{ padding: '14px 16px', fontWeight: 500 }}>Prog. / Asignado</th>
                  <th style={{ padding: '14px 16px', fontWeight: 500 }}>Finanzas</th>
                  <th style={{ padding: '14px 16px', fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: '14px 16px', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => {
                  const badge = getEstadoColor(v.estado)
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                        {v.clientes?.nombre_completo || v.nombre_pasajero}
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                          {v.tipo_servicio === 'Tercerizado' && `📤 Subcontrata: ${v.proveedores?.nombre_fantasia || 'Agencia'}`}
                          {v.tipo_servicio === 'B2B' && `📥 Pedido B2B: ${v.proveedores?.nombre_fantasia || 'Agencia'}`}
                          {v.tipo_servicio === 'Propio' && '🚙 Flota Propia'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3FA9F5' }} />
                          {v.origen}
                        </div>
                        {v.destino && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                            {v.destino}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>
                        <div style={{ color: '#E5E7EB', marginBottom: 2 }}>
                          {v.fecha_programada ? new Date(v.fecha_programada).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Inmediato'}
                        </div>
                        {v.chofer_id && (
                          <div style={{ fontSize: 11, color: '#3FA9F5' }}>👨‍✈️ {v.choferes?.nombre_completo}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {v.validacion_precio_manual ? (
                          <span style={{ color: '#F59E0B', fontSize: 12 }}>Por cotizar</span>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: v.moneda === 'U$D' ? '#4ADE80' : '#E5E7EB' }}>
                              {v.moneda || 'ARS'} ${v.precio_estimado || '0'}
                            </div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                              Cobró: <strong>{v.quien_cobro || 'Agencia'}</strong>
                            </div>
                            {v.tipo_servicio === 'Tercerizado' && (
                              <div style={{ fontSize: 11, color: '#F59E0B' }}>Costo Prov: ${v.costo_proveedor || '0'}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: badge.bg, color: badge.txt, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
                          {v.estado}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {v.estado !== 'Finalizado' && v.estado !== 'Cancelado' && v.estado !== 'Liquidado' && (
                            <button 
                              onClick={() => handleWhatsApp(v)}
                              title="Notificar Cliente"
                              style={{ background: '#0B0F14', color: '#22C55E', border: '1px solid #166534', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <User size={14} /> 
                            </button>
                          )}
                          
                          {v.estado === 'Finalizado' && (
                            <button 
                              onClick={() => handleSurveyWhatsApp(v)}
                              title="Pedir Calificación NPS al Cliente"
                              style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1px solid #F59E0B', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Star size={14} />
                            </button>
                          )}
                          
                          {v.chofer_id && v.estado !== 'Finalizado' && v.estado !== 'Cancelado' && v.estado !== 'Liquidado' && (
                            <button 
                              onClick={() => handleWhatsAppChofer(v)}
                              title="Enviar Viaje al Chofer por WhatsApp"
                              style={{ background: '#0B0F14', color: '#3FA9F5', border: '1px solid #1E40AF', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Car size={14} /> 
                            </button>
                          )}
                          
                          {!v.chofer_id && v.estado === 'Pendiente' && (
                            <button 
                              onClick={() => handleWhatsAppBroadcast(v)}
                              title="Avisar al Grupo de Choferes por WhatsApp"
                              style={{ background: '#0B0F14', color: '#A855F7', border: '1px solid #7E22CE', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Users size={14} style={{ marginRight: 4 }} /> <MessageCircle size={16} />
                            </button>
                          )}

                          <button 
                            onClick={() => abrirGestion(v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(63,169,245,0.1)', color: '#3FA9F5', border: '1px solid rgba(63,169,245,0.2)', padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                          >
                            <Settings size={14} /> Gestión
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVO VIAJE CONTABLE */}
      {isModalOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
         <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
           <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#1A1F26', zIndex: 20 }}>
             <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Crear Viaje Contable</h2>
             <button 
               onClick={() => setIsModalOpen(false)}
               style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
             >
               <X size={20} />
             </button>
           </div>
           
           <form onSubmit={handleSubmit} style={{ padding: 24 }}>
             
             {/* SECCIÓN 1: DATOS BÁSICOS */}
             <div style={{ marginBottom: 24 }}>
               <h3 style={{ fontSize: 14, color: '#3FA9F5', marginBottom: 12, borderBottom: '1px solid #2A2F36', paddingBottom: 6 }}>1. Operativa Básica</h3>
               
               <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                 <div style={{ flex: 1 }}>
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
                      <div style={{ position: 'relative', zIndex: 105 }}>
                        <input 
                          type="text" 
                          required 
                          value={clienteSearch} 
                          onChange={e => {
                            setClienteSearch(e.target.value)
                            setClienteSeleccionadoId('')
                            setShowClientDropdown(true)
                          }}
                          onFocus={() => setShowClientDropdown(true)}
                          placeholder="Escribe para buscar cliente..."
                          style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                        />
                        {showClientDropdown && clienteSearch.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 6, maxHeight: 150, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
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
                     <div style={{ display: 'flex', gap: 8 }}>
                       <input 
                         type="text" required value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                         placeholder="Nombre del cliente"
                         style={{ flex: 1, background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                       />
                       <input 
                         type="tel" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                         placeholder="Celular"
                         style={{ width: '120px', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                       />
                     </div>
                   )}
                 </div>

                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Fecha Programada (Opc.)</label>
                   <div style={{ position: 'relative' }}>
                     <Calendar size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                     <input 
                       type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)}
                       style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', colorScheme: 'dark' }}
                     />
                   </div>
                 </div>
               </div>

               {tarifasList.length > 0 && (
                 <div style={{ marginBottom: 16 }}>
                   <select 
                     value={tarifaSeleccionadaId} onChange={handleTarifaSelect}
                     style={{ width: '100%', background: '#252b33', border: '1px solid rgba(63, 169, 245, 0.3)', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                   >
                     <option value="">-- Cargar ruta de Cuadro Tarifario (Opcional) --</option>
                     {tarifasList.map(t => (
                       <option key={t.id} value={t.id}>{t.nombre_servicio} - ${t.precio_fijo}</option>
                     ))}
                   </select>
                 </div>
               )}

               {/* SECCIÓN MAPAS Y RUTEO */}
               <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                 <div style={{ flex: 1, zIndex: 101 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{tarifaSeleccionadaId ? 'Servicio / Origen' : 'Origen'}</label>
                   <LocationAutocomplete 
                     value={origen} onChange={setOrigen} onSelectCoords={(lat, lon) => setOrigenCoords(`${lon},${lat}`)}
                     placeholder="Ej. Obelisco, Buenos Aires" iconColor="#3FA9F5" 
                   />
                 </div>
                 {!tarifaSeleccionadaId && (
                    <button 
                      type="button"
                      onClick={() => { 
                        const tmp = origen; setOrigen(destino); setDestino(tmp); 
                        const tmpC = origenCoords; setOrigenCoords(destinoCoords); setDestinoCoords(tmpC);
                      }}
                      title="Intercambiar Origen y Destino"
                      style={{ marginTop: 24, background: '#1A1F26', border: '1px solid #3FA9F5', borderRadius: '50%', color: '#3FA9F5', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <ArrowDownUp size={16} />
                    </button>
                 )}
                 {!tarifaSeleccionadaId && (
                   <div style={{ flex: 1, zIndex: 100 }}>
                     <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Destino</label>
                     <LocationAutocomplete 
                       value={destino} onChange={setDestino} onSelectCoords={(lat, lon) => setDestinoCoords(`${lon},${lat}`)}
                       placeholder="Ej. Aeropuerto Ezeiza" iconColor="#22C55E" 
                     />
                   </div>
                 )}
               </div>
               
               {!tarifaSeleccionadaId && origen && destino && (
                 <div style={{ marginTop: 12 }}>
                   <button 
                     type="button" 
                     onClick={async () => {
                       const btn = document.getElementById('btn-cotizar');
                       btn.innerText = 'Calculando...';
                       try {
                         let routeC_org = origenCoords;
                         let routeC_dst = destinoCoords;

                         if (!routeC_org) {
                           const reqOrg = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origen)}&limit=1&countrycodes=ar`);
                           const dataOrg = await reqOrg.json();
                           if(dataOrg.length > 0) routeC_org = `${dataOrg[0].lon},${dataOrg[0].lat}`;
                         }
                         if (!routeC_dst) {
                           const reqDst = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1&countrycodes=ar`);
                           const dataDst = await reqDst.json();
                           if(dataDst.length > 0) routeC_dst = `${dataDst[0].lon},${dataDst[0].lat}`;
                         }
                         
                         if(routeC_org && routeC_dst) {
                           const route = await fetch(`https://router.project-osrm.org/route/v1/driving/${routeC_org};${routeC_dst}?overview=false`);
                           const routeData = await route.json();
                           
                           if(routeData.routes && routeData.routes.length > 0) {
                             const distanceKm = routeData.routes[0].distance / 1000;
                             // Cotización: Precio Base $2500 + $800 por KM
                             const precioSugerido = 2500 + (distanceKm * 800);
                             setPrecio(Math.round(precioSugerido).toString());
                             btn.innerText = `Ruta: ${distanceKm.toFixed(1)} km - Cotización Aplicada!`;
                             setTimeout(() => btn.innerText = '🗺️ Cotizar Ruta Automáticamente', 3000);
                           }
                         } else {
                           btn.innerText = 'Ruta no encontrada';
                         }
                       } catch(e) {
                         btn.innerText = 'Error GPS';
                       }
                     }}
                     id="btn-cotizar"
                     style={{ width: '100%', background: 'rgba(63,169,245,0.1)', border: '1px solid #3FA9F5', color: '#3FA9F5', padding: '10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: '0.3s' }}
                   >
                     🗺️ Cotizar Ruta Automáticamente
                   </button>
                 </div>
               )}
             </div>

             {/* DETALLES DEL PASAJERO */}
             <div style={{ marginBottom: 24 }}>
               <h3 style={{ fontSize: 14, color: '#F59E0B', marginBottom: 12, borderBottom: '1px solid #2A2F36', paddingBottom: 6 }}>2. Detalles del Pasajero / Equipaje</h3>
               <div style={{ display: 'flex', gap: 12 }}>
                 <div style={{ flex: 2 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Nombre del Pasajero (Opcional)</label>
                   <div style={{ position: 'relative' }}>
                     <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                     <input 
                       type="text" value={nombrePasajero} onChange={e => setNombrePasajero(e.target.value)}
                       placeholder="Ej. Sr. Gonzalez"
                       style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                     />
                   </div>
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Pasajeros</label>
                   <input 
                     type="number" min="1" value={pasajerosQty} onChange={e => setPasajerosQty(e.target.value)}
                     style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                   />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Valijas</label>
                   <input 
                     type="number" min="0" value={valijasQty} onChange={e => setValijasQty(e.target.value)}
                     style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                   />
                 </div>
               </div>
             </div>

             {/* FINANZAS (CON PADDING BOTTOM PARA AUTOCOMPLETE Y CALENDARIO) */}
             <div style={{ marginBottom: 24, paddingBottom: 150 }}>
               <h3 style={{ fontSize: 14, color: '#F59E0B', marginBottom: 12, borderBottom: '1px solid #2A2F36', paddingBottom: 6 }}>3. Modelo de Contrato y Finanzas</h3>
               
               <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Provisión del Coche</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                     <label style={{ padding: '10px', border: `1px solid ${tipoServicio === 'Propio' ? '#3FA9F5' : '#2A2F36'}`, background: tipoServicio === 'Propio' ? 'rgba(63,169,245,0.1)' : '#0B0F14', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 13, color: tipoServicio === 'Propio' ? '#E5E7EB' : '#9CA3AF' }}>
                       <input type="radio" value="Propio" checked={tipoServicio === 'Propio'} onChange={(e) => setTipoServicio(e.target.value)} style={{ display: 'none' }} />
                       👨‍✈️ Chofer Propio
                     </label>
                     <label style={{ padding: '10px', border: `1px solid ${tipoServicio === 'Tercerizado' ? '#EF4444' : '#2A2F36'}`, background: tipoServicio === 'Tercerizado' ? 'rgba(239,68,68,0.1)' : '#0B0F14', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 13, color: tipoServicio === 'Tercerizado' ? '#EF4444' : '#9CA3AF' }}>
                       <input type="radio" value="Tercerizado" checked={tipoServicio === 'Tercerizado'} onChange={(e) => setTipoServicio(e.target.value)} style={{ display: 'none' }} />
                       📤 Subcontratamos
                     </label>
                     <label style={{ padding: '10px', border: `1px solid ${tipoServicio === 'B2B' ? '#F59E0B' : '#2A2F36'}`, background: tipoServicio === 'B2B' ? 'rgba(245,158,11,0.1)' : '#0B0F14', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 13, color: tipoServicio === 'B2B' ? '#F59E0B' : '#9CA3AF' }}>
                       <input type="radio" value="B2B" checked={tipoServicio === 'B2B'} onChange={(e) => setTipoServicio(e.target.value)} style={{ display: 'none' }} />
                       📥 Agenc. B2B nos pide
                     </label>
                   </div>
                 </div>
               </div>

               {/* Panel Proveedor Tercerizado / Agencia B2B */}
               {tipoServicio !== 'Propio' && (
                 <div style={{ marginBottom: 16, background: tipoServicio === 'B2B' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px dashed ${tipoServicio === 'B2B' ? '#F59E0B' : '#EF4444'}`, borderRadius: 6, padding: 16 }}>
                   <div style={{ display: 'flex', gap: 12 }}>
                     <div style={{ flex: 2 }}>
                       <label style={{ display: 'block', fontSize: 12, color: tipoServicio === 'B2B' ? '#F59E0B' : '#EF4444', marginBottom: 6 }}>
                         {tipoServicio === 'B2B' ? 'Agencia que nos subcontrata *' : 'Empresa que subcontratamos *'}
                       </label>
                       <div style={{ position: 'relative' }}>
                         <Building size={16} color={tipoServicio === 'B2B' ? '#F59E0B' : '#EF4444'} style={{ position: 'absolute', left: 10, top: 12 }} />
                         <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}>
                           <option value="">Selecciona Proveedor...</option>
                           {proveedoresList.map(p => <option key={p.id} value={p.id}>{p.nombre_fantasia}</option>)}
                         </select>
                       </div>
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: 12, color: tipoServicio === 'B2B' ? '#F59E0B' : '#EF4444', marginBottom: 6 }}>
                         {tipoServicio === 'B2B' ? 'Nuestra Tarifa Neta *' : 'Costo que nos cobran *'}
                       </label>
                       <div style={{ position: 'relative' }}>
                         <DollarSign size={16} color={tipoServicio === 'B2B' ? '#F59E0B' : '#EF4444'} style={{ position: 'absolute', left: 10, top: 12 }} />
                         <input type="number" required value={costoProveedor} onChange={(e) => setCostoProveedor(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }} />
                       </div>
                     </div>
                   </div>
                 </div>
               )}

               <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Moneda de Facturación</label>
                   <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}>
                     <option value="ARS">Pesos (ARS)</option>
                     <option value="U$D">Dólares (USD)</option>
                   </select>
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Forma de Cobro</label>
                   <select value={formaPago} onChange={e => setFormaPago(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}>
                     <option value="Efectivo">Efectivo</option>
                     <option value="Transferencia">Transferencia</option>
                     <option value="Cuenta Corriente">Cuenta Corriente (Empresas)</option>
                     <option value="Mercado Pago">Mercado Pago</option>
                   </select>
                 </div>
               </div>

               <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>💰 ¿Quién recaudó el dinero?</label>
                   <select value={quienCobro} onChange={e => setQuienCobro(e.target.value)} style={{ width: '100%', background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#4ADE80', fontWeight: 600, outline: 'none' }}>
                     <option value="Agencia">🏦 Cobró la Agencia (Me entró a mí)</option>
                     <option value="Chofer">👨‍✈️ Cobró el Chofer en mano</option>
                     {tipoServicio === 'Tercerizado' && <option value="Proveedor">🏢 Cobró el Proveedor Ext.</option>}
                   </select>
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Precio Final al Cliente</label>
                   <div style={{ position: 'relative' }}>
                     <DollarSign size={16} color="#22C55E" style={{ position: 'absolute', left: 10, top: 12 }} />
                     <input 
                       type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                       disabled={validacionManual}
                       placeholder={validacionManual ? "Por cotizar" : "0.00"}
                       style={{ width: '100%', background: validacionManual ? '#1A1F26' : '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', opacity: validacionManual ? 0.5 : 1, fontSize: 16, fontWeight: 700 }}
                     />
                   </div>
                 </div>
               </div>

               <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#0B0F14', padding: '10px 14px', borderRadius: 6, border: '1px solid #2A2F36' }}>
                 <input 
                   type="checkbox" 
                   checked={validacionManual} 
                   onChange={e => {
                     setValidacionManual(e.target.checked)
                     if(e.target.checked) setPrecio('')
                   }}
                   style={{ accentColor: '#3FA9F5', width: 16, height: 16 }}
                 />
                 <span style={{ fontSize: 13, color: '#E5E7EB' }}>Aún no cerramos el precio (Requiere cotización posterior)</span>
               </label>
             </div>

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
                 {isSubmitting ? 'Registrando...' : <><Check size={16} /> Completar Viaje</>}
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
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Asignación Operativa</h2>
              <button 
                onClick={() => setIsManageModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleManageSubmit} style={{ padding: 20 }}>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Asignar Flota Propia (Ignorar si es tercerizado)</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <select 
                    value={manageChoferId} onChange={e => setManageChoferId(e.target.value)}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="">-- Sin asignar --</option>
                    {choferesList.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo} ({c.disponibilidad})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Estado Actual (Tracker)</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={manageEstado} onChange={e => setManageEstado(e.target.value)}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="Ofrecido">Ofrecido (Esperando Aceptación Chofer)</option>
                    <option value="Pendiente">Pendiente de Ejecución / Asignado</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Finalizado">Finalizado (Listo p/ liquidar)</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Alterar Precio Final</label>
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
