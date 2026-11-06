-- ====================================================================
-- Migración 38: Soporte para Generación Automática de Orden de Trabajo (OT)
-- ante Hallazgos en Tareas Preventivas (Tablets de Planta)
-- ====================================================================

BEGIN;

-- 1. Permisos para que usuarios autenticados (operadores) puedan registrar órdenes de trabajo
GRANT INSERT ON public.orden_trabajo TO mant_authenticated;
GRANT INSERT ON public.orden_trabajo_estado_historial TO mant_authenticated;

DROP POLICY IF EXISTS ot_insert_auth ON public.orden_trabajo;
CREATE POLICY ot_insert_auth ON public.orden_trabajo
  FOR INSERT TO mant_authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS ot_hist_insert_auth ON public.orden_trabajo_estado_historial;
CREATE POLICY ot_hist_insert_auth ON public.orden_trabajo_estado_historial
  FOR INSERT TO mant_authenticated
  WITH CHECK (true);

-- 2. Función RPC para crear Orden de Trabajo automática ante hallazgo en preventiva
CREATE OR REPLACE FUNCTION public.crear_ot_hallazgo_preventivo(
  p_codigo_equipo text,
  p_tarea_codigo text,
  p_tarea_nombre text,
  p_observacion text,
  p_operador_nombre text,
  p_operador_email text,
  p_evidencias_urls text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eq record;
  v_equipo_id uuid;
  v_area text := 'Plásticos';
  v_ubicacion text := 'Planta';
  v_trabajo text;
  v_ot_id uuid;
  v_numero_ot bigint;
  v_codigo_ot text;
  v_now timestamptz := now();
  v_operador text;
BEGIN
  -- Validaciones básicas
  IF p_observacion IS NULL OR btrim(p_observacion) = '' THEN
    RAISE EXCEPTION 'La descripción de la observación es obligatoria.';
  END IF;

  v_operador := COALESCE(NULLIF(btrim(p_operador_nombre), ''), split_part(p_operador_email, '@', 1), 'Operador');

  -- Buscar equipo en tabla de activos
  SELECT id, area, ubicacion, nombre INTO v_eq
  FROM public.equipo
  WHERE codigo = p_codigo_equipo OR nombre ILIKE '%' || p_codigo_equipo || '%'
  LIMIT 1;

  IF FOUND THEN
    v_equipo_id := v_eq.id;
    v_area := COALESCE(v_eq.area, v_area);
    v_ubicacion := COALESCE(v_eq.ubicacion, v_eq.nombre, v_ubicacion);
  END IF;

  -- Construir detalle del trabajo a realizar
  v_trabajo := '[Hallazgo Preventivo ' || COALESCE(p_tarea_codigo, '') || ' - ' || COALESCE(p_tarea_nombre, 'Inspección') || ']: ' || btrim(p_observacion);

  -- Adjuntar referencias a fotos/videos si existen
  IF array_length(p_evidencias_urls, 1) > 0 THEN
    v_trabajo := v_trabajo || E'\n\nEvidencias multimedia registradas:\n' || array_to_string(p_evidencias_urls, E'\n');
  END IF;

  -- Insertar la Orden de Trabajo real en estado Pendiente
  INSERT INTO public.orden_trabajo (
    estado,
    origen,
    solicitante_nombre,
    solicitante_area,
    area,
    ubicacion,
    equipo_id,
    trabajo,
    tecnico,
    prioridad,
    tipo_intervencion,
    es_falla,
    tipo_falla,
    fecha_reporte,
    created_at,
    updated_at
  ) VALUES (
    'Pendiente',
    'Inspección',
    v_operador,
    v_area,
    v_area,
    v_ubicacion,
    v_equipo_id,
    v_trabajo,
    'Sin asignar',
    'Media',
    'Correctiva',
    true,
    'Mecánica',
    v_now,
    v_now,
    v_now
  ) RETURNING id, numero_ot, codigo_ot INTO v_ot_id, v_numero_ot, v_codigo_ot;

  -- Asegurar formato de código OT
  IF v_codigo_ot IS NULL OR btrim(v_codigo_ot) = '' THEN
    v_codigo_ot := 'OT-' || lpad(v_numero_ot::text, 6, '0');
    UPDATE public.orden_trabajo SET codigo_ot = v_codigo_ot WHERE id = v_ot_id;
  END IF;

  -- Historial de estado inicial
  INSERT INTO public.orden_trabajo_estado_historial (
    ot_id,
    estado_anterior,
    estado_nuevo,
    fecha_hora,
    usuario_nombre,
    comentario
  ) VALUES (
    v_ot_id,
    null,
    'Pendiente',
    v_now,
    v_operador,
    'OT generada automáticamente desde inspección preventiva con observaciones.'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_ot_id,
    'numero_ot', v_numero_ot,
    'codigo_ot', v_codigo_ot,
    'mensaje', 'Orden de Trabajo creada exitosamente en estado Pendiente.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_ot_hallazgo_preventivo TO mant_anon, mant_authenticated, mant_admin;

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
