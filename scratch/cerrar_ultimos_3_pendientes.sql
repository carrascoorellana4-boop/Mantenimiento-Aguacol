-- ====================================================================
-- SCRIPT ADMINISTRATIVO: CIERRE OFICIAL DE LOS ÚLTIMOS 3 PENDIENTES
-- Archivo: scratch/cerrar_ultimos_3_pendientes.sql
-- Ejecutar en: Supabase SQL Editor (Rol postgres)
-- Proyecto: Sistema_Mantenimiento
-- Objetivo:
--   1. Crear activo 'Sistema de iluminación Cocina' (Servicios Generales).
--   2. Crear activo 'Tablero eléctrico Cocina' (Servicios Generales).
--   3. Transferir las 3 intervenciones oficiales a bitacora_mantenimiento:
--      - Iluminación Cocina (Victor Muñoz) -> Sistema de iluminación Cocina
--      - Potenciómetro VDF N°4 (Willi Orellana) -> Tablero eléctrico Cocina
--      - Guía cinta etiquetadora (Maximiliano Badilla) -> Etiquetadora M4-M5
--   4. Actualizar los 3 registros en bitacora_importacion_pendiente a 'Resuelto'.
--   5. Dejar la pestaña Pendientes de Validación exactamente en CERO (0).
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. CREAR ACTIVOS DE SERVICIOS GENERALES EN COCINA (SI NO EXISTEN)
-- --------------------------------------------------------------------

-- 1.1 Sistema de iluminación Cocina
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    ubicacion,
    criticidad,
    estado,
    activo,
    observaciones_tecnicas
)
SELECT 
    'AGL-SSGG-ILU-COC-01',
    'Sistema de iluminación Cocina',
    'Servicios Generales',
    '6f85dd1e-dc22-4b2f-bc77-f9aa4b00f079'::uuid, -- Cocina (AGL-JJV-COC)
    'AGUACOL → Producción / JJV → Cocina',
    'Baja',
    'Operativo',
    true,
    'Sistema integral de iluminación de Cocina con referencia física en Producción / JJV → Cocina'
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-ILU-COC-01' 
       OR LOWER(nombre) = 'sistema de iluminación cocina'
       OR LOWER(nombre) = 'sistema de iluminacion cocina'
);

-- 1.2 Tablero eléctrico Cocina
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    ubicacion,
    criticidad,
    estado,
    activo,
    observaciones_tecnicas
)
SELECT 
    'AGL-SSGG-TAB-COC-01',
    'Tablero eléctrico Cocina',
    'Servicios Generales',
    '6f85dd1e-dc22-4b2f-bc77-f9aa4b00f079'::uuid, -- Cocina (AGL-JJV-COC)
    'AGUACOL → Producción / JJV → Cocina',
    'Media',
    'Operativo',
    true,
    'Tablero eléctrico de distribución y control de Cocina con referencia física en Producción / JJV → Cocina'
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-TAB-COC-01' 
       OR LOWER(nombre) = 'tablero eléctrico cocina'
       OR LOWER(nombre) = 'tablero electrico cocina'
);

-- --------------------------------------------------------------------
-- 2. RESOLVER Y TRANSFERIR LAS 3 INTERVENCIONES
-- --------------------------------------------------------------------

DO $$
DECLARE
    v_batch_id uuid := 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'::uuid;
    v_created_by uuid := '796275b6-d01d-4cef-b519-d99c8464e453'::uuid;
    
    v_id_ilu_cocina uuid;
    v_id_tab_cocina uuid;
    v_id_etiquetadora uuid;
BEGIN
    -- Obtener UUIDs reales
    SELECT id INTO v_id_ilu_cocina 
    FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-ILU-COC-01' OR LOWER(nombre) LIKE '%iluminaci%cocina%' 
    LIMIT 1;

    SELECT id INTO v_id_tab_cocina 
    FROM public.equipo 
    WHERE codigo = 'AGL-SSGG-TAB-COC-01' OR LOWER(nombre) LIKE '%tablero%cocina%' 
    LIMIT 1;

    SELECT id INTO v_id_etiquetadora 
    FROM public.equipo 
    WHERE codigo = 'AGL-PLA-GPL-EXT-M45-ETQ' OR LOWER(nombre) = 'etiquetadora m4-m5' 
    LIMIT 1;

    IF v_id_ilu_cocina IS NULL OR v_id_tab_cocina IS NULL OR v_id_etiquetadora IS NULL THEN
        RAISE EXCEPTION 'No se pudieron recuperar los UUIDs de los 3 activos requeridos';
    END IF;

    -- ================================================================
    -- 2.1 ILUMINACIÓN COCINA (Victor Muñoz - 17-08-2026)
    -- ID pendiente: 67c394a2-5577-4bea-ab8f-dc488098a99f
    -- ================================================================
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_ilu_cocina
          AND tecnico = 'Victor Muñoz'
          AND trabajo_realizado ILIKE '%repara iluminación de la cocina%'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        )
        SELECT 
            fecha_hora,
            v_id_ilu_cocina,
            'Victor Muñoz',
            true,
            'Correctiva',
            trabajo_realizado,
            'Eléctrica / Control',
            trabajo_realizado,
            'Operativo',
            'Servicios Generales',
            'Excel',
            v_batch_id,
            v_created_by
        FROM public.bitacora_importacion_pendiente
        WHERE id = '67c394a2-5577-4bea-ab8f-dc488098a99f'::uuid;
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_ilu_cocina,
        motivo_pendiente = 'Resuelto a Sistema de iluminación Cocina (Servicios Generales)',
        resolved_at = clock_timestamp()
    WHERE id = '67c394a2-5577-4bea-ab8f-dc488098a99f'::uuid;

    -- ================================================================
    -- 2.2 TABLERO ELÉCTRICO COCINA / POTENCIÓMETRO (Willi Orellana - 18-08-2026)
    -- ID pendiente: 990d5ade-def6-4a37-8d81-052364ac78ae
    -- ================================================================
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_tab_cocina
          AND tecnico = 'Willi Orellana'
          AND trabajo_realizado ILIKE '%potenciometro para controlar velocidad de VDF%'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        )
        SELECT 
            fecha_hora,
            v_id_tab_cocina,
            'Willi Orellana',
            false,
            'Mejora',
            NULL,
            NULL,
            trabajo_realizado,
            'Operativo',
            'Servicios Generales',
            'Excel',
            v_batch_id,
            v_created_by
        FROM public.bitacora_importacion_pendiente
        WHERE id = '990d5ade-def6-4a37-8d81-052364ac78ae'::uuid;
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_tab_cocina,
        motivo_pendiente = 'Resuelto a Tablero eléctrico Cocina (Servicios Generales)',
        resolved_at = clock_timestamp()
    WHERE id = '990d5ade-def6-4a37-8d81-052364ac78ae'::uuid;

    -- ================================================================
    -- 2.3 ETIQUETADORA M4-M5 (Maximiliano Badilla - 05-10-2026)
    -- ID pendiente: 00fbdbeb-3e21-41dd-b0cb-9ea4145cd07b
    -- ================================================================
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_etiquetadora
          AND tecnico = 'Maximiliano Badilla'
          AND trabajo_realizado ILIKE '%instala guía a cinta de etiquetadora%'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, tipo_falla, trabajo_realizado, estado_final,
            area, origen, import_batch_id, created_by
        )
        SELECT 
            fecha_hora,
            v_id_etiquetadora,
            'Maximiliano Badilla',
            false,
            'Correctiva',
            NULL,
            NULL,
            trabajo_realizado,
            'Operativo',
            'Plásticos',
            'Excel',
            v_batch_id,
            v_created_by
        FROM public.bitacora_importacion_pendiente
        WHERE id = '00fbdbeb-3e21-41dd-b0cb-9ea4145cd07b'::uuid;
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_etiquetadora,
        motivo_pendiente = 'Resuelto a Etiquetadora M4-M5 (Plásticos)',
        resolved_at = clock_timestamp()
    WHERE id = '00fbdbeb-3e21-41dd-b0cb-9ea4145cd07b'::uuid;

END $$;

COMMIT;

-- --------------------------------------------------------------------
-- 3. AUDITORÍA FINAL POST-EJECUCIÓN
-- --------------------------------------------------------------------

-- 3.1 Confirmar los UUIDs de los activos utilizados
SELECT codigo, nombre, id, area, ubicacion_tecnica_id, activo
FROM public.equipo
WHERE codigo IN ('AGL-SSGG-ILU-COC-01', 'AGL-SSGG-TAB-COC-01', 'AGL-PLA-GPL-EXT-M45-ETQ')
ORDER BY codigo;

-- 3.2 Total general de activos en public.equipo (debe ser 103)
SELECT COUNT(*) AS total_equipos_en_supabase FROM public.equipo;

-- 3.3 Verificar las 3 intervenciones insertadas en public.bitacora_mantenimiento
SELECT 
    bm.id,
    bm.fecha_hora,
    eq.codigo AS codigo_equipo,
    eq.nombre AS nombre_equipo,
    bm.tecnico,
    bm.tipo_intervencion,
    bm.es_falla,
    bm.tipo_falla,
    bm.trabajo_realizado,
    bm.created_by
FROM public.bitacora_mantenimiento bm
JOIN public.equipo eq ON eq.id = bm.equipo_id
WHERE bm.id IN (
    SELECT bm2.id FROM public.bitacora_mantenimiento bm2
    WHERE bm2.import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'
      AND bm2.equipo_id IN (
          SELECT id FROM public.equipo 
          WHERE codigo IN ('AGL-SSGG-ILU-COC-01', 'AGL-SSGG-TAB-COC-01', 'AGL-PLA-GPL-EXT-M45-ETQ')
      )
)
ORDER BY bm.fecha_hora;

-- 3.4 Distribución final en public.bitacora_importacion_pendiente (Resuelto: 26, Ignorado: 7, Pendiente: 0)
SELECT 
    estado,
    COUNT(*) AS cantidad
FROM public.bitacora_importacion_pendiente
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'
GROUP BY estado
ORDER BY estado;
