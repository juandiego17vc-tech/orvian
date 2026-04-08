-- ORVIAN Multi-Tenant Supabase Schema

-- ========================================================
-- 1. BASE DE DATOS ESTRUCTURAL
-- ========================================================

-- Tabla Tenants (Las Agencias/Clientes SaaS que compran ORVIAN)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT NOT NULL,
    suscripcion_plan TEXT DEFAULT 'Starter', -- Starter, Pro, Business
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla Usuarios Tenant (El "Pase VIP" que une a un usuario de login con una agencia)
-- NOTA: auth.users es la tabla interna de Supabase, referenciamos su id
CREATE TABLE usuarios_tenant (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rol TEXT DEFAULT 'Operador', -- Admin, Operador
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- 2. TABLAS DEL NEGOCIO (Filtradas por tenant)
-- ========================================================

-- Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    segmento TEXT DEFAULT 'Nuevo', -- VIP, Frecuente, Riesgo, Nuevo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Choferes (Añadidos a mano, sin auth)
CREATE TABLE choferes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    vehiculo_placa TEXT,
    estado TEXT DEFAULT 'Activo', -- Activo, Inactivo
    disponibilidad TEXT DEFAULT 'Disponible', -- Disponible, En Viaje, Fuera de Turno
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Viajes
CREATE TABLE viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    chofer_id UUID REFERENCES choferes(id) ON DELETE SET NULL,
    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    estado TEXT DEFAULT 'Pendiente', -- Pendiente, Asignado, En Curso, Finalizado, Cancelado
    fecha_programada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    precio_estimado DECIMAL(10, 2),
    validacion_precio_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pagos
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    viaje_id UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    monto DECIMAL(10, 2) NOT NULL,
    metodo TEXT, -- Efectivo, Tarjeta, MercadoPago
    estado TEXT DEFAULT 'Pendiente', -- Pendiente, Pagado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Encuestas (NPS)
CREATE TABLE encuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    viaje_id UUID NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alertas
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- SOS, Retraso, Pago Fallido
    mensaje TEXT NOT NULL,
    resuelta BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- 3. SEGURIDAD MULTI-TENANT (R.L.S)
-- ========================================================

-- 1. Creamos una función mágica para detectar a qué agencia pertenece el usuario actual
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.usuarios_tenant WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 2. Activamos la máxima seguridad (candados) en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE choferes ENABLE ROW LEVEL SECURITY;
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- 3. Creamos las reglas específicas. Todo se resume a:
-- "Solo puedes tocar esta fila si su tenant_id es igual al tuyo".

-- Usuarios puede ver su propia relación
CREATE POLICY "Aislamiento: Leer usuarios_tenant" ON usuarios_tenant FOR SELECT USING (id = auth.uid());

-- Reglas universales para el resto de tablas usando la función mágica
CREATE POLICY "Aislamiento: clientes" ON clientes FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: choferes" ON choferes FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: viajes" ON viajes FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: pagos" ON pagos FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: encuestas" ON encuestas FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: alertas" ON alertas FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "Aislamiento: tenants" ON tenants FOR SELECT USING (id = current_tenant_id());
