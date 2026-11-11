-- MIGRACIÓN 55: Vinculación robusta de equipo en solicitudes de mantenimiento y visualización
-- Garantiza que selecciones de línea como "Inyectora 2 (Tapas/Manillas)", "Inyectora BORCHE", "Sopladora S1/S2", etc.
-- se asocien automáticamente a su equipo oficial en public.equipo en lugar de quedar en null.

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

  -- 1. Intentar vincular equipo oficial por equipo_solicitado si viene
  IF length(v_equipo) > 0 THEN
    SELECT id INTO v_matched_equipo_id
    FROM public.equipo
    WHERE lower(nombre) = lower(v_equipo) 
       OR lower(codigo) = lower(v_equipo)
       OR (v_equipo ILIKE '%Inyectora 2%' AND (codigo = 'AGL-PLA-GPL-INY-02' OR nombre ILIKE '%Inyectora 2%'))
       OR (v_equipo ILIKE '%BORCHE%' AND (codigo = 'AGL-PLA-GPL-INY-BOR' OR nombre ILIKE '%BORCHE%'))
       OR (v_equipo ILIKE '%Sopladora S1%' AND (codigo = 'AGL-SOP-S01' OR nombre = 'S1'))
       OR (v_equipo ILIKE '%Sopladora S2%' AND (codigo = 'AGL-SOP-S02' OR nombre = 'S2'))
    ORDER BY (lower(nombre) = lower(v_equipo)) DESC, length(nombre) ASC
    LIMIT 1;
  END IF;

  -- 2. Si no encontró por equipo, buscar por nombre de la línea si corresponde a un equipo
  IF v_matched_equipo_id IS NULL AND length(v_linea) > 0 THEN
    SELECT id INTO v_matched_equipo_id
    FROM public.equipo
    WHERE lower(nombre) = lower(v_linea) 
       OR lower(codigo) = lower(v_linea)
       OR (v_linea ILIKE '%Inyectora 2%' AND (codigo = 'AGL-PLA-GPL-INY-02' OR nombre ILIKE '%Inyectora 2%'))
       OR (v_linea ILIKE '%BORCHE%' AND (codigo = 'AGL-PLA-GPL-INY-BOR' OR nombre ILIKE '%BORCHE%'))
       OR (v_linea ILIKE '%Sopladora S1%' AND (codigo = 'AGL-SOP-S01' OR nombre = 'S1'))
       OR (v_linea ILIKE '%Sopladora S2%' AND (codigo = 'AGL-SOP-S02' OR nombre = 'S2'))
       OR (v_linea ILIKE '%Preformas 1%' AND (codigo = 'AGL-PLA-GPL-INY-PREF' OR nombre ILIKE '%preformas 1%'))
       OR (v_linea ILIKE '%Preformas 2%' AND (codigo = 'AGL-PLA-GPL-INY-PREF-02' OR nombre ILIKE '%preformas 2%'))
    ORDER BY (lower(nombre) = lower(v_linea)) DESC, length(nombre) ASC
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

  -- Asegurar formato OT-XXXXXX
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
    'ya_existia', false,
    'mensaje', 'Solicitud ingresada correctamente con ' || v_codigo_ot || '.'
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';
