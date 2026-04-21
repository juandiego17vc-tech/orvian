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

-- ========================================================
-- 4. ONBOARDING (Bypass RLS para nuevos clientes)
-- ========================================================
-- Esta función permite a la UI crear el Tenant justo al registrar al usuario
CREATE OR REPLACE FUNCTION crear_mi_agencia(p_nombre_empresa TEXT)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Insertamos la nueva empresa (Agencia)
  INSERT INTO public.tenants (nombre_empresa, suscripcion_plan)
  VALUES (p_nombre_empresa, 'Starter')
  RETURNING id INTO v_tenant_id;

  -- Asociamos al usuario (que llamó la función) con esta agencia como Admin
  INSERT INTO public.usuarios_tenant (id, tenant_id, rol)
  VALUES (auth.uid(), v_tenant_id, 'Admin');

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 5. ONBOARDING EMPLEADOS (Bypass RLS para Operadores)
-- ========================================================
CREATE OR REPLACE FUNCTION unirse_agencia(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    INSERT INTO public.usuarios_tenant (id, tenant_id, rol)
    VALUES (auth.uid(), p_tenant_id, 'Operador');
  ELSE
    RAISE EXCEPTION 'Código de Agencia inválido';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 6. PWA CHOFERES (Magic Links)
-- ========================================================
CREATE OR REPLACE FUNCTION rpc_get_chofer(p_id UUID)
RETURNS SETOF public.choferes AS $$
  SELECT * FROM public.choferes WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_get_viajes_chofer(p_chofer_id UUID)
RETURNS SETOF public.viajes AS $$
  SELECT * FROM public.viajes WHERE chofer_id = p_chofer_id AND estado != 'Finalizado' ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_update_viaje_estado(p_viaje_id UUID, p_estado TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.viajes SET estado = p_estado WHERE id = p_viaje_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 7. PORTAL B2B CLIENTES (Autogestión por Magic Link)
-- ========================================================
CREATE OR REPLACE FUNCTION rpc_get_cliente(p_id UUID)
RETURNS SETOF public.clientes AS $$
  SELECT * FROM public.clientes WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_get_resumen_cliente(p_cliente_id UUID)
RETURNS TABLE (
  total_viajes BIGINT,
  deuda_actual NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COALESCE(SUM(precio_estimado), 0)
  FROM public.viajes 
  WHERE cliente_id = p_cliente_id AND archivado = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_crear_viaje_cliente(p_cliente_id UUID, p_origen TEXT, p_destino TEXT, p_pasajero TEXT)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.clientes WHERE id = p_cliente_id;
  
  INSERT INTO public.viajes (tenant_id, cliente_id, nombre_pasajero, origen, destino, estado, quien_cobro)
  VALUES (v_tenant_id, p_cliente_id, p_pasajero, p_origen, p_destino, 'Pendiente', 'Agencia');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
