-- usuario de la sesión (sub del JWT); reemplaza auth.uid() de Supabase
CREATE OR REPLACE FUNCTION public.app_uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(COALESCE(current_setting('request.jwt.claims', true), '{}')::json ->> 'sub', '')::uuid $$;
