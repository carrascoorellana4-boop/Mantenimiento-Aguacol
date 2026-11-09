-- =============================================================================
-- MIGRACIÓN 49: DETENCIÓN POR FALLA EN INYECTORA BORCHE (LUNES 09/11/2026)
-- Equipo: Inyectora BORCHE BS150-III (AGL-PLA-GPL-INY-BOR)
-- Detenida: 08:57 hrs | Habilitada: 10:50 hrs (Duración: 1 h 53 min = 1.88 h)
-- Motivo: Manillas se estaban quedando pegadas al molde en zona de expulsión.
-- Solución: Willi Orellana agregó 2 expulsiones por ciclo sin afectar ciclo de trabajo.
-- =============================================================================

BEGIN;

-- 1. Registrar en bitácora de mantenimiento
INSERT INTO public.bitacora_mantenimiento (
  id,
  fecha_hora,
  equipo_id,
  tecnico,
  es_falla,
  tipo_intervencion,
  tipo_falla,
  falla_motivo,
  trabajo_realizado,
  estado_final,
  area,
  origen,
  created_by
) VALUES (
  gen_random_uuid(),
  '2026-11-09 08:57:00-03'::timestamptz,
  'd5164976-93fa-4076-b887-9ddf38854b00'::uuid,
  'Willi Orellana',
  true,
  'Correctiva',
  'Mecánica',
  'Manillas se estaban quedando pegadas al molde, en zona de expulsión (08:57 a 10:50 hrs)',
  'Manillas se estaban quedando pegadas al molde, en zona de expulsión. Como solución se agregaron 2 expulsiones por ciclo para botar cualquier manilla que haya quedado pegada, esto sin afectar el ciclo de trabajo. Habilitada y operativa a las 10:50 hrs.',
  'Operativo',
  'Plásticos / Inyección',
  'Operación / Bitácora Diaria',
  '658930a1-e88f-4b8a-9aa5-99ab22cdb663'::uuid
);

-- 2. Actualizar registro de disponibilidad de Inyectora BORCHE para el período 07–13 nov
UPDATE public.registro_disponibilidad
SET
  horas_disponibles = 118.12,
  horas_mantencion = 1.88,
  horas_efectivas_mantenimiento = 1.88,
  turnos_mantencion = 0.24,
  tipo_detencion = 'Falla / Mantenimiento',
  motivo = 'Detención por manillas pegadas al molde en expulsión (08:57 a 10:50 hrs: 1 h 53 min)',
  observaciones = 'Planificación 07–13 nov: Detención lunes 09/11 de 08:57 a 10:50 hrs (1 h 53 min = 1.88 h). Manillas pegadas en molde; Willi Orellana agregó 2 expulsiones por ciclo sin afectar el ciclo. Habilitada 10:50 hrs.'
WHERE id = 'd15b0000-0000-4000-8000-000000000188'::uuid;

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
