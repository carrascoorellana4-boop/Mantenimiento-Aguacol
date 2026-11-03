-- Corre UNA vez como superusuario (postgres) en el Postgres del servidor. Variables: -v ownerpw=... -v authpw=... -v supapw=...
-- Roles propios (prefijo mant_) para no chocar con los de otras apps del mismo Postgres.
CREATE ROLE mant_owner LOGIN PASSWORD :'ownerpw';
CREATE ROLE mant_anon NOLOGIN;
CREATE ROLE mant_authenticated NOLOGIN;
CREATE ROLE mant_authenticator LOGIN NOINHERIT PASSWORD :'authpw';
GRANT mant_anon, mant_authenticated TO mant_authenticator;
CREATE ROLE supabase_auth_admin LOGIN PASSWORD :'supapw';
CREATE DATABASE mantenimiento OWNER mant_owner ENCODING 'UTF8' TEMPLATE template0;
