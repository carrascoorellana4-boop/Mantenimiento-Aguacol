-- MIGRACIÓN 56: Crear activo e incorporación en árbol de activos para Iluminación de Galpón Cloro
-- Ubicación técnica padre: 'AGL-JJV-CLORO' (Galpón Cloro, ID: 3a6a0176-a513-4a0c-b0c3-44848d292728)

DO $$
DECLARE
  v_ut_id uuid := '3a6a0176-a513-4a0c-b0c3-44848d292728'; -- Galpón Cloro
  v_eq_id uuid;
BEGIN
  -- 1. Insertar el equipo si no existe
  SELECT id INTO v_eq_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-CLORO-ILU-01' OR codigo = 'AGL-SSGG-ILU-CLORO-01' OR lower(nombre) = lower('Sistema de iluminación Galpón Cloro');

  IF v_eq_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      ubicacion_tecnica_id,
      estado,
      criticidad,
      activo,
      observaciones_tecnicas,
      especificaciones_tecnicas
    ) VALUES (
      'AGL-JJV-CLORO-ILU-01',
      'Sistema de iluminación Galpón Cloro',
      'Producción / JJV',
      'Galpón de Cloro',
      v_ut_id,
      'Operativo',
      'Baja',
      true,
      'Sistema integral de iluminación y luminarias del Galpón de Cloro',
      '{"tipo": "Iluminación", "sector": "Galpón de Cloro"}'::jsonb
    ) RETURNING id INTO v_eq_id;
  ELSE
    -- Asegurar vinculación con la ubicación técnica de Galpón Cloro
    UPDATE public.equipo
    SET ubicacion_tecnica_id = v_ut_id,
        ubicacion = 'Galpón de Cloro',
        area = 'Producción / JJV',
        estado = 'Operativo',
        activo = true
    WHERE id = v_eq_id;
  END IF;

  -- 2. Registrar alias para búsqueda flexible en OTs y solicitudes
  INSERT INTO public.equipo_alias (alias, equipo_id, observacion, activo)
  VALUES 
    ('AGL-SSGG-ILU-CLORO-01', v_eq_id, 'Código alternativo servicios generales', true),
    ('Iluminación Galpón Cloro', v_eq_id, 'Nombre corto iluminación', true),
    ('Iluminación del galpón cloro', v_eq_id, 'Alias solicitud de planta', true)
  ON CONFLICT DO NOTHING;

END $$;

NOTIFY pgrst, 'reload schema';
