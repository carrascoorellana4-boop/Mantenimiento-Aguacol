#!/usr/bin/env bash
# Corre EN EL SERVIDOR dentro de ~/mantenimiento/restore. Reemplaza el esquema public reconstruido por el real del dump de Supabase.
# Uso:  PG_SUPER_URL='postgresql://postgres:CLAVE@127.0.0.1:5432' ./restaurar.sh
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ../.env; set +a
: "${PG_SUPER_URL:?falta PG_SUPER_URL (sin base al final)}"
SUP="$PG_SUPER_URL/mantenimiento"
OWN="postgresql://mant_owner:${OWNER_PW}@127.0.0.1:5432/mantenimiento"

mkdir -p ../backups
COPIA="../backups/antes-del-dump-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -Fc "$SUP" -f "$COPIA"; echo "== copia de seguridad: $COPIA ($(du -h "$COPIA" | cut -f1)) =="

echo "== se vacía el esquema public (solo lo reconstruido) =="
psql "$SUP" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE' -c 'CREATE SCHEMA public AUTHORIZATION mant_owner'

echo "== esquema real + módulo de OT =="
psql "$OWN" -v ON_ERROR_STOP=1 -f 00_app_uid.sql -f schema_adaptado.sql -f ../sql/20_ordenes_trabajo.sql -f 01_fk_ot.sql
psql "$OWN" -v ON_ERROR_STOP=1 -f ../sql/41_permisos_roles.sql -f 42_permisos_dump.sql

echo "== datos (solo public) =="
psql "$SUP" -v ON_ERROR_STOP=1 -f datos_public.sql

echo "== comprobación =="
psql "$SUP" -tAc "select 'ubicacion_tecnica', count(*) from ubicacion_tecnica union all select 'equipo', count(*) from equipo union all select 'bitacora', count(*) from bitacora_mantenimiento union all select 'pendientes', count(*) from bitacora_importacion_pendiente union all select 'alias', count(*) from equipo_alias union all select 'repuesto', count(*) from repuesto union all select 'movimientos', count(*) from movimiento_inventario union all select 'perfiles', count(*) from perfil_usuario"
cd .. && docker compose restart postgrest >/dev/null && echo "== PostgREST reiniciado (recarga el esquema) =="
