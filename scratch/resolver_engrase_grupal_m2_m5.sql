-- ====================================================================
-- SCRIPT ADMINISTRATIVO: EXPANSIÓN GRUPAL DE ENGRASE PREVENTIVO M2-M5
-- Archivo: scratch/resolver_engrase_grupal_m2_m5.sql
-- Ejecutar en: Supabase SQL Editor (Rol postgres)
-- Proyecto: Sistema_Mantenimiento
-- Objetivo:
--   1. Expandir el registro de engrase grupal del 07-10-2026 en 4 intervenciones
--      preventivas independientes asociadas a: M2, M3, M4 y M5.
--   2. Verificar no duplicidad por (fecha_hora, equipo_id, tecnico, trabajo_realizado).
--   3. Actualizar el registro pendiente a 'Resuelto' con equipo_id_resuelto = NULL
--      y motivo_pendiente documentando la expansión grupal.
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_batch_id uuid := 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'::uuid;
    v_created_by uuid := '796275b6-d01d-4cef-b519-d99c8464e453'::uuid;
    v_pendiente_id uuid := '6754a184-d3aa-436e-a0ea-5723a4cbc166'::uuid;
    
    v_fecha_hora timestamptz;
    v_tecnico text;
    v_trabajo text;
    
    v_id_m2 uuid;
    v_id_m3 uuid;
    v_id_m4 uuid;
    v_id_m5 uuid;
    
    v_count_intervenciones int := 0;
BEGIN
    -- 1. Obtener datos exactos del pendiente origen
    SELECT fecha_hora, tecnico, trabajo_realizado
    INTO v_fecha_hora, v_tecnico, v_trabajo
    FROM public.bitacora_importacion_pendiente
    WHERE id = v_pendiente_id;

    IF v_fecha_hora IS NULL THEN
        RAISE EXCEPTION 'Registro pendiente % no encontrado', v_pendiente_id;
    END IF;

    -- 2. Obtener los UUIDs reales de M2, M3, M4 y M5 en public.equipo
    SELECT id INTO v_id_m2 FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' OR nombre = 'Extrusora M2' LIMIT 1;
    SELECT id INTO v_id_m3 FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' OR nombre = 'Extrusora M3' LIMIT 1;
    SELECT id INTO v_id_m4 FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' OR nombre = 'Extrusora M4' LIMIT 1;
    SELECT id INTO v_id_m5 FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' OR nombre = 'Extrusora M5' LIMIT 1;

    IF v_id_m2 IS NULL OR v_id_m3 IS NULL OR v_id_m4 IS NULL OR v_id_m5 IS NULL THEN
        RAISE EXCEPTION 'No se encontraron todos los UUIDs de M2, M3, M4 y M5 en public.equipo';
    END IF;

    -- 3. Intervención para M2
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE fecha_hora = v_fecha_hora
          AND equipo_id = v_id_m2
          AND tecnico = v_tecnico
          AND trabajo_realizado = v_trabajo
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        ) VALUES (
            v_fecha_hora, v_id_m2, v_tecnico, false, 'Preventiva',
            NULL, NULL, v_trabajo, 'Operativo',
            'Plásticos', 'Excel', v_batch_id, v_created_by
        );
    END IF;

    -- 4. Intervención para M3
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE fecha_hora = v_fecha_hora
          AND equipo_id = v_id_m3
          AND tecnico = v_tecnico
          AND trabajo_realizado = v_trabajo
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        ) VALUES (
            v_fecha_hora, v_id_m3, v_tecnico, false, 'Preventiva',
            NULL, NULL, v_trabajo, 'Operativo',
            'Plásticos', 'Excel', v_batch_id, v_created_by
        );
    END IF;

    -- 5. Intervención para M4
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE fecha_hora = v_fecha_hora
          AND equipo_id = v_id_m4
          AND tecnico = v_tecnico
          AND trabajo_realizado = v_trabajo
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        ) VALUES (
            v_fecha_hora, v_id_m4, v_tecnico, false, 'Preventiva',
            NULL, NULL, v_trabajo, 'Operativo',
            'Plásticos', 'Excel', v_batch_id, v_created_by
        );
    END IF;

    -- 6. Intervención para M5
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE fecha_hora = v_fecha_hora
          AND equipo_id = v_id_m5
          AND tecnico = v_tecnico
          AND trabajo_realizado = v_trabajo
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        ) VALUES (
            v_fecha_hora, v_id_m5, v_tecnico, false, 'Preventiva',
            NULL, NULL, v_trabajo, 'Operativo',
            'Plásticos', 'Excel', v_batch_id, v_created_by
        );
    END IF;

    -- 7. Verificar que existan exactamente las 4 intervenciones antes de cerrar el pendiente
    SELECT COUNT(*) INTO v_count_intervenciones
    FROM public.bitacora_mantenimiento
    WHERE fecha_hora = v_fecha_hora
      AND tecnico = v_tecnico
      AND trabajo_realizado = v_trabajo
      AND equipo_id IN (v_id_m2, v_id_m3, v_id_m4, v_id_m5);

    IF v_count_intervenciones < 4 THEN
        RAISE EXCEPTION 'No se pudieron confirmar las 4 intervenciones preventivas (encontradas: %)', v_count_intervenciones;
    END IF;

    -- 8. Actualizar registro en bitacora_importacion_pendiente
    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = NULL,
        motivo_pendiente = 'Resuelto mediante expansión grupal a M2, M3, M4 y M5.',
        resolved_at = clock_timestamp()
    WHERE id = v_pendiente_id;

END $$;

COMMIT;

-- --------------------------------------------------------------------
-- CONSULTAS DE VERIFICACIÓN POST-EJECUCIÓN
-- --------------------------------------------------------------------

-- 1. Verificar las 4 intervenciones en public.bitacora_mantenimiento
SELECT 
    bm.id,
    bm.fecha_hora,
    eq.codigo AS codigo_equipo,
    eq.nombre AS nombre_equipo,
    bm.tecnico,
    bm.tipo_intervencion,
    bm.es_falla,
    bm.trabajo_realizado,
    bm.estado_final,
    bm.created_by
FROM public.bitacora_mantenimiento bm
JOIN public.equipo eq ON eq.id = bm.equipo_id
WHERE bm.fecha_hora = '2026-10-07 03:00:00+00'
  AND bm.tecnico = 'Mauricio Riquelme'
  AND bm.trabajo_realizado = 'Se rellena grasa en M2, M3, M4 y M5.'
ORDER BY eq.codigo;

-- 2. Verificar estado del registro en bitacora_importacion_pendiente
SELECT 
    id,
    estado,
    equipo_id_resuelto,
    motivo_pendiente,
    resolved_at
FROM public.bitacora_importacion_pendiente
WHERE id = '6754a184-d3aa-436e-a0ea-5723a4cbc166';

-- 3. Conteo de pendientes restantes (debe ser exactamente 3)
SELECT 
    estado,
    COUNT(*) AS cantidad
FROM public.bitacora_importacion_pendiente
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'
GROUP BY estado
ORDER BY estado;
