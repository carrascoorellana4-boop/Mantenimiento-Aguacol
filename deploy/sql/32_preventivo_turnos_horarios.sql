-- =============================================================================
-- MIGRACIÓN 32: CONTROL DE TIEMPOS DE COMIENZO Y CIERRE EN MANTENIMIENTO PREVENTIVO
-- Horarios de turnos de mantenimiento AGUACOL:
-- - Lunes a Viernes: 07:00 a 15:00 y 15:00 a 23:00 (07:00 a 23:00)
-- - Sábados: 04:00 a 09:00
-- =============================================================================

-- 1. Agregar columnas para inicio, cierre y horas efectivas de turno
ALTER TABLE public.plan_preventivo_ejecucion 
  ADD COLUMN IF NOT EXISTS fecha_hora_inicio timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fecha_hora_cierre timestamptz,
  ADD COLUMN IF NOT EXISTS horas_efectivas_turno numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tecnico_nombre text;

-- 2. Asegurar que registros existentes tengan fecha de inicio asignada
UPDATE public.plan_preventivo_ejecucion 
SET fecha_hora_inicio = fecha_ejecucion,
    fecha_hora_cierre = fecha_ejecucion
WHERE fecha_hora_inicio IS NULL;

-- 3. Índices de búsqueda para tareas en curso o por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_plan_prev_ejec_inicio ON public.plan_preventivo_ejecucion(fecha_hora_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_plan_prev_ejec_estado ON public.plan_preventivo_ejecucion(estado);

-- 4. Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';
