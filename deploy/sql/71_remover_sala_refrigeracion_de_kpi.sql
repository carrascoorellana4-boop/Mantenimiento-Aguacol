-- Migración 71: Remover Sala de Refrigeración y componentes de Servicios Generales de los KPI de disponibilidad
-- Los KPI de disponibilidad de planta aplican exclusivamente a las máquinas y líneas productivas oficiales.

-- 1. Eliminar registros de Sala de Refrigeración o sus bombas en registro_disponibilidad
DELETE FROM public.registro_disponibilidad
WHERE codigo_equipo IN ('AGL-REF-SALA', 'AGL-PLA-REF-BOM-M01')
   OR nombre_equipo ILIKE '%Sala de Refrigeración%'
   OR nombre_equipo ILIKE '%Bomba de Refrigeración M1%'
   OR motivo ILIKE '%OT-000061%';

-- 2. Marcar OT-000061 como omitida de KPI
UPDATE public.orden_trabajo
SET kpi_validado = false,
    kpi_omitido = true,
    kpi_registro_id = NULL
WHERE codigo_ot = 'OT-000061';

NOTIFY pgrst, 'reload schema';
