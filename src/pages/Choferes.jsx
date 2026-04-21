import { useState, useEffect } from 'react'
import { Plus, Check, X, CarFront, Hash, Info, Edit2, Trash2, Smartphone, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Choferes() {
  const { tenantId } = useAuth()
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalComentarios, setModalComentarios] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [choferEditando, setChoferEditando] = useState(null)

  // Form State
  const [nombre, setNombre] = useState('')
  const [placa, setPlaca] = useState('')
  const [telefono, setTelefono] = useState('')
  const [comision, setComision] = useState(33)
  const [disponibilidad, setDisponibilidad] = useState('Disponible')
  const [estadoCuenta, setEstadoCuenta] = useState('Activo')

  useEffect(() => {
    if (tenantId) fetchChoferes()
  }, [tenantId])

  const fetchChoferes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('choferes')
      .select('*, viajes(id, estado, encuestas(calificacion, comentario, created_at))')
      .order('created_at', { ascending: false })
    
    if (data) {
      const enriched = data.map(c => {
        let totalScore = 0;
        let count = 0;
        let comentariosArr = [];

        if (c.viajes) {
          c.viajes.forEach(v => {
            if (v.encuestas && v.encuestas.length > 0) {
              v.encuestas.forEach(e => {
                if (e.calificacion > 0) {
                  totalScore += e.calificacion;
                  count++;
                }
                if (e.comentario && e.comentario.trim().length > 0) {
                  comentariosArr.push({
                    calificacion: e.calificacion,
                    texto: e.comentario,
                    fecha: e.created_at
                  });
                }
              })
            }
          })
        }
        
        // Ordenar comentarios por fecha descendente
        comentariosArr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Determinar estado del viaje activo
        const activeTrip = c.viajes?.find(v => v.estado === 'En Curso' || v.estado === 'Pasajero a Bordo' || v.estado === 'Pendiente');
        c.estadoViajeActual = activeTrip ? activeTrip.estado : null;
        c.idViajeActual = activeTrip ? activeTrip.id : null;
        
        c.rating = count > 0 ? (totalScore / count).toFixed(1) : 'S/N';
        c.ratingCount = count;
        c.comentariosNPS = comentariosArr;
        return c;
      })
      setChoferes(enriched)
    }
    setLoading(false)
  }

  const handleUpdateViajeEstado = async (choferId, viajeId, nuevoEstado) => {
    try {
      if (!window.confirm(`¿Forzar el estado del viaje activo a "${nuevoEstado}"?`)) return;
      
      const { error } = await supabase.from('viajes').update({ estado: nuevoEstado, validacion_precio_manual: false }).eq('id', viajeId)
      if (error) throw error
      
      if (nuevoEstado === 'Finalizado' || nuevoEstado === 'Cancelado') {
        const { error: errChofer } = await supabase.from('choferes').update({ disponibilidad: 'Disponible' }).eq('id', choferId)
        if (errChofer) throw errChofer
      }
      
      fetchChoferes()
    } catch (err) {
      console.error(err)
      alert("Error al forzar el estado del viaje.")
    }
  }

  const handleOpenForm = (chofer = null) => {
    if (chofer) {
      setChoferEditando(chofer)
      setNombre(chofer.nombre_completo)
      setPlaca(chofer.vehiculo_placa || '')
      setTelefono(chofer.telefono || '')
      setComision(chofer.comision_porcentaje || 33)
      setDisponibilidad(chofer.disponibilidad)
      setEstadoCuenta(chofer.estado)
    } else {
      setChoferEditando(null)
      setNombre('')
      setPlaca('')
      setTelefono('')
      setComision(33)
      setDisponibilidad('Disponible')
      setEstadoCuenta('Activo')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenantId) return
    setIsSubmitting(true)

    try {
      if (choferEditando) {
        // Actualizar
        const { error } = await supabase
          .from('choferes')
          .update({
            nombre_completo: nombre,
            vehiculo_placa: placa || null,
            telefono: telefono || null,
            comision_porcentaje: comision,
            disponibilidad: disponibilidad,
            estado: estadoCuenta
          })
          .eq('id', choferEditando.id)
        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('choferes')
          .insert([{
            tenant_id: tenantId,
            nombre_completo: nombre,
            vehiculo_placa: placa || null,
            telefono: telefono || null,
            comision_porcentaje: comision,
            disponibilidad: disponibilidad,
            estado: 'Activo'
          }])
        if (error) throw error
      }

      setIsModalOpen(false)
      fetchChoferes()
    } catch (err) {
      console.error(err)
      alert("Hubo un error al guardar al chofer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (choferId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este chofer? Sus viajes asociados quedarán "sin chofer".')) return
    try {
      const { error } = await supabase.from('choferes').delete().eq('id', choferId)
      if (error) throw error
      fetchChoferes()
    } catch (err) {
      console.error(err)
      alert("Error al eliminar el chofer")
    }
  }

  const getDispoColor = (disp) => {
    const colors = {
      'Disponible': { bg: 'rgba(34, 197, 94, 0.15)', txt: '#4ADE80' }, // Verde
      'En Viaje': { bg: 'rgba(63, 169, 245, 0.15)', txt: '#3FA9F5' }, // Azul
      'Fuera de Turno': { bg: 'rgba(107, 114, 128, 0.15)', txt: '#9CA3AF' } // Gris
    }
    return colors[disp] || colors['Fuera de Turno']
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Gestión de Choferes</h1>
        <button
          onClick={() => handleOpenForm(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
        >
          <Plus size={16} /> Alta Chofer
        </button>
      </div>

      {/* TABLA */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Cargando choferes...</div>
        ) : choferes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
            <CarFront size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            No hay choferes en tu flota.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Chofer</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Score (NPS)</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Patente / Placa</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Estado Cuenta</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Disponibilidad</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {choferes.map((c) => {
                const badge = getDispoColor(c.disponibilidad)
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#21272F', border: '1px solid #2A2F36', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                          <CarFront size={14} />
                        </div>
                        {c.nombre_completo}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div 
                        onClick={() => c.ratingCount > 0 ? setModalComentarios(c) : null}
                        title={c.ratingCount > 0 ? "Ver Comentarios NPS" : ""}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.ratingCount > 0 ? '#F59E0B' : '#6B7280', cursor: c.ratingCount > 0 ? 'pointer' : 'default', transition: '0.2s', padding: '4px', borderRadius: 6 }}
                        onMouseOver={e => c.ratingCount > 0 ? e.currentTarget.style.background = 'rgba(245,158,11,0.1)' : null}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Star size={14} fill={c.ratingCount > 0 ? '#F59E0B' : 'transparent'} />
                        <span style={{ fontWeight: 700 }}>{c.rating}</span>
                        {c.ratingCount > 0 && <span style={{ fontSize: 11, color: '#6B7280' }}>({c.ratingCount})</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>
                      {c.vehiculo_placa ? (
                        <span style={{ border: '1px dashed #3FA9F5', color: '#3FA9F5', padding: '2px 6px', borderRadius: 4, fontSize: 11, letterSpacing: '0.05em' }}>
                          {c.vehiculo_placa.toUpperCase()}
                        </span>
                      ) : 'Sin asignar'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.estado === 'Activo' ? '#4ADE80' : '#EF4444' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.estado === 'Activo' ? '#4ADE80' : '#EF4444' }}></div>
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.txt, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
                        {c.disponibilidad}
                      </span>
                      {c.estadoViajeActual && c.disponibilidad === 'En Viaje' && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#3FA9F5', fontWeight: 700 }}>↳</span>
                          <select 
                            value={c.estadoViajeActual}
                            onChange={(e) => handleUpdateViajeEstado(c.id, c.idViajeActual, e.target.value)}
                            style={{ background: 'rgba(63, 169, 245, 0.1)', color: '#3FA9F5', border: '1px solid rgba(63, 169, 245, 0.3)', borderRadius: 4, padding: '2px 4px', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="Pendiente">Pendiente (Yendo)</option>
                            <option value="En Curso">En Curso</option>
                            <option value="Pasajero a Bordo">Pasajero a Bordo</option>
                            <option value="Finalizado">🟢 Finalizar Viaje</option>
                            <option value="Cancelado">🔴 Cancelar Viaje</option>
                          </select>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          title="Copiar Link de Conductor" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/driver/${c.id}`)
                            alert('Link de Conductor copiado al portapapeles. Envíaselo por WhatsApp.')
                          }} 
                          style={{ background: 'transparent', border: '1px solid #3FA9F5', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#3FA9F5' }}>
                          <Smartphone size={14} />
                        </button>
                        <button onClick={() => handleOpenForm(c)} style={{ background: 'transparent', border: '1px solid #2A2F36', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#9CA3AF' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#F87171' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CHOFER */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>
                {choferEditando ? 'Modificar Chofer' : 'Dar de Alta Chofer'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Nombre Completo del Chofer</label>
                <div style={{ position: 'relative' }}>
                  <CarFront size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. Roberto Sánchez"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Matrícula / Placa del Vehículo</label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                    <input 
                      type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                      placeholder="ABC 123"
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>% Comisión Inicial</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: 10, color: '#9CA3AF', fontSize: 14 }}>%</span>
                    <input 
                      type="number" required value={comision} onChange={e => setComision(e.target.value)}
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Disponibilidad</label>
                  <div style={{ position: 'relative' }}>
                    <Info size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                    <select 
                      value={disponibilidad} onChange={e => setDisponibilidad(e.target.value)}
                      style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="Fuera de Turno">Fuera de Turno</option>
                      <option value="En Viaje">En Viaje</option>
                    </select>
                  </div>
                </div>

                {choferEditando && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Estado Cuenta</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={estadoCuenta} onChange={e => setEstadoCuenta(e.target.value)}
                        style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                      >
                        <option value="Activo">Activo (Permitido)</option>
                        <option value="Inactivo">Inactivo (Suspendido)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Teléfono WhatsApp</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej. +5491100001111"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
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
                  {isSubmitting ? 'Guardando...' : <><Check size={16} /> Guardar Chofer</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* MODAL COMENTARIOS NPS */}
      {modalComentarios && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #3FA9F5', borderRadius: 12, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827' }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: '#E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={16} fill="#F59E0B" color="#F59E0B" /> Comentarios NPS
                </h2>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Conductor: <strong style={{ color: 'white' }}>{modalComentarios.nombre_completo}</strong></div>
              </div>
              <button 
                onClick={() => setModalComentarios(null)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {modalComentarios.comentariosNPS && modalComentarios.comentariosNPS.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {modalComentarios.comentariosNPS.map((c, idx) => (
                    <div key={idx} style={{ background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} fill={s <= c.calificacion ? '#F59E0B' : 'transparent'} color={s <= c.calificacion ? '#F59E0B' : '#4B5563'} />
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: '#6B7280' }}>
                          {new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.5, fontStyle: 'italic' }}>
                        "{c.texto}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>
                  Este conductor tiene calificaciones, pero los pasajeros no dejaron ningún comentario escrito.
                </div>
              )}
            </div>
            
            <div style={{ padding: 16, borderTop: '1px solid #2A2F36', textAlign: 'center' }}>
               <button onClick={() => setModalComentarios(null)} style={{ background: '#374151', color: 'white', padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cerrar</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  )
}
