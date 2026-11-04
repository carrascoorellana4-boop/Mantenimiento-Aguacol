-- ====================================================================
-- MÓDULO MANTENIMIENTO PREVENTIVO - EXTRUSORAS M1 A M5 (AGUACOL)
-- Archivo: deploy/sql/30_mantenimiento_preventivo.sql
-- Ejecutar en: PostgreSQL de producción (como mant_owner o postgres)
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. TABLA: public.plan_preventivo_tarea
--    Catálogo de tareas preventivas oficiales por activo
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_preventivo_tarea (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id uuid REFERENCES public.equipo(id) ON DELETE CASCADE,
    codigo_equipo text NOT NULL,
    nombre_equipo text NOT NULL,
    orden integer NOT NULL DEFAULT 1,
    id_tarea_fuente text,
    sistema text,
    tarea text NOT NULL,
    frecuencia text NOT NULL,
    responsable text NOT NULL,
    condicion_trabajo text,
    criterio_registro text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT uq_plan_prev_equipo_tarea UNIQUE (codigo_equipo, tarea, frecuencia)
);

CREATE INDEX IF NOT EXISTS idx_plan_prev_tarea_equipo ON public.plan_preventivo_tarea(equipo_id, activo);
CREATE INDEX IF NOT EXISTS idx_plan_prev_tarea_codigo ON public.plan_preventivo_tarea(codigo_equipo);

-- --------------------------------------------------------------------
-- 2. TABLA: public.plan_preventivo_ejecucion
--    Registro de cada ejecución de tarea preventiva
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_preventivo_ejecucion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id uuid REFERENCES public.plan_preventivo_tarea(id) ON DELETE SET NULL,
    equipo_id uuid REFERENCES public.equipo(id) ON DELETE CASCADE,
    codigo_equipo text NOT NULL,
    nombre_equipo text NOT NULL,
    tarea text NOT NULL,
    frecuencia text NOT NULL,
    responsable_plan text NOT NULL,
    estado text NOT NULL DEFAULT 'Realizada' CHECK (estado IN ('Pendiente', 'Realizada')),
    ejecutado_por text NOT NULL,
    usuario_id uuid DEFAULT public.app_uid(),
    fecha_ejecucion timestamptz DEFAULT now() NOT NULL,
    observaciones text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_prev_ejec_equipo ON public.plan_preventivo_ejecucion(equipo_id, fecha_ejecucion DESC);
CREATE INDEX IF NOT EXISTS idx_plan_prev_ejec_tarea ON public.plan_preventivo_ejecucion(tarea_id);

-- --------------------------------------------------------------------
-- 3. TABLA: public.plan_preventivo_evidencia
--    Evidencias fotográficas y en video asociadas a una ejecución
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_preventivo_evidencia (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ejecucion_id uuid NOT NULL REFERENCES public.plan_preventivo_ejecucion(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('Foto', 'Video')),
    archivo_path text NOT NULL,
    nombre_archivo text,
    mime_type text NOT NULL,
    tamano bigint NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_prev_evid_ejec ON public.plan_preventivo_evidencia(ejecucion_id);

-- --------------------------------------------------------------------
-- 4. PERMISOS Y RLS
-- --------------------------------------------------------------------
ALTER TABLE public.plan_preventivo_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_preventivo_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_preventivo_evidencia ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas
DROP POLICY IF EXISTS prev_tarea_select ON public.plan_preventivo_tarea;
DROP POLICY IF EXISTS prev_tarea_admin ON public.plan_preventivo_tarea;
DROP POLICY IF EXISTS prev_ejec_select ON public.plan_preventivo_ejecucion;
DROP POLICY IF EXISTS prev_ejec_admin ON public.plan_preventivo_ejecucion;
DROP POLICY IF EXISTS prev_evid_select ON public.plan_preventivo_evidencia;
DROP POLICY IF EXISTS prev_evid_admin ON public.plan_preventivo_evidencia;

-- Lectura para mant_admin y mant_authenticated
CREATE POLICY prev_tarea_select ON public.plan_preventivo_tarea FOR SELECT TO mant_admin, mant_authenticated, mant_anon USING (true);
CREATE POLICY prev_ejec_select ON public.plan_preventivo_ejecucion FOR SELECT TO mant_admin, mant_authenticated, mant_anon USING (true);
CREATE POLICY prev_evid_select ON public.plan_preventivo_evidencia FOR SELECT TO mant_admin, mant_authenticated, mant_anon USING (true);

-- Escritura solo para mant_admin
CREATE POLICY prev_tarea_admin ON public.plan_preventivo_tarea FOR ALL TO mant_admin USING (true) WITH CHECK (true);
CREATE POLICY prev_ejec_admin ON public.plan_preventivo_ejecucion FOR ALL TO mant_admin USING (true) WITH CHECK (true);
CREATE POLICY prev_evid_admin ON public.plan_preventivo_evidencia FOR ALL TO mant_admin USING (true) WITH CHECK (true);

-- Otorgar privilegios a los roles
GRANT SELECT ON public.plan_preventivo_tarea TO mant_authenticated, mant_anon;
GRANT SELECT ON public.plan_preventivo_ejecucion TO mant_authenticated, mant_anon;
GRANT SELECT ON public.plan_preventivo_evidencia TO mant_authenticated, mant_anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_preventivo_tarea TO mant_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_preventivo_ejecucion TO mant_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_preventivo_evidencia TO mant_admin;

REVOKE ALL ON public.plan_preventivo_tarea FROM PUBLIC;
REVOKE ALL ON public.plan_preventivo_ejecucion FROM PUBLIC;
REVOKE ALL ON public.plan_preventivo_evidencia FROM PUBLIC;

-- --------------------------------------------------------------------
-- 5. CARGA INICIAL IDEMPOTENTE: EXTRUSORAS M1 A M5 (95 TAREAS)
-- --------------------------------------------------------------------
DO $$
DECLARE
    v_eq_id uuid;
BEGIN

    -- Extrusora M1 - T01: Revisar niveles, fugas, ruidos y alarmas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 1, 'T01',
        'General', 'Revisar niveles, fugas, ruidos y alarmas.', 'Cada turno', 'Operador', 'Visual en marcha', 'Sin fugas activas ni alarmas sin evaluar.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T01: Revisar niveles, fugas, ruidos y alarmas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 2, 'T01',
        'General', 'Revisar niveles, fugas, ruidos y alarmas.', 'Cada turno', 'Operador', 'Visual en marcha', 'Sin fugas activas ni alarmas sin evaluar.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T01: Revisar niveles, fugas, ruidos y alarmas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 3, 'T01',
        'General', 'Revisar niveles, fugas, ruidos y alarmas.', 'Cada turno', 'Operador', 'Visual en marcha', 'Sin fugas activas ni alarmas sin evaluar.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T01: Revisar niveles, fugas, ruidos y alarmas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 4, 'T01',
        'General', 'Revisar niveles, fugas, ruidos y alarmas.', 'Cada turno', 'Operador', 'Visual en marcha', 'Sin fugas activas ni alarmas sin evaluar.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T01: Revisar niveles, fugas, ruidos y alarmas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 5, 'T01',
        'General', 'Revisar niveles, fugas, ruidos y alarmas.', 'Cada turno', 'Operador', 'Visual en marcha', 'Sin fugas activas ni alarmas sin evaluar.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T02: Registrar temperaturas y revisar calefac...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 6, 'T02',
        'Calefaccion', 'Registrar temperaturas y revisar calefaccion.', 'Diaria', 'Operador', 'Visual en marcha', 'Comparar con receta aprobada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T02: Registrar temperaturas y revisar calefac...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 7, 'T02',
        'Calefaccion', 'Registrar temperaturas y revisar calefaccion.', 'Diaria', 'Operador', 'Visual en marcha', 'Comparar con receta aprobada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T02: Registrar temperaturas y revisar calefac...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 8, 'T02',
        'Calefaccion', 'Registrar temperaturas y revisar calefaccion.', 'Diaria', 'Operador', 'Visual en marcha', 'Comparar con receta aprobada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T02: Registrar temperaturas y revisar calefac...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 9, 'T02',
        'Calefaccion', 'Registrar temperaturas y revisar calefaccion.', 'Diaria', 'Operador', 'Visual en marcha', 'Comparar con receta aprobada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T02: Registrar temperaturas y revisar calefac...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 10, 'T02',
        'Calefaccion', 'Registrar temperaturas y revisar calefaccion.', 'Diaria', 'Operador', 'Visual en marcha', 'Comparar con receta aprobada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T03: Comprobar agua y refrigeracion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 11, 'T03',
        'Refrigeracion', 'Comprobar agua y refrigeracion.', 'Diaria', 'Operador', 'Visual en marcha', 'Caudal y temperatura segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T03: Comprobar agua y refrigeracion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 12, 'T03',
        'Refrigeracion', 'Comprobar agua y refrigeracion.', 'Diaria', 'Operador', 'Visual en marcha', 'Caudal y temperatura segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T03: Comprobar agua y refrigeracion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 13, 'T03',
        'Refrigeracion', 'Comprobar agua y refrigeracion.', 'Diaria', 'Operador', 'Visual en marcha', 'Caudal y temperatura segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T03: Comprobar agua y refrigeracion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 14, 'T03',
        'Refrigeracion', 'Comprobar agua y refrigeracion.', 'Diaria', 'Operador', 'Visual en marcha', 'Caudal y temperatura segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T03: Comprobar agua y refrigeracion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 15, 'T03',
        'Refrigeracion', 'Comprobar agua y refrigeracion.', 'Diaria', 'Operador', 'Visual en marcha', 'Caudal y temperatura segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T04: Comprobar suministro de lubricacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 16, 'T04',
        'Lubricacion', 'Comprobar suministro de lubricacion.', 'Cada turno', 'Operador', 'Visual en marcha', 'Nivel y suministro segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T04: Comprobar suministro de lubricacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 17, 'T04',
        'Lubricacion', 'Comprobar suministro de lubricacion.', 'Cada turno', 'Operador', 'Visual en marcha', 'Nivel y suministro segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T04: Comprobar suministro de lubricacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 18, 'T04',
        'Lubricacion', 'Comprobar suministro de lubricacion.', 'Cada turno', 'Operador', 'Visual en marcha', 'Nivel y suministro segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T04: Comprobar suministro de lubricacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 19, 'T04',
        'Lubricacion', 'Comprobar suministro de lubricacion.', 'Cada turno', 'Operador', 'Visual en marcha', 'Nivel y suministro segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T04: Comprobar suministro de lubricacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 1, 'T04',
        'Lubricacion', 'Comprobar suministro de lubricacion.', 'Cada turno', 'Operador', 'Visual en marcha', 'Nivel y suministro segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T05: Inspeccionar guias y retirar residuos....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 2, 'T05',
        'Movimiento', 'Inspeccionar guias y retirar residuos.', 'Diaria', 'Mecanico', 'Bloqueo para limpiar', 'Limpias y sin dano visible.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T05: Inspeccionar guias y retirar residuos....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 3, 'T05',
        'Movimiento', 'Inspeccionar guias y retirar residuos.', 'Diaria', 'Mecanico', 'Bloqueo para limpiar', 'Limpias y sin dano visible.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T05: Inspeccionar guias y retirar residuos....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 4, 'T05',
        'Movimiento', 'Inspeccionar guias y retirar residuos.', 'Diaria', 'Mecanico', 'Bloqueo para limpiar', 'Limpias y sin dano visible.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T05: Inspeccionar guias y retirar residuos....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 5, 'T05',
        'Movimiento', 'Inspeccionar guias y retirar residuos.', 'Diaria', 'Mecanico', 'Bloqueo para limpiar', 'Limpias y sin dano visible.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T05: Inspeccionar guias y retirar residuos....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 6, 'T05',
        'Movimiento', 'Inspeccionar guias y retirar residuos.', 'Diaria', 'Mecanico', 'Bloqueo para limpiar', 'Limpias y sin dano visible.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T06: Revisar nivel de aceite y fugas....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 7, 'T06',
        'Reductor', 'Revisar nivel de aceite y fugas.', 'Semanal', 'Mecanico', 'Segun procedimiento', 'Nivel segun visor y manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T06: Revisar nivel de aceite y fugas....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 8, 'T06',
        'Reductor', 'Revisar nivel de aceite y fugas.', 'Semanal', 'Mecanico', 'Segun procedimiento', 'Nivel segun visor y manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T06: Revisar nivel de aceite y fugas....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 9, 'T06',
        'Reductor', 'Revisar nivel de aceite y fugas.', 'Semanal', 'Mecanico', 'Segun procedimiento', 'Nivel segun visor y manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T06: Revisar nivel de aceite y fugas....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 10, 'T06',
        'Reductor', 'Revisar nivel de aceite y fugas.', 'Semanal', 'Mecanico', 'Segun procedimiento', 'Nivel segun visor y manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T06: Revisar nivel de aceite y fugas....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 11, 'T06',
        'Reductor', 'Revisar nivel de aceite y fugas.', 'Semanal', 'Mecanico', 'Segun procedimiento', 'Nivel segun visor y manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T07: Limpiar y comprobar sensores de posicion...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 12, 'T07',
        'Sensores', 'Limpiar y comprobar sensores de posicion.', 'Semanal', 'Mecanico / electrico', 'Si', 'Respuesta correcta en prueba autorizada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T07: Limpiar y comprobar sensores de posicion...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 13, 'T07',
        'Sensores', 'Limpiar y comprobar sensores de posicion.', 'Semanal', 'Mecanico / electrico', 'Si', 'Respuesta correcta en prueba autorizada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T07: Limpiar y comprobar sensores de posicion...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 14, 'T07',
        'Sensores', 'Limpiar y comprobar sensores de posicion.', 'Semanal', 'Mecanico / electrico', 'Si', 'Respuesta correcta en prueba autorizada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T07: Limpiar y comprobar sensores de posicion...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 15, 'T07',
        'Sensores', 'Limpiar y comprobar sensores de posicion.', 'Semanal', 'Mecanico / electrico', 'Si', 'Respuesta correcta en prueba autorizada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T07: Limpiar y comprobar sensores de posicion...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 16, 'T07',
        'Sensores', 'Limpiar y comprobar sensores de posicion.', 'Semanal', 'Mecanico / electrico', 'Si', 'Respuesta correcta en prueba autorizada.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T08: Inspeccionar lubricacion de partes movil...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 17, 'T08',
        'Lubricacion', 'Inspeccionar lubricacion de partes moviles.', 'Semanal', 'Mecanico', 'Si', 'Confirmar distribucion; lubricar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T08: Inspeccionar lubricacion de partes movil...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 18, 'T08',
        'Lubricacion', 'Inspeccionar lubricacion de partes moviles.', 'Semanal', 'Mecanico', 'Si', 'Confirmar distribucion; lubricar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T08: Inspeccionar lubricacion de partes movil...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 19, 'T08',
        'Lubricacion', 'Inspeccionar lubricacion de partes moviles.', 'Semanal', 'Mecanico', 'Si', 'Confirmar distribucion; lubricar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T08: Inspeccionar lubricacion de partes movil...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 1, 'T08',
        'Lubricacion', 'Inspeccionar lubricacion de partes moviles.', 'Semanal', 'Mecanico', 'Si', 'Confirmar distribucion; lubricar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T08: Inspeccionar lubricacion de partes movil...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 2, 'T08',
        'Lubricacion', 'Inspeccionar lubricacion de partes moviles.', 'Semanal', 'Mecanico', 'Si', 'Confirmar distribucion; lubricar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T09: Inspeccionar mangueras, conexiones y vas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 3, 'T09',
        'Hidraulico', 'Inspeccionar mangueras, conexiones y vastagos.', 'Semanal', 'Mecanico', 'Si', 'Sin grietas, abrasion ni fugas.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T09: Inspeccionar mangueras, conexiones y vas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 4, 'T09',
        'Hidraulico', 'Inspeccionar mangueras, conexiones y vastagos.', 'Semanal', 'Mecanico', 'Si', 'Sin grietas, abrasion ni fugas.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T09: Inspeccionar mangueras, conexiones y vas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 5, 'T09',
        'Hidraulico', 'Inspeccionar mangueras, conexiones y vastagos.', 'Semanal', 'Mecanico', 'Si', 'Sin grietas, abrasion ni fugas.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T09: Inspeccionar mangueras, conexiones y vas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 6, 'T09',
        'Hidraulico', 'Inspeccionar mangueras, conexiones y vastagos.', 'Semanal', 'Mecanico', 'Si', 'Sin grietas, abrasion ni fugas.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T09: Inspeccionar mangueras, conexiones y vas...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 7, 'T09',
        'Hidraulico', 'Inspeccionar mangueras, conexiones y vastagos.', 'Semanal', 'Mecanico', 'Si', 'Sin grietas, abrasion ni fugas.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T10: Revisar filtros y registrar saturacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 8, 'T10',
        'Filtracion', 'Revisar filtros y registrar saturacion.', 'Mensual', 'Mecanico', 'Si se interviene', 'Sin alarma; actuar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T10: Revisar filtros y registrar saturacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 9, 'T10',
        'Filtracion', 'Revisar filtros y registrar saturacion.', 'Mensual', 'Mecanico', 'Si se interviene', 'Sin alarma; actuar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T10: Revisar filtros y registrar saturacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 10, 'T10',
        'Filtracion', 'Revisar filtros y registrar saturacion.', 'Mensual', 'Mecanico', 'Si se interviene', 'Sin alarma; actuar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T10: Revisar filtros y registrar saturacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 11, 'T10',
        'Filtracion', 'Revisar filtros y registrar saturacion.', 'Mensual', 'Mecanico', 'Si se interviene', 'Sin alarma; actuar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T10: Revisar filtros y registrar saturacion....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 12, 'T10',
        'Filtracion', 'Revisar filtros y registrar saturacion.', 'Mensual', 'Mecanico', 'Si se interviene', 'Sin alarma; actuar segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T11: Revisar suavidad y lubricacion de guias....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 13, 'T11',
        'Movimiento', 'Revisar suavidad y lubricacion de guias.', 'Mensual', 'Mecanico', 'Si', 'Sin trabas; holguras segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T11: Revisar suavidad y lubricacion de guias....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 14, 'T11',
        'Movimiento', 'Revisar suavidad y lubricacion de guias.', 'Mensual', 'Mecanico', 'Si', 'Sin trabas; holguras segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T11: Revisar suavidad y lubricacion de guias....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 15, 'T11',
        'Movimiento', 'Revisar suavidad y lubricacion de guias.', 'Mensual', 'Mecanico', 'Si', 'Sin trabas; holguras segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T11: Revisar suavidad y lubricacion de guias....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 16, 'T11',
        'Movimiento', 'Revisar suavidad y lubricacion de guias.', 'Mensual', 'Mecanico', 'Si', 'Sin trabas; holguras segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T11: Revisar suavidad y lubricacion de guias....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 17, 'T11',
        'Movimiento', 'Revisar suavidad y lubricacion de guias.', 'Mensual', 'Mecanico', 'Si', 'Sin trabas; holguras segun manual.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T12: Inspeccionar cuchilla y fijaciones....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 18, 'T12',
        'Corte', 'Inspeccionar cuchilla y fijaciones.', 'Mensual', 'Mecanico', 'Si', 'Sin dano; fijaciones segun especificacion.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T12: Inspeccionar cuchilla y fijaciones....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 19, 'T12',
        'Corte', 'Inspeccionar cuchilla y fijaciones.', 'Mensual', 'Mecanico', 'Si', 'Sin dano; fijaciones segun especificacion.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T12: Inspeccionar cuchilla y fijaciones....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 1, 'T12',
        'Corte', 'Inspeccionar cuchilla y fijaciones.', 'Mensual', 'Mecanico', 'Si', 'Sin dano; fijaciones segun especificacion.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T12: Inspeccionar cuchilla y fijaciones....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 2, 'T12',
        'Corte', 'Inspeccionar cuchilla y fijaciones.', 'Mensual', 'Mecanico', 'Si', 'Sin dano; fijaciones segun especificacion.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T12: Inspeccionar cuchilla y fijaciones....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 3, 'T12',
        'Corte', 'Inspeccionar cuchilla y fijaciones.', 'Mensual', 'Mecanico', 'Si', 'Sin dano; fijaciones segun especificacion.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T13: Comprobar mandos y controles....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 4, 'T13',
        'Mandos', 'Comprobar mandos y controles.', 'Mensual', 'Electromecanico', 'Prueba controlada', 'Prueba funcional segun procedimiento.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T13: Comprobar mandos y controles....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 5, 'T13',
        'Mandos', 'Comprobar mandos y controles.', 'Mensual', 'Electromecanico', 'Prueba controlada', 'Prueba funcional segun procedimiento.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T13: Comprobar mandos y controles....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 6, 'T13',
        'Mandos', 'Comprobar mandos y controles.', 'Mensual', 'Electromecanico', 'Prueba controlada', 'Prueba funcional segun procedimiento.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T13: Comprobar mandos y controles....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 7, 'T13',
        'Mandos', 'Comprobar mandos y controles.', 'Mensual', 'Electromecanico', 'Prueba controlada', 'Prueba funcional segun procedimiento.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T13: Comprobar mandos y controles....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 8, 'T13',
        'Mandos', 'Comprobar mandos y controles.', 'Mensual', 'Electromecanico', 'Prueba controlada', 'Prueba funcional segun procedimiento.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T14: Evaluar aceite y enfriador....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 9, 'T14',
        'Hidraulico', 'Evaluar aceite y enfriador.', 'Mensual', 'Mecanico', 'Segun procedimiento', 'Registrar condicion y temperatura; evaluar desvios.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T14: Evaluar aceite y enfriador....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 10, 'T14',
        'Hidraulico', 'Evaluar aceite y enfriador.', 'Mensual', 'Mecanico', 'Segun procedimiento', 'Registrar condicion y temperatura; evaluar desvios.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T14: Evaluar aceite y enfriador....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 11, 'T14',
        'Hidraulico', 'Evaluar aceite y enfriador.', 'Mensual', 'Mecanico', 'Segun procedimiento', 'Registrar condicion y temperatura; evaluar desvios.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T14: Evaluar aceite y enfriador....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 12, 'T14',
        'Hidraulico', 'Evaluar aceite y enfriador.', 'Mensual', 'Mecanico', 'Segun procedimiento', 'Registrar condicion y temperatura; evaluar desvios.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T14: Evaluar aceite y enfriador....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 13, 'T14',
        'Hidraulico', 'Evaluar aceite y enfriador.', 'Mensual', 'Mecanico', 'Segun procedimiento', 'Registrar condicion y temperatura; evaluar desvios.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T15: Verificar fijaciones principales y guias...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 14, 'T15',
        'Estructura', 'Verificar fijaciones principales y guias.', 'Trimestral', 'Mecanico', 'Si', 'Par segun manual; sin dano ni desgaste anormal.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T15: Verificar fijaciones principales y guias...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 15, 'T15',
        'Estructura', 'Verificar fijaciones principales y guias.', 'Trimestral', 'Mecanico', 'Si', 'Par segun manual; sin dano ni desgaste anormal.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T15: Verificar fijaciones principales y guias...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 16, 'T15',
        'Estructura', 'Verificar fijaciones principales y guias.', 'Trimestral', 'Mecanico', 'Si', 'Par segun manual; sin dano ni desgaste anormal.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T15: Verificar fijaciones principales y guias...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 17, 'T15',
        'Estructura', 'Verificar fijaciones principales y guias.', 'Trimestral', 'Mecanico', 'Si', 'Par segun manual; sin dano ni desgaste anormal.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T15: Verificar fijaciones principales y guias...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 18, 'T15',
        'Estructura', 'Verificar fijaciones principales y guias.', 'Trimestral', 'Mecanico', 'Si', 'Par segun manual; sin dano ni desgaste anormal.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T16: Inspeccionar conexiones del tablero....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 19, 'T16',
        'Electrico', 'Inspeccionar conexiones del tablero.', 'Trimestral', 'Electromecanico', 'Si', 'Sin deterioro; conexiones segun fabricante.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T16: Inspeccionar conexiones del tablero....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 1, 'T16',
        'Electrico', 'Inspeccionar conexiones del tablero.', 'Trimestral', 'Electromecanico', 'Si', 'Sin deterioro; conexiones segun fabricante.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T16: Inspeccionar conexiones del tablero....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 2, 'T16',
        'Electrico', 'Inspeccionar conexiones del tablero.', 'Trimestral', 'Electromecanico', 'Si', 'Sin deterioro; conexiones segun fabricante.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T16: Inspeccionar conexiones del tablero....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 3, 'T16',
        'Electrico', 'Inspeccionar conexiones del tablero.', 'Trimestral', 'Electromecanico', 'Si', 'Sin deterioro; conexiones segun fabricante.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T16: Inspeccionar conexiones del tablero....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 4, 'T16',
        'Electrico', 'Inspeccionar conexiones del tablero.', 'Trimestral', 'Electromecanico', 'Si', 'Sin deterioro; conexiones segun fabricante.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T17: Muestrear aceite y evaluar filtros....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 5, 'T17',
        'Hidraulico', 'Muestrear aceite y evaluar filtros.', 'Referencia 500 h', 'Mecanico / especialista', 'Segun procedimiento', 'Informe de laboratorio y criterio del filtro.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T17: Muestrear aceite y evaluar filtros....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 6, 'T17',
        'Hidraulico', 'Muestrear aceite y evaluar filtros.', 'Referencia 500 h', 'Mecanico / especialista', 'Segun procedimiento', 'Informe de laboratorio y criterio del filtro.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T17: Muestrear aceite y evaluar filtros....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 7, 'T17',
        'Hidraulico', 'Muestrear aceite y evaluar filtros.', 'Referencia 500 h', 'Mecanico / especialista', 'Segun procedimiento', 'Informe de laboratorio y criterio del filtro.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T17: Muestrear aceite y evaluar filtros....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 8, 'T17',
        'Hidraulico', 'Muestrear aceite y evaluar filtros.', 'Referencia 500 h', 'Mecanico / especialista', 'Segun procedimiento', 'Informe de laboratorio y criterio del filtro.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T17: Muestrear aceite y evaluar filtros....
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 9, 'T17',
        'Hidraulico', 'Muestrear aceite y evaluar filtros.', 'Referencia 500 h', 'Mecanico / especialista', 'Segun procedimiento', 'Informe de laboratorio y criterio del filtro.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T18: Evaluar desgaste y servicio del reductor...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 10, 'T18',
        'Reductor y guias', 'Evaluar desgaste y servicio del reductor.', 'Anual', 'Mecanico', 'Si', 'Informe de condicion y decision de servicio.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T18: Evaluar desgaste y servicio del reductor...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 11, 'T18',
        'Reductor y guias', 'Evaluar desgaste y servicio del reductor.', 'Anual', 'Mecanico', 'Si', 'Informe de condicion y decision de servicio.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T18: Evaluar desgaste y servicio del reductor...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 12, 'T18',
        'Reductor y guias', 'Evaluar desgaste y servicio del reductor.', 'Anual', 'Mecanico', 'Si', 'Informe de condicion y decision de servicio.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T18: Evaluar desgaste y servicio del reductor...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 13, 'T18',
        'Reductor y guias', 'Evaluar desgaste y servicio del reductor.', 'Anual', 'Mecanico', 'Si', 'Informe de condicion y decision de servicio.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T18: Evaluar desgaste y servicio del reductor...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 14, 'T18',
        'Reductor y guias', 'Evaluar desgaste y servicio del reductor.', 'Anual', 'Mecanico', 'Si', 'Informe de condicion y decision de servicio.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M1 - T19: Probar resguardos, enclavamientos y para...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M01' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M1' OR nombre = 'M1' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M01', 'Extrusora M1', 15, 'T19',
        'Seguridad', 'Probar resguardos, enclavamientos y parada.', 'Propuesta semanal', 'Personal competente', 'Prueba controlada', 'Prueba documentada segun procedimiento TONGDA.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M2 - T19: Probar resguardos, enclavamientos y para...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M02' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M2' OR nombre = 'M2' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M02', 'Extrusora M2', 16, 'T19',
        'Seguridad', 'Probar resguardos, enclavamientos y parada.', 'Propuesta semanal', 'Personal competente', 'Prueba controlada', 'Prueba documentada segun procedimiento TONGDA.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M3 - T19: Probar resguardos, enclavamientos y para...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M03' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M3' OR nombre = 'M3' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M03', 'Extrusora M3', 17, 'T19',
        'Seguridad', 'Probar resguardos, enclavamientos y parada.', 'Propuesta semanal', 'Personal competente', 'Prueba controlada', 'Prueba documentada segun procedimiento TONGDA.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M4 - T19: Probar resguardos, enclavamientos y para...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M04' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M4' OR nombre = 'M4' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M04', 'Extrusora M4', 18, 'T19',
        'Seguridad', 'Probar resguardos, enclavamientos y parada.', 'Propuesta semanal', 'Personal competente', 'Prueba controlada', 'Prueba documentada segun procedimiento TONGDA.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    -- Extrusora M5 - T19: Probar resguardos, enclavamientos y para...
    SELECT id INTO v_eq_id FROM public.equipo WHERE codigo = 'AGL-PLA-GPL-M05' LIMIT 1;
    IF v_eq_id IS NULL THEN
        SELECT id INTO v_eq_id FROM public.equipo WHERE nombre = 'Extrusora M5' OR nombre = 'M5' LIMIT 1;
    END IF;

    INSERT INTO public.plan_preventivo_tarea (
        equipo_id, codigo_equipo, nombre_equipo, orden, id_tarea_fuente,
        sistema, tarea, frecuencia, responsable, condicion_trabajo, criterio_registro
    ) VALUES (
        v_eq_id, 'AGL-PLA-GPL-M05', 'Extrusora M5', 19, 'T19',
        'Seguridad', 'Probar resguardos, enclavamientos y parada.', 'Propuesta semanal', 'Personal competente', 'Prueba controlada', 'Prueba documentada segun procedimiento TONGDA.'
    )
    ON CONFLICT (codigo_equipo, tarea, frecuencia) DO UPDATE SET
        equipo_id = COALESCE(EXCLUDED.equipo_id, public.plan_preventivo_tarea.equipo_id),
        nombre_equipo = EXCLUDED.nombre_equipo,
        orden = EXCLUDED.orden,
        id_tarea_fuente = EXCLUDED.id_tarea_fuente,
        sistema = EXCLUDED.sistema,
        responsable = EXCLUDED.responsable,
        condicion_trabajo = EXCLUDED.condicion_trabajo,
        criterio_registro = EXCLUDED.criterio_registro,
        activo = true,
        updated_at = now();

    RAISE NOTICE 'Carga de 95 tareas preventivas para Extrusoras M1-M5 completada con éxito.';
END $$;

COMMIT;
