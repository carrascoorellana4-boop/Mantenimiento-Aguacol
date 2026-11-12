-- MIGRACIÓN 58: Crear activo para Banco de Trasvasije de Cloro en Sector Cloro
-- Ubicación técnica: 'AGL-JJV-CLORO' (Galpón Cloro, ID: 3a6a0176-a513-4a0c-b0c3-44848d292728)

DO $$
DECLARE
  v_ut_id uuid := '3a6a0176-a513-4a0c-b0c3-44848d292728'; -- Galpón Cloro
  v_eq_id uuid;
BEGIN
  -- 1. Banco de Trasvasije de Cloro
  SELECT id INTO v_eq_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-CLORO-BAN-TRS' 
     OR lower(nombre) = lower('Banco de trasvasije de cloro')
     OR lower(nombre) = lower('Banco de Trasvasije de Cloro');

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
      'AGL-JJV-CLORO-BAN-TRS',
      'Banco de trasvasije de cloro',
      'Producción / JJV',
      'Galpón de Cloro',
      v_ut_id,
      'Operativo',
      'Media',
      true,
      'Banco de trasvasije, llenado y trasvase de cloro',
      '{"tipo": "Banco de Trasvasije", "sector": "Galpón de Cloro"}'::jsonb
    ) RETURNING id INTO v_eq_id;
  ELSE
    UPDATE public.equipo
    SET ubicacion_tecnica_id = v_ut_id,
        ubicacion = 'Galpón de Cloro',
        area = 'Producción / JJV',
        estado = 'Operativo',
        activo = true
    WHERE id = v_eq_id;
  END IF;

  -- Alias Banco de Trasvasije
  INSERT INTO public.equipo_alias (alias, equipo_id, observacion, activo)
  VALUES 
    ('Banco de Trasvasije de Cloro', v_eq_id, 'Nombre capitalizado', true),
    ('Banco de trasvasije', v_eq_id, 'Nombre corto', true),
    ('Banco trasvasije cloro', v_eq_id, 'Alias rápido', true),
    ('AGL-JJV-CLORO-TRS-01', v_eq_id, 'Código alternativo TRS', true)
  ON CONFLICT DO NOTHING;

END $$;

NOTIFY pgrst, 'reload schema';
