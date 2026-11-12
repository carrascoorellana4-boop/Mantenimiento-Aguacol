-- Migración 59: Validación de Tiempos Perdidos de OT para KPI
-- Permite al Administrador auditar los tiempos de detención de las OT y volcarlos
-- formalmente a la disponibilidad de los equipos (public.registro_disponibilidad).

ALTER TABLE public.orden_trabajo 
ADD COLUMN IF NOT EXISTS kpi_validado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kpi_validado_el timestamptz,
ADD COLUMN IF NOT EXISTS kpi_validado_por text,
ADD COLUMN IF NOT EXISTS kpi_omitido boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kpi_horas_aprobadas numeric(8,2),
ADD COLUMN IF NOT EXISTS kpi_registro_id uuid;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orden_trabajo TO mant_authenticated, mant_admin, mant_externo;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registro_disponibilidad TO mant_authenticated, mant_admin, mant_externo;
GRANT SELECT ON public.orden_trabajo TO mant_anon;
GRANT SELECT ON public.registro_disponibilidad TO mant_anon;

NOTIFY pgrst, 'reload schema';
