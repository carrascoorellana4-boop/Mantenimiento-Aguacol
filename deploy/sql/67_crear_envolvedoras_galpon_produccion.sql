-- Migración 67: Crear Envolvedora de pallet 1 y 2 en Galpón Producción (Producción / JJV)
-- Inserta Envolvedora de pallet 1 y Envolvedora de pallet 2 en la tabla equipo y sus alias correspondientes

DO $$
DECLARE
  v_ub_id uuid := 'af6a277e-c24b-4690-93e6-ead8f4434d35'; -- Galpón Producción
  v_eq1_id uuid;
  v_eq2_id uuid;
BEGIN
  -- 1. Insertar Envolvedora de pallet 1 si no existe
  SELECT id INTO v_eq1_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-PROD-ENV-01' OR (lower(nombre) = 'envolvedora de pallet 1' AND area = 'Producción / JJV');

  IF v_eq1_id IS NULL THEN
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
      'AGL-JJV-PROD-ENV-01',
      'Envolvedora de pallet 1',
      'Galpón Producción',
      'Media',
      'Activo',
      v_ub_id,
      'Producción / JJV',
      true,
      NULL
    )
    RETURNING id INTO v_eq1_id;
  END IF;

  -- 2. Insertar Envolvedora de pallet 2 si no existe
  SELECT id INTO v_eq2_id
  FROM public.equipo
  WHERE codigo = 'AGL-JJV-PROD-ENV-02' OR (lower(nombre) = 'envolvedora de pallet 2' AND area = 'Producción / JJV');

  IF v_eq2_id IS NULL THEN
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
      'AGL-JJV-PROD-ENV-02',
      'Envolvedora de pallet 2',
      'Galpón Producción',
      'Media',
      'Activo',
      v_ub_id,
      'Producción / JJV',
      true,
      NULL
    )
    RETURNING id INTO v_eq2_id;
  END IF;

  -- 3. Aliases para Envolvedora de pallet 1
  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora 1') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora 1', v_eq1_id, true, 'Alias corto');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora produccion 1') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora Producción 1', v_eq1_id, true, 'Alias área');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora de pallet 1') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora de pallet 1', v_eq1_id, true, 'Nombre oficial');
  END IF;

  -- 4. Aliases para Envolvedora de pallet 2
  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora 2') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora 2', v_eq2_id, true, 'Alias corto');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora produccion 2') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora Producción 2', v_eq2_id, true, 'Alias área');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.equipo_alias WHERE lower(btrim(alias)) = 'envolvedora de pallet 2') THEN
    INSERT INTO public.equipo_alias (alias, equipo_id, activo, observacion)
    VALUES ('Envolvedora de pallet 2', v_eq2_id, true, 'Nombre oficial');
  END IF;

END $$;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
