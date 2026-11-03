-- Corre como mant_owner después de 40_roles.sql.
GRANT USAGE ON SCHEMA public TO mant_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mant_admin;
GRANT INSERT, UPDATE ON public.equipo, public.equipo_alias, public.ubicacion_tecnica, public.bitacora_mantenimiento,
  public.bitacora_importacion_pendiente, public.repuesto, public.movimiento_inventario, public.orden_trabajo TO mant_admin;
GRANT INSERT ON public.orden_trabajo_estado_historial TO mant_admin;
GRANT USAGE, SELECT ON SEQUENCE public.orden_trabajo_numero_ot_seq TO mant_admin;
GRANT EXECUTE ON FUNCTION public.app_uid() TO mant_admin;

-- El visualizador pierde toda escritura y la función que cambia estados de OT.
REVOKE INSERT, UPDATE ON public.equipo, public.equipo_alias, public.ubicacion_tecnica, public.bitacora_mantenimiento,
  public.bitacora_importacion_pendiente, public.repuesto, public.movimiento_inventario, public.orden_trabajo FROM mant_authenticated;
REVOKE INSERT ON public.orden_trabajo_estado_historial FROM mant_authenticated;
REVOKE USAGE ON SEQUENCE public.orden_trabajo_numero_ot_seq FROM mant_authenticated;
REVOKE EXECUTE ON FUNCTION public.cambiar_estado_orden_trabajo(uuid, text, text, text, text, text, text) FROM mant_authenticated, mant_anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_orden_trabajo(uuid, text, text, text, text, text, text) TO mant_admin;

-- Políticas de OT: lectura para todos; escritura solo administrador.
DROP POLICY IF EXISTS ot_insert ON public.orden_trabajo;
DROP POLICY IF EXISTS ot_update ON public.orden_trabajo;
DROP POLICY IF EXISTS oth_insert ON public.orden_trabajo_estado_historial;
DROP POLICY IF EXISTS ot_select_admin ON public.orden_trabajo;
DROP POLICY IF EXISTS oth_select_admin ON public.orden_trabajo_estado_historial;
CREATE POLICY ot_select_admin ON public.orden_trabajo FOR SELECT TO mant_admin USING (true);
CREATE POLICY ot_insert ON public.orden_trabajo FOR INSERT TO mant_admin WITH CHECK (true);
CREATE POLICY ot_update ON public.orden_trabajo FOR UPDATE TO mant_admin USING (true) WITH CHECK (true);
CREATE POLICY oth_select_admin ON public.orden_trabajo_estado_historial FOR SELECT TO mant_admin USING (true);
CREATE POLICY oth_insert ON public.orden_trabajo_estado_historial FOR INSERT TO mant_admin WITH CHECK (true);
