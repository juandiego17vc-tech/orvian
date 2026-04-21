import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Hash, Mail, Lock } from 'lucide-react'

export default function Join() {
  const [codigoAgencia, setCodigoAgencia] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, reloadTenant } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Validar formato UUID básico para el código
    if (codigoAgencia.length < 30) {
      setError('Código de agencia inválido. Solicítalo a tu Administrador.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await signUp(email, password)
    
    if (signUpError) {
      setError(signUpError.message || 'Error al registrarte.')
      setLoading(false)
      return
    }

    if (data?.user && !data?.session) {
      setError('Por favor, revisa tu correo para confirmar tu cuenta y luego inicia sesión.')
      setLoading(false)
      return
    }

    if (data?.user || data?.session) {
      // Unirse a la agencia existente
      const { error: rpcError } = await supabase.rpc('unirse_agencia', { p_tenant_id: codigoAgencia })
      
      if (rpcError) {
        console.error(rpcError)
        setError('El código secreto no existe o hubo un error al unirte.')
        setLoading(false)
        return
      }

      reloadTenant()
      navigate('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, rgba(11,15,20,0) 70%)', pointerEvents: 'none' }}></div>
      
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, padding: 40, width: '100%', maxWidth: 450, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 800, color: '#E5E7EB' }}>ORVIAN <span style={{color: '#8B5CF6'}}>Team</span></span>
        </div>

        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 6, textAlign: 'center' }}>Portal de Empleados</h1>
        <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
          Vincula tu cuenta con la Bóveda de tu administrador usando el Código Secreto.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
             <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Código Secreto de Agencia</label>
             <div style={{ position: 'relative' }}>
               <Hash size={16} color="#8B5CF6" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
               <input
                type="text" value={codigoAgencia} onChange={e => setCodigoAgencia(e.target.value.trim())}
                placeholder="Pegar el código de tu jefe..." required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Tu Email de Trabajo</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="operador@empresa.com" required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 40px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '8px 12px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 6, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter' }}
          >
            {loading ? 'Validando Accesos...' : 'Conectar a Base Central'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#6B7280' }}>
            <Link to="/login" style={{ color: '#8B5CF6', textDecoration: 'none', fontWeight: 600 }}>Volver a Iniciar Sesión</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
