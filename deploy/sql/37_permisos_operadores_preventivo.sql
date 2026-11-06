-- ====================================================================
-- Migración 37: Permisos y RLS para Operadores en Mantenimiento Preventivo
-- Permite a usuarios autenticados (mant_authenticated) ejecutar tareas preventivas
-- y registrar evidencias desde dispositivos móviles (Tablets de Planta).
-- ====================================================================

BEGIN;

-- 1. Otorgar permisos de escritura en ejecuciones y evidencias a mant_authenticated
GRANT SELECT, INSERT, UPDATE ON public.plan_preventivo_ejecucion TO mant_authenticated;
GRANT SELECT, INSERT, UPDATE ON public.plan_preventivo_evidencia TO mant_authenticated;

-- 2. Políticas RLS para inserción y actualización de ejecuciones
DROP POLICY IF EXISTS prev_ejec_auth_insert ON public.plan_preventivo_ejecucion;
CREATE POLICY prev_ejec_auth_insert ON public.plan_preventivo_ejecucion
  FOR INSERT TO mant_authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS prev_ejec_auth_update ON public.plan_preventivo_ejecucion;
CREATE POLICY prev_ejec_auth_update ON public.plan_preventivo_ejecucion
  FOR UPDATE TO mant_authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Políticas RLS para inserción y actualización de evidencias
DROP POLICY IF EXISTS prev_evid_auth_insert ON public.plan_preventivo_evidencia;
CREATE POLICY prev_evid_auth_insert ON public.plan_preventivo_evidencia
  FOR INSERT TO mant_authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS prev_evid_auth_update ON public.plan_preventivo_evidencia;
CREATE POLICY prev_evid_auth_update ON public.plan_preventivo_evidencia
  FOR UPDATE TO mant_authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
