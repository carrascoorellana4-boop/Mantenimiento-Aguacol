-- ============================================================================
-- MIGRACIÓN 44: Agregar bombas de alimentación de estanque de cloro en Galpón Cloro
-- y resolver la tarea pendiente asignándola a la Bomba 2.
-- ============================================================================

DO $$
DECLARE
  v_ut_cloro_id uuid := '3a6a0176-a513-4a0c-b0c3-44848d292728'; -- Galpón Cloro (AGL-JJV-CLORO)
  v_bomba1_id uuid;
  v_bomba2_id uuid;
  v_pend_id uuid := 'd0d5df22-e3c8-4ed7-a72c-9a83f8d731b8';
  v_pend record;
BEGIN
  -- 1. Insertar Bomba de Alimentación Estanque Cloro 1 si no existe
  SELECT id INTO v_bomba1_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-CLORO-BOM-01';

  IF v_bomba1_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      criticidad,
      activo,
      estado
    ) VALUES (
      'AGL-JJV-CLORO-BOM-01',
      'Bomba de Alimentación Estanque Cloro 1',
      'Producción / JJV',
      'Galpón de Cloro',
      v_ut_cloro_id,
      'Media',
      true,
      'Activo'
    )
    RETURNING id INTO v_bomba1_id;
  END IF;

  -- 2. Insertar Bomba de Alimentación Estanque Cloro 2 si no existe
  SELECT id INTO v_bomba2_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-CLORO-BOM-02';

  IF v_bomba2_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      criticidad,
      activo,
      estado
    ) VALUES (
      'AGL-JJV-CLORO-BOM-02',
      'Bomba de Alimentación Estanque Cloro 2',
      'Producción / JJV',
      'Galpón de Cloro',
      v_ut_cloro_id,
      'Media',
      true,
      'Activo'
    )
    RETURNING id INTO v_bomba2_id;
  END IF;

  -- 3. Crear alias para reconocimiento automático
  INSERT INTO public.equipo_alias (equipo_id, alias, observacion)
  VALUES
    (v_bomba1_id, 'Bomba de Alimentación Estanque Cloro 1', 'Alias oficial Galpón Cloro'),
    (v_bomba1_id, 'Bomba de alimentacion estanque cloro 1', 'Alias normalizado'),
    (v_bomba1_id, 'Bomba Cloro 1', 'Alias corto'),
    (v_bomba1_id, 'Bomba de cloro 1', 'Alias corto minúscula'),
    (v_bomba2_id, 'Bomba de Alimentación Estanque Cloro 2', 'Alias oficial Galpón Cloro'),
    (v_bomba2_id, 'Bomba de alimentacion estanque cloro 2', 'Alias normalizado'),
    (v_bomba2_id, 'Bomba Cloro 2', 'Alias corto'),
    (v_bomba2_id, 'Bomba de cloro 2', 'Alias corto minúscula')
  ON CONFLICT DO NOTHING;

  -- 4. Resolver la tarea pendiente si existe
  SELECT * INTO v_pend
  FROM public.bitacora_importacion_pendiente
  WHERE id = v_pend_id;

  IF FOUND AND v_pend.estado = 'Pendiente' THEN
    -- Insertar intervención en bitacora_mantenimiento
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
      COALESCE(v_pend.fecha_hora, now()),
      v_bomba2_id,
      COALESCE(v_pend.tecnico, 'Elias Gonzalez'),
      COALESCE(v_pend.es_falla, false),
      'Correctiva',
      'Reposición de tapa de bomba',
      v_pend.trabajo_realizado,
      'Operativo',
      'Producción / JJV',
      'Mecánica',
      'Validación de importación',
      v_pend.import_batch_id,
      v_pend.created_by
    );

    -- Actualizar estado a Resuelto
    UPDATE public.bitacora_importacion_pendiente
    SET
      estado = 'Resuelto',
      equipo_id_resuelto = v_bomba2_id,
      motivo_pendiente = 'Resuelto a Bomba de Alimentación Estanque Cloro 2 [AGL-JJV-CLORO-BOM-02]',
      resolved_at = now(),
      resolved_by = v_pend.created_by
    WHERE id = v_pend_id;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
