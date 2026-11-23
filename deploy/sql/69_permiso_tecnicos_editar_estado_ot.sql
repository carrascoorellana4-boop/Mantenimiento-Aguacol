-- Migración 69: Otorgar permisos a técnicos de mantención (mant_authenticated) para editar estados y detalles de Órdenes de Trabajo

BEGIN;

-- 1. Permisos de actualización en orden_trabajo e inserción en historial
GRANT SELECT, UPDATE ON public.orden_trabajo TO mant_authenticated;
GRANT SELECT, INSERT ON public.orden_trabajo_estado_historial TO mant_authenticated;

-- 2. Permiso de ejecución en la función RPC cambiar_estado_orden_trabajo
GRANT EXECUTE ON FUNCTION public.cambiar_estado_orden_trabajo(uuid, text, text, text, text, text, text) TO mant_authenticated;

-- 3. Políticas de seguridad a nivel de fila (RLS) para mant_authenticated
DROP POLICY IF EXISTS ot_update_auth ON public.orden_trabajo;
CREATE POLICY ot_update_auth ON public.orden_trabajo
  FOR UPDATE TO mant_authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS oth_insert_auth ON public.orden_trabajo_estado_historial;
CREATE POLICY oth_insert_auth ON public.orden_trabajo_estado_historial
  FOR INSERT TO mant_authenticated
  WITH CHECK (true);

COMMIT;

-- 4. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
