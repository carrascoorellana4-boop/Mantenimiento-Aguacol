-- =============================================================================
-- MIGRACIÓN 50: PREVENTIVO REVISIÓN NIVEL ACEITE Y RELLENO MOTOREDUCTORES DE CINTAS
-- Alcance: Todas las máquinas de Extrusión (M1..M5) y Soplado (S1, S2)
-- Tarea: Revisión de nivel de aceite y relleno a los motoreductores de cintas
-- Frecuencia: Semanal | Responsable: Mecánico
-- =============================================================================

BEGIN;

-- 1. Extrusora M1
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000001-0020-4000-8000-000000000001'::uuid,
  'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid,
  'AGL-PLA-GPL-M01',
  'Extrusora M1',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 2. Extrusora M2
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000002-0020-4000-8000-000000000002'::uuid,
  '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid,
  'AGL-PLA-GPL-M02',
  'Extrusora M2',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 3. Extrusora M3
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000003-0020-4000-8000-000000000003'::uuid,
  '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid,
  'AGL-PLA-GPL-M03',
  'Extrusora M3',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 4. Extrusora M4
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000004-0020-4000-8000-000000000004'::uuid,
  '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid,
  'AGL-PLA-GPL-M04',
  'Extrusora M4',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 5. Extrusora M5
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000005-0020-4000-8000-000000000005'::uuid,
  '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid,
  'AGL-PLA-GPL-M05',
  'Extrusora M5',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 6. S1 (Soplado - PET Auto 5LT)
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000006-0020-4000-8000-000000000006'::uuid,
  'bf955bcc-e66d-4d32-bcbf-5f181afa4841'::uuid,
  'AGL-SOP-S01',
  'S1',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

-- 7. S2 (Soplado - PET Auto Botella)
INSERT INTO public.plan_preventivo_tarea (
  id, equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
  sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro,
  activo, intervalo_h, maximo_dias, validacion_requerida, origen_consolidado
) VALUES (
  'e0000007-0020-4000-8000-000000000007'::uuid,
  '2327f61c-e1d3-466d-967b-df3c67332edf'::uuid,
  'AGL-SOP-S02',
  'S2',
  20,
  'T20',
  'Motoreductores de cintas',
  'Revisión de nivel de aceite y relleno a los motoreductores de cintas.',
  'Semanal',
  'Mecánico',
  'Equipo detenido / Seguro',
  'Nivel según visor o tapón; rellenar con lubricante especificado y verificar ausencia de fugas.',
  true,
  168,
  7,
  'Frecuencia local',
  'Instrucción Jefatura Mantenimiento'
)
ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
  sistema = EXCLUDED.sistema,
  orden = EXCLUDED.orden,
  id_tarea_fuente = EXCLUDED.id_tarea_fuente,
  responsable = EXCLUDED.responsable,
  condicion_trabajo = EXCLUDED.condicion_trabajo,
  criterio_registro = EXCLUDED.criterio_registro,
  activo = true,
  updated_at = now();

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
