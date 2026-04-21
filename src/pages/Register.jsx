import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Building, User, Mail, Lock } from 'lucide-react'

export default function Register() {
  const [empresa, setEmpresa] = useState('')
  const [nombre, setNombre] = useState('')
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
    
    // 1. Registrar al usuario en Auth
    const { data, error: signUpError } = await signUp(email, password)
    
    if (signUpError) {
      setError(signUpError.message || 'Error al registrar el usuario')
      setLoading(false)
      return
    }

    // Si requiere confirmación por email, informarlo. (Si lo apagaron en Supabase avanza)
    if (data?.user && !data?.session) {
      setError('Por favor, revisa tu correo para confirmar tu cuenta y luego inicia sesión.')
      setLoading(false)
      return
    }

    // 2. Instanciar la agencia usando nuestra función RPC
    if (data?.user || data?.session) {
      const { error: rpcError } = await supabase.rpc('crear_mi_agencia', { p_nombre_empresa: empresa })
      
      if (rpcError) {
        console.error(rpcError)
        setError('El usuario se creó, pero falló la creación de la Agencia.')
        setLoading(false)
        return
      }

      // 3. Forzar al contexto a leer el tenant_id recién fabricado
      reloadTenant()
      navigate('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(63,169,245,0.05) 0%, rgba(11,15,20,0) 70%)', pointerEvents: 'none' }}></div>
      
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, padding: 40, width: '100%', maxWidth: 450, position: 'relative', zIndex: 10 }}>
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="5" cy="19" r="2.5" fill="#3FA9F5"/>
            <circle cx="10" cy="9" r="2.5" fill="#3FA9F5"/>
            <line x1="5" y1="19" x2="10" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <line x1="10" y1="9" x2="22" y2="9" stroke="#3FA9F5" strokeWidth="1.5"/>
            <polygon points="22,6 28,9 22,12" fill="#3FA9F5"/>
          </svg>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 800, color: '#E5E7EB' }}>ORVIAN</span>
        </div>

        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 6, textAlign: 'center' }}>Crea tu Espacio de Trabajo</h1>
        <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
          Obtén tu bóveda B2B gratuita y automatiza tu de agencia remises o logística en segundos.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Nombre de tu Agencia Comercial</label>
            <div style={{ position: 'relative' }}>
              <Building size={16} color="#3FA9F5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                placeholder="Remises El Sol, Logística Sur..."
                required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Tu Nombre Completo</label>
              <div style={{ position: 'relative' }}>
                 <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                 <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                  style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Email Administrador</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Contraseña Segura</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 40px 10px 36px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '8px 12px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            {loading ? 'Preparando Bóveda...' : 'Comenzar a Operar'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#6B7280' }}>
            ¿Ya tienes una agencia operativa?{' '}
            <Link to="/login" style={{ color: '#3FA9F5', textDecoration: 'none', fontWeight: 600 }}>
              Inicia Sesión aquí
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
