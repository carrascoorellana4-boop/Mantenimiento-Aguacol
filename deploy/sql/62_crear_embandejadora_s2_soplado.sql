-- Migración 62: Añadir Embandejadora como equipo hijo de S2 en Soplado
-- Ubicación: Nave Soplado - Línea 2
-- Padre: S2 (AGL-SOP-S02)

DO $$
DECLARE
  v_s2_id uuid;
  v_ubicacion_id uuid;
  v_embandejadora_id uuid;
BEGIN
  -- 1. Obtener ID de S2 y su ubicación técnica (Soplado)
  SELECT id, ubicacion_tecnica_id INTO v_s2_id, v_ubicacion_id
  FROM public.equipo
  WHERE codigo = 'AGL-SOP-S02';

  IF v_s2_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el equipo S2 con código AGL-SOP-S02';
  END IF;

  -- 2. Verificar o insertar Embandejadora
  SELECT id INTO v_embandejadora_id
  FROM public.equipo
  WHERE codigo = 'AGL-SOP-S02-EMB' OR (nombre ILIKE 'Embandejadora%' AND equipo_padre_id = v_s2_id);

  IF v_embandejadora_id IS NULL THEN
    INSERT INTO public.equipo (
      id,
      codigo,
      nombre,
      ubicacion,
      criticidad,
      estado,
      ubicacion_tecnica_id,
      area,
      activo,
      equipo_padre_id,
      observaciones_tecnicas
    ) VALUES (
      gen_random_uuid(),
      'AGL-SOP-S02-EMB',
      'Embandejadora',
      'Soplado',
      'Media',
      'Activo',
      v_ubicacion_id,
      'Soplado',
      true,
      v_s2_id,
      'Embandejadora perteneciente estructuralmente a S2 en Nave Soplado'
    )
    RETURNING id INTO v_embandejadora_id;

    RAISE NOTICE 'Embandejadora creada con ID % vinculada a S2 (%)', v_embandejadora_id, v_s2_id;
  ELSE
    UPDATE public.equipo
    SET
      codigo = 'AGL-SOP-S02-EMB',
      nombre = 'Embandejadora',
      ubicacion = 'Soplado',
      area = 'Soplado',
      activo = true,
      equipo_padre_id = v_s2_id,
      ubicacion_tecnica_id = v_ubicacion_id
    WHERE id = v_embandejadora_id;

    RAISE NOTICE 'Embandejadora actualizada con ID % vinculada a S2 (%)', v_embandejadora_id, v_s2_id;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
