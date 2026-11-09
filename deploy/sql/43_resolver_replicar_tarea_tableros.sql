-- ============================================================================
-- MIGRACIÓN 43: Resolución manual y réplica de intervención de tableros
-- Replicar la mantención de tableros de sala de bombas, extrusoras e inyección
-- en M1, M2, M3, M4, M5, Inyectora 2, Inyectora Borche, Inyectora de preformas 1 e Inyectora de preformas 2.
-- ============================================================================

DO $$
DECLARE
  v_pend_id uuid := '9b18fa90-e47f-46a0-94a7-cddfa8f5f2c9';
  v_pend record;
  v_eq_ids uuid[] := ARRAY[
    'f3391b9c-1b29-4dab-9038-03feb1f0e258'::uuid, -- Extrusora M1
    '0a48f66e-fcec-446d-a10e-0293df79ef25'::uuid, -- Extrusora M2
    '4dd7f22f-0d8e-491d-bf96-1bcf86f8e749'::uuid, -- Extrusora M3
    '8584e91c-9d3b-4c04-8c1a-3c5f006ddd3f'::uuid, -- Extrusora M4
    '37599bdc-7394-45cb-9d5e-77b5d06745cc'::uuid, -- Extrusora M5
    'bec7a55c-bf6c-4060-82c4-a74d009ef4e7'::uuid, -- Inyectora 2 de Tapas/Manillas
    'd5164976-93fa-4076-b887-9ddf38854b00'::uuid, -- Inyectora BORCHE BS150-III
    'b9a7accc-adf7-4203-84cf-c55e887bfab9'::uuid, -- Inyectora de preformas 1
    '0335d2bf-5211-48b4-830f-20574c0cea2d'::uuid  -- Inyectora de preformas 2
  ];
  v_eq_id uuid;
  v_eq record;
BEGIN
  -- 1. Obtener datos de la tarea pendiente
  SELECT * INTO v_pend
  FROM public.bitacora_importacion_pendiente
  WHERE id = v_pend_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Tarea pendiente % no encontrada o ya resuelta.', v_pend_id;
    RETURN;
  END IF;

  -- 2. Insertar en bitacora_mantenimiento para cada uno de los 9 equipos
  FOREACH v_eq_id IN ARRAY v_eq_ids
  LOOP
    SELECT id, codigo, nombre, area INTO v_eq
    FROM public.equipo
    WHERE id = v_eq_id;

    -- Evitar duplicados si ya existiera
    IF NOT EXISTS (
      SELECT 1 FROM public.bitacora_mantenimiento
      WHERE equipo_id = v_eq_id
        AND fecha_hora = v_pend.fecha_hora
        AND trabajo_realizado = v_pend.trabajo_realizado
    ) THEN
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
        v_eq_id,
        COALESCE(v_pend.tecnico, 'Elias Gonzalez'),
        COALESCE(v_pend.es_falla, false),
        'Preventiva',
        NULL,
        v_pend.trabajo_realizado,
        'Operativo',
        COALESCE(v_eq.area, 'Plásticos'),
        NULL,
        'Validación de importación',
        v_pend.import_batch_id,
        v_pend.created_by
      );
    END IF;
  END LOOP;

  -- 3. Marcar la tarea pendiente como Resuelto
  UPDATE public.bitacora_importacion_pendiente
  SET
    estado = 'Resuelto',
    equipo_id_resuelto = 'f3391b9c-1b29-4dab-9038-03feb1f0e258', -- M1 como referencia principal
    motivo_pendiente = 'Resuelto y replicado en M1, M2, M3, M4, M5, Inyectora 2, Inyectora Borche, Inyectora Preformas 1 e Inyectora Preformas 2',
    resolved_at = now(),
    resolved_by = v_pend.created_by
  WHERE id = v_pend_id;

END $$;

NOTIFY pgrst, 'reload schema';

