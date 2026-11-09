-- ============================================================================
-- MIGRACIÓN 46: Agregar Horno y Selladora como equipos hijos en Línea 2 y Línea 3
-- de Producción / JJV en el árbol de activos.
-- ============================================================================

DO $$
DECLARE
  v_ut_prod_id uuid := 'af6a277e-c24b-4690-93e6-ead8f4434d35'; -- Galpón Producción
  v_l02_id uuid := '0ca16367-c687-4bc3-a04f-f9e3cfaf7bca';     -- JJV Línea 2
  v_l03_id uuid := '5733ca37-020f-4a57-bd43-29ea4f005cfc';     -- JJV Línea 3
  v_horno_l02_id uuid;
  v_sell_l02_id uuid;
  v_sell_l03_id uuid;
BEGIN
  -- 1. Horno de producción Línea 2
  SELECT id INTO v_horno_l02_id FROM public.equipo WHERE codigo = 'AGL-JJV-PROD-L02-HOR';
  IF v_horno_l02_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      equipo_padre_id,
      criticidad,
      activo,
      estado,
      observaciones_tecnicas
    ) VALUES (
      'AGL-JJV-PROD-L02-HOR',
      'Horno de producción',
      'Producción / JJV',
      'Galpón de Producción - Línea 2',
      v_ut_prod_id,
      v_l02_id,
      'Alta',
      true,
      'Activo',
      'Horno perteneciente estructuralmente a JJV Línea 2'
    )
    RETURNING id INTO v_horno_l02_id;
  END IF;

  -- 2. Selladora de producción Línea 2
  SELECT id INTO v_sell_l02_id FROM public.equipo WHERE codigo = 'AGL-JJV-PROD-L02-SELL';
  IF v_sell_l02_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      equipo_padre_id,
      criticidad,
      activo,
      estado,
      observaciones_tecnicas
    ) VALUES (
      'AGL-JJV-PROD-L02-SELL',
      'Selladora de producción',
      'Producción / JJV',
      'Galpón de Producción - Línea 2',
      v_ut_prod_id,
      v_l02_id,
      'Media',
      true,
      'Activo',
      'Selladora perteneciente estructuralmente a JJV Línea 2'
    )
    RETURNING id INTO v_sell_l02_id;
  END IF;

  -- 3. Selladora de producción Línea 3
  SELECT id INTO v_sell_l03_id FROM public.equipo WHERE codigo = 'AGL-JJV-PROD-L03-SELL';
  IF v_sell_l03_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      equipo_padre_id,
      criticidad,
      activo,
      estado,
      observaciones_tecnicas
    ) VALUES (
      'AGL-JJV-PROD-L03-SELL',
      'Selladora de producción',
      'Producción / JJV',
      'Galpón de Producción - Línea 3',
      v_ut_prod_id,
      v_l03_id,
      'Media',
      true,
      'Activo',
      'Selladora perteneciente estructuralmente a JJV Línea 3'
    )
    RETURNING id INTO v_sell_l03_id;
  END IF;

  -- 4. Registrar alias para reconocimiento
  INSERT INTO public.equipo_alias (equipo_id, alias, observacion)
  VALUES
    (v_horno_l02_id, 'Horno Línea 2', 'Alias horno L2'),
    (v_horno_l02_id, 'Horno Linea 2', 'Alias sin tildes'),
    (v_sell_l02_id, 'Selladora Línea 2', 'Alias selladora L2'),
    (v_sell_l02_id, 'Selladora Linea 2', 'Alias sin tildes'),
    (v_sell_l03_id, 'Selladora Línea 3', 'Alias selladora L3'),
    (v_sell_l03_id, 'Selladora Linea 3', 'Alias sin tildes')
  ON CONFLICT DO NOTHING;

END $$;

NOTIFY pgrst, 'reload schema';
