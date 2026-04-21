import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Star, MessageSquare, AlertCircle, CheckCircle, Navigation } from 'lucide-react'

export default function EncuestaCSI() {
  const { id } = useParams()
  const [viaje, setViaje] = useState(null)
  
  const [calificacion, setCalificacion] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comentario, setComentario] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchViaje()
  }, [id])

  const fetchViaje = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('rpc_get_viaje_publico', { p_viaje_id: id })
    
    if (error || !data || data.length === 0) {
      setError("Enlace de Calificación Inválido o Expirado.")
    } else {
      setViaje(data[0])
    }
    setLoading(false)
  }

  const handleCalificar = async (e) => {
    e.preventDefault()
    if (calificacion === 0) {
      alert("Por favor, selecciona al menos 1 estrella para continuar.")
      return
    }
    
    setSubmitting(true)
    
    const { error: rpcError } = await supabase.rpc('rpc_submit_encuesta', { 
      p_viaje_id: id,
      p_calificacion: calificacion,
      p_comentario: comentario || null
    })
    
    if (rpcError) {
      console.error(rpcError)
      alert("Hubo un error al enviar la calificación. Intenta de nuevo más tarde.")
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>Cargando Viaje...</div>
  
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EF4444', padding: 20 }}>
      <AlertCircle size={48} style={{ marginBottom: 16 }} />
      <h2>Solicitud Rechazada</h2>
      <p>{error}</p>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 20, textAlign: 'center' }}>
      <CheckCircle size={64} color="#10B981" style={{ marginBottom: 24 }} />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>¡Gracias por tus comentarios!</h2>
      <p style={{ color: '#9CA3AF', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
        La puntuación y tu valioso feedback ayudan a mantener el más alto estándar operativo para servirte mejor la próxima vez.
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#111827', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1F2937', borderRadius: 24, border: '1px solid #374151', padding: '40px 32px', width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
           <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px 0' }}>Califica tu Viaje</h1>
           <p style={{ color: '#9CA3AF', margin: 0, fontSize: 14 }}>{viaje.origen.split(',')[0]} <Navigation size={12} style={{ display: 'inline', margin: '0 4px', color: '#F59E0B' }}/> {viaje.destino?.split(',')[0]}</p>
        </div>

        <div style={{ background: '#111827', borderRadius: 16, padding: '16px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
           <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB', fontSize: 18, fontWeight: 700 }}>
             {viaje.chofer_nombre ? viaje.chofer_nombre.charAt(0).toUpperCase() : '👨‍✈️'}
           </div>
           <div>
             <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Tu Conductor</div>
             <div style={{ fontSize: 16, color: 'white', fontWeight: 600 }}>{viaje.chofer_nombre || 'Móvil Asignado'}</div>
           </div>
        </div>

        <form onSubmit={handleCalificar} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ textAlign: 'center' }}>
            <label style={{ display: 'block', fontSize: 13, color: '#E5E7EB', marginBottom: 16, fontWeight: 600 }}>
              ¿Cómo evaluarías el servicio y al conductor?
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setCalificacion(star)}
                  style={{ 
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, 
                    transform: (hoverRating || calificacion) >= star ? 'scale(1.15)' : 'scale(1)',
                    transition: '0.2s all cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  <Star 
                    size={40} 
                    fill={(hoverRating || calificacion) >= star ? '#F59E0B' : 'transparent'} 
                    color={(hoverRating || calificacion) >= star ? '#F59E0B' : '#4B5563'} 
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            {calificacion > 0 && (
              <div style={{ color: '#F59E0B', fontSize: 12, marginTop: 12, fontWeight: 600 }}>
                {calificacion === 5 && '¡Excelente servicio! 🤩'}
                {calificacion === 4 && 'Muy buen servicio 😊'}
                {calificacion === 3 && 'Servicio aceptable 😐'}
                {calificacion === 2 && 'Podría mejorar 😕'}
                {calificacion === 1 && 'No cumplió expectativas 😞'}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E5E7EB', marginBottom: 8, fontWeight: 600 }}>
              <MessageSquare size={16} color="#9CA3AF" /> Comentarios (Opcional)
            </label>
            <textarea 
              value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="¿Qué te gustó del viaje? O ¿En qué podemos mejorar?"
              rows="4"
              style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '12px 16px', color: '#E5E7EB', fontSize: 14, outlineColor: '#8B5CF6', resize: 'none' }}
            />
          </div>

          <button 
            type="submit" disabled={submitting || calificacion === 0}
            style={{ 
              background: calificacion > 0 ? '#10B981' : '#374151', 
              color: calificacion > 0 ? 'white' : '#9CA3AF', 
              border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: submitting || calificacion === 0 ? 'not-allowed' : 'pointer', 
              transition: '0.3s' 
            }}
          >
            {submitting ? 'Guardando Calificación...' : 'Enviar Evaluación'}
          </button>
        </form>

      </div>
    </div>
  )
}
