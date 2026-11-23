-- Migración 64: Imputación de horas de detención de equipos hijos hacia su activo padre en KPI
-- Si una falla ocurre en un componente/hijo (ej: Moledora M3), la detención de línea computa al activo padre (Extrusora M3)
-- manteniendo la trazabilidad técnica en la OT del hijo.

CREATE OR REPLACE FUNCTION public.validar_tiempo_detencion_ot(
  p_ot_id uuid,
  p_horas numeric,
  p_usuario text DEFAULT 'Administrador'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ot record;
  v_eq record;
  v_padre record;
  v_reg_id uuid;
  v_target_equipo_id uuid;
  v_codigo text;
  v_nombre text;
  v_area text;
  v_obs text;
  v_motivo text;
  v_fecha date;
  v_horas numeric;
BEGIN
  -- 1. Obtener y bloquear la OT
  SELECT * INTO v_ot
  FROM public.orden_trabajo
  WHERE id = p_ot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Orden de trabajo no encontrada');
  END IF;

  -- 2. Validar que la OT esté cerrada/finalizada
  IF LOWER(COALESCE(v_ot.estado, '')) <> 'finalizada' THEN
    RETURN json_build_object('ok', false, 'error', 'Solo es posible validar tiempos de Órdenes de Trabajo cerradas/finalizadas.');
  END IF;

  -- 3. Validar que tenga tiempo de detención mayor a 0
  v_horas := ROUND(COALESCE(p_horas, (COALESCE(v_ot.tiempo_detencion_minutos, 0)::numeric / 60.0)), 2);
  IF v_horas <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'La orden de trabajo debe registrar un tiempo de detención mayor a 0 horas para ser imputada en KPI.');
  END IF;

  -- 4. Obtener equipo si está asociado, y si es hijo, resolver su equipo padre principal
  IF v_ot.equipo_id IS NOT NULL THEN
    SELECT * INTO v_eq
    FROM public.equipo
    WHERE id = v_ot.equipo_id;

    -- Si el equipo tiene padre registrado, la detención de línea computa a la máquina principal (padre)
    IF v_eq.equipo_padre_id IS NOT NULL THEN
      SELECT * INTO v_padre
      FROM public.equipo
      WHERE id = v_eq.equipo_padre_id;
    END IF;
  END IF;

  v_fecha := COALESCE(v_ot.fecha_reporte::date, CURRENT_DATE);

  -- 5. Determinar activo de imputación en KPI (Padre si existe, o el propio equipo)
  IF v_padre.id IS NOT NULL THEN
    v_target_equipo_id := v_padre.id;
    v_codigo := COALESCE(v_padre.codigo, 'EQ-PLANTA');
    v_nombre := COALESCE(v_padre.nombre, 'Equipo Principal');
    v_area := COALESCE(v_padre.area, v_eq.area, v_ot.area, 'Producción');
    v_obs := 'Horas imputadas a ' || v_padre.nombre || ' por detención en componente ' || v_eq.nombre || ' (' || COALESCE(v_ot.codigo_ot, 'OT') || ' - ' || COALESCE(v_ot.tiempo_detencion_minutos, 0)::text || ' min reportados)';
    v_motivo := v_eq.nombre || ': ' || COALESCE(v_ot.trabajo, 'Falla en componente');
  ELSE
    v_target_equipo_id := v_ot.equipo_id;
    v_codigo := COALESCE(v_eq.codigo, 'EQ-PLANTA');
    v_nombre := COALESCE(v_eq.nombre, v_ot.equipo_solicitado, 'Equipo en planta');
    v_area := COALESCE(v_eq.area, v_ot.area, 'Producción');
    v_obs := 'Horas imputadas automáticamente desde ' || COALESCE(v_ot.codigo_ot, 'OT') || ' (' || COALESCE(v_ot.tiempo_detencion_minutos, 0)::text || ' min reportados)';
    v_motivo := COALESCE(v_ot.trabajo, 'Intervención correctiva validada desde OT');
  END IF;

  -- 6. Si ya existía un registro de disponibilidad vinculado a esta OT, limpiarlo primero
  IF v_ot.kpi_registro_id IS NOT NULL THEN
    DELETE FROM public.registro_disponibilidad WHERE id = v_ot.kpi_registro_id;
  END IF;

  -- 7. Insertar el registro formal en registro_disponibilidad asignado al activo principal
  INSERT INTO public.registro_disponibilidad (
    id,
    fecha,
    equipo_id,
    codigo_equipo,
    nombre_equipo,
    area,
    linea,
    horas_disponibles,
    horas_mantencion,
    tipo_detencion,
    motivo,
    turno,
    observaciones,
    origen_importacion,
    registrado_por,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_fecha,
    v_target_equipo_id,
    v_codigo,
    v_nombre,
    v_area,
    COALESCE(v_ot.ubicacion, v_area),
    24,
    v_horas,
    'Mantenimiento Correctivo OT',
    v_motivo,
    'Diurno',
    v_obs,
    'ot_tiempo_detencion',
    COALESCE(p_usuario, 'Administrador'),
    NOW()
  )
  RETURNING id INTO v_reg_id;

  -- 8. Actualizar la OT como validada (conservando equipo_id original en la OT)
  UPDATE public.orden_trabajo
  SET
    kpi_validado = true,
    kpi_validado_el = NOW(),
    kpi_validado_por = COALESCE(p_usuario, 'Administrador'),
    kpi_omitido = false,
    kpi_horas_aprobadas = v_horas,
    kpi_registro_id = v_reg_id,
    updated_at = NOW()
  WHERE id = p_ot_id;

  RETURN json_build_object(
    'ok', true,
    'registro_id', v_reg_id,
    'codigo_ot', v_ot.codigo_ot,
    'horas', v_horas,
    'equipo', v_nombre,
    'equipo_origen', COALESCE(v_eq.nombre, v_nombre)
  );
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.validar_tiempo_detencion_ot(uuid, numeric, text) TO mant_admin, mant_authenticated;

-- Actualizar registros históricos ya existentes de componentes hijos para imputarlos a su padre
UPDATE public.registro_disponibilidad rd
SET
  equipo_id = p.id,
  codigo_equipo = p.codigo,
  nombre_equipo = p.nombre,
  area = COALESCE(p.area, rd.area),
  observaciones = 'Horas imputadas a ' || p.nombre || ' por detención en ' || e.nombre || ' (OT histórica)',
  motivo = e.nombre || ': ' || rd.motivo
FROM public.equipo e
JOIN public.equipo p ON e.equipo_padre_id = p.id
WHERE rd.equipo_id = e.id AND rd.origen_importacion = 'ot_tiempo_detencion';

NOTIFY pgrst, 'reload schema';
