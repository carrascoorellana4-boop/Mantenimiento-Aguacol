-- =============================================================================
-- MIGRACIÓN 34: CONSOLIDACIÓN DE DISPONIBILIDAD (HOJA "RESUMEN POR MÁQUINA")
-- Incorpora columnas detalladas de turnos, cambios de molde y períodos observados.
-- Fórmula: Disponibilidad = (Horas disponibles / (Horas disponibles + Horas en mantención)) * 100
-- =============================================================================

ALTER TABLE public.registro_disponibilidad
  ADD COLUMN IF NOT EXISTS periodo text,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS turnos_produccion numeric,
  ADD COLUMN IF NOT EXISTS turnos_mantencion numeric,
  ADD COLUMN IF NOT EXISTS horas_efectivas_mantenimiento numeric,
  ADD COLUMN IF NOT EXISTS cambios_molde integer,
  ADD COLUMN IF NOT EXISTS horas_cambio_molde numeric,
  ADD COLUMN IF NOT EXISTS cobertura text;

-- Notificar recarga a PostgREST
NOTIFY pgrst, 'reload schema';
