import { useState, useEffect } from 'react'
import { DollarSign, Search, Calculator, CheckCircle, FileText, Printer, AlertTriangle, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Liquidaciones() {
  const { tenantId } = useAuth()
  const [choferes, setChoferes] = useState([])
  const [choferSeleccionado, setChoferSeleccionado] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [pctComision, setPctComision] = useState(33) // Default
  const [tcUsd, setTcUsd] = useState(1000) // Cotización ARS/USD
  
  const [viajesPorLiquidar, setViajesPorLiquidar] = useState([])
  const [calculando, setCalculando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (tenantId) fetchChoferes()
  }, [tenantId])

  const fetchChoferes = async () => {
    const { data } = await supabase
      .from('choferes')
      .select('id, nombre_completo, comision_porcentaje')
      .order('nombre_completo', { ascending: true })
    if (data) setChoferes(data)
  }

  const handleChoferChange = (e) => {
    const cid = e.target.value
    setChoferSeleccionado(cid)
    const choferInfo = choferes.find(c => c.id === cid)
    if (choferInfo && choferInfo.comision_porcentaje) {
      setPctComision(choferInfo.comision_porcentaje)
    }
  }

  const buscarViajes = async () => {
    if (!choferSeleccionado) {
      alert("Selecciona un chofer primero")
      return
    }
    setCalculando(true)
    
    let query = supabase.from('viajes').select('*, clientes(nombre_completo)')
      .eq('chofer_id', choferSeleccionado)
      .eq('estado', 'Finalizado')
      .eq('liquidado', false)

    if (fechaDesde) query = query.gte('fecha_programada', new Date(fechaDesde).toISOString())
    if (fechaHasta) {
      const hastaEndDate = new Date(fechaHasta)
      hastaEndDate.setHours(23, 59, 59, 999)
      query = query.lte('fecha_programada', hastaEndDate.toISOString())
    }

    const { data, error } = await query
    
    if (error) {
      console.error(error)
      alert("Error buscando viajes finalizados.")
    } else {
      setViajesPorLiquidar(data)
    }
    setCalculando(false)
  }

  // Lógica Matemática Principal
  const totalViajesARS = viajesPorLiquidar.filter(v => v.moneda === 'ARS').reduce((acc, v) => acc + (v.precio_estimado || 0), 0)
  const totalViajesUSD = viajesPorLiquidar.filter(v => v.moneda === 'U$D').reduce((acc, v) => acc + (v.precio_estimado || 0), 0)
  
  const totalUSDenPesos = totalViajesUSD * tcUsd
  const totalCombinadoARS = totalViajesARS + totalUSDenPesos

  // Comisión a favor del chofer
  const comisionChoferBRUTO = totalCombinadoARS * (pctComision / 100)

  // Descontar lo que el Chofer YA se quedó en mano
  // (Si Quien Cobró = Chofer, es dinero que él ya tiene en su bolsillo y se le descuenta de lo que le debe la Agencia)
  const cobradoPorChoferARS = viajesPorLiquidar.filter(v => v.quien_cobro === 'Chofer' && v.moneda === 'ARS').reduce((acc, v) => acc + (v.precio_estimado || 0), 0)
  const cobradoPorChoferUSD = viajesPorLiquidar.filter(v => v.quien_cobro === 'Chofer' && v.moneda === 'U$D').reduce((acc, v) => acc + (v.precio_estimado || 0), 0)
  const totalYaCobradoPorChofer = cobradoPorChoferARS + (cobradoPorChoferUSD * tcUsd)

  // Si la Diferencia es Positiva, la AGENCIA le tiene que pagar al Chofer.
  // Si la Diferencia es Negativa, el CHOFER se quedó con plata de más y le debe a la Agencia.
  const balanceFinal = comisionChoferBRUTO - totalYaCobradoPorChofer

  const confirmarLiquidacion = async () => {
    if (viajesPorLiquidar.length === 0) return
    if (!window.confirm("¿Seguro que deseas confirmar? Se marcarán todos estos viajes como LIQUIDADOS permanentemente.")) return
    
    setConfirmando(true)
    try {
      // 1. Guardar el recibo (Si creaste la tabla de liquidaciones)
      await supabase.from('liquidaciones').insert([{
        tenant_id: tenantId,
        chofer_id: choferSeleccionado,
        monto_total: balanceFinal,
        notas: `Comisión ${pctComision}% | TC: $${tcUsd} | Viajes: ${viajesPorLiquidar.length}`
      }])

      // 2. Marcar los viajes
      const travelIds = viajesPorLiquidar.map(v => v.id)
      const { error } = await supabase.from('viajes').update({ liquidado: true, estado: 'Liquidado' }).in('id', travelIds)
      
      if (error) throw error

      alert("Liquidación cerrada y viajes archivados correctamente.")
      setViajesPorLiquidar([])
      setChoferSeleccionado('')
    } catch (err) {
      console.error(err)
      alert("Error sellando la liquidación.")
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div style={{ padding: 24, position: 'relative', minHeight: '100vh', maxWidth: 1100, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: '#E5E7EB' }}>Finanzas: Nómina y Liquidaciones</h1>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Centro de cálculos cruzados para pagar comisiones a tu flota operativa.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24 }}>
        
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#3FA9F5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} /> Parámetros
            </h3>
            
            <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Chofer</label>
            <select 
              value={choferSeleccionado} onChange={handleChoferChange}
              style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', marginBottom: 14 }}
            >
              <option value="">— Elegir Chofer —</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Fecha Desde</label>
            <input 
              type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', colorScheme: 'dark', marginBottom: 14 }}
            />

            <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Fecha Hasta</label>
            <input 
              type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', colorScheme: 'dark', marginBottom: 14 }}
            />

            <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>% Su Comisión Habitual</label>
            <input 
              type="number" value={pctComision} onChange={e => setPctComision(e.target.value)}
              style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px', color: '#E5E7EB', outline: 'none', marginBottom: 14 }}
            />

            <label style={{ display: 'block', fontSize: 12, color: '#F59E0B', marginBottom: 6, fontWeight: 600 }}>💱 TC Cotización (USD → ARS)</label>
            <input 
              type="number" value={tcUsd} onChange={e => setTcUsd(e.target.value)}
              style={{ width: '100%', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', borderRadius: 6, padding: '10px 12px', color: '#F59E0B', outline: 'none', fontWeight: 700, fontSize: 16 }}
            />

            <button 
              onClick={buscarViajes}
              disabled={calculando}
              style={{ width: '100%', background: '#3FA9F5', color: 'white', border: 'none', borderRadius: 6, padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {calculando ? 'Buscando...' : <><Search size={16} /> Buscar Viajes Finalizados</>}
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: RENDIMIENTO Y RESULTADO */}
        <div>
          {viajesPorLiquidar.length === 0 ? (
            <div style={{ background: '#1A1F26', border: '1px dashed #2A2F36', borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', minHeight: 400 }}>
              <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>No hay ninguna liquidación en curso.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Selecciona un chofer y pulsa "Buscar Viajes"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Tarjetas KPI de Recaudación */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: '#1A1F26', border: '1px solid rgba(63, 169, 245, 0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Total Viajes ARS</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#3FA9F5' }}>${totalViajesARS.toLocaleString()}</div>
                </div>
                <div style={{ background: '#1A1F26', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Total Viajes USD</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>U$D {totalViajesUSD.toLocaleString()}</div>
                </div>
                <div style={{ background: '#1A1F26', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Conversión a Pesos</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>${totalUSDenPesos.toLocaleString()}</div>
                </div>
                <div style={{ background: '#1A1F26', border: '1px solid #166534', borderRadius: 8, padding: 16, textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)' }}>
                  <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, marginBottom: 4 }}>TOTAL COMBINADO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#22C55E' }}>${totalCombinadoARS.toLocaleString()}</div>
                </div>
              </div>

              {/* TICKET DE LIQUIDACIÓN */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', borderRadius: 12, padding: 24, color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>💵 CÁLCULO FINAL DE NÓMINA</h3>
                    <p style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{viajesPorLiquidar.length} viajes auditados para {choferes.find(c=>c.id===choferSeleccionado)?.nombre_completo}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Comisión del Chofer</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#FBBF24' }}>${comisionChoferBRUTO.toLocaleString()}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>(El {pctComision}% del Total Combinado)</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#93C5FD' }}>💰 Dinero ya retenido en mano por él:</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span>Cobrado en ARS:</span>
                      <strong>${cobradoPorChoferARS.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span>Cobrado en USD (convertido):</span>
                      <strong>${(cobradoPorChoferUSD * tcUsd).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#EF4444', fontWeight: 700 }}>
                      <span>Se descuenta:</span>
                      <span>- ${totalYaCobradoPorChofer.toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ background: balanceFinal >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: `2px solid ${balanceFinal >= 0 ? '#4ADE80' : '#F87171'}`, borderRadius: 8, padding: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: balanceFinal >= 0 ? '#86EFAC' : '#FCA5A5', marginBottom: 4 }}>
                      {balanceFinal >= 0 ? '✔️ RESULTADO: DEBEMOS ABONARLE A ÉL' : '⚠️ RESULTADO: ÉL LE DEBE A LA AGENCIA'}
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: 'white' }}>
                      ${Math.abs(balanceFinal).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }} className="hide-on-print">
                  <button 
                    onClick={confirmarLiquidacion} disabled={confirmando}
                    style={{ flex: 1, background: '#4ADE80', color: '#14532D', border: 'none', borderRadius: 8, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <CheckCircle size={20} /> {confirmando ? 'Registrando...' : 'Confirmar y Archivar'}
                  </button>
                  <button 
                    onClick={() => {
                      const chofer = choferes.find(c=>c.id===choferSeleccionado)
                      const msg = `*LIQUIDACIÓN ORVIAN*\n👨‍✈️ Chofer: ${chofer?.nombre_completo}\n📅 Vuelo de Viajes: ${viajesPorLiquidar.length}\n\n*Resumen Económico:*\nBruto Facturado: $${totalCombinadoARS.toLocaleString()}\nTu Comisión (${pctComision}%): $${comisionChoferBRUTO.toLocaleString()}\n\nDinero que ya te dejaste (Adelantos): $${totalYaCobradoPorChofer.toLocaleString()}\n\n*SALDO FINAL: ${balanceFinal >= 0 ? `LA AGENCIA TE DEBE A ABONAR $${balanceFinal.toLocaleString()}` : `DEBES RENDIR A LA AGENCIA $${Math.abs(balanceFinal).toLocaleString()}`}*\n\nPor favor verificá y dame el OK para sellarla en sistema.`
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 8, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <MessageCircle size={20} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => window.print()}
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Printer size={20} /> PDF
                  </button>
                </div>
              </div>

              {/* LISTA DE VIAJES INVOLUCRADOS */}
              <div style={{ background: '#1A1F26', border: '1px solid #2A2F36', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#151921', borderBottom: '1px solid #2A2F36', color: '#9CA3AF' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Fecha Prog.</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Ruta</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Bruto Contable</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Método / Quién Retuvo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajesPorLiquidar.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #2A2F36', color: '#E5E7EB' }}>
                        <td style={{ padding: '10px 16px' }}>{new Date(v.fecha_programada).toLocaleDateString('es-AR')}</td>
                        <td style={{ padding: '10px 16px', color: '#9CA3AF' }}>{v.origen}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: v.moneda === 'U$D' ? '#4ADE80' : '#E5E7EB' }}>
                          {v.moneda || 'ARS'} ${v.precio_estimado}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 11, background: '#0B0F14', border: '1px solid #2A2F36', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>
                            {v.forma_pago}
                          </span>
                          <span style={{ fontSize: 11, color: v.quien_cobro === 'Chofer' ? '#F87171' : '#3FA9F5', fontWeight: 600 }}>
                            {v.quien_cobro === 'Chofer' ? '💸 Cobró Chofer' : '🏦 Cobró Agencia'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
