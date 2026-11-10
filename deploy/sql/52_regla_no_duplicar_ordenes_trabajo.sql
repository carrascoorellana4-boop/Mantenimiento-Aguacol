-- MIGRACIÓN 52: Regla de No Duplicar Órdenes de Trabajo (OT)
-- Objetivo: Evitar crear múltiples OTs cuando el contenido completo reportado sea idéntico
-- a una orden de trabajo existente activa ('Pendiente' o 'En curso').

-- 1. Función de validación para trigger antes de INSERT
CREATE OR REPLACE FUNCTION public.fn_check_ot_no_duplicada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_dup_codigo text;
  v_dup_id uuid;
BEGIN
  -- Verificar si ya existe una OT idéntica en estado activo ('Pendiente' o 'En curso')
  SELECT id, codigo_ot INTO v_dup_id, v_dup_codigo
  FROM public.orden_trabajo
  WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND lower(btrim(COALESCE(solicitante_nombre, ''))) = lower(btrim(COALESCE(NEW.solicitante_nombre, '')))
    AND lower(btrim(COALESCE(area, ''))) = lower(btrim(COALESCE(NEW.area, '')))
    AND lower(btrim(COALESCE(ubicacion, ''))) = lower(btrim(COALESCE(NEW.ubicacion, '')))
    AND lower(btrim(COALESCE(trabajo, ''))) = lower(btrim(COALESCE(NEW.trabajo, '')))
    AND lower(btrim(COALESCE(equipo_solicitado, ''))) = lower(btrim(COALESCE(NEW.equipo_solicitado, '')))
    AND (equipo_id IS NOT DISTINCT FROM NEW.equipo_id)
    AND lower(btrim(COALESCE(condicion_linea, ''))) = lower(btrim(COALESCE(NEW.condicion_linea, '')))
    AND estado IN ('Pendiente', 'En curso')
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe una Orden de Trabajo idéntica activa (%) para el mismo solicitante, área, equipo y trabajo reportado.', v_dup_codigo
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verificar_ot_no_duplicada ON public.orden_trabajo;
CREATE TRIGGER trg_verificar_ot_no_duplicada
BEFORE INSERT ON public.orden_trabajo
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_ot_no_duplicada();

-- 2. Actualizar función RPC crear_solicitud_mantenimiento_qr con manejo de duplicados
CREATE OR REPLACE FUNCTION public.crear_solicitud_mantenimiento_qr(
  p_area text,
  p_solicitante text,
  p_linea text,
  p_descripcion text,
  p_equipo text DEFAULT NULL,
  p_linea_detenida boolean DEFAULT false,
  p_foto_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_area text;
  v_solicitante text;
  v_linea text;
  v_descripcion text;
  v_equipo text;
  v_foto_url text;
  v_matched_equipo_id uuid;
  v_condicion text;
  v_prioridad text;
  v_existing_id uuid;
  v_existing_numero bigint;
  v_existing_codigo text;
  v_ot_id uuid;
  v_numero_ot bigint;
  v_codigo_ot text;
  v_now timestamptz := now();
BEGIN
  -- Sanitización y validaciones obligatorias
  v_area := btrim(COALESCE(p_area, ''));
  v_solicitante := btrim(COALESCE(p_solicitante, ''));
  v_linea := btrim(COALESCE(p_linea, ''));
  v_descripcion := btrim(COALESCE(p_descripcion, ''));
  v_equipo := btrim(COALESCE(p_equipo, ''));
  v_foto_url := btrim(COALESCE(p_foto_url, ''));

  -- Eliminar tags HTML
  v_solicitante := regexp_replace(v_solicitante, '<[^>]*>', '', 'g');
  v_linea := regexp_replace(v_linea, '<[^>]*>', '', 'g');
  v_descripcion := regexp_replace(v_descripcion, '<[^>]*>', '', 'g');
  v_equipo := regexp_replace(v_equipo, '<[^>]*>', '', 'g');

  IF length(v_area) = 0 THEN
    RAISE EXCEPTION 'El área del solicitante es obligatoria.';
  END IF;
  IF length(v_solicitante) < 2 THEN
    RAISE EXCEPTION 'El nombre del solicitante debe tener al menos 2 caracteres.';
  END IF;
  IF length(v_linea) = 0 THEN
    RAISE EXCEPTION 'La línea o sector es obligatorio.';
  END IF;
  IF length(v_descripcion) < 3 THEN
    RAISE EXCEPTION 'La descripción del problema o trabajo requerido debe tener al menos 3 caracteres.';
  END IF;

  IF length(v_solicitante) > 120 THEN v_solicitante := left(v_solicitante, 120); END IF;
  IF length(v_linea) > 120 THEN v_linea := left(v_linea, 120); END IF;
  IF length(v_equipo) > 120 THEN v_equipo := left(v_equipo, 120); END IF;
  IF length(v_descripcion) > 3000 THEN v_descripcion := left(v_descripcion, 3000); END IF;

  -- Condición de línea con valores oficiales
  IF p_linea_detenida IS TRUE THEN
    v_condicion := 'Línea detenida';
    v_prioridad := 'Alta';
  ELSE
    v_condicion := 'Línea produciendo';
    v_prioridad := 'Media';
  END IF;

  -- Intentar vincular equipo oficial si coincide nombre o código
  IF length(v_equipo) > 0 THEN
    SELECT id INTO v_matched_equipo_id
    FROM public.equipo
    WHERE lower(nombre) = lower(v_equipo) OR lower(codigo) = lower(v_equipo)
    LIMIT 1;
  END IF;

  -- Si no encontró por equipo, buscar por nombre de la línea si corresponde a un equipo
  IF v_matched_equipo_id IS NULL AND length(v_linea) > 0 THEN
    SELECT id INTO v_matched_equipo_id
    FROM public.equipo
    WHERE lower(nombre) = lower(v_linea) OR lower(codigo) = lower(v_linea)
    LIMIT 1;
  END IF;

  -- =========================================================================
  -- REGLA DE NO DUPLICAR OT: Si ya existe una activa con el contenido idéntico
  -- =========================================================================
  SELECT id, numero_ot, codigo_ot INTO v_existing_id, v_existing_numero, v_existing_codigo
  FROM public.orden_trabajo
  WHERE lower(btrim(COALESCE(solicitante_nombre, ''))) = lower(v_solicitante)
    AND lower(btrim(COALESCE(area, ''))) = lower(v_area)
    AND lower(btrim(COALESCE(ubicacion, ''))) = lower(v_linea)
    AND lower(btrim(COALESCE(trabajo, ''))) = lower(v_descripcion)
    AND lower(btrim(COALESCE(equipo_solicitado, ''))) = lower(v_equipo)
    AND (equipo_id IS NOT DISTINCT FROM v_matched_equipo_id)
    AND lower(btrim(COALESCE(condicion_linea, ''))) = lower(v_condicion)
    AND estado IN ('Pendiente', 'En curso')
  ORDER BY numero_ot DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'id', v_existing_id,
      'numero_ot', v_existing_numero,
      'codigo_ot', v_existing_codigo,
      'area', v_area,
      'linea', v_linea,
      'equipo', v_equipo,
      'linea_detenida', p_linea_detenida,
      'condicion_linea', v_condicion,
      'foto_url', v_foto_url,
      'duplicada', true,
      'ya_existia', true,
      'mensaje', 'Ya existía una solicitud idéntica registrada (' || v_existing_codigo || '). No se duplicó la orden de trabajo.'
    );
  END IF;

  -- Insertar nueva OT real
  INSERT INTO public.orden_trabajo (
    estado,
    origen,
    solicitante_nombre,
    solicitante_area,
    area,
    ubicacion,
    equipo_id,
    equipo_solicitado,
    trabajo,
    tecnico,
    prioridad,
    tipo_intervencion,
    es_falla,
    tipo_falla,
    condicion_linea,
    foto_url,
    fecha_reporte,
    created_at,
    updated_at
  ) VALUES (
    'Pendiente',
    'Solicitud QR',
    v_solicitante,
    v_area,
    v_area,
    v_linea,
    v_matched_equipo_id,
    NULLIF(v_equipo, ''),
    v_descripcion,
    'Sin asignar',
    v_prioridad,
    'Correctiva',
    true,
    'Mecánica',
    v_condicion,
    NULLIF(v_foto_url, ''),
    v_now,
    v_now,
    v_now
  ) RETURNING id, numero_ot, codigo_ot INTO v_ot_id, v_numero_ot, v_codigo_ot;

  IF v_codigo_ot IS NULL OR btrim(v_codigo_ot) = '' THEN
    v_codigo_ot := 'OT-' || lpad(v_numero_ot::text, 6, '0');
    UPDATE public.orden_trabajo SET codigo_ot = v_codigo_ot WHERE id = v_ot_id;
  END IF;

  -- Historial de estado
  INSERT INTO public.orden_trabajo_estado_historial (
    ot_id,
    estado_anterior,
    estado_nuevo,
    fecha_hora,
    usuario_id,
    usuario_nombre,
    comentario
  ) VALUES (
    v_ot_id,
    null,
    'Pendiente',
    v_now,
    null,
    v_solicitante,
    'Solicitud generada vía ventana web desde ' || v_area || ' (' || v_linea || ')' ||
    CASE WHEN length(v_equipo) > 0 THEN ' - Equipo: ' || v_equipo ELSE '' END ||
    ' • ' || v_condicion
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_ot_id,
    'numero_ot', v_numero_ot,
    'codigo_ot', v_codigo_ot,
    'area', v_area,
    'linea', v_linea,
    'equipo', v_equipo,
    'linea_detenida', p_linea_detenida,
    'condicion_linea', v_condicion,
    'foto_url', v_foto_url,
    'duplicada', false,
    'ya_existia', false
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';
