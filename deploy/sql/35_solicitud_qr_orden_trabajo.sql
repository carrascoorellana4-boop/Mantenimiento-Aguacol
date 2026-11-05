-- ============================================================================
-- MIGRACIÓN 35: Flujo de Solicitud de Mantenimiento mediante Código QR e
-- Integración de Ejecución de OT (Tiempos Reales, Repuestos y Condición de Línea)
-- ============================================================================

-- 1. Actualizar check constraint para permitir 'Solicitud QR' como origen oficial de OT
ALTER TABLE public.orden_trabajo 
  DROP CONSTRAINT IF EXISTS chk_orden_trabajo_origen;

ALTER TABLE public.orden_trabajo 
  ADD CONSTRAINT chk_orden_trabajo_origen 
  CHECK (origen IN ('Manual', 'Inspección', 'WhatsApp', 'Solicitud QR'));

-- 2. Nuevas columnas en public.orden_trabajo para trazabilidad de solicitud y ejecución
ALTER TABLE public.orden_trabajo 
  ADD COLUMN IF NOT EXISTS solicitante_nombre text,
  ADD COLUMN IF NOT EXISTS solicitante_area text,
  ADD COLUMN IF NOT EXISTS fecha_hora_inicio_trabajo timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_hora_fin_trabajo timestamptz,
  ADD COLUMN IF NOT EXISTS condicion_linea text CHECK (condicion_linea IS NULL OR condicion_linea IN ('Línea detenida', 'Línea produciendo')),
  ADD COLUMN IF NOT EXISTS utilizo_repuestos boolean DEFAULT false;

-- Comentarios explicativos
COMMENT ON COLUMN public.orden_trabajo.solicitante_nombre IS 'Nombre del trabajador que emitió la solicitud (físico o QR)';
COMMENT ON COLUMN public.orden_trabajo.solicitante_area IS 'Área del solicitante (Producción JJV, Plásticos, Otro)';
COMMENT ON COLUMN public.orden_trabajo.fecha_hora_inicio_trabajo IS 'Timestamp automático exacto en que el técnico presiona Iniciar trabajo';
COMMENT ON COLUMN public.orden_trabajo.fecha_hora_fin_trabajo IS 'Timestamp automático exacto en que el técnico finaliza la OT';
COMMENT ON COLUMN public.orden_trabajo.condicion_linea IS 'Condición operativa durante el trabajo: Línea detenida o Línea produciendo';
COMMENT ON COLUMN public.orden_trabajo.utilizo_repuestos IS 'Indica si durante la intervención se consumieron repuestos de inventario';

-- 3. Tabla para detalle de repuestos consumidos en cada Orden de Trabajo
CREATE TABLE IF NOT EXISTS public.orden_trabajo_repuesto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id uuid NOT NULL REFERENCES public.orden_trabajo(id) ON DELETE CASCADE,
  repuesto_id uuid NOT NULL REFERENCES public.repuesto(id) ON DELETE RESTRICT,
  cantidad numeric(12,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(12,2) DEFAULT 0,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_repuesto_ot ON public.orden_trabajo_repuesto(ot_id);
CREATE INDEX IF NOT EXISTS idx_ot_repuesto_rep ON public.orden_trabajo_repuesto(repuesto_id);

COMMENT ON TABLE public.orden_trabajo_repuesto IS 'Registro de repuestos utilizados en cada Orden de Trabajo con trazabilidad de costos y stock';

-- 4. Actualizar trigger trg_fn_orden_trabajo_before_write() para generar codigo_ot y sellar timestamps
CREATE OR REPLACE FUNCTION public.trg_fn_orden_trabajo_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at := now();

    -- Generación automática de codigo_ot si no viene provisto
    IF NEW.codigo_ot IS NULL OR btrim(NEW.codigo_ot) = '' THEN
        IF NEW.numero_ot IS NOT NULL THEN
            NEW.codigo_ot := 'OT-' || lpad(NEW.numero_ot::text, 6, '0');
        END IF;
    END IF;

    -- Regla: Al pasar a En curso, sellar fecha de inicio si estaba vacía
    IF NEW.estado = 'En curso' THEN
        IF NEW.fecha_inicio IS NULL THEN
            NEW.fecha_inicio := now();
        END IF;
        IF NEW.fecha_hora_inicio_trabajo IS NULL THEN
            NEW.fecha_hora_inicio_trabajo := NEW.fecha_inicio;
        END IF;
    END IF;

    -- Regla: No permitir Finalizada sin solucion_definitiva
    IF NEW.estado = 'Finalizada' THEN
        IF NEW.solucion_definitiva IS NULL OR btrim(NEW.solucion_definitiva) = '' THEN
            RAISE EXCEPTION 'No es posible finalizar la OT sin registrar una solución definitiva.';
        END IF;
        IF NEW.fecha_finalizacion IS NULL THEN
            NEW.fecha_finalizacion := now();
        END IF;
        IF NEW.fecha_hora_fin_trabajo IS NULL THEN
            NEW.fecha_hora_fin_trabajo := NEW.fecha_finalizacion;
        END IF;
    END IF;

    -- Regla: Si se reabre (Finalizada -> En curso) o vuelve a Pendiente, limpiar fecha_finalizacion y fecha_hora_fin_trabajo
    IF TG_OP = 'UPDATE' AND OLD.estado = 'Finalizada' AND NEW.estado <> 'Finalizada' THEN
        NEW.fecha_finalizacion := NULL;
        NEW.fecha_hora_fin_trabajo := NULL;
    END IF;

    -- Regla: En curso -> Pendiente conserva fecha_inicio histórica
    IF TG_OP = 'UPDATE' AND OLD.fecha_inicio IS NOT NULL AND NEW.fecha_inicio IS NULL THEN
        NEW.fecha_inicio := OLD.fecha_inicio;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.fecha_hora_inicio_trabajo IS NOT NULL AND NEW.fecha_hora_inicio_trabajo IS NULL THEN
        NEW.fecha_hora_inicio_trabajo := OLD.fecha_hora_inicio_trabajo;
    END IF;

    RETURN NEW;
END;
$function$;

-- 5. Función RPC pública y segura para crear Solicitud de Mantenimiento vía QR
CREATE OR REPLACE FUNCTION public.crear_solicitud_mantenimiento_qr(
  p_area text,
  p_solicitante text,
  p_linea text,
  p_descripcion text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area text;
  v_solicitante text;
  v_linea text;
  v_descripcion text;
  v_ot_id uuid;
  v_numero_ot bigint;
  v_codigo_ot text;
  v_now timestamptz := now();
BEGIN
  -- Sanitización y validaciones obligatorias
  v_area := btrim(COALESCE(p_area, ''));
  v_solicitante := btrim(COALESCE(p_solicitante, ''));
  v_linea := btrim(COALESCE(p_linea, ''));
  v_descripcion := btrim(COALESCE(p_descripcion, ''));

  -- Eliminar posibles tags HTML peligrosos
  v_solicitante := regexp_replace(v_solicitante, '<[^>]*>', '', 'g');
  v_linea := regexp_replace(v_linea, '<[^>]*>', '', 'g');
  v_descripcion := regexp_replace(v_descripcion, '<[^>]*>', '', 'g');

  IF length(v_area) = 0 THEN
    RAISE EXCEPTION 'El área del solicitante es obligatoria.';
  END IF;
  IF length(v_solicitante) < 2 THEN
    RAISE EXCEPTION 'El nombre del trabajador debe tener al menos 2 caracteres.';
  END IF;
  IF length(v_linea) = 0 THEN
    RAISE EXCEPTION 'La línea o sector es obligatorio.';
  END IF;
  IF length(v_descripcion) < 3 THEN
    RAISE EXCEPTION 'La descripción del problema o trabajo requerido debe tener al menos 3 caracteres.';
  END IF;

  IF length(v_solicitante) > 120 THEN
    v_solicitante := left(v_solicitante, 120);
  END IF;
  IF length(v_linea) > 120 THEN
    v_linea := left(v_linea, 120);
  END IF;
  IF length(v_descripcion) > 3000 THEN
    v_descripcion := left(v_descripcion, 3000);
  END IF;

  -- Insertar OT real en el sistema existente (numero_ot generado automáticamente por identity)
  INSERT INTO public.orden_trabajo (
    estado,
    origen,
    solicitante_nombre,
    solicitante_area,
    area,
    ubicacion,
    trabajo,
    tecnico,
    prioridad,
    tipo_intervencion,
    es_falla,
    tipo_falla,
    fecha_reporte,
    created_at,
    updated_at
  ) VALUES (
    'Pendiente',
    'Solicitud QR',
    v_solicitante,
    v_area,
    v_area,
    v_linea,
    v_descripcion,
    'Sin asignar',
    'Media',
    'Correctiva',
    true,
    'Mecánica',
    v_now,
    v_now,
    v_now
  ) RETURNING id, numero_ot, codigo_ot INTO v_ot_id, v_numero_ot, v_codigo_ot;

  -- Si codigo_ot estuviera vacío por timing del trigger, asegurar formato OT-XXXXXX
  IF v_codigo_ot IS NULL OR btrim(v_codigo_ot) = '' THEN
    v_codigo_ot := 'OT-' || lpad(v_numero_ot::text, 6, '0');
    UPDATE public.orden_trabajo SET codigo_ot = v_codigo_ot WHERE id = v_ot_id;
  END IF;

  -- Historial de estado
  INSERT INTO public.orden_trabajo_estado_historial (
    ot_id,
    estado_anterior,
    estado_nuevo,
    fecha_hora,
    usuario_id,
    usuario_nombre,
    comentario
  ) VALUES (
    v_ot_id,
    null,
    'Pendiente',
    v_now,
    null,
    v_solicitante,
    'Solicitud generada vía código QR desde ' || v_area || ' (' || v_linea || ')'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_ot_id,
    'numero_ot', v_numero_ot,
    'codigo_ot', v_codigo_ot
  );
END;
$$;

-- 6. Función RPC para registrar consumo de repuestos en OT con deducción de inventario
CREATE OR REPLACE FUNCTION public.consumir_repuesto_ot(
  p_ot_id uuid,
  p_repuesto_id uuid,
  p_cantidad numeric,
  p_tecnico text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ot record;
  v_rep record;
  v_stock_actual numeric;
  v_cant numeric := round(p_cantidad, 2);
  v_precio numeric := 0;
  v_consumo_id uuid;
BEGIN
  IF v_cant <= 0 THEN
    RAISE EXCEPTION 'La cantidad de repuestos debe ser mayor a 0.';
  END IF;

  -- Validar existencia de OT
  SELECT id, codigo_ot, estado, tecnico INTO v_ot
  FROM public.orden_trabajo
  WHERE id = p_ot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La Orden de Trabajo especificada no existe.';
  END IF;

  -- Validar repuesto y precio
  SELECT id, codigo, nombre, precio_compra INTO v_rep
  FROM public.repuesto
  WHERE id = p_repuesto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El repuesto especificado no existe en el catálogo.';
  END IF;

  v_precio := COALESCE(v_rep.precio_compra, 0);

  -- Calcular stock actual desde movimientos
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo_movimiento IN ('Entrada', 'Stock Inicial', 'Ajuste Positivo') THEN cantidad
      WHEN tipo_movimiento IN ('Salida', 'Ajuste Negativo') THEN -cantidad
      ELSE 0
    END
  ), 0) INTO v_stock_actual
  FROM public.movimiento_inventario
  WHERE repuesto_id = p_repuesto_id;

  IF v_stock_actual < v_cant THEN
    RAISE EXCEPTION 'Stock insuficiente para "%". Stock actual: %, Solicitado: %',
      v_rep.nombre, v_stock_actual, v_cant;
  END IF;

  -- Registrar en orden_trabajo_repuesto
  INSERT INTO public.orden_trabajo_repuesto (
    ot_id,
    repuesto_id,
    cantidad,
    precio_unitario,
    registrado_por
  ) VALUES (
    p_ot_id,
    p_repuesto_id,
    v_cant,
    v_precio,
    COALESCE(p_tecnico, v_ot.tecnico, 'Técnico')
  ) RETURNING id INTO v_consumo_id;

  -- Registrar salida en movimiento_inventario
  INSERT INTO public.movimiento_inventario (
    repuesto_id,
    tipo_movimiento,
    cantidad,
    documento_referencia,
    observaciones
  ) VALUES (
    p_repuesto_id,
    'Salida',
    v_cant,
    v_ot.codigo_ot,
    'Consumo en ' || v_ot.codigo_ot || ' — Técnico: ' || COALESCE(p_tecnico, v_ot.tecnico, 'Técnico')
  );

  -- Marcar utilizo_repuestos en la OT
  UPDATE public.orden_trabajo
  SET utilizo_repuestos = true,
      updated_at = now()
  WHERE id = p_ot_id;

  RETURN jsonb_build_object(
    'ok', true,
    'consumo_id', v_consumo_id,
    'repuesto', v_rep.nombre,
    'cantidad', v_cant,
    'precio_unitario', v_precio,
    'stock_restante', v_stock_actual - v_cant
  );
END;
$$;

-- 7. Permisos para anon y autenticado
GRANT EXECUTE ON FUNCTION public.crear_solicitud_mantenimiento_qr TO mant_anon, mant_authenticated, mant_admin;
GRANT EXECUTE ON FUNCTION public.consumir_repuesto_ot TO mant_authenticated, mant_admin;

GRANT SELECT, INSERT ON public.orden_trabajo_repuesto TO mant_authenticated, mant_admin;
GRANT SELECT ON public.orden_trabajo_repuesto TO mant_anon;

-- Recargar esquema en PostgREST
NOTIFY pgrst, 'reload schema';
