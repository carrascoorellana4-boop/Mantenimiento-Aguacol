#!/usr/bin/env bash
# Despliegue automático por consulta (pull): corre cada pocos minutos desde cron en el servidor, en ~/mantenimiento.
# Si hay commits nuevos en main, baja el código, compila la web y solo reemplaza la que está funcionando si la compilación sale bien.
# No abre ningún puerto hacia afuera. Registro en autodeploy.log.   Cron:  */3 * * * * $HOME/mantenimiento/autodeploy.sh
set -uo pipefail
cd "$(dirname "$0")"
exec 9>.autodeploy.lock; flock -n 9 || exit 0
log() { echo "[$(date '+%F %T')] $*" >> autodeploy.log; }
git -C repo fetch -q origin main 2>/dev/null || { log "no se pudo consultar GitHub"; exit 0; }
# Nada que hacer si lo publicado en GitHub ya está incluido en lo que corre aquí (mismo commit, o el servidor va por delante).
git -C repo merge-base --is-ancestor origin/main HEAD && exit 0
NUEVO=$(git -C repo rev-parse --short origin/main)
log "commit nuevo $NUEVO: $(git -C repo log -1 --format=%s origin/main)"
git -C repo merge --ff-only -q origin/main || { log "no se pudo avanzar: hay cambios locales en repo/ del servidor"; exit 1; }
if docker compose build web >> autodeploy.log 2>&1; then
  docker compose up -d web usermgr >> autodeploy.log 2>&1 && log "desplegado $NUEVO"
  docker compose restart usermgr >> autodeploy.log 2>&1 || true
else
  log "FALLÓ la compilación de $NUEVO: sigue funcionando la versión anterior. Corregir y volver a subir."
fi
# Si cambió algo de deploy/ (compose, servicio de usuarios, SQL), se avisa: eso se aplica a mano.
git -C repo diff --name-only HEAD@{1} HEAD -- deploy 2>/dev/null | grep -q . && log "OJO: cambió la carpeta deploy/: revisar si hay que aplicar docker-compose o SQL a mano"
exit 0
