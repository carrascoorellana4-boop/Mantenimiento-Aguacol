# Despliegue — Mantenimiento AGUACOL

Producción: https://mantenimiento.aguacol.cl (servidor Linux de la empresa, carpeta `~/mantenimiento`).

## Cómo se publica un cambio

1. Trabaja en una rama y abre un Pull Request hacia `main`.
2. Al fusionarlo en `main`, **el servidor lo publica solo en unos 3 minutos**: cada 3 minutos consulta GitHub (`deploy/autodeploy.sh`, desde cron); si hay commits nuevos baja el código, compila la web y, **solo si compila bien**, reemplaza la que está funcionando. Si la compilación falla, sigue la versión anterior y queda anotado en `~/mantenimiento/autodeploy.log`.
3. El navegador de quien está usando el sistema muestra el aviso "Hay una actualización disponible" y basta con pulsar Recargar.

No hace falta entrar al servidor. El servidor consulta a GitHub; no se abre ningún puerto hacia internet.

## Qué NO se despliega solo

| Cambio | Cómo se aplica |
|---|---|
| Esquema de la base de datos (tablas, vistas, permisos) | Un archivo SQL nuevo en `deploy/sql/` que se ejecuta a mano en el servidor con `psql`. Avisar en el PR. |
| `deploy/docker-compose.yml`, `deploy/usermgr/` (servicio de usuarios) | Copiar al servidor y `docker compose up -d`. El script anota "cambió la carpeta deploy/" en el log. |
| Secretos (`.env`) | Solo existen en el servidor. **Nunca** se suben a GitHub (`deploy/.env.example` muestra qué variables hay). |

## Piezas

- `web` (nginx + build de Vite): sirve la aplicación y enruta `/rest/v1` (PostgREST), `/auth/v1` (GoTrue) y `/api/users` (servicio de usuarios).
- `postgrest`, `gotrue`, `usermgr`, `cloudflared`: ver `docker-compose.yml`.
- Base de datos: PostgreSQL del servidor, base `mantenimiento`, roles `mant_*`.
- Roles de la aplicación: administrador (`mant_admin`, escribe y gestiona usuarios) y visualizador (`mant_authenticated`, solo lectura). Usuarios siempre `nombre@aguacol.cl`; solo `admin` entra sin escribir el correo.

## Instalar en un servidor nuevo (resumen)

1. Crear `~/mantenimiento`, copiar `deploy/docker-compose.yml`, `deploy/usermgr/`, `deploy/sql/`, `deploy/autodeploy.sh` y crear `.env` desde `deploy/.env.example`.
2. `git clone https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git ~/mantenimiento/repo`
3. Crear la base: `deploy/sql/00_roles.sql`, `05_auth_schema.sql`, el esquema, `20_ordenes_trabajo.sql`, `40_roles.sql`, `41_permisos_roles.sql` (ver `deploy/restore/` para el esquema adaptado del dump de Supabase).
4. `docker compose up -d --build` y programar: `crontab -e` → `*/3 * * * * $HOME/mantenimiento/autodeploy.sh`.
