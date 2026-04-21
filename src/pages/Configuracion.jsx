import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Building, Mail, Star, Save, Check } from 'lucide-react'

export default function Configuracion() {
  const { session, tenantId } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [nombreEmpresa, setNombreEmpresa] = useState('')

  useEffect(() => {
    if (tenantId) fetchTenantDetails()
  }, [tenantId])

  const fetchTenantDetails = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()
      
    if (data) {
      setTenant(data)
      setNombreEmpresa(data.nombre_empresa)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('tenants')
      .update({ nombre_empresa: nombreEmpresa })
      .eq('id', tenantId)
      
    if (!error) {
      // Exito
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
      if (data) setTenant(data)
    } else {
      alert("Error al actualizar la configuración")
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Configuración de Agencia</h1>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Administra el perfil y la suscripción de tu bóveda operativa.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        
        {/* PARÁMETROS GENERALES */}
        <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={16} color="#3FA9F5" /> Ajustes Comerciales
          </h3>
          
          {loading ? (
             <div style={{ color: '#6B7280', fontSize: 13 }}>Cargando perfil...</div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Nombre Comercial (Tu Agencia)</label>
                <input 
                  type="text" 
                  value={nombreEmpresa} 
                  onChange={e => setNombreEmpresa(e.target.value)}
                  style={{ width: '100%', maxWidth: 400, background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Email del Administrador (Sesión actual)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', maxWidth: 400, opacity: 0.7 }}>
                  <Mail size={14} color="#9CA3AF" />
                  <span style={{ fontSize: 13, color: '#E5E7EB' }}>{session?.user?.email}</span>
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={saving || nombreEmpresa === tenant?.nombre_empresa}
                style={{ background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: (saving || nombreEmpresa === tenant?.nombre_empresa) ? 'not-allowed' : 'pointer', opacity: (saving || nombreEmpresa === tenant?.nombre_empresa) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saving ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
              </button>
            </>
          )}
        </div>

        {/* PLAN DE SUSCRIPCIÓN */}
        <div style={{ background: 'linear-gradient(135deg, rgba(63, 169, 245, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(63, 169, 245, 0.2)', borderRadius: 8, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} color="#F59E0B" fill="#F59E0B" /> Plan de Suscripción ORVIAN
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 800, color: '#3FA9F5', marginBottom: 4 }}>
                {tenant?.suscripcion_plan || 'Starter'}
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 400, lineHeight: 1.5 }}>
                Estás utilizando el plan {tenant?.suscripcion_plan}. Tienes acceso completo a módulos de rutas, liquidación financiera, despachos de vehículos propios y B2B.
              </p>
            </div>
            
            <div style={{ background: '#1A1F26', border: '1px dashed #2A2F36', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Identificador de Tenant</div>
              <div style={{ fontSize: 10, color: '#3FA9F5', fontFamily: 'monospace' }}>{tenantId}</div>
            </div>
          </div>
        </div>

        {/* TU EQUIPO (OPERADORES) */}
        <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 24 }}>
           <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Tu Equipo de Operadores
          </h3>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>
            Para invitar a tus empleados, pásales esta dirección web y dales tu <strong>Código Secreto de Agencia</strong>. Ellos tendrán un rol restringido y no verán tu contabilidad.
          </p>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '12px 16px', display: 'flex', flexDirection: 'column', minWidth: 200 }}>
              <span style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>1. Link para empleados</span>
              <span style={{ fontSize: 13, color: '#3FA9F5', fontFamily: 'monospace' }}>{window.location.origin}/join</span>
            </div>
            
            <div style={{ background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '12px 16px', display: 'flex', flexDirection: 'column', minWidth: 250 }}>
              <span style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>2. Su Código Secreto de Agencia</span>
              <span style={{ fontSize: 13, color: '#E5E7EB', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tenantId}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
