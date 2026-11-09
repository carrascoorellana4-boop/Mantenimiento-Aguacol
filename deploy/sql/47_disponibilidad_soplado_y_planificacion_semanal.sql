-- =============================================================================
-- MIGRACIÓN 47: TIEMPOS PERDIDOS DE SOPLADO Y PLANIFICACIÓN SEMANAL 07-13 NOV 2026
-- 1. Incorporación de tiempos perdidos documentados y corregidos de Soplado PET:
--    - S1: 10 h 15 min (10.25 h)
--    - S2: 8 h 23 min (8.38 h)
--    - Total Soplado PET: 18 h 38 min (18.63 h)
--    - Desglose por causa: Fallas/mantención/ajustes 13 h 33 min, Cambios de molde 4 h 51 min, Espera producción 14 min.
-- 2. Planificación semanal oficial del 07 al 13 de noviembre de 2026:
--    - M1..M5 (Extrusión con turnos extras en fin de semana y preventivo M2 en lunes y martes mañana)
--    - S1 y S2 (Soplado PET Botella y 5LT)
--    - Inyectoras Borche, Iny 2, Preformas 1 y Preformas 2 (con turnos extras en Preformas 1)
-- =============================================================================

BEGIN;

-- Evitar duplicados si la migración se ejecuta más de una vez
DELETE FROM public.registro_disponibilidad 
WHERE periodo IN ('02–06 nov', '07–13 nov') 
   OR id::text LIKE 'd15b0000-0000-4000-8000-00000000017%'
   OR id::text LIKE 'd15b0000-0000-4000-8000-00000000018%';

-- =============================================================================
-- PARTE 1: TIEMPOS PERDIDOS CORREGIDOS DE SOPLADO PET (PERÍODO 02–06 NOV 2026)
-- S1 total acumulado documentado: 10 h 15 min (8.00 h julio + 2.25 h ajuste)
-- S2 total acumulado documentado: 8 h 23 min (8.38 h)
-- Total Soplado documentado: 18 h 38 min
-- =============================================================================

-- S1 (PET Auto 5LT)
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000171'::uuid, '2026-11-02', '2026-11-06', '02–06 nov',
  'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  80.00, 2.25, 10, 0.28,
  2.25, 1, 4.85,
  'Falla / Mantenimiento', 'Ajuste tiempos perdidos conocidos Soplado PET (S1: 10 h 15 min acumulado)',
  '10 turnos prod',
  'Totales corregidos Soplado: S1 suma 10 h 15 min (10.25 h). Causas Soplado: Fallas/mantención/ajustes 13 h 33 min, Cambios de molde 4 h 51 min, Espera producción 14 min. Total Soplado: 18 h 38 min.',
  'Validada y corregida',
  'Planilla Consolidada Producción (Totales corregidos Soplado)', 'Totales_corregidos_Soplado.png', 'Jefatura de Operaciones / Mantenimiento'
);

-- S2 (PET Auto Botella)
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000172'::uuid, '2026-11-02', '2026-11-06', '02–06 nov',
  '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  80.00, 8.38, 10, 1.05,
  8.38, 0, 0,
  'Falla / Mantenimiento', 'Ajuste tiempos perdidos conocidos Soplado PET (S2: 8 h 23 min acumulado)',
  '10 turnos prod',
  'Totales corregidos Soplado: S2 suma 8 h 23 min (8.38 h). Causas Soplado: Fallas/mantención/ajustes 13 h 33 min, Cambios de molde 4 h 51 min, Espera producción 14 min. Total Soplado: 18 h 38 min.',
  'Validada y corregida',
  'Planilla Consolidada Producción (Totales corregidos Soplado)', 'Totales_corregidos_Soplado.png', 'Jefatura de Operaciones / Mantenimiento'
);

-- =============================================================================
-- PARTE 2: PLANIFICACIÓN SEMANAL 07 AL 13 DE NOVIEMBRE 2026 (11 MÁQUINAS)
-- =============================================================================

-- 1. Extrusora M1
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000181'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168.00, 0.00, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod',
  'Planificación 07–13 nov: 3 turnos continuos diarios (3.000 u/día). Turnos extras en fin de semana (sábado y domingo completo).',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 2. Extrusora M2 (Mantenimiento preventivo lunes y martes turno mañana)
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000182'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  120.00, 16.00, 15, 2,
  16.00, 0, 0,
  'Falla / Mantenimiento', 'Mantenimiento Preventivo programado lunes 9 y martes 10 (turnos mañana)',
  '15 turnos prod',
  'Planificación 07–13 nov: Mantenimiento Preventivo lunes y martes en turno mañana (16 h efectivas de mantención). Sábado 2 turnos (16 h), domingo detenido, miércoles a viernes 3 turnos (10.000 u/día).',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 3. Extrusora M3
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000183'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  168.00, 0.00, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod',
  'Planificación 07–13 nov: Operación continua 3 turnos diarios los 7 días (10.000 u/día). Turnos extras fin de semana M3 en ambos lados.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 4. Extrusora M4
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000184'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  120.00, 0.00, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod',
  'Planificación 07–13 nov: Lunes a viernes 3 turnos diarios de producción (10.000 u/día). Sábado y domingo sin programación.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 5. Extrusora M5
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000185'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  120.00, 0.00, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod',
  'Planificación 07–13 nov: Lunes a viernes 3 turnos diarios de producción (10.000 a 12.000 u/día). Sábado y domingo sin programación.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 6. PET Auto 5LT / S1 (Soplado)
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000186'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  88.00, 0.00, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod',
  'Planificación 07–13 nov: Sábado turno mañana (8 h, 6.000 u), Domingo detenido, Lunes a Viernes 2 turnos diarios mañana y tarde (80 h, 6.000 u/día). Total: 88 h.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 7. PET Auto Botella / S2 (Soplado)
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000187'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  96.00, 0.00, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod',
  'Planificación 07–13 nov: Sábado 2 turnos mañana y tarde (16 h), Domingo detenido, Lunes a Viernes 2 turnos diarios mañana y tarde (80 h, 15.000 a 20.000 u/día). Total: 96 h.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 8. Inyectora BORCHE BS150-III
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000188'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  120.00, 0.00, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod',
  'Planificación 07–13 nov: Lunes a viernes 3 turnos diarios de producción (30.000 u/día). Fin de semana sin programación.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 9. Inyectora 2 de Tapas/Manillas
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000189'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  120.00, 0.00, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod',
  'Planificación 07–13 nov: Lunes a viernes 3 turnos diarios de producción (30.000 u/día). Fin de semana sin programación.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 10. Inyectora de Preformas 1
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000190'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  168.00, 0.00, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod',
  'Planificación 07–13 nov: Operación continua 3 turnos diarios los 7 días (45.000 u/día). Turnos extras fin de semana Preforma 90 con Hans López, Andrés Campos, Pedro Barrera y Cristian Sánchez.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

-- 11. Inyectora de Preformas 2
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000191'::uuid, '2026-11-07', '2026-11-13', '07–13 nov',
  '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  136.00, 0.00, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod',
  'Planificación 07–13 nov: Sábado 2 turnos mañana y tarde (16 h, 55.000 u), Domingo detenido, Lunes a Viernes 3 turnos continuos (120 h, 90.000 u/día). Total: 136 h.',
  'Planificada y validada',
  'Planilla Consolidada Producción (Planificación semanal)', 'Planificacion_07_13_nov.jpg', 'Planificación Producción'
);

COMMIT;

-- Recargar esquema de PostgREST para reflejar los nuevos registros de inmediato
NOTIFY pgrst, 'reload schema';
