import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const db = {
  viajes: () => supabase.from('viajes'),
  clientes: () => supabase.from('clientes'),
  choferes: () => supabase.from('choferes'),
  pagos: () => supabase.from('pagos'),
  encuestas: () => supabase.from('encuestas'),
  alertas: () => supabase.from('alertas'),
}
