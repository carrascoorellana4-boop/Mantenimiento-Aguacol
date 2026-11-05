-- Migración 33: Carga consolidada completa del Plan Preventivo (Extrusión, Inyección y Soplado)
-- 11 máquinas, 19 tareas por máquina (209 tareas en total)
-- Códigos y nombres alineados con el Árbol de Activos oficial de AGUACOL.

ALTER TABLE public.plan_preventivo_tarea 
  ADD COLUMN IF NOT EXISTS intervalo_h numeric,
  ADD COLUMN IF NOT EXISTS maximo_dias integer,
  ADD COLUMN IF NOT EXISTS validacion_requerida text,
  ADD COLUMN IF NOT EXISTS origen_consolidado text;

-- Notificar recarga a PostgREST
NOTIFY pgrst, 'reload schema';
