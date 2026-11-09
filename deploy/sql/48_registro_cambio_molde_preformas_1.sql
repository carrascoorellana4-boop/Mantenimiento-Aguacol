-- =============================================================================
-- MIGRACIÓN 48: REGISTRO DE CAMBIO DE MOLDE INYECTORA DE PREFORMAS 1 (06/11/2026)
-- Evento: Cambio de molde de 36g a 47g
-- Horario: 07:45 hrs a 12:24 hrs (4 h 39 min = 4.65 horas)
-- Criterio AGUACOL: Cambio de molde operacional, no imputable a falla de mantenimiento.
-- =============================================================================

BEGIN;

-- 1. Registrar en registro_disponibilidad
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000173'::uuid, '2026-11-06', '2026-11-06', '02–06 nov',
  'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  19.35, 0.00, 2.42, 0,
  0, 1, 4.65,
  'Cambio de molde', 'Cambio de molde de 36g a 47g (07:45 a 12:24 hrs)',
  'Turno Mañana (07:45–12:24)',
  'Tiempo perdido en inyección el viernes 06/11 solamente por cambio de molde en inyectora de preformas 1 de 36g a 47g. Desde las 07:45 hrs hasta las 12:24 hrs (4 h 39 min = 4.65 h). No imputable a falla de mantenimiento.',
  'Validada y registrada',
  'Reporte Operacional Inyección', 'Registro_Inyeccion_06_11_2026.log', 'Personal Inyección / Mantenimiento'
)
ON CONFLICT (id) DO UPDATE SET
  horas_disponibles = EXCLUDED.horas_disponibles,
  horas_mantencion = EXCLUDED.horas_mantencion,
  cambios_molde = EXCLUDED.cambios_molde,
  horas_cambio_molde = EXCLUDED.horas_cambio_molde,
  tipo_detencion = EXCLUDED.tipo_detencion,
  motivo = EXCLUDED.motivo,
  turno = EXCLUDED.turno,
  observaciones = EXCLUDED.observaciones;

-- 2. Actualizar registro correspondiente en bitacora_mantenimiento con horario exacto y sin catalogar como falla
UPDATE public.bitacora_mantenimiento
SET 
  fecha_hora = '2026-11-06 07:45:00-03'::timestamptz,
  es_falla = false,
  tipo_intervencion = 'Ajuste',
  falla_motivo = 'Cambio de molde operacional de 36g a 47g (07:45 a 12:24 hrs)',
  trabajo_realizado = 'Cambio de molde en inyectora de preformas 1 de 36g a 47g. Horario: 07:45 hrs a 12:24 hrs (duración: 4 h 39 min = 4.65 h). Máquina queda operativa y produciendo en 47g.',
  estado_final = 'Operativo'
WHERE id = '874b8b1f-d499-4ed2-b41c-cb7b163cb41b'::uuid;

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
