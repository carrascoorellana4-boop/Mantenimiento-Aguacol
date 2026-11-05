-- Migration 36: Actualizar disponibilidad con hoja Detalle Consolidado (166 registros)
-- Autor: AGUACOL Mantenimiento

BEGIN;

-- Limpiar registros previos cargados desde la planilla consolidada
DELETE FROM public.registro_disponibilidad WHERE origen_importacion LIKE 'Planilla Consolidada Producción%' OR id::text LIKE 'd15b0000-%';

-- Inserción de 166 registros validados hasta 01-nov
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000001'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  112, 0, 14, 0,
  0, 1, 8,
  'Sin detención', NULL, '14 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000002'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000003'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  80, 0, 10, 0,
  0, 1, 8,
  'Sin detención', NULL, '10 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000004'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  0, 32, 0, 4,
  31, 0, 0,
  'Falla / Mantenimiento', 'Planificación validada por imagen; M4 en mantención en varios turnos.', '0 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000005'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000006'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  56, 0, 7, 0,
  0, 0, 0,
  'Sin detención', NULL, '7 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000007'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  24, 0, 3, 0,
  0, 1, 8,
  'Sin detención', NULL, '3 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000008'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 24, 0, 3,
  24, 0, 0,
  'Falla / Mantenimiento', 'Planificación validada por imagen; M4 en mantención en varios turnos.', '0 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000009'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  80, 0, 10, 0,
  0, 1, 8,
  'Sin detención', NULL, '10 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000010'::uuid, '2026-07-11', '2026-07-15', '11–15 jul', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  56, 0, 7, 0,
  0, 1, 8,
  'Sin detención', NULL, '7 turnos prod', 'Planificación validada por imagen; M4 en mantención en varios turnos.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000011'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000012'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000013'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  16, 0, 2, 0,
  0, 1, 8,
  'Sin detención', NULL, '2 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000014'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  0, 8, 0, 1,
  8, 0, 0,
  'Falla / Mantenimiento', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', '0 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000015'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000016'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  16, 0, 2, 0,
  0, 0, 0,
  'Sin detención', NULL, '2 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000017'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  0, 8, 0, 1,
  8, 0, 0,
  'Falla / Mantenimiento', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', '0 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000018'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 24, 0, 3,
  16, 0, 0,
  'Falla / Mantenimiento', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', '0 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000019'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  0, 24, 0, 3,
  16, 0, 0,
  'Falla / Mantenimiento', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', '0 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000020'::uuid, '2026-07-16', '2026-07-17', '16–17 jul', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  24, 0, 3, 0,
  0, 0, 0,
  'Sin detención', NULL, '3 turnos prod', 'Solo 16–17; el 18 se toma desde la planificación más reciente 18–24.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000021'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 1, 8,
  'Sin detención', NULL, '20 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000022'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  128, 0, 16, 0,
  0, 1, 8,
  'Sin detención', NULL, '16 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000023'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  152, 0, 19, 0,
  0, 0, 0,
  'Sin detención', NULL, '19 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000024'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  0, 16, 0, 2,
  15, 0, 0,
  'Falla / Mantenimiento', 'Se usa la versión más reciente de la planificación para fechas solapadas.', '0 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000025'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000026'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  32, 0, 4, 0,
  0, 1, 8,
  'Sin detención', NULL, '4 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000027'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  32, 0, 4, 0,
  0, 0, 0,
  'Sin detención', NULL, '4 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000028'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 16, 0, 2,
  3, 0, 0,
  'Falla / Mantenimiento', 'Se usa la versión más reciente de la planificación para fechas solapadas.', '0 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000029'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000030'::uuid, '2026-07-18', '2026-07-24', '18–24 jul', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  40, 0, 5, 0,
  0, 0, 0,
  'Sin detención', NULL, '5 turnos prod', 'Se usa la versión más reciente de la planificación para fechas solapadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000031'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  40, 8, 5, 1,
  0, 0, 0,
  'Falla / Mantenimiento', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horari', '5 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000032'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000033'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000034'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 0, 0,
  'Sin detención', NULL, '20 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000035'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 0, 0,
  'Sin detención', NULL, '20 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000036'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  64, 0, 8, 0,
  0, 0, 0,
  'Sin detención', NULL, '8 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000037'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  32, 0, 4, 0,
  0, 0, 0,
  'Sin detención', NULL, '4 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000038'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 16, 0, 2,
  3, 0, 0,
  'Falla / Mantenimiento', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horari', '0 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000039'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000040'::uuid, '2026-08-01', '2026-08-07', '1–7 ago', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  16, 0, 2, 0,
  0, 0, 0,
  'Sin detención', NULL, '2 turnos prod', 'M1: ''MANTENCIÓN MOLDE'' en turno noche; 0 h efectivas de mantenimiento por horario.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000041'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  48, 8, 6, 1,
  0, 0, 0,
  'Falla / Mantenimiento', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', '6 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000042'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 2, 16,
  'Sin detención', NULL, '15 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000043'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000044'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000045'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000046'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000047'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  40, 0, 5, 0,
  0, 0, 0,
  'Sin detención', NULL, '5 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000048'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 8, 0, 1,
  0, 0, 0,
  'Falla / Mantenimiento', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', '0 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000049'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000050'::uuid, '2026-08-08', '2026-08-14', '8–14 ago', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', '''DETENIDA'' no se atribuye a Mantenimiento y no suma horas de funcionamiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000051'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000052'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000053'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000054'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000055'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000056'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  56, 0, 7, 0,
  0, 0, 0,
  'Sin detención', NULL, '7 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000057'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  40, 0, 5, 0,
  0, 0, 0,
  'Sin detención', NULL, '5 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000058'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  144, 0, 18, 0,
  0, 0, 0,
  'Sin detención', NULL, '18 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000059'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000060'::uuid, '2026-08-15', '2026-08-21', '15–21 ago', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Sin mantenciones explícitas relevantes en las máquinas consolidadas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000061'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000062'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 2, 16,
  'Sin detención', NULL, '15 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000063'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000064'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  152, 0, 19, 0,
  0, 0, 0,
  'Sin detención', NULL, '19 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000065'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  152, 0, 19, 0,
  0, 0, 0,
  'Sin detención', NULL, '19 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000066'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000067'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  40, 0, 5, 0,
  0, 1, 8,
  'Sin detención', NULL, '5 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000068'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000069'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  16, 0, 2, 0,
  0, 0, 0,
  'Sin detención', NULL, '2 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000070'::uuid, '2026-08-22', '2026-08-28', '22–28 ago', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  128, 0, 16, 0,
  0, 1, 8,
  'Sin detención', NULL, '16 turnos prod', 'M5 presenta encabezado heredado en fuente; se interpreta como semana 22–28 por contexto.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000071'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000072'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  104, 0, 13, 0,
  0, 1, 8,
  'Sin detención', NULL, '13 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000073'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  152, 0, 19, 0,
  0, 1, 8,
  'Sin detención', NULL, '19 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000074'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000075'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000076'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  64, 0, 8, 0,
  0, 0, 0,
  'Sin detención', NULL, '8 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000077'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000078'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000079'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000080'::uuid, '2026-08-29', '2026-09-04', '29 ago–4 sep', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 no se cuenta como funcionamiento ni como mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000081'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000082'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  112, 0, 14, 0,
  0, 0, 0,
  'Sin detención', NULL, '14 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000083'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  112, 0, 14, 0,
  0, 0, 0,
  'Sin detención', NULL, '14 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000084'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000085'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000086'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  40, 0, 5, 0,
  0, 0, 0,
  'Sin detención', NULL, '5 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000087'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  32, 0, 4, 0,
  0, 0, 0,
  'Sin detención', NULL, '4 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000088'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  72, 0, 9, 0,
  0, 0, 0,
  'Sin detención', NULL, '9 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000089'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000090'::uuid, '2026-09-12', '2026-09-16', '12–16 sep', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 12–16 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000091'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  144, 0, 18, 0,
  0, 0, 0,
  'Sin detención', NULL, '18 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000092'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  112, 0, 14, 0,
  0, 1, 8,
  'Sin detención', NULL, '14 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000093'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000094'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000095'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000096'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  72, 0, 9, 0,
  0, 0, 0,
  'Sin detención', NULL, '9 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000097'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  56, 0, 7, 0,
  0, 0, 0,
  'Sin detención', NULL, '7 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000098'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000099'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000100'::uuid, '2026-09-19', '2026-09-25', '19–25 sep', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Bloque validado por imágenes 19–25 septiembre.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000101'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000102'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  112, 0, 14, 0,
  0, 2, 16,
  'Sin detención', NULL, '14 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000103'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000104'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  120, 8, 15, 1,
  7, 0, 0,
  'Falla / Mantenimiento', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas', '15 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000105'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000106'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000107'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  48, 0, 6, 0,
  0, 2, 16,
  'Sin detención', NULL, '6 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000108'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000109'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000110'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000111'::uuid, '2026-09-26', '2026-10-02', '26 sep–2 oct', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  72, 0, 9, 0,
  0, 1, 8,
  'Sin detención', NULL, '9 turnos prod', 'Planificación 26-sep a 2-oct. M4: mantención sábado turno mañana = 7 h efectivas por jornada de mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000112'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000113'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 1, 8,
  'Sin detención', NULL, '20 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000114'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000115'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  144, 0, 18, 0,
  0, 0, 0,
  'Sin detención', NULL, '18 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000116'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000117'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000118'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  56, 0, 7, 0,
  0, 0, 0,
  'Sin detención', NULL, '7 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000119'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000120'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000121'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000122'::uuid, '2026-10-03', '2026-10-09', '3–9 oct', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', '''DETENIDA'' en Borche/Preforma 2 no se atribuye a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000123'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000124'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  104, 0, 13, 0,
  0, 1, 8,
  'Sin detención', NULL, '13 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000125'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000126'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000127'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000128'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  88, 0, 11, 0,
  0, 0, 0,
  'Sin detención', NULL, '11 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000129'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000130'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000131'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  112, 0, 14, 0,
  0, 0, 0,
  'Sin detención', NULL, '14 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000132'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  152, 0, 19, 0,
  0, 0, 0,
  'Sin detención', NULL, '19 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000133'::uuid, '2026-10-10', '2026-10-16', '10–16 oct', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  88, 0, 11, 0,
  0, 1, 8,
  'Sin detención', NULL, '11 turnos prod', 'Sin mantenciones explícitas en esta planificación para las máquinas incluidas.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000134'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  144, 0, 18, 0,
  0, 0, 0,
  'Sin detención', NULL, '18 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000135'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 1, 8,
  'Sin detención', NULL, '20 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000136'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000137'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000138'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000139'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000140'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000141'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  96, 0, 12, 0,
  0, 0, 0,
  'Sin detención', NULL, '12 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000142'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  40, 0, 5, 0,
  0, 0, 0,
  'Sin detención', NULL, '5 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000143'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  152, 0, 19, 0,
  0, 0, 0,
  'Sin detención', NULL, '19 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000144'::uuid, '2026-10-17', '2026-10-23', '17–23 oct', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  128, 0, 16, 0,
  0, 1, 8,
  'Sin detención', NULL, '16 turnos prod', '''DETENIDA'' en INY 2 se mantiene fuera del tiempo atribuido a Mantenimiento.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000145'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000146'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  160, 0, 20, 0,
  0, 1, 8,
  'Sin detención', NULL, '20 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000147'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  80, 89, 10, 11.125,
  64, 0, 0,
  'Falla / Mantenimiento', 'CORRECCIÓN REAL: M3 en mantenimiento desde mar 27-oct 07:00. En este bloque, ind', '10 turnos prod', 'CORRECCIÓN REAL: M3 en mantenimiento desde mar 27-oct 07:00. En este bloque, indisponible 89 h (27-oct 07:00 a 30-oct 24:00); 64 h efectivas de mantenimiento Lun-Vie. La planificación original queda subordinada al dato real.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000148'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000149'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  136, 0, 17, 0,
  0, 0, 0,
  'Sin detención', NULL, '17 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000150'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  80, 0, 10, 0,
  0, 0, 0,
  'Sin detención', NULL, '10 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000151'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000152'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000153'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  120, 0, 15, 0,
  0, 0, 0,
  'Sin detención', NULL, '15 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000154'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  168, 0, 21, 0,
  0, 0, 0,
  'Sin detención', NULL, '21 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000155'::uuid, '2026-10-24', '2026-10-30', '24–30 oct', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'M3: ''MANTENCIÓN MOLDE'' lunes turno mañana = 8 h efectivas de mantenimiento. INY Preforma 2 figura detenida, no como mantención.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000156'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', 'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, 'AGL-PLA-GPL-M01', 'Extrusora M1', 'Plásticos / Extrusión',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000157'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, 'AGL-PLA-GPL-M02', 'Extrusora M2', 'Plásticos / Extrusión',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000158'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, 'AGL-PLA-GPL-M03', 'Extrusora M3', 'Plásticos / Extrusión',
  29, 18, 3.625, 2.25,
  10, 0, 0,
  'Falla / Mantenimiento', 'M3: mantenimiento real continúa hasta sáb 31-oct 18:00. Indisponibilidad 00:00–1', '3.625 turnos prod', 'M3: mantenimiento real continúa hasta sáb 31-oct 18:00. Indisponibilidad 00:00–18:00 = 18 h; trabajo efectivo de mantenimiento sábado 04:00–14:00 = 10 h; funcionamiento posterior 18:00–23:00 = 5 h + domingo 24 h = 29 h.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000159'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, 'AGL-PLA-GPL-M04', 'Extrusora M4', 'Plásticos / Extrusión',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000160'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, 'AGL-PLA-GPL-M05', 'Extrusora M5', 'Plásticos / Extrusión',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000161'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid, 'AGL-SOP-S02', 'S2', 'Soplado',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000162'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', 'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid, 'AGL-SOP-S01', 'S1', 'Soplado',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000163'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', 'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, 'AGL-PLA-GPL-INY-BOR', 'Inyectora BORCHE BS150-III', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000164'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', 'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, 'AGL-PLA-GPL-INY-02', 'Inyectora 2 de Tapas/Manillas', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000165'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', 'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, 'AGL-PLA-GPL-INY-PREF', 'Inyectora de preformas 1', 'Plásticos / Inyección',
  48, 0, 6, 0,
  0, 0, 0,
  'Sin detención', NULL, '6 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);
INSERT INTO public.registro_disponibilidad (
  id, fecha, fecha_fin, periodo, equipo_id, codigo_equipo, nombre_equipo, area,
  horas_disponibles, horas_mantencion, turnos_produccion, turnos_mantencion,
  horas_efectivas_mantenimiento, cambios_molde, horas_cambio_molde,
  tipo_detencion, motivo, turno, observaciones, cobertura, origen_importacion, archivo_origen, registrado_por
) VALUES (
  'd15b0000-0000-4000-8000-000000000166'::uuid, '2026-10-31', '2026-11-01', '31 oct–1 nov', '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid, 'AGL-PLA-GPL-INY-PREF-02', 'Inyectora de preformas 2', 'Plásticos / Inyección',
  0, 0, 0, 0,
  0, 0, 0,
  'Sin detención', NULL, '0 turnos prod', 'Planificación 31-oct–01-nov.', 'Validada hasta 01-nov',
  'Planilla Consolidada Producción (Detalle consolidado)', 'Consolidado_horas_operacion_mantenimiento_Aguacol.xlsx', 'Personal Producción'
);

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
