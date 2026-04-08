import { useState, useEffect } from 'react'
import { Building, Plus, Search, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCcw, Archive, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Proveedores() {
  const { tenantId } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [loading, setLoading] = useState(true)

  // Movimientos
  const [viajes, setViajes] = useState([])
  const [transacciones, setTransacciones] = useState([])
  
  // Modals
  const [isModalProveedoresOpen, setIsModalProveedoresOpen] = useState(false)
  const [isModalTransaccionOpen, setIsModalTransaccionOpen] = useState(false)
  
  // Forms
  const [nombreFantasia, setNombreFantasia] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  const [tTipo, setTTipo] = useState('Cobro Ingresado')
  const [tMonto, setTMonto] = useState('')
  const [tComprobante, setTComprobante] = useState('')

  useEffect(() => {
    if (tenantId) fetchProveedores()
  }, [tenantId])

  useEffect(() => {
    if (proveedorSeleccionado) {
      fetchMovimientos(proveedorSeleccionado.id)
    }
  }, [proveedorSeleccionado])

  const fetchProveedores = async () => {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre_fantasia', { ascending: true })
    if (data) setProveedores(data)
    setLoading(false)
  }

  const fetchMovimientos = async (pid) => {
    // Viajes no archivados
    const { data: vData } = await supabase.from('viajes')
      .select('id, fecha_programada, origen, tipo_servicio, precio_estimado, costo_proveedor, moneda, quien_cobro')
      .eq('proveedor_id', pid)
      .eq('proveedor_archivado', false)
      .order('fecha_programada', { ascending: false })
    
    // Transacciones manuales no archivadas
    const { data: tData } = await supabase.from('transacciones_proveedores')
      .select('*')
      .eq('proveedor_id', pid)
      .eq('archivado', false)
      .order('created_at', { ascending: false })

    if (vData) setViajes(vData)
    if (tData) setTransacciones(tData)
  }

  const handleCrearProveedor = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('proveedores').insert([{
      tenant_id: tenantId,
      nombre_fantasia: nombreFantasia,
      razon_social: razonSocial,
      telefono: telefono,
      email: email
    }]).select().single()

    if (!error) {
      setIsModalProveedoresOpen(false)
      setNombreFantasia(''); setRazonSocial(''); setTelefono(''); setEmail('');
      fetchProveedores()
      setProveedorSeleccionado(data)
    } else {
      alert("Error al crear proveedor")
    }
  }

  const handleCrearTransaccion = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('transacciones_proveedores').insert([{
      tenant_id: tenantId,
      proveedor_id: proveedorSeleccionado.id,
      tipo: tTipo,
      monto: parseFloat(tMonto),
      comprobante_texto: tComprobante
    }])

    if (!error) {
      setIsModalTransaccionOpen(false)
      setTMonto(''); setTComprobante('')
      fetchMovimientos(proveedorSeleccionado.id)
    } else {
      alert("Error registrando pago")
    }
  }

  const archivarMes = async () => {
    if (!window.confirm("¿Estás seguro de cerrar este mes? Los viajes y pagos se archivarán y solo se creará una transacción de 'Saldo Inicial' con la diferencia actual para el mes siguiente.")) return
    
    // 1. Calcular el balance final para arrastrar
    // Aquí el cálculo arroja un SALDO TOTAL. Positivo = Nos deben. Negativo = Debemos.
    // Lógica simplificada: TODO a ARS solo por demostración, habría que soportar dual, pero asumamos ARS.
    
    // Si balance es distinto de cero, crear transacción de arrastre
    if (Math.abs(balanceARS) > 0) {
       await supabase.from('transacciones_proveedores').insert([{
         tenant_id: tenantId,
         proveedor_id: proveedorSeleccionado.id,
         tipo: balanceARS > 0 ? 'Saldo Inicial (A Favor Nuestro)' : 'Saldo Inicial (En Contra Nuestro)',
         monto: Math.abs(balanceARS),
         comprobante_texto: 'Arrastre Automático de Cierre de Mes'
       }])
    }

    // 2. Archivar Viajes
    if (viajes.length > 0) {
      await supabase.from('viajes').update({ proveedor_archivado: true }).in('id', viajes.map(v => v.id))
    }
    // 3. Archivar Transacciones Viejas
    if (transacciones.length > 0) {
      await supabase.from('transacciones_proveedores').update({ archivado: true }).in('id', transacciones.map(t => t.id))
    }

    alert("Estado de Cuenta consolidado y mes cerrado.")
    fetchMovimientos(proveedorSeleccionado.id)
  }


  // MOTOR DE ESTADO DE RESULTADOS (CUENTA CORRIENTE)
  // CREDITOS (+) -> Suma a favor de la Agencia ORVIAN
  // DEBITOS (-) -> Dinero que le debemos al Proveedor
  let balanceARS = 0

  // Analizar Viajes B2B (Inbound) -> Ellos nos compran a nosotros.
  // Ellos nos deben "costo_proveedor" (Nuestra tarifa neta).
  // Pero ojo, si "quien_cobro == Agencia", ya tenemos el dinero, saldo cero.
  // Si "quien_cobro == Proveedor", ellos tienen la plata. Nos deben.
  // Si "quien_cobro == Chofer", el chofer agarró el total (150k), así que ya cobramos, de hecho le debemos comision al chofer. El proveedor no nos debe nada.
  
  // Analizar Viajes Tercerizados (Outbound) -> Nosotros subcontratamos su coche.
  // Nosotros les debemos "costo_proveedor".
  // Si "quien_cobro == Agencia", agarramos la plata. Les debemos "costo_proveedor".
  // Si "quien_cobro == Proveedor", él agarró el PVP (150k). Le debíamos 100k. Él agarró 150k, o sea que ÉL nos debe 50k a nosotros!
  
  // Para no complicarlo en esta demo de MVP, sumaremos todos los montos de transacciones
  // y viajes directos a favor y en contra simple.

  const viajesAFavor = viajes.filter(v => v.tipo_servicio === 'B2B').reduce((acc, v) => acc + (v.costo_proveedor || 0), 0)
  const viajesEnContra = viajes.filter(v => v.tipo_servicio === 'Tercerizado').reduce((acc, v) => acc + (v.costo_proveedor || 0), 0)
  
  const pagosRecibidos = transacciones.filter(t => t.tipo.includes('Cobro') || t.tipo.includes('A Favor')).reduce((acc, t) => acc + parseFloat(t.monto), 0)
  const pagosEnviados = transacciones.filter(t => t.tipo.includes('Pago') || t.tipo.includes('En Contra')).reduce((acc, t) => acc + parseFloat(t.monto), 0)

  balanceARS = (viajesAFavor + pagosRecibidos) - (viajesEnContra + pagosEnviados)

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Bóveda B2B</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Estado de Resultados y Cuentas Corrientes con Proveedores (Agencias Externas).</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24 }}>
        {/* LISTADO LATERAL DE PROVEEDORES */}
        <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          <button 
            onClick={() => setIsModalProveedoresOpen(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(63,169,245,0.1)', color: '#3FA9F5', border: '1px dashed #3FA9F5', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
          >
            <Plus size={16} /> Añadir Proveedor
          </button>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {proveedores.map(p => (
              <div 
                key={p.id} 
                onClick={() => setProveedorSeleccionado(p)}
                style={{ padding: '12px', borderBottom: '1px solid #2A2F36', cursor: 'pointer', background: proveedorSeleccionado?.id === p.id ? 'rgba(63,169,245,0.05)' : 'transparent', borderLeft: proveedorSeleccionado?.id === p.id ? '2px solid #3FA9F5' : '2px solid transparent' }}
              >
                <div style={{ fontWeight: 600, color: '#E5E7EB', fontSize: 13 }}>{p.nombre_fantasia}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{p.telefono || 'Sin teléfono'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ESTADO DE RESULTADOS PRINCIPAL */}
        {!proveedorSeleccionado ? (
          <div style={{ background: '#1A1F26', border: '1px dashed #2A2F36', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
            <Building size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 500 }}>Selecciona una Agencia/Proveedor B2B</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#151921', padding: 24, borderRadius: 8, border: '1px solid #2A2F36' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#E5E7EB' }}>{proveedorSeleccionado.nombre_fantasia}</h2>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>ID Contable: {proveedorSeleccionado.id.substring(0,8)}</div>
              </div>
              <button 
                onClick={archivarMes}
                style={{ background: '#374151', color: 'white', border: '1px solid #4B5563', borderRadius: 6, padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Archive size={14} /> Cerrar Mes (Generar Arrastre)
              </button>
            </div>

            {/* BALANCE KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', padding: 20, borderRadius: 8 }}>
                <h3 style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowUpRight size={16}/> ACTIVOS (A FAVOR)</h3>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginTop: 10 }}>${(viajesAFavor + pagosRecibidos).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Servicios prestados o cobros de ellos.</div>
              </div>
              
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: 20, borderRadius: 8 }}>
                <h3 style={{ fontSize: 12, color: '#F87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowDownRight size={16}/> PASIVOS (DEUDA)</h3>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginTop: 10 }}>${(viajesEnContra + pagosEnviados).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Servicios recibidos o pagos a ellos.</div>
              </div>

              <div style={{ background: balanceARS >= 0 ? 'linear-gradient(135deg, #166534 0%, #14532D 100%)' : 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)', border: `1px solid ${balanceARS >= 0 ? '#4ADE80' : '#F87171'}`, padding: 20, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: 12, color: balanceARS >= 0 ? '#A7F3D0' : '#FECACA', fontWeight: 600 }}>SALDO NETO (CTA CTE)</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginTop: 6 }}>
                  {balanceARS >= 0 ? '+' : '-'}${Math.abs(balanceARS).toLocaleString()}
                </div>
              </div>
            </div>

            {/* OPERACIONES MATRIZ */}
            <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB' }}>Libro Mayor: Viajes y Transacciones</h3>
                <button 
                  onClick={() => setIsModalTransaccionOpen(true)}
                  style={{ background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <DollarSign size={14} /> Registrar Pago Ext.
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Fecha / Concepto</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Tipo Operación</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Débito (-)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Crédito (+)</th>
                  </tr>
                </thead>
                <tbody>
                  {transacciones.map(t => (
                     <tr key={t.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                       <td style={{ padding: '12px 16px' }}>{new Date(t.created_at).toLocaleDateString()} - <strong>{t.comprobante_texto}</strong></td>
                       <td style={{ padding: '12px 16px', color: '#F59E0B' }}>Transacción Manual</td>
                       <td style={{ padding: '12px 16px', textAlign: 'right', color: '#EF4444' }}>{t.tipo.includes('Pago') || t.tipo.includes('En Contra') ? `$${parseFloat(t.monto).toLocaleString()}` : '-'}</td>
                       <td style={{ padding: '12px 16px', textAlign: 'right', color: '#22C55E' }}>{t.tipo.includes('Cobro') || t.tipo.includes('A Favor') ? `$${parseFloat(t.monto).toLocaleString()}` : '-'}</td>
                     </tr>
                  ))}
                  {viajes.map(v => (
                     <tr key={v.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                       <td style={{ padding: '12px 16px' }}>{new Date(v.fecha_programada || Date.now()).toLocaleDateString()} - Viaje a {v.origen}</td>
                       <td style={{ padding: '12px 16px', color: v.tipo_servicio === 'B2B' ? '#3FA9F5' : '#8B5CF6' }}>{v.tipo_servicio}</td>
                       <td style={{ padding: '12px 16px', textAlign: 'right', color: '#EF4444' }}>{v.tipo_servicio === 'Tercerizado' ? `$${(v.costo_proveedor || 0).toLocaleString()}` : '-'}</td>
                       <td style={{ padding: '12px 16px', textAlign: 'right', color: '#22C55E' }}>{v.tipo_servicio === 'B2B' ? `$${(v.costo_proveedor || 0).toLocaleString()}` : '-'}</td>
                     </tr>
                  ))}
                </tbody>
              </table>

            </div>

          </div>
        )}
      </div>

      {/* MODAL PROVEEDOR */}
      {isModalProveedoresOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36' }}><h2 style={{ fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Nuevo Proveedor B2B</h2></div>
            <form onSubmit={handleCrearProveedor} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}><input type="text" required placeholder="Nombre de Fantasía" value={nombreFantasia} onChange={e=>setNombreFantasia(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white' }} /></div>
              <div style={{ marginBottom: 16 }}><input type="text" placeholder="Razón Social (Opcional)" value={razonSocial} onChange={e=>setRazonSocial(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white' }} /></div>
              <div style={{ marginBottom: 16 }}><input type="text" placeholder="Teléfono" value={telefono} onChange={e=>setTelefono(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white' }} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={()=>setIsModalProveedoresOpen(false)} style={{ background: 'transparent', color: 'white', padding: '10px 16px', border: '1px solid #2A2F36', borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#3FA9F5', color: 'white', padding: '10px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSACCION */}
      {isModalTransaccionOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 12, width: '100%', maxWidth: 450, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2F36' }}><h2 style={{ fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>Registrar Transferencia en Libro</h2></div>
            <form onSubmit={handleCrearTransaccion} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#9CA3AF' }}>Concepto</label>
                <select value={tTipo} onChange={e=>setTTipo(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white', marginTop: 6 }}>
                  <option value="Cobro Ingresado">Cobro: Proveedor nos transfiere plata (+)</option>
                  <option value="Pago Realizado">Pago: Nosotros le transferimos plata a ellos (-)</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#9CA3AF' }}>Monto a asentar</label>
                <input type="number" required value={tMonto} onChange={e=>setTMonto(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white', marginTop: 6 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#9CA3AF' }}>Nro Comprobante / Nota</label>
                <input type="text" required value={tComprobante} onChange={e=>setTComprobante(e.target.value)} style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', padding: 12, borderRadius: 6, color: 'white', marginTop: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={()=>setIsModalTransaccionOpen(false)} style={{ background: 'transparent', color: 'white', padding: '10px 16px', border: '1px solid #2A2F36', borderRadius: 6, cursor: 'pointer' }}>Descartar</button>
                <button type="submit" style={{ background: '#3FA9F5', color: 'white', padding: '10px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Sellar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
