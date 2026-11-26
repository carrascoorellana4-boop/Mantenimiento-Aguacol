-- Migración 72: Remover Embolsadora del listado oficial de disponibilidad de máquinas productivas
-- Los KPI de disponibilidad de planta aplican estrictamente a las 11 máquinas principales (Extrusoras M1..M5, Inyectoras y Sopladoras).

-- 1. Eliminar registros de Embolsadora en registro_disponibilidad
DELETE FROM public.registro_disponibilidad
WHERE codigo_equipo ILIKE '%EMB%'
   OR nombre_equipo ILIKE '%Embolsadora%';

-- 2. Marcar las OTs asociadas a la Embolsadora como omitidas de KPI
UPDATE public.orden_trabajo
SET kpi_validado = false,
    kpi_omitido = true,
    kpi_registro_id = NULL
WHERE codigo_ot IN ('OT-000039', 'OT-000043')
   OR equipo_id = '42e73a39-642a-4c9a-bc96-2a3d84380e99';

NOTIFY pgrst, 'reload schema';
