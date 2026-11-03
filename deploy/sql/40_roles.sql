-- Roles de la app: administrador (mant_admin) puede escribir; visualizador (mant_authenticated) solo lee.
-- Corre como postgres (crea el rol). Idempotente.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mant_admin') THEN CREATE ROLE mant_admin NOLOGIN; END IF;
END $$;
GRANT mant_admin TO mant_authenticator;
