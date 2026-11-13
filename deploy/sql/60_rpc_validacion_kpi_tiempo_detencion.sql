-- Migración 60: RPCs transaccionales con SECURITY DEFINER para validación de tiempos perdidos de OT para KPI
-- Garantiza ejecución atómica y sin bloqueos de RLS.

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
  v_reg_id uuid;
  v_codigo text;
  v_nombre text;
  v_area text;
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

  -- 2. Obtener equipo si está asociado
  IF v_ot.equipo_id IS NOT NULL THEN
    SELECT * INTO v_eq
    FROM public.equipo
    WHERE id = v_ot.equipo_id;
  END IF;

  v_horas := ROUND(COALESCE(p_horas, (COALESCE(v_ot.tiempo_detencion_minutos, 0)::numeric / 60.0)), 2);
  v_fecha := COALESCE(v_ot.fecha_reporte::date, CURRENT_DATE);
  v_codigo := COALESCE(v_eq.codigo, 'EQ-PLANTA');
  v_nombre := COALESCE(v_eq.nombre, v_ot.equipo_solicitado, 'Equipo en planta');
  v_area := COALESCE(v_eq.area, v_ot.area, 'Producción');

  -- 3. Si ya existía un registro de disponibilidad vinculado a esta OT, limpiarlo primero
  IF v_ot.kpi_registro_id IS NOT NULL THEN
    DELETE FROM public.registro_disponibilidad WHERE id = v_ot.kpi_registro_id;
  END IF;

  -- 4. Insertar el registro formal en registro_disponibilidad (sin columna generada disponibilidad_pct)
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
    horas_efectivas_mantenimiento,
    turnos_produccion,
    turnos_mantencion,
    tipo_detencion,
    motivo,
    turno,
    observaciones,
    origen_importacion,
    registrado_por,
    cobertura
  ) VALUES (
    gen_random_uuid(),
    v_fecha,
    v_ot.equipo_id,
    v_codigo,
    v_nombre,
    v_area,
    NULL,
    0,
    v_horas,
    v_horas,
    0,
    ROUND(v_horas / 8.0, 2),
    'Falla / Mantenimiento Correctivo (OT)',
    COALESCE(v_ot.codigo_ot, 'OT-' || v_ot.numero_ot) || ': ' || COALESCE(v_ot.trabajo, 'Detención validada'),
    'Turno mantenimiento',
    'Validado por ' || COALESCE(p_usuario, 'Administrador') || '. Tiempo reportado: ' || COALESCE(v_ot.tiempo_detencion_minutos, 0) || ' min.',
    'Validación ' || COALESCE(v_ot.codigo_ot, 'OT-' || v_ot.numero_ot),
    COALESCE(p_usuario, 'Administrador'),
    'Validada'
  )
  RETURNING id INTO v_reg_id;

  -- 5. Actualizar la OT
  UPDATE public.orden_trabajo
  SET
    kpi_validado = true,
    kpi_omitido = false,
    kpi_validado_el = NOW(),
    kpi_validado_por = COALESCE(p_usuario, 'Administrador'),
    kpi_horas_aprobadas = v_horas,
    kpi_registro_id = v_reg_id
  WHERE id = p_ot_id;

  RETURN json_build_object(
    'ok', true,
    'ot_id', p_ot_id,
    'registro_id', v_reg_id,
    'horas', v_horas
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.omitir_tiempo_detencion_ot(
  p_ot_id uuid,
  p_usuario text DEFAULT 'Administrador'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orden_trabajo
  SET
    kpi_validado = false,
    kpi_omitido = true,
    kpi_validado_el = NOW(),
    kpi_validado_por = COALESCE(p_usuario, 'Administrador'),
    kpi_horas_aprobadas = 0
  WHERE id = p_ot_id;

  RETURN json_build_object('ok', true, 'ot_id', p_ot_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.revertir_validacion_ot(
  p_ot_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id uuid;
BEGIN
  SELECT kpi_registro_id INTO v_reg_id
  FROM public.orden_trabajo
  WHERE id = p_ot_id;

  IF v_reg_id IS NOT NULL THEN
    DELETE FROM public.registro_disponibilidad WHERE id = v_reg_id;
  END IF;

  UPDATE public.orden_trabajo
  SET
    kpi_validado = false,
    kpi_omitido = false,
    kpi_validado_el = NULL,
    kpi_validado_por = NULL,
    kpi_horas_aprobadas = NULL,
    kpi_registro_id = NULL
  WHERE id = p_ot_id;

  RETURN json_build_object('ok', true, 'ot_id', p_ot_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_tiempo_detencion_ot TO mant_authenticated, mant_admin, mant_anon;
GRANT EXECUTE ON FUNCTION public.omitir_tiempo_detencion_ot TO mant_authenticated, mant_admin, mant_anon;
GRANT EXECUTE ON FUNCTION public.revertir_validacion_ot TO mant_authenticated, mant_admin, mant_anon;

NOTIFY pgrst, 'reload schema';
