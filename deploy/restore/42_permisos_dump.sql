-- Permisos de las tablas y vistas del dump con nuestros roles: lectura para quien tenga sesión (y pública salvo perfiles), escritura solo administrador.
GRANT USAGE ON SCHEMA public TO mant_anon, mant_authenticated, mant_authenticator, mant_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mant_anon, mant_authenticated, mant_admin;
REVOKE SELECT ON public.perfil_usuario FROM mant_anon;
GRANT EXECUTE ON FUNCTION public.app_uid() TO mant_anon, mant_authenticated, mant_admin;
GRANT INSERT, UPDATE ON public.proveedor, public.repuesto_equipo, public.repuesto_proveedor TO mant_admin;
