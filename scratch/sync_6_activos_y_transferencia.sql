-- ====================================================================
-- SCRIPT ADMINISTRATIVO DE SINCRONIZACIÓN Y RESOLUCIÓN FINAL (CORREGIDO)
-- Archivo: scratch/sync_6_activos_y_transferencia.sql
-- Ejecutar en: Supabase SQL Editor (Rol postgres)
-- Proyecto: Sistema_Mantenimiento
-- Objetivo:
--   1. Crear en public.equipo los 6 activos faltantes con sus códigos oficiales y ubicaciones técnicas.
--   2. Resolver y transferir los 7 registros pendientes que esperaban estos activos hacia public.bitacora_mantenimiento.
--   3. Asignar created_by = '796275b6-d01d-4cef-b519-d99c8464e453'::uuid en todas las inserciones.
--   4. Actualizar public.bitacora_importacion_pendiente (estado = 'Resuelto', equipo_id_resuelto, resolved_at).
--   5. Mantener los 6 registros pendientes con ambigüedad física o técnica en estado 'Pendiente'.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. CREACIÓN DE LOS 6 ACTIVOS EN public.equipo
-- --------------------------------------------------------------------

-- 1.1 Elevador Bodega Tradicional (AGL-BOD-ELEV-01)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-BOD-ELEV-01',
    'Elevador Bodega Tradicional',
    'Bodega Tradicional',
    'c41baed4-7e69-46ef-bb2c-9fad76ada0f1'::uuid, -- Bodega Tradicional
    'Media',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-BOD-ELEV-01' 
       OR LOWER(nombre) = 'elevador bodega tradicional'
);

-- 1.2 Bomba sumergible Galpón de Producción (AGL-JJV-PROD-BOM-SUM)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-JJV-PROD-BOM-SUM',
    'Bomba sumergible Galpón de Producción',
    'Producción / JJV',
    'af6a277e-c24b-4690-93e6-ead8f4434d35'::uuid, -- Galpón Producción
    'Media',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-JJV-PROD-BOM-SUM' 
       OR LOWER(nombre) IN ('bomba sumergible galpón de producción', 'bomba sumergible galpon de produccion')
);

-- 1.3 Portón de acceso a planta (AGL-SSGG-INF-POR-01)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-SSGG-INF-POR-01',
    'Portón de acceso a planta',
    'Servicios Generales',
    '1a8c1eb4-6291-4010-b413-b72873796d31'::uuid, -- Servicios Generales
    'Media',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-INF-POR-01' 
       OR LOWER(nombre) IN ('portón de acceso a planta', 'porton de acceso a planta')
);

-- 1.4 Sistema de iluminación Galpón Soplado (AGL-SSGG-ILU-SOP-01)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-SSGG-ILU-SOP-01',
    'Sistema de iluminación Galpón Soplado',
    'Servicios Generales',
    '47d20f6a-bf5b-4856-b21f-71c36d140b38'::uuid, -- Soplado / PET
    'Baja',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-ILU-SOP-01' 
       OR LOWER(nombre) IN ('sistema de iluminación galpón soplado', 'sistema de iluminacion galpon soplado')
);

-- 1.5 Traspaleta 1 (AGL-PLA-LOG-TRA-01)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    modelo,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-PLA-LOG-TRA-01',
    'Traspaleta 1',
    'Plásticos',
    '09dc193d-77b3-433c-973d-9b0008b32eaa'::uuid, -- Plásticos
    NULL,
    'Baja',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-PLA-LOG-TRA-01' 
       OR LOWER(nombre) = 'traspaleta 1'
);

-- 1.6 Traspaleta 2 (AGL-PLA-LOG-TRA-02)
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    modelo,
    criticidad,
    estado,
    activo
)
SELECT 
    'AGL-PLA-LOG-TRA-02',
    'Traspaleta 2',
    'Plásticos',
    '09dc193d-77b3-433c-973d-9b0008b32eaa'::uuid, -- Plásticos
    NULL,
    'Baja',
    'Operativo',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-PLA-LOG-TRA-02' 
       OR LOWER(nombre) = 'traspaleta 2'
);

-- --------------------------------------------------------------------
-- 2. RESOLUCIÓN Y TRANSFERENCIA DE LOS 7 REGISTROS PENDIENTES
-- --------------------------------------------------------------------

DO $$
DECLARE
    v_batch_id uuid := 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'::uuid;
    v_created_by uuid := '796275b6-d01d-4cef-b519-d99c8464e453'::uuid;
    v_id_elevador uuid;
    v_id_bomba_sum uuid;
    v_id_porton uuid;
    v_id_ilu_sop uuid;
BEGIN
    -- Obtener UUIDs reales recién insertados o existentes
    SELECT id INTO v_id_elevador FROM public.equipo WHERE codigo = 'AGL-BOD-ELEV-01' LIMIT 1;
    SELECT id INTO v_id_bomba_sum FROM public.equipo WHERE codigo = 'AGL-JJV-PROD-BOM-SUM' LIMIT 1;
    SELECT id INTO v_id_porton FROM public.equipo WHERE codigo = 'AGL-SSGG-INF-POR-01' LIMIT 1;
    SELECT id INTO v_id_ilu_sop FROM public.equipo WHERE codigo = 'AGL-SSGG-ILU-SOP-01' LIMIT 1;

    -- ================================================================
    -- 2.1 ELEVADOR BODEGA TRADICIONAL (1 registro)
    -- ================================================================
    -- Pendiente ID: 8304e2a9-848f-48fd-9d7a-fdebcb745cc4
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_elevador 
          AND fecha_hora = '2026-07-21T04:00:00+00:00'::timestamptz
          AND tecnico = 'Victor Muñoz'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-07-21T04:00:00+00:00'::timestamptz,
            v_id_elevador,
            'Victor Muñoz',
            true,
            'Correctiva',
            'El elevador de producción queda operativo',
            'El elevador de producción queda operativo',
            'Operativo',
            'Bodega Tradicional',
            'Mecánica',
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_elevador,
        motivo_pendiente = 'Resuelto a Elevador Bodega Tradicional (AGL-BOD-ELEV-01)',
        resolved_at = clock_timestamp()
    WHERE id = '8304e2a9-848f-48fd-9d7a-fdebcb745cc4'::uuid;

    -- ================================================================
    -- 2.2 BOMBA SUMERGIBLE GALPÓN PRODUCCIÓN (3 registros)
    -- ================================================================
    -- Reg A: c44912f6-451d-4f42-b766-2bac69c0b1f4 (2026-08-25, Leonel Carreño)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_bomba_sum 
          AND fecha_hora = '2026-08-25T04:00:00+00:00'::timestamptz
          AND tecnico = 'Leonel Carreño'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-08-25T04:00:00+00:00'::timestamptz,
            v_id_bomba_sum,
            'Leonel Carreño',
            true,
            'Correctiva',
            'Producción estaba con problemas en bomba sumergida que va hacia el desagüe, bomba queda funcionando',
            'Producción estaba con problemas en bomba sumergida que va hacia el desagüe, bomba queda funcionando',
            'Operativo',
            'Producción / JJV',
            'Hidráulica / Refrigeración',
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_bomba_sum,
        motivo_pendiente = 'Resuelto a Bomba sumergible Galpón de Producción (AGL-JJV-PROD-BOM-SUM)',
        resolved_at = clock_timestamp()
    WHERE id = 'c44912f6-451d-4f42-b766-2bac69c0b1f4'::uuid;

    -- Reg B: 2caf07cb-687e-4e82-9698-c9bb36231d09 (2026-08-28, Maximiliano Badilla)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_bomba_sum 
          AND fecha_hora = '2026-08-28T04:00:00+00:00'::timestamptz
          AND tecnico = 'Maximiliano Badilla'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-08-28T04:00:00+00:00'::timestamptz,
            v_id_bomba_sum,
            'Maximiliano Badilla',
            true,
            'Correctiva',
            'Se despata bomba sumergible de producción',
            'Se despata bomba sumergible de producción',
            'Operativo',
            'Producción / JJV',
            'Hidráulica / Refrigeración',
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_bomba_sum,
        motivo_pendiente = 'Resuelto a Bomba sumergible Galpón de Producción (AGL-JJV-PROD-BOM-SUM)',
        resolved_at = clock_timestamp()
    WHERE id = '2caf07cb-687e-4e82-9698-c9bb36231d09'::uuid;

    -- Reg C: 2e3f74a2-d7fe-4568-82e8-efdb02c5d3a3 (2026-09-14, Maximiliano Badilla)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_bomba_sum 
          AND fecha_hora = '2026-09-14T03:00:00+00:00'::timestamptz
          AND tecnico = 'Maximiliano Badilla'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-09-14T03:00:00+00:00'::timestamptz,
            v_id_bomba_sum,
            'Maximiliano Badilla',
            true,
            'Correctiva',
            'Se destapa noma sumergible producción',
            'Se destapa noma sumergible producción',
            'Operativo',
            'Producción / JJV',
            'Hidráulica / Refrigeración',
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_bomba_sum,
        motivo_pendiente = 'Resuelto a Bomba sumergible Galpón de Producción (AGL-JJV-PROD-BOM-SUM)',
        resolved_at = clock_timestamp()
    WHERE id = '2e3f74a2-d7fe-4568-82e8-efdb02c5d3a3'::uuid;

    -- ================================================================
    -- 2.3 PORTÓN DE ACCESO A PLANTA (2 registros)
    -- ================================================================
    -- Reg A: 4e99e0a4-eef0-4fae-b7d3-74d7f497dbb9 (2026-09-22, Leonel Carreño)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_porton 
          AND fecha_hora = '2026-09-22T03:00:00+00:00'::timestamptz
          AND tecnico = 'Leonel Carreño'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-09-22T03:00:00+00:00'::timestamptz,
            v_id_porton,
            'Leonel Carreño',
            false,
            'Preventiva',
            NULL,
            'Portón principal se coloca perno que faltaba a riel, se engrasan piñones y rieles',
            'Operativo',
            'Servicios Generales',
            NULL,
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_porton,
        motivo_pendiente = 'Resuelto a Portón de acceso a planta (AGL-SSGG-INF-POR-01)',
        resolved_at = clock_timestamp()
    WHERE id = '4e99e0a4-eef0-4fae-b7d3-74d7f497dbb9'::uuid;

    -- Reg B: 2887eee9-5102-4ed2-9d3d-fa47082b488c (2026-09-23, Victor Muñoz)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_porton 
          AND fecha_hora = '2026-09-23T03:00:00+00:00'::timestamptz
          AND tecnico = 'Victor Muñoz'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-09-23T03:00:00+00:00'::timestamptz,
            v_id_porton,
            'Victor Muñoz',
            false,
            'Inspección',
            NULL,
            'Se revisa porton de acceso, por solicitud de guardias, Julián dejo una nota en el libro que portón quedó peor que antes con la mantención, Yo lo revise y portón quedó con un recorrido suave ayer estaba forzado, lo he estado observando y funciona bien, solo se observa desgaste en riel y a veces topa el portacandados',
            'Operativo',
            'Servicios Generales',
            NULL,
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_porton,
        motivo_pendiente = 'Resuelto a Portón de acceso a planta (AGL-SSGG-INF-POR-01)',
        resolved_at = clock_timestamp()
    WHERE id = '2887eee9-5102-4ed2-9d3d-fa47082b488c'::uuid;

    -- ================================================================
    -- 2.4 SISTEMA DE ILUMINACIÓN GALPÓN SOPLADO (1 registro)
    -- ================================================================
    -- Reg: 9574487d-d753-4cb7-90f1-36ec384ddd36 (2026-09-23, Maximiliano Badilla)
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_ilu_sop 
          AND fecha_hora = '2026-09-23T03:00:00+00:00'::timestamptz
          AND tecnico = 'Maximiliano Badilla'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        ) VALUES (
            '2026-09-23T03:00:00+00:00'::timestamptz,
            v_id_ilu_sop,
            'Maximiliano Badilla',
            false,
            'Mejora',
            NULL,
            'Se instalan focos en PET',
            'Operativo',
            'Servicios Generales',
            NULL,
            'Excel',
            v_batch_id,
            v_created_by
        );
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_ilu_sop,
        motivo_pendiente = 'Resuelto a Sistema de iluminación Galpón Soplado (AGL-SSGG-ILU-SOP-01)',
        resolved_at = clock_timestamp()
    WHERE id = '9574487d-d753-4cb7-90f1-36ec384ddd36'::uuid;

END $$;

COMMIT;

-- --------------------------------------------------------------------
-- 3. AUDITORÍA FINAL DE VERIFICACIÓN POST-EJECUCIÓN
-- --------------------------------------------------------------------

-- 3.1 Comprobación de los 6 activos en public.equipo
SELECT 
    codigo,
    nombre,
    id,
    ubicacion_tecnica_id,
    area,
    activo
FROM public.equipo
WHERE codigo IN (
    'AGL-BOD-ELEV-01',
    'AGL-JJV-PROD-BOM-SUM',
    'AGL-SSGG-INF-POR-01',
    'AGL-SSGG-ILU-SOP-01',
    'AGL-PLA-LOG-TRA-01',
    'AGL-PLA-LOG-TRA-02'
)
ORDER BY codigo;

-- 3.2 Total general en public.equipo (debe ser 100)
SELECT COUNT(*) AS total_equipos_en_supabase FROM public.equipo;

-- 3.3 Distribución por estado en bitacora_importacion_pendiente (debe ser Resuelto: 20, Ignorado: 7, Pendiente: 6)
SELECT 
    estado,
    COUNT(*) AS cantidad
FROM public.bitacora_importacion_pendiente
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'
GROUP BY estado
ORDER BY estado;

-- 3.4 Comprobación de las 20 transferencias en public.bitacora_mantenimiento
SELECT 
    COUNT(*) AS total_transferidos_en_bitacora
FROM public.bitacora_mantenimiento
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd';
