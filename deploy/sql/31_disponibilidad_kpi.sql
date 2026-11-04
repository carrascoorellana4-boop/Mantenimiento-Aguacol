-- =============================================================================
-- MIGRACIÓN 31: MÓDULO KPI DE DISPONIBILIDAD OPERACIONAL (PRODUCCIÓN & MANTENIMIENTO)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.registro_disponibilidad (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha date NOT NULL,
    equipo_id uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
    codigo_equipo text NOT NULL,
    nombre_equipo text,
    area text,
    linea text,
    tiempo_produccion_horas numeric(10, 2) NOT NULL DEFAULT 0 CHECK (tiempo_produccion_horas >= 0),
    tiempo_detencion_horas numeric(10, 2) NOT NULL DEFAULT 0 CHECK (tiempo_detencion_horas >= 0),
    disponibilidad_pct numeric(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN tiempo_produccion_horas > 0 THEN 
                GREATEST(0, LEAST(100, ROUND((((tiempo_produccion_horas - tiempo_detencion_horas) / tiempo_produccion_horas) * 100)::numeric, 2)))
            ELSE 0 
        END
    ) STORED,
    tipo_detencion text DEFAULT 'Falla / Mantenimiento',
    motivo text,
    turno text,
    observaciones text,
    origen_importacion text DEFAULT 'Excel Producción',
    archivo_origen text,
    registrado_por text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para consultas rápidas y filtros de período
CREATE INDEX IF NOT EXISTS idx_reg_disp_fecha ON public.registro_disponibilidad(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reg_disp_codigo ON public.registro_disponibilidad(codigo_equipo);
CREATE INDEX IF NOT EXISTS idx_reg_disp_equipo_id ON public.registro_disponibilidad(equipo_id);
CREATE INDEX IF NOT EXISTS idx_reg_disp_area ON public.registro_disponibilidad(area);

-- Habilitar RLS
ALTER TABLE public.registro_disponibilidad ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes si se reaplica
DROP POLICY IF EXISTS reg_disp_select ON public.registro_disponibilidad;
DROP POLICY IF EXISTS reg_disp_insert ON public.registro_disponibilidad;
DROP POLICY IF EXISTS reg_disp_admin ON public.registro_disponibilidad;

-- Políticas de acceso
CREATE POLICY reg_disp_select ON public.registro_disponibilidad 
  FOR SELECT TO mant_admin, mant_authenticated, mant_anon USING (true);

CREATE POLICY reg_disp_insert ON public.registro_disponibilidad 
  FOR INSERT TO mant_admin, mant_authenticated WITH CHECK (true);

CREATE POLICY reg_disp_admin ON public.registro_disponibilidad 
  FOR ALL TO mant_admin USING (true) WITH CHECK (true);

-- Permisos
GRANT SELECT ON public.registro_disponibilidad TO mant_authenticated, mant_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registro_disponibilidad TO mant_admin, mant_authenticated;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
