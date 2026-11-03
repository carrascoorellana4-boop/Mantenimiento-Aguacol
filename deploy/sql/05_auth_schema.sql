-- Corre como postgres conectado a la base mantenimiento.
ALTER DATABASE mantenimiento SET timezone TO 'America/Santiago';
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT CONNECT ON DATABASE mantenimiento TO supabase_auth_admin, mant_authenticator;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
