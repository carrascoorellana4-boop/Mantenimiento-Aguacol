-- Migración 61: Función RPC transaccional para eliminar Orden de Trabajo de forma segura
-- Permite al Administrador eliminar OTs de prueba o erróneas.
-- Limpia registros vinculados en orden_trabajo_estado_historial, orden_trabajo_repuesto,
-- y si tenía un registro de disponibilidad KPI (kpi_registro_id), también lo elimina.

CREATE OR REPLACE FUNCTION public.eliminar_orden_trabajo(
  p_ot_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ot record;
  v_cod text;
BEGIN
  -- 1. Obtener datos de la OT y verificar existencia
  SELECT id, numero_ot, codigo_ot, kpi_registro_id
  INTO v_ot
  FROM public.orden_trabajo
  WHERE id = p_ot_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Orden de trabajo no encontrada');
  END IF;

  v_cod := COALESCE(v_ot.codigo_ot, 'OT-' || v_ot.numero_ot);

  -- 2. Si tenía un registro de disponibilidad imputado, eliminarlo
  IF v_ot.kpi_registro_id IS NOT NULL THEN
    DELETE FROM public.registro_disponibilidad WHERE id = v_ot.kpi_registro_id;
  END IF;

  -- También limpiar cualquier registro de disponibilidad cuyo origen coincida con esta OT
  DELETE FROM public.registro_disponibilidad 
  WHERE origen_importacion = 'Validación ' || v_cod;

  -- 3. Eliminar registros vinculados
  DELETE FROM public.orden_trabajo_estado_historial WHERE ot_id = p_ot_id;
  DELETE FROM public.orden_trabajo_repuesto WHERE ot_id = p_ot_id;
  UPDATE public.bitacora_mantenimiento SET ot_id = NULL WHERE ot_id = p_ot_id;

  -- 4. Eliminar la Orden de Trabajo
  DELETE FROM public.orden_trabajo WHERE id = p_ot_id;

  RETURN json_build_object(
    'ok', true,
    'ot_id', p_ot_id,
    'codigo_ot', v_cod
  );
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orden_trabajo' AND policyname = 'ot_delete_auth'
  ) THEN
    CREATE POLICY ot_delete_auth ON public.orden_trabajo
    FOR DELETE
    TO mant_authenticated, mant_admin
    USING (true);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.eliminar_orden_trabajo TO mant_authenticated, mant_admin, mant_anon;

NOTIFY pgrst, 'reload schema';
