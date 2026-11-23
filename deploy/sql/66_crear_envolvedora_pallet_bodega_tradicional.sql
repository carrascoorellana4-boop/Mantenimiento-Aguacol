-- Migración 66: Crear activo Envolvedora de pallet en Bodega Tradicional
-- Inserta Envolvedora de pallet en Bodega Tradicional en la tabla equipo y sus alias correspondientes

DO $$
DECLARE
  v_ub_id uuid := 'c41baed4-7e69-46ef-bb2c-9fad76ada0f1'; -- Bodega Tradicional
  v_eq_id uuid;
BEGIN
  -- Limpiar aliases previos erróneamente asociados a Plásticos durante el intento anterior
  DELETE FROM public.equipo_alias 
  WHERE lower(btrim(alias)) IN (
    'envolvedora bodega tradicional',
    'paletizadora bodega retail',
    'envolvedora bodega'
  );

  -- 1. Insertar equipo Envolvedora de pallet en Bodega Tradicional si no existe
  SELECT id INTO v_eq_id
  FROM public.equipo
  WHERE codigo = 'AGL-BOD-ENV-01' OR (lower(nombre) = 'envolvedora de pallet' AND area = 'Bodega Tradicional');

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
      'AGL-BOD-ENV-01',
      'Envolvedora de pallet',
      'Bodega Tradicional',
      'Media',
      'Activo',
      v_ub_id,
      'Bodega Tradicional',
      true,
      NULL
    )
    RETURNING id INTO v_eq_id;
  END IF;

  -- 2. Insertar aliases en equipo_alias para el nuevo equipo de Bodega Tradicional
  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora bodega tradicional') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora Bodega Tradicional', v_eq_id, true, 'Alias contextual de área');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'paletizadora bodega retail') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Paletizadora Bodega Retail', v_eq_id, true, 'Denominación operativa en planta');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora bodega') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora Bodega', v_eq_id, true, 'Alias corto bodega');
  END IF;

  -- 3. Si existe una tarea pendiente de importación asociada a "Paletizadora Bodega Retail", asociarla
  UPDATE public.bitacora_importacion_pendiente
  SET motivo_pendiente = 'Asociado automáticamente a Envolvedora de pallet [AGL-BOD-ENV-01]'
  WHERE lower(nombre_equipo_origen) = 'paletizadora bodega retail';

END $$;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
