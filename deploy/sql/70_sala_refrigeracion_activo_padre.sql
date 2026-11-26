-- Migración 70: Creación de activo padre "Sala de Refrigeración" y reasignación de componentes hijos
-- La Bomba de Refrigeración M1 (y los demás activos de refrigeración) pertenecen a la Sala de Refrigeración
-- y al área Servicios Generales, saliendo de los KPI de producción de Plásticos.

DO $$
DECLARE
  v_sala_id uuid;
BEGIN
  -- 1. Buscar o crear el activo padre 'Sala de Refrigeración'
  SELECT id INTO v_sala_id
  FROM public.equipo
  WHERE codigo = 'AGL-REF-SALA' OR nombre = 'Sala de Refrigeración'
  LIMIT 1;

  IF v_sala_id IS NULL THEN
    INSERT INTO public.equipo (
      codigo,
      nombre,
      area,
      ubicacion,
      criticidad,
      estado,
      activo,
      equipo_padre_id
    ) VALUES (
      'AGL-REF-SALA',
      'Sala de Refrigeración',
      'Servicios Generales',
      'Sala de Refrigeración',
      'Media',
      'Operativo',
      true,
      NULL
    )
    RETURNING id INTO v_sala_id;
    RAISE NOTICE 'Activo padre Sala de Refrigeración creado con ID %', v_sala_id;
  ELSE
    UPDATE public.equipo
    SET area = 'Servicios Generales',
        ubicacion = 'Sala de Refrigeración',
        equipo_padre_id = NULL
    WHERE id = v_sala_id;
    RAISE NOTICE 'Activo padre Sala de Refrigeración ya existía con ID %', v_sala_id;
  END IF;

  -- 2. Asignar 'Bomba de Refrigeración M1' (y demás equipos de la sala) a la Sala de Refrigeración
  -- Actualizando equipo_padre_id y cambiando el área a 'Servicios Generales'
  UPDATE public.equipo
  SET equipo_padre_id = v_sala_id,
      area = 'Servicios Generales'
  WHERE id <> v_sala_id
    AND (
      codigo = 'AGL-PLA-REF-BOM-M01'
      OR ubicacion = 'Sala de Refrigeración'
      OR area = 'Plásticos / Refrigeración'
    );

  -- 3. Reasignar en registro_disponibilidad el registro originado por OT-000061 (Bomba M1) hacia Sala de Refrigeración bajo Servicios Generales
  UPDATE public.registro_disponibilidad
  SET equipo_id = v_sala_id,
      codigo_equipo = 'AGL-REF-SALA',
      nombre_equipo = 'Sala de Refrigeración',
      area = 'Servicios Generales',
      motivo = 'Bomba de Refrigeración M1: OT-000061: tapa lateral filtra constantemente',
      observaciones = 'Horas imputadas a Sala de Refrigeración por detención en componente Bomba de Refrigeración M1 (OT-000061 - 120 min reportados). Validado por acarrasco@aguacol.cl.'
  WHERE codigo_equipo = 'AGL-PLA-REF-BOM-M01'
     OR nombre_equipo ILIKE '%Bomba de Refrigeración M1%'
     OR motivo ILIKE '%OT-000061%';

  -- 4. Actualizar OT-000061 en orden_trabajo para reflejar el área Servicios Generales
  UPDATE public.orden_trabajo
  SET area = 'Servicios Generales'
  WHERE codigo_ot = 'OT-000061' OR id = 'ba89f871-c753-404b-9507-be6d75d979fb';

  -- 5. Actualizar cualquier otra OT asociada a equipos de Sala de Refrigeración
  UPDATE public.orden_trabajo
  SET area = 'Servicios Generales'
  WHERE area = 'Plásticos / Refrigeración';

END $$;

NOTIFY pgrst, 'reload schema';
