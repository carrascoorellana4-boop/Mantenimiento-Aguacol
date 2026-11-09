-- ============================================================================
-- MIGRACIÓN 42: Corrección y robustecimiento del flujo de validación de importaciones
-- Agrega columnas faltantes (resolved_by, motivo_ignorado), otorga permisos completos
-- y crea funciones RPC atómicas para resolver e ignorar registros pendientes sin duplicados.
-- ============================================================================

-- 1. Asegurar columnas de auditoría en bitacora_importacion_pendiente
ALTER TABLE public.bitacora_importacion_pendiente
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS motivo_ignorado text;

-- 2. Asegurar permisos para roles de la aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bitacora_importacion_pendiente TO mant_admin, mant_authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bitacora_mantenimiento TO mant_admin, mant_authenticated;
GRANT SELECT, INSERT, UPDATE ON public.equipo_alias TO mant_admin, mant_authenticated;

-- 3. Función RPC atómica para resolver un registro pendiente individual
CREATE OR REPLACE FUNCTION public.resolver_importacion_pendiente(
  p_id uuid,
  p_equipo_id uuid,
  p_guardar_alias boolean DEFAULT false,
  p_alias text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_eq record;
  v_bitacora_id uuid;
  v_norm_alias text;
  v_trabajo text;
  v_fecha timestamptz;
BEGIN
  -- 1. Obtener y bloquear la fila pendiente
  SELECT * INTO v_rec
  FROM public.bitacora_importacion_pendiente
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Registro pendiente no encontrado.');
  END IF;

  IF v_rec.estado = 'Resuelto' THEN
    RETURN json_build_object('ok', true, 'already_resolved', true, 'message', 'El registro ya había sido resuelto.');
  END IF;

  -- 2. Validar que el equipo exista
  SELECT id, codigo, nombre, area INTO v_eq
  FROM public.equipo
  WHERE id = p_equipo_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'El activo oficial seleccionado no existe.');
  END IF;

  v_fecha := COALESCE(v_rec.fecha_hora, now());
  v_trabajo := COALESCE(NULLIF(TRIM(v_rec.trabajo_realizado), ''), 'Mantenimiento validado');

  -- 3. Insertar en bitacora_mantenimiento (si no existe ya idéntico)
  INSERT INTO public.bitacora_mantenimiento (
    fecha_hora,
    equipo_id,
    tecnico,
    es_falla,
    tipo_intervencion,
    falla_motivo,
    trabajo_realizado,
    estado_final,
    area,
    tipo_falla,
    origen,
    import_batch_id,
    created_by
  ) VALUES (
    v_fecha,
    p_equipo_id,
    COALESCE(NULLIF(TRIM(v_rec.tecnico), ''), 'Técnico no especificado'),
    COALESCE(v_rec.es_falla, false),
    CASE WHEN v_rec.es_falla THEN 'Correctiva' ELSE 'Preventiva' END,
    CASE WHEN v_rec.es_falla THEN COALESCE(v_rec.tipo_falla, v_trabajo) ELSE NULL END,
    v_trabajo,
    'Operativo',
    COALESCE(v_rec.area_origen, v_eq.area),
    CASE WHEN v_rec.es_falla THEN COALESCE(v_rec.tipo_falla, 'Mecánica') ELSE NULL END,
    'Validación de importación',
    v_rec.import_batch_id,
    p_user_id
  )
  RETURNING id INTO v_bitacora_id;

  -- 4. Actualizar bitacora_importacion_pendiente a Resuelto
  UPDATE public.bitacora_importacion_pendiente
  SET
    estado = 'Resuelto',
    equipo_id_resuelto = p_equipo_id,
    motivo_pendiente = 'Resuelto a ' || v_eq.nombre || ' [' || v_eq.codigo || ']',
    resolved_at = now(),
    resolved_by = p_user_id
  WHERE id = p_id;

  -- 5. Manejo de alias seguro
  IF p_guardar_alias AND p_alias IS NOT NULL AND TRIM(p_alias) <> '' THEN
    v_norm_alias := LOWER(TRIM(p_alias));
    IF v_norm_alias NOT IN (
      'produccion', 'producción', 'extrusion', 'extrusión', 'refrigeracion',
      'refrigeración', 'plasticos', 'plásticos', 'pet', 'cocina', 'soplado',
      'instalaciones', 'servicios generales', 'bodega', 'bodega tradicional',
      'planta', 'galpon', 'galpón'
    ) THEN
      BEGIN
        INSERT INTO public.equipo_alias (equipo_id, alias)
        VALUES (p_equipo_id, TRIM(p_alias))
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'bitacora_id', v_bitacora_id,
    'equipo_nombre', v_eq.nombre,
    'equipo_codigo', v_eq.codigo
  );
END;
$$;

-- 4. Función RPC atómica para ignorar un registro pendiente
CREATE OR REPLACE FUNCTION public.ignorar_importacion_pendiente(
  p_id uuid,
  p_motivo text DEFAULT 'Rutina operativa',
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motivo text;
BEGIN
  v_motivo := COALESCE(NULLIF(TRIM(p_motivo), ''), 'Rutina operativa');

  UPDATE public.bitacora_importacion_pendiente
  SET
    estado = 'Ignorado',
    motivo_pendiente = 'Ignorado: ' || v_motivo,
    motivo_ignorado = v_motivo,
    resolved_at = now(),
    resolved_by = p_user_id
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Registro no encontrado.');
  END IF;

  RETURN json_build_object('ok', true, 'id', p_id, 'motivo', v_motivo);
END;
$$;

-- 5. Función RPC atómica para validación masiva hacia un mismo activo
CREATE OR REPLACE FUNCTION public.resolver_importaciones_masivas(
  p_ids uuid[],
  p_equipo_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_res json;
  v_count integer := 0;
BEGIN
  FOREACH v_id IN ARRAY p_ids
  LOOP
    v_res := public.resolver_importacion_pendiente(v_id, p_equipo_id, false, NULL, p_user_id);
    IF (v_res->>'ok')::boolean = true THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('ok', true, 'count', v_count);
END;
$$;

-- 6. Permisos de ejecución sobre las funciones RPC
GRANT EXECUTE ON FUNCTION public.resolver_importacion_pendiente(uuid, uuid, boolean, text, uuid) TO mant_authenticated, mant_admin;
GRANT EXECUTE ON FUNCTION public.ignorar_importacion_pendiente(uuid, text, uuid) TO mant_authenticated, mant_admin;
GRANT EXECUTE ON FUNCTION public.resolver_importaciones_masivas(uuid[], uuid, uuid) TO mant_authenticated, mant_admin;

-- 7. Notificar a PostgREST para recargar el esquema de inmediato
NOTIFY pgrst, 'reload schema';

