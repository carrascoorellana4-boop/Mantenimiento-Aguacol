-- Migración 53: Tabla sistema_config para parámetros del sistema y notificaciones
-- Permite almacenar configuraciones (como claves de API de correo) sin exponer secretos en el repositorio.

CREATE TABLE IF NOT EXISTS public.sistema_config (
  clave text PRIMARY KEY,
  valor text NOT NULL,
  descripcion text,
  actualizado_el timestamptz DEFAULT now()
);

-- RLS habilitado
ALTER TABLE public.sistema_config ENABLE ROW LEVEL SECURITY;

-- Permisos estrictos: solo roles autenticados de servicio / admin pueden leer o escribir
REVOKE ALL ON public.sistema_config FROM mant_anon, public;
GRANT SELECT ON public.sistema_config TO mant_authenticated, mant_admin;
GRANT ALL ON public.sistema_config TO mant_admin;

-- Política de lectura para mant_admin y mant_authenticated
DROP POLICY IF EXISTS "Permitir lectura config a roles internos" ON public.sistema_config;
CREATE POLICY "Permitir lectura config a roles internos"
  ON public.sistema_config
  FOR SELECT
  TO mant_authenticated, mant_admin
  USING (true);

-- Insertar parámetros iniciales de notificación
INSERT INTO public.sistema_config (clave, valor, descripcion)
VALUES
  ('resend_api_key', 'CONFIGURAR_API_KEY', 'Clave API de Resend para despacho de notificaciones por email'),
  ('notif_email_to', 'acarrasco@aguacol.cl', 'Destinatario principal de notificaciones de mantenimiento'),
  ('notif_email_fallback', 'carrascoorellana4@gmail.com', 'Destinatario de respaldo cuando el remitente esté en modo prueba de Resend')
ON CONFLICT (clave) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    actualizado_el = now();

-- Función RPC para obtener parámetro de configuración de forma segura
CREATE OR REPLACE FUNCTION public.obtener_sistema_config(p_clave text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor text;
BEGIN
  SELECT valor INTO v_valor FROM public.sistema_config WHERE clave = p_clave;
  RETURN v_valor;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_sistema_config(text) FROM public, mant_anon;
GRANT EXECUTE ON FUNCTION public.obtener_sistema_config(text) TO mant_authenticated, mant_admin;

NOTIFY pgrst, 'reload schema';
