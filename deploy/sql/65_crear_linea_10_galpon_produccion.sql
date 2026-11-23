-- Migración 65: Crear Línea 10 en Galpón Producción (Producción / JJV)
-- Inserta JJV Línea 10 en la tabla equipo y sus alias correspondientes

DO $$
DECLARE
  v_ub_id uuid := 'af6a277e-c24b-4690-93e6-ead8f4434d35'; -- Galpón Producción
  v_eq_id uuid;
BEGIN
  -- 1. Insertar equipo JJV Línea 10 si no existe
  SELECT id INTO v_eq_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-PROD-L10' OR nombre = 'JJV Línea 10';

  IF v_eq_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      ubicacion,
      criticidad,
      estado,
      ubicacion_tecnica_id,
      area,
      activo,
      equipo_padre_id
    ) VALUES (
      'AGL-JJV-PROD-L10',
      'JJV Línea 10',
      'Galpón Producción',
      'Alta',
      'Activo',
      v_ub_id,
      'Producción / JJV',
      true,
      NULL
    )
    RETURNING id INTO v_eq_id;
  END IF;

  -- 2. Insertar alias "Línea 10" y "Linea 10" en equipo_alias si no existen
  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(alias) = 'línea 10' AND equipo_id = v_eq_id) THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Línea 10', v_eq_id, true, 'Alias histórico validado para bitácoras');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(alias) = 'linea 10' AND equipo_id = v_eq_id) THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Linea 10', v_eq_id, true, 'Alias sin tildes');
  END IF;

  -- 3. Si existe una tarea pendiente de importación asociada a "Línea 10", resolverla o asociarla
  UPDATE public.bitacora_importacion_pendiente
  SET motivo_pendiente = 'Asociado automáticamente a JJV Línea 10 [AGL-JJV-PROD-L10]'
  WHERE lower(nombre_equipo_origen) = 'línea 10' OR lower(nombre_equipo_origen) = 'linea 10';

END $$;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
