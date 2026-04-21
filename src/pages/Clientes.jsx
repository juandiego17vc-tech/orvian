import { useState, useEffect } from 'react'
import { Plus, User, Phone, Check, X, Users, Tag, Edit2, Trash2, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Clientes() {
  const { tenantId } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clienteEditando, setClienteEditando] = useState(null)

  // Form State
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [segmento, setSegmento] = useState('Nuevo')

  useEffect(() => {
    if (tenantId) fetchClientes()
  }, [tenantId])

  const fetchClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setClientes(data)
    setLoading(false)
  }

  const handleOpenForm = (cliente = null) => {
    if (cliente) {
      setClienteEditando(cliente)
      setNombre(cliente.nombre_completo)
      setTelefono(cliente.telefono || '')
      setSegmento(cliente.segmento || 'Nuevo')
    } else {
      setClienteEditando(null)
      setNombre('')
      setTelefono('')
      setSegmento('Nuevo')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenantId) return
    setIsSubmitting(true)

    try {
      if (clienteEditando) {
        // Actualizar
        const { error } = await supabase
          .from('clientes')
          .update({
            nombre_completo: nombre,
            telefono: telefono || null,
            segmento: segmento
          })
          .eq('id', clienteEditando.id)
        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('clientes')
          .insert([{
            tenant_id: tenantId,
            nombre_completo: nombre,
            telefono: telefono || null,
            segmento: segmento
          }])
        if (error) throw error
      }

      setIsModalOpen(false)
      fetchClientes()
    } catch (err) {
      console.error(err)
      alert("Hubo un error al guardar el cliente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (clienteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente? Se borrarán o desvincularán sus viajes asociados.')) return
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', clienteId)
      if (error) throw error
      fetchClientes()
    } catch (err) {
      console.error(err)
      alert("Error al eliminar el cliente")
    }
  }

  const getSegmentoColor = (seg) => {
    const colors = {
      'VIP': { bg: 'rgba(139, 92, 246, 0.15)', txt: '#A78BFA' }, // Morado
      'Frecuente': { bg: 'rgba(56, 189, 248, 0.15)', txt: '#38BDF8' }, // Celeste
      'Nuevo': { bg: 'rgba(34, 197, 94, 0.15)', txt: '#4ADE80' }, // Verde
      'Riesgo': { bg: 'rgba(239, 68, 68, 0.15)', txt: '#F87171' } // Rojo
    }
    return colors[seg] || colors.Nuevo
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Directorio de Clientes</h1>
        <button
          onClick={() => handleOpenForm(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
        >
          <Plus size={16} /> Agregar Cliente
        </button>
      </div>

      {/* TABLA */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
            <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            No hay clientes registrados en tu agencia.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Nombre Completo</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Teléfono</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Segmento</th>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const badge = getSegmentoColor(c.segmento)
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#21272F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>
                          {c.nombre_completo.charAt(0).toUpperCase()}
                        </div>
                        {c.nombre_completo}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>{c.telefono || 'Sin teléfono'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.txt, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {c.segmento}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          title="Copiar Link de Portal" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/portal/${c.id}`)
                            alert('Link del Portal Copiado. El cliente podrá ver su cuenta y pedir autos sin iniciar sesión.')
                          }} 
                          style={{ background: 'transparent', border: '1px solid #8B5CF6', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#8B5CF6' }}>
                          <LinkIcon size={14} />
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

      {/* MODAL CLIENTE */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>
                {clienteEditando ? 'Modificar Cliente' : 'Agregar Cliente'}
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
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Nombre Completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. María Gómez"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Teléfono (WhatsApp)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                    placeholder="+54 9 11 1234-5678"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Segmento Comercial</label>
                <div style={{ position: 'relative' }}>
                  <Tag size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <select 
                    value={segmento} onChange={e => setSegmento(e.target.value)}
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none', appearance: 'none' }}
                  >
                    <option value="Nuevo">Nuevo (Primer viaje)</option>
                    <option value="Frecuente">Frecuente (Más de 5 viajes)</option>
                    <option value="VIP">VIP (Corporativo o de alto valor)</option>
                    <option value="Riesgo">Riesgo (Problemas de pago previos)</option>
                  </select>
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
                  {isSubmitting ? 'Guardando...' : <><Check size={16} /> Guardar Cliente</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
