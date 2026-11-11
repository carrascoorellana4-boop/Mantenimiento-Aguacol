-- Migración 54: Añadir columna tiempo_detencion_minutos en orden_trabajo
-- Permite registrar explícitamente el tiempo real que la línea estuvo detenida/parada por falla

ALTER TABLE public.orden_trabajo
ADD COLUMN IF NOT EXISTS tiempo_detencion_minutos integer DEFAULT NULL;

COMMENT ON COLUMN public.orden_trabajo.tiempo_detencion_minutos IS 'Tiempo que la línea estuvo detenida expresado en minutos (tiempo perdido operacional)';

NOTIFY pgrst, 'reload schema';
