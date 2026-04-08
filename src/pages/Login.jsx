import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, padding: 40, width: '100%', maxWidth: 400 }}>
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

        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: '#E5E7EB', marginBottom: 6, textAlign: 'center' }}>Bienvenido</h1>
        <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 28 }}>Ingresá a tu cuenta</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@empresa.com"
              required
              style={{ width: '100%', background: '#21272F', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 500 }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                style={{ width: '100%', background: '#21272F', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 40px 10px 12px', fontSize: 13, color: '#E5E7EB', outline: 'none', fontFamily: 'Inter' }}
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
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '8px 12px', color: '#EF4444', fontSize: 12, marginBottom: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '11px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
