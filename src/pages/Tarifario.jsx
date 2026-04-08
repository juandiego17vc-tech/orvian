import { useState, useEffect } from 'react'
import { Plus, Tag, DollarSign, Check, X, FileText, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Tarifario() {
  const { tenantId } = useAuth()
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tarifaEditando, setTarifaEditando] = useState(null)

  // Form State
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  useEffect(() => {
    if (tenantId) fetchTarifas()
  }, [tenantId])

  const fetchTarifas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tarifario')
      .select('*')
      .order('nombre_servicio', { ascending: true })
    
    if (data) setTarifas(data)
    setLoading(false)
  }

  const handleOpenForm = (tarifa = null) => {
    if (tarifa) {
      setTarifaEditando(tarifa)
      setNombre(tarifa.nombre_servicio)
      setPrecio(tarifa.precio_fijo.toString())
    } else {
      setTarifaEditando(null)
      setNombre('')
      setPrecio('')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenantId) return
    setIsSubmitting(true)

    try {
      if (tarifaEditando) {
        // Actualizar
        const { error } = await supabase
          .from('tarifario')
          .update({
            nombre_servicio: nombre,
            precio_fijo: parseFloat(precio)
          })
          .eq('id', tarifaEditando.id)
        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('tarifario')
          .insert([{
            tenant_id: tenantId,
            nombre_servicio: nombre,
            precio_fijo: parseFloat(precio)
          }])
        if (error) throw error
      }

      setIsModalOpen(false)
      fetchTarifas()
    } catch (err) {
      console.error(err)
      alert("La tabla 'tarifario' aún no existe en Supabase. Por favor, créala usando el panel SQL de Supabase antes de guardar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (tarifaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarifa prediseñada?')) return
    try {
      const { error } = await supabase.from('tarifario').delete().eq('id', tarifaId)
      if (error) throw error
      fetchTarifas()
    } catch (err) {
      console.error(err)
    }
  }

  // Inyectar librería XLSX para leer excel puro
  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!window.XLSX) {
      alert("La configuración del procesador de Excel está iniciando. Intenta darle clic nuevamente en 2 segundos.")
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = window.XLSX.read(data, { type: 'array' })
        
        // Leemos la primera hoja
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convertimos a array puro
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        const dataToInsert = []

        for (let i = 0; i < rows.length; i++) {
          const cols = rows[i]
          if (!cols || cols.length < 2) continue
          
          const servicio = String(cols[0] || '').trim()
          let precioRaw = String(cols[1] || '').trim()
          
          // Limpiamos formato
          const precio = precioRaw.replace(/[^0-9.]/g, '')

          // Filtramos headers
          if (servicio && servicio.toLowerCase() !== 'ruta' && servicio.toLowerCase() !== 'servicio' && !isNaN(parseFloat(precio))) {
            dataToInsert.push({
              tenant_id: tenantId,
              nombre_servicio: servicio,
              precio_fijo: parseFloat(precio)
            })
          }
        }

        if (dataToInsert.length === 0) {
          alert('No se encontraron tarifas. Tu Excel debe tener: Columna A (Servicio) y Columna B (Precio).')
          return
        }

        setIsSubmitting(true)
        const { error } = await supabase.from('tarifario').insert(dataToInsert)
        if (error) throw error

        alert(`¡Boom! Se inyectaron ${dataToInsert.length} tarifas directo desde tu Excel de forma nativa.`)
        fetchTarifas()
      } catch (err) {
        console.error("Detalle del error:", err)
        alert('Hubo un error procesando el Excel: ' + (err.message || 'Archivo ilegible. Re-guarda como .xlsx puro.'))
      } finally {
        setIsSubmitting(false)
        e.target.value = null // reset
      }
    }
    // Para XLS y XLSX se debe leer como Buffer/Array
    reader.readAsArrayBuffer(file)
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Cuadro Tarifario</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Tu lista de precios parametrizable. ¡Lo que pongas aquí aparecerá al cotizar viajes!</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1F26', color: '#E5E7EB', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {isSubmitting ? 'Importando...' : <><FileText size={16} /> Importar EXCEL</>}
            <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isSubmitting} />
          </label>
          <button
            onClick={() => handleOpenForm(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
          >
            <Plus size={16} /> Nueva Tarifa
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Cargando tarifas...</div>
        ) : tarifas.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#6B7280' }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E5E7EB', marginBottom: 8 }}>El Tarifario está vacío</h3>
            <p style={{ maxWidth: 400, margin: '0 auto 20px', fontSize: 13, lineHeight: 1.5 }}>
              Comienza a agregar servicios, rutas o kilómetros haciendo clic en "Nueva Tarifa". 
              También puedes pedirle soporte a ORVIAN para inyectar todo tu Excel de golpe.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                <th style={{ padding: '14px 16px', fontWeight: 500 }}>Nombre del Servicio o Ruta</th>
                <th style={{ padding: '14px 16px', fontWeight: 500, width: 200 }}>Precio Fijo</th>
                <th style={{ padding: '14px 16px', fontWeight: 500, width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={14} color="#9CA3AF" />
                      {t.nombre_servicio}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#4ADE80' }}>
                    ${parseFloat(t.precio_fijo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleOpenForm(t)} style={{ background: 'transparent', border: '1px solid #2A2F36', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#9CA3AF' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#F87171' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL TARIFA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>
                {tarifaEditando ? 'Modificar Tarifa' : 'Crear Nueva Tarifa'}
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
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Denominación (Ruta, Servicio o Destino)</label>
                <div style={{ position: 'relative' }}>
                  <Tag size={16} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. Aeropuerto Ezeiza"
                    style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Precio Final ($)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} color="#4ADE80" style={{ position: 'absolute', left: 10, top: 12 }} />
                  <input 
                    type="number" required value={precio} onChange={e => setPrecio(e.target.value)}
                    placeholder="25000"
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
                  {isSubmitting ? 'Guardando...' : <><Check size={16} /> Guardar Tarifa</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
