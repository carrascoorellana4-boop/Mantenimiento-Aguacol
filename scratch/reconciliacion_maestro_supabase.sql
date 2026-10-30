-- ====================================================================
-- SCRIPT OFICIAL DE RECONCILIACIÓN DEL MAESTRO DE SUPABASE
-- Archivo: scratch/reconciliacion_maestro_supabase.sql
-- Base de datos: PostgreSQL / Supabase
-- Proyecto: Sistema_Mantenimiento
-- Objetivo: Reconciliación controlada contra el maestro REAL de 94 activos.
--           Reutilizar activos existentes, no duplicar chillers/bombas/estanques,
--           crear únicamente los 6 activos estrictamente nuevos,
--           registrar alias históricos y verificar vista_resolucion_equipo.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. CONTROL DE AUDITORÍA PREVIO
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_total_inicial int;
BEGIN
    SELECT COUNT(*) INTO v_total_inicial FROM public.equipo;
    RAISE NOTICE '=== AUDITORÍA PREVIA ===';
    RAISE NOTICE 'Total de equipos existentes en public.equipo antes de iniciar: %', v_total_inicial;
END $$;

-- --------------------------------------------------------------------
-- 1. UBICACIÓN TÉCNICA: BODEGA TRADICIONAL
--    Regla: Usar columnas REALES (ubicacion_padre_id, estado).
--           NO usar parent_id ni activo.
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_aguacol_id uuid;
    v_bodega_id uuid;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ubicacion_tecnica'
    ) THEN
        -- Buscar nodo padre AGUACOL
        SELECT id INTO v_aguacol_id 
        FROM public.ubicacion_tecnica 
        WHERE LOWER(nombre) = 'aguacol' 
        LIMIT 1;

        IF v_aguacol_id IS NULL THEN
            SELECT id INTO v_aguacol_id 
            FROM public.ubicacion_tecnica 
            WHERE ubicacion_padre_id IS NULL 
            LIMIT 1;
        END IF;

        -- Buscar o crear 'Bodega Tradicional'
        SELECT id INTO v_bodega_id 
        FROM public.ubicacion_tecnica 
        WHERE LOWER(nombre) = 'bodega tradicional';

        IF v_bodega_id IS NULL THEN
            INSERT INTO public.ubicacion_tecnica (nombre, ubicacion_padre_id, estado)
            VALUES ('Bodega Tradicional', v_aguacol_id, 'Activo')
            RETURNING id INTO v_bodega_id;
            RAISE NOTICE 'Ubicación técnica Bodega Tradicional creada exitosamente (ID: %, Padre: %)', v_bodega_id, v_aguacol_id;
        ELSE
            RAISE NOTICE 'Ubicación técnica Bodega Tradicional ya existe (ID: %)', v_bodega_id;
        END IF;
    ELSE
        RAISE NOTICE 'Tabla public.ubicacion_tecnica no existe; se continuará con asignación a nivel de equipo.';
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 2. REUTILIZACIÓN Y RENOMBRAMIENTO DE ACTIVOS EXISTENTES
--    (Conserva ID, código, relaciones y datos técnicos)
-- --------------------------------------------------------------------

-- 2.1 CHILLER PRINCIPAL
-- Código: AGL-PLA-REF-CH-02
-- Nombre anterior: Chiller de Refrigeración 2 -- ANGES (Placa ACK-50(F), S/N A22060127)
-- Nombre oficial: Chiller principal
UPDATE public.equipo
SET nombre = 'Chiller principal'
WHERE codigo = 'AGL-PLA-REF-CH-02';

-- 2.2 CHILLER SECUNDARIO
-- Código: AGL-PLA-REF-CH-01
-- Nombre anterior: Chiller de Refrigeración 1 -- ANGES (Placa ACK-25(D), S/N A21080132)
-- Nombre oficial: Chiller secundario
UPDATE public.equipo
SET nombre = 'Chiller secundario'
WHERE codigo = 'AGL-PLA-REF-CH-01';

-- 2.3 ESTANQUE DE REFRIGERACIÓN DE EXTRUSIÓN
-- Código: AGL-PLA-REF-EST-01
-- Nombre anterior: Estanque Acumulador de Agua
-- Nombre oficial: Estanque de refrigeración de Extrusión
UPDATE public.equipo
SET nombre = 'Estanque de refrigeración de Extrusión'
WHERE codigo = 'AGL-PLA-REF-EST-01';

-- 2.4 BOMBAS REFRIGERACIÓN M1 A M5
-- Reutilizar equipos existentes, conservar IDs y códigos originales
UPDATE public.equipo SET nombre = 'Bomba refrigeración M1' WHERE codigo = 'AGL-PLA-REF-BOM-M01';
UPDATE public.equipo SET nombre = 'Bomba refrigeración M2' WHERE codigo = 'AGL-PLA-REF-BOM-M02';
UPDATE public.equipo SET nombre = 'Bomba refrigeración M3' WHERE codigo = 'AGL-PLA-REF-BOM-M03';
UPDATE public.equipo SET nombre = 'Bomba refrigeración M4' WHERE codigo = 'AGL-PLA-REF-BOM-M04';
UPDATE public.equipo SET nombre = 'Bomba refrigeración M5' WHERE codigo = 'AGL-PLA-REF-BOM-M05';

-- 2.5 ESTANQUES DE PRODUCCIÓN (REUTILIZACIÓN DE AGL-JJV-DESM-TK)
-- Código: AGL-JJV-DESM-TK
-- Nombre anterior: Estanques de producción
-- Nombre oficial: Estanques acumuladores de producto líquido
-- Ubicación: Producción / JJV (se retira la relación con Desmineralizador)
DO $$
DECLARE
    v_prod_ubicacion_id uuid;
    v_has_ub_tec_col boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'equipo' AND column_name = 'ubicacion_tecnica_id'
    ) INTO v_has_ub_tec_col;

    IF v_has_ub_tec_col AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ubicacion_tecnica'
    ) THEN
        SELECT id INTO v_prod_ubicacion_id 
        FROM public.ubicacion_tecnica 
        WHERE LOWER(nombre) LIKE '%producci%' OR LOWER(nombre) LIKE '%jjv%'
        ORDER BY (CASE WHEN ubicacion_padre_id IS NOT NULL THEN 1 ELSE 2 END)
        LIMIT 1;

        UPDATE public.equipo
        SET nombre = 'Estanques acumuladores de producto líquido',
            area = 'Producción / JJV',
            ubicacion_tecnica_id = COALESCE(v_prod_ubicacion_id, ubicacion_tecnica_id)
        WHERE codigo = 'AGL-JJV-DESM-TK';
    ELSE
        UPDATE public.equipo
        SET nombre = 'Estanques acumuladores de producto líquido',
            area = 'Producción / JJV'
        WHERE codigo = 'AGL-JJV-DESM-TK';
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 3. ACTIVOS REALMENTE NUEVOS (CREAR SOLO SI NO EXISTEN)
--    Total a crear: exactamente 6 activos.
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_has_activo boolean;
    v_has_estado boolean;
    v_has_modelo boolean;
    v_has_ubicacion_tecnica_id boolean;
    v_bodega_id uuid;
    v_prod_id uuid;
    v_sg_id uuid;
    v_pla_id uuid;
BEGIN
    -- Comprobación dinámica de columnas existentes en public.equipo
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipo' AND column_name='activo') INTO v_has_activo;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipo' AND column_name='estado') INTO v_has_estado;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipo' AND column_name='modelo') INTO v_has_modelo;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipo' AND column_name='ubicacion_tecnica_id') INTO v_has_ubicacion_tecnica_id;

    -- Obtener IDs de ubicaciones técnicas si existen
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ubicacion_tecnica') THEN
        SELECT id INTO v_bodega_id FROM public.ubicacion_tecnica WHERE LOWER(nombre) = 'bodega tradicional' LIMIT 1;
        SELECT id INTO v_prod_id FROM public.ubicacion_tecnica WHERE LOWER(nombre) LIKE '%producci%' OR LOWER(nombre) LIKE '%jjv%' LIMIT 1;
        SELECT id INTO v_sg_id FROM public.ubicacion_tecnica WHERE LOWER(nombre) LIKE '%servicios%' OR LOWER(nombre) LIKE '%infraestructura%' LIMIT 1;
        SELECT id INTO v_pla_id FROM public.ubicacion_tecnica WHERE LOWER(nombre) LIKE '%pl[aá]stico%' LIMIT 1;
    END IF;

    -- 3.1 Bomba sumergible Galpón de Producción
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) IN ('bomba sumergible galpón de producción', 'bomba sumergible galpon de produccion')
           OR codigo = 'AGL-JJV-PROD-BOM-SUM'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-JJV-PROD-BOM-SUM', 'Bomba sumergible Galpón de Producción', 'Producción / JJV');
        
        IF v_has_ubicacion_tecnica_id AND v_prod_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_prod_id WHERE codigo = 'AGL-JJV-PROD-BOM-SUM';
        END IF;
        RAISE NOTICE 'Activo creado: Bomba sumergible Galpón de Producción (AGL-JJV-PROD-BOM-SUM)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Bomba sumergible Galpón de Producción';
    END IF;

    -- 3.2 Traspaleta 1
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) = 'traspaleta 1' OR codigo = 'AGL-PLA-LOG-TRA-01'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-PLA-LOG-TRA-01', 'Traspaleta 1', 'Plásticos');
        
        IF v_has_modelo THEN
            UPDATE public.equipo SET modelo = 'Pendiente de confirmar' WHERE codigo = 'AGL-PLA-LOG-TRA-01';
        END IF;
        IF v_has_ubicacion_tecnica_id AND v_pla_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_pla_id WHERE codigo = 'AGL-PLA-LOG-TRA-01';
        END IF;
        RAISE NOTICE 'Activo creado: Traspaleta 1 (AGL-PLA-LOG-TRA-01)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Traspaleta 1';
    END IF;

    -- 3.3 Traspaleta 2
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) = 'traspaleta 2' OR codigo = 'AGL-PLA-LOG-TRA-02'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-PLA-LOG-TRA-02', 'Traspaleta 2', 'Plásticos');
        
        IF v_has_modelo THEN
            UPDATE public.equipo SET modelo = 'Pendiente de confirmar' WHERE codigo = 'AGL-PLA-LOG-TRA-02';
        END IF;
        IF v_has_ubicacion_tecnica_id AND v_pla_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_pla_id WHERE codigo = 'AGL-PLA-LOG-TRA-02';
        END IF;
        RAISE NOTICE 'Activo creado: Traspaleta 2 (AGL-PLA-LOG-TRA-02)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Traspaleta 2';
    END IF;

    -- 3.4 Portón de acceso a planta
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) IN ('portón de acceso a planta', 'porton de acceso a planta')
           OR codigo = 'AGL-SSGG-INF-POR-01'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-SSGG-INF-POR-01', 'Portón de acceso a planta', 'Servicios Generales');
        
        IF v_has_ubicacion_tecnica_id AND v_sg_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_sg_id WHERE codigo = 'AGL-SSGG-INF-POR-01';
        END IF;
        RAISE NOTICE 'Activo creado: Portón de acceso a planta (AGL-SSGG-INF-POR-01)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Portón de acceso a planta';
    END IF;

    -- 3.5 Sistema de iluminación Galpón Soplado
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) IN ('sistema de iluminación galpón soplado', 'sistema de iluminacion galpon soplado')
           OR codigo = 'AGL-SSGG-ILU-SOP-01'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-SSGG-ILU-SOP-01', 'Sistema de iluminación Galpón Soplado', 'Servicios Generales');
        
        IF v_has_ubicacion_tecnica_id AND v_sg_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_sg_id WHERE codigo = 'AGL-SSGG-ILU-SOP-01';
        END IF;
        RAISE NOTICE 'Activo creado: Sistema de iluminación Galpón Soplado (AGL-SSGG-ILU-SOP-01)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Sistema de iluminación Galpón Soplado';
    END IF;

    -- 3.6 Elevador Bodega Tradicional
    IF NOT EXISTS (
        SELECT 1 FROM public.equipo 
        WHERE LOWER(nombre) = 'elevador bodega tradicional'
           OR codigo = 'AGL-BOD-ELEV-01'
    ) THEN
        INSERT INTO public.equipo (codigo, nombre, area)
        VALUES ('AGL-BOD-ELEV-01', 'Elevador Bodega Tradicional', 'Bodega Tradicional');
        
        IF v_has_ubicacion_tecnica_id AND v_bodega_id IS NOT NULL THEN
            UPDATE public.equipo SET ubicacion_tecnica_id = v_bodega_id WHERE codigo = 'AGL-BOD-ELEV-01';
        END IF;
        RAISE NOTICE 'Activo creado: Elevador Bodega Tradicional (AGL-BOD-ELEV-01)';
    ELSE
        RAISE NOTICE 'Activo ya existía: Elevador Bodega Tradicional';
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 4. ALIAS HISTÓRICOS EN public.equipo_alias
--    Regla: NO recrear tabla ni políticas. Usar tabla existente.
--           NO insertar 'Inyectora de tapas' porque ya existe.
-- --------------------------------------------------------------------

-- 4.1 Alias Chiller principal
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Chiller de Refrigeración 2 -- ANGES'
FROM public.equipo
WHERE codigo = 'AGL-PLA-REF-CH-02'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'chiller de refrigeración 2 -- anges'
  );

-- 4.2 Alias Chiller secundario
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Chiller de Refrigeración 1 -- ANGES'
FROM public.equipo
WHERE codigo = 'AGL-PLA-REF-CH-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'chiller de refrigeración 1 -- anges'
  );

-- 4.3 Alias Estanque de refrigeración de Extrusión
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Estanque Acumulador de Agua'
FROM public.equipo
WHERE codigo = 'AGL-PLA-REF-EST-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'estanque acumulador de agua'
  );

-- 4.4 Alias Bombas de Refrigeración M1 a M5
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Bomba de Refrigeración M1' FROM public.equipo WHERE codigo = 'AGL-PLA-REF-BOM-M01'
AND NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'bomba de refrigeración m1');

INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Bomba de Refrigeración M2' FROM public.equipo WHERE codigo = 'AGL-PLA-REF-BOM-M02'
AND NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'bomba de refrigeración m2');

INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Bomba de Refrigeración M3' FROM public.equipo WHERE codigo = 'AGL-PLA-REF-BOM-M03'
AND NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'bomba de refrigeración m3');

INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Bomba de Refrigeración M4' FROM public.equipo WHERE codigo = 'AGL-PLA-REF-BOM-M04'
AND NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'bomba de refrigeración m4');

INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Bomba de Refrigeración M5' FROM public.equipo WHERE codigo = 'AGL-PLA-REF-BOM-M05'
AND NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'bomba de refrigeración m5');

-- 4.5 Alias Estanques acumuladores de producto líquido
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Estanques de producción'
FROM public.equipo
WHERE codigo = 'AGL-JJV-DESM-TK'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'estanques de producción'
  );

-- 4.6 Alias para Elevador Bodega Tradicional
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Elevador Bodega'
FROM public.equipo
WHERE codigo = 'AGL-BOD-ELEV-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'elevador bodega'
  );

-- 4.7 Alias para Portón de acceso a planta
INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Portón planta'
FROM public.equipo
WHERE codigo = 'AGL-SSGG-INF-POR-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'portón planta'
  );

INSERT INTO public.equipo_alias (equipo_id, alias)
SELECT id, 'Porton planta'
FROM public.equipo
WHERE codigo = 'AGL-SSGG-INF-POR-01'
  AND NOT EXISTS (
      SELECT 1 FROM public.equipo_alias 
      WHERE equipo_id = public.equipo.id AND LOWER(alias) = 'porton planta'
  );

COMMIT;

-- ====================================================================
-- 5. CONSULTAS OBLIGATORIAS DE VERIFICACIÓN (REQUERIMIENTO 15)
-- ====================================================================

-- 5.1 Conteo total de activos en public.equipo (Esperado: 94 iniciales + 6 nuevos = 100)
SELECT 
    COUNT(*) AS total_actual_equipos,
    COUNT(*) - 94 AS nuevos_incorporados
FROM public.equipo;

-- 5.2 Verificación de los 8 activos reutilizados / renombrados
SELECT 
    codigo, 
    nombre AS nombre_oficial_actualizado, 
    area, 
    id AS equipo_uuid
FROM public.equipo
WHERE codigo IN (
    'AGL-PLA-REF-CH-02',
    'AGL-PLA-REF-CH-01',
    'AGL-PLA-REF-EST-01',
    'AGL-PLA-REF-BOM-M01',
    'AGL-PLA-REF-BOM-M02',
    'AGL-PLA-REF-BOM-M03',
    'AGL-PLA-REF-BOM-M04',
    'AGL-PLA-REF-BOM-M05',
    'AGL-JJV-DESM-TK'
)
ORDER BY codigo;

-- 5.3 Verificación de los 6 activos estrictamente nuevos creados
SELECT 
    codigo, 
    nombre, 
    area, 
    id AS equipo_uuid
FROM public.equipo
WHERE codigo IN (
    'AGL-JJV-PROD-BOM-SUM',
    'AGL-PLA-LOG-TRA-01',
    'AGL-PLA-LOG-TRA-02',
    'AGL-SSGG-INF-POR-01',
    'AGL-SSGG-ILU-SOP-01',
    'AGL-BOD-ELEV-01'
)
ORDER BY codigo;

-- 5.4 Verificación de alias añadidos en public.equipo_alias
SELECT 
    ea.id AS alias_id,
    e.codigo,
    e.nombre AS nombre_oficial,
    ea.alias
FROM public.equipo_alias ea
JOIN public.equipo e ON e.id = ea.equipo_id
WHERE ea.alias IN (
    'Chiller de Refrigeración 2 -- ANGES',
    'Chiller de Refrigeración 1 -- ANGES',
    'Estanque Acumulador de Agua',
    'Bomba de Refrigeración M1',
    'Bomba de Refrigeración M2',
    'Bomba de Refrigeración M3',
    'Bomba de Refrigeración M4',
    'Bomba de Refrigeración M5',
    'Estanques de producción',
    'Elevador Bodega',
    'Portón planta',
    'Porton planta'
)
ORDER BY e.codigo, ea.alias;

-- 5.5 Comprobación en public.vista_resolucion_equipo
--     (Debe resolver automáticamente sin modificar la vista)
SELECT 
    nombre_busqueda,
    nombre_oficial,
    codigo,
    equipo_id
FROM public.vista_resolucion_equipo
WHERE nombre_busqueda IN (
    'chiller principal',
    'chiller secundario',
    'estanque de refrigeración de extrusión',
    'chiller de refrigeración 2 -- anges',
    'chiller de refrigeración 1 -- anges',
    'estanque acumulador de agua',
    'estanques acumuladores de producto líquido',
    'estanques de producción',
    'inyectora de tapas',
    'elevador bodega',
    'elevador bodega tradicional',
    'porton planta',
    'portón de acceso a planta',
    'traspaleta 1',
    'traspaleta 2',
    'bomba sumergible galpón de producción'
)
ORDER BY nombre_oficial, nombre_busqueda;
