-- Migración 68: Reasignar tarea de Abraham Martinez a Willi Orellana y restringir asignación a técnicos del catálogo oficial

-- 1. Actualizar registros existentes de Abraham Martinez a Willi Orellana en bitácora de mantenimiento
UPDATE public.bitacora_mantenimiento
SET
  tecnico = 'Willi Orellana',
  updated_at = now()
WHERE id = 'f52ed7d5-dffa-48f2-9002-e51aa4545318'
   OR tecnico ILIKE '%Abraham Martinez%';

-- 2. Actualizar registro en bitácora de importación pendiente para consistencia histórica
UPDATE public.bitacora_importacion_pendiente
SET
  tecnico = 'Willi Orellana'
WHERE id = '18c8298e-8973-440d-be9f-15cee73f53ff'
   OR tecnico ILIKE '%Abraham Martinez%';

-- 3. Actualizar función RPC resolver_importacion_pendiente para permitir asignar o corregir el técnico con uno del catálogo oficial
DROP FUNCTION IF EXISTS public.resolver_importacion_pendiente(uuid, uuid, boolean, text, uuid);

CREATE OR REPLACE FUNCTION public.resolver_importacion_pendiente(
  p_id uuid,
  p_equipo_id uuid,
  p_guardar_alias boolean DEFAULT false,
  p_alias text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_tecnico text DEFAULT NULL
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
  v_tecnico_final text;
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
  v_tecnico_final := COALESCE(NULLIF(TRIM(p_tecnico), ''), NULLIF(TRIM(v_rec.tecnico), ''), 'Técnico no especificado');

  -- 3. Insertar en bitacora_mantenimiento
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
    v_tecnico_final,
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
    tecnico = v_tecnico_final,
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
    'equipo_codigo', v_eq.codigo,
    'tecnico', v_tecnico_final
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_importacion_pendiente(uuid, uuid, boolean, text, uuid, text) TO mant_authenticated, mant_admin;

-- 4. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
