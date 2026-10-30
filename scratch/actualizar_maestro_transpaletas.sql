-- ====================================================================
-- SCRIPT ADMINISTRATIVO: MAESTRO OFICIAL DE TRANSPALETAS Y CIERRE PET
-- Archivo: scratch/actualizar_maestro_transpaletas.sql
-- Ejecutar en: Supabase SQL Editor (Rol postgres)
-- Proyecto: Sistema_Mantenimiento
-- Objetivo:
--   1. Actualizar Traspaleta 1 (Verde) asignándola a Extrusión.
--   2. Actualizar Traspaleta 2 (Roja) asignándola a Inyección.
--   3. Crear Traspaleta 3 (Roja) asignándola a Soplado (PET).
--   4. Resolver el registro histórico de Transpaleta PET vinculándolo a Traspaleta 3 y transfiriéndolo a bitácora_mantenimiento.
--   5. Mantener en 'Pendiente' el registro genérico 'Transpaleta de plástico' por ambigüedad entre las 3 traspaletas.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. ACTUALIZACIÓN DE TRASPALETA 1 (VERDE -> EXTRUSIÓN)
-- --------------------------------------------------------------------
UPDATE public.equipo
SET ubicacion_tecnica_id = '17fb5e50-78fc-4eff-be8b-d6dd5540fabb'::uuid, -- Plásticos → Galpón Plásticos → Extrusión
    ubicacion = 'AGUACOL → Plásticos → Galpón Plásticos → Extrusión',
    area = 'Plásticos',
    especificaciones_tecnicas = jsonb_build_object('color', 'Verde'),
    observaciones_tecnicas = 'Traspaleta manual de movimiento de pallets en Extrusión. Color: Verde.'
WHERE codigo = 'AGL-PLA-LOG-TRA-01';

-- --------------------------------------------------------------------
-- 2. ACTUALIZACIÓN DE TRASPALETA 2 (ROJA -> INYECCIÓN)
-- --------------------------------------------------------------------
UPDATE public.equipo
SET ubicacion_tecnica_id = '04c0907a-0e7f-4ec9-ae90-6bb08be2acaa'::uuid, -- Plásticos → Galpón Plásticos → Inyección
    ubicacion = 'AGUACOL → Plásticos → Galpón Plásticos → Inyección',
    area = 'Plásticos',
    especificaciones_tecnicas = jsonb_build_object('color', 'Roja'),
    observaciones_tecnicas = 'Traspaleta manual de movimiento de pallets en Inyección. Color: Roja.'
WHERE codigo = 'AGL-PLA-LOG-TRA-02';

-- --------------------------------------------------------------------
-- 3. CREACIÓN DE TRASPALETA 3 (ROJA -> SOPLADO / PET)
-- --------------------------------------------------------------------
INSERT INTO public.equipo (
    codigo,
    nombre,
    area,
    ubicacion_tecnica_id,
    ubicacion,
    especificaciones_tecnicas,
    observaciones_tecnicas,
    criticidad,
    estado,
    activo,
    modelo,
    fabricante,
    numero_serie
)
SELECT 
    'AGL-SOP-LOG-TRA-03',
    'Traspaleta 3',
    'Soplado',
    '47d20f6a-bf5b-4856-b21f-71c36d140b38'::uuid, -- Soplado (Ex PET)
    'AGUACOL → Soplado',
    jsonb_build_object('color', 'Roja'),
    'Traspaleta manual de movimiento de pallets en Soplado (PET). Color: Roja.',
    'Baja',
    'Operativo',
    true,
    NULL,
    NULL,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.equipo 
    WHERE codigo = 'AGL-SOP-LOG-TRA-03' 
       OR LOWER(nombre) = 'traspaleta 3'
);

-- --------------------------------------------------------------------
-- 4. RESOLUCIÓN DE REGISTRO HISTÓRICO TRANSPALETA PET Y ACTUALIZACIÓN PLÁSTICO
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_batch_id uuid := 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'::uuid;
    v_created_by uuid := '796275b6-d01d-4cef-b519-d99c8464e453'::uuid;
    v_id_traspaleta_3 uuid;
BEGIN
    SELECT id INTO v_id_traspaleta_3 FROM public.equipo WHERE codigo = 'AGL-SOP-LOG-TRA-03' LIMIT 1;

    -- 4.1 Resolver Transpaleta PET (Registro: 12-08-2026 / 11-08-2026 - Victor Muñoz)
    -- ID: c6e860fd-8418-4209-8309-5c09f78617cb
    IF NOT EXISTS (
        SELECT 1 FROM public.bitacora_mantenimiento
        WHERE equipo_id = v_id_traspaleta_3 
          AND tecnico = 'Victor Muñoz'
          AND trabajo_realizado ILIKE '%Transpaleta pet con problemas en cable%'
    ) THEN
        INSERT INTO public.bitacora_mantenimiento (
            fecha_hora, equipo_id, tecnico, es_falla, tipo_intervencion,
            falla_motivo, trabajo_realizado, estado_final, area, tipo_falla,
            origen, import_batch_id, created_by
        )
        SELECT 
            fecha_hora,
            v_id_traspaleta_3,
            'Victor Muñoz',
            true,
            'Correctiva',
            trabajo_realizado,
            trabajo_realizado,
            'Operativo',
            'Soplado',
            'Eléctrica / Control',
            'Excel',
            v_batch_id,
            v_created_by
        FROM public.bitacora_importacion_pendiente
        WHERE id = 'c6e860fd-8418-4209-8309-5c09f78617cb'::uuid;
    END IF;

    UPDATE public.bitacora_importacion_pendiente
    SET estado = 'Resuelto',
        equipo_id_resuelto = v_id_traspaleta_3,
        motivo_pendiente = 'Resuelto a Traspaleta 3 (AGL-SOP-LOG-TRA-03)',
        resolved_at = clock_timestamp()
    WHERE id = 'c6e860fd-8418-4209-8309-5c09f78617cb'::uuid;

    -- 4.2 Mantener pendiente Transpaleta de plástico por ambigüedad
    -- ID: c9c0a3aa-fa3d-4af0-94c9-0fd5cc4ddc91
    UPDATE public.bitacora_importacion_pendiente
    SET motivo_pendiente = 'Ambigüedad física: no se identifica si corresponde a Traspaleta 1, 2 o 3.'
    WHERE id = 'c9c0a3aa-fa3d-4af0-94c9-0fd5cc4ddc91'::uuid;

END $$;

COMMIT;

-- --------------------------------------------------------------------
-- 5. AUDITORÍA FINAL DE VERIFICACIÓN POST-EJECUCIÓN
-- --------------------------------------------------------------------

-- 5.1 Comprobación de las tres traspaletas en public.equipo
SELECT 
    codigo,
    nombre,
    id,
    ubicacion_tecnica_id,
    area,
    especificaciones_tecnicas->>'color' AS color,
    activo
FROM public.equipo
WHERE codigo IN (
    'AGL-PLA-LOG-TRA-01',
    'AGL-PLA-LOG-TRA-02',
    'AGL-SOP-LOG-TRA-03'
)
ORDER BY codigo;

-- 5.2 Total general en public.equipo (debe ser 101)
SELECT COUNT(*) AS total_equipos_en_supabase FROM public.equipo;

-- 5.3 Distribución por estado en bitacora_importacion_pendiente (Resuelto: 21, Ignorado: 7, Pendiente: 5)
SELECT 
    estado,
    COUNT(*) AS cantidad
FROM public.bitacora_importacion_pendiente
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd'
GROUP BY estado
ORDER BY estado;

-- 5.4 Comprobación de las 21 transferencias en public.bitacora_mantenimiento
SELECT 
    COUNT(*) AS total_transferidos_en_bitacora
FROM public.bitacora_mantenimiento
WHERE import_batch_id = 'bf7c6de9-96a4-43bd-85ec-a2248367c5bd';
