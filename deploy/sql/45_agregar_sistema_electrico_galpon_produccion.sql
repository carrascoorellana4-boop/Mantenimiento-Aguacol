-- ============================================================================
-- MIGRACIÓN 45: Agregar Sistema eléctrico galpón producción en Servicios Generales
-- y resolver la tarea pendiente de reparación de enchufes de producción.
-- ============================================================================

DO $$
DECLARE
  v_ut_prod_id uuid := 'af6a277e-c24b-4690-93e6-ead8f4434d35'; -- Galpón Producción (AGL-JJV-PROD)
  v_eq_id uuid;
  v_pend_id uuid := 'da334e58-1111-49db-8e20-aae10ef74953';
  v_pend record;
BEGIN
  -- 1. Insertar el activo en public.equipo si no existe
  SELECT id INTO v_eq_id
  FROM public.equipo
  WHERE codigo = 'AGL-SSGG-ELEC-PROD-01';

  IF v_eq_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      criticidad,
      activo,
      estado,
      observaciones_tecnicas
    ) VALUES (
      'AGL-SSGG-ELEC-PROD-01',
      'Sistema eléctrico galpón producción',
      'Servicios Generales',
      'AGUACOL → Servicios Generales (Referencia física: Galpón Producción)',
      v_ut_prod_id,
      'Media',
      true,
      'Activo',
      'Sistema integral de distribución eléctrica, enchufes e iluminación secundaria del Galpón de Producción'
    )
    RETURNING id INTO v_eq_id;
  END IF;

  -- 2. Crear alias para reconocimiento automático
  INSERT INTO public.equipo_alias (equipo_id, alias, observacion)
  VALUES
    (v_eq_id, 'Sistema eléctrico galpón producción', 'Alias oficial Servicios Generales'),
    (v_eq_id, 'Sistema electrico galpon produccion', 'Alias normalizado sin tildes'),
    (v_eq_id, 'Sistema eléctrico producción', 'Alias corto'),
    (v_eq_id, 'Enchufes producción', 'Alias funcional'),
    (v_eq_id, 'Enchufe de producción', 'Alias verbatim'),
    (v_eq_id, 'Enchufe producción', 'Alias directo'),
    (v_eq_id, 'Enchufes galpón producción', 'Alias de ubicación')
  ON CONFLICT DO NOTHING;

  -- 3. Resolver la tarea pendiente
  SELECT * INTO v_pend
  FROM public.bitacora_importacion_pendiente
  WHERE id = v_pend_id;

  IF FOUND AND v_pend.estado = 'Pendiente' THEN
    -- Insertar en bitacora_mantenimiento
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
      COALESCE(v_pend.tecnico, 'Victor Muñoz'),
      COALESCE(v_pend.es_falla, false),
      'Correctiva',
      'Reparación de enchufes de producción',
      v_pend.trabajo_realizado,
      'Operativo',
      'Servicios Generales',
      'Eléctrica / Control',
      'Validación de importación',
      v_pend.import_batch_id,
      v_pend.created_by
    );

    -- Actualizar estado a Resuelto
    UPDATE public.bitacora_importacion_pendiente
    SET
      estado = 'Resuelto',
      equipo_id_resuelto = v_eq_id,
      motivo_pendiente = 'Resuelto a Sistema eléctrico galpón producción [AGL-SSGG-ELEC-PROD-01]',
      resolved_at = now(),
      resolved_by = v_pend.created_by
    WHERE id = v_pend_id;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
