# Memoria y Reglas del Proyecto Sistema_Mantenimiento (AGUACOL)

## Repositorio Remoto Oficial
- **GitHub:** `https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git`
- **Rama principal:** `main`
- **Sitio en Producción:** `https://mantenimiento.aguacol.cl`

## Conexión Directa a Base de Datos de Producción (PostgreSQL vía Tailscale)
El asistente tiene acceso directo a la base de datos de producción mediante la red Tailscale para ejecutar cambios completos (DDL, migraciones, consultas, inserciones y recarga de PostgREST):
- **Host:** `100.101.54.28` (máquina: `administrador-ms-7d78`)
- **Puerto:** `5435`
- **Base de datos:** `mantenimiento`
- **Usuario:** `mant_externo`
- **Clave:** `f0a31d0b5c08cf5b30d9d089e3692092`
- **SSL:** `ssl: false` (o `disable` / `prefer`)
- **Recarga de esquema:** Tras aplicar cambios en tablas, ejecutar siempre `NOTIFY pgrst, 'reload schema';` para actualizar la API de PostgREST de inmediato.

## Regla de Sincronización Automática
1. **Push en cada cambio:** Siempre que se realicen y validen modificaciones, mejoras o correcciones en el proyecto, el asistente debe:
   - Preparar el commit asegurando que no se incluyan archivos sensibles o temporales innecesarios.
   - Realizar el commit local con un mensaje claro y descriptivo.
   - Ejecutar `git push origin main` hacia `https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git` para que el servidor de AGUACOL actualice la web de producción automáticamente.

## Capacidad de Desarrollo y Despliegue Completo (Full-Stack)
El asistente puede realizar y desplegar de forma autónoma cualquier requerimiento completo:
1. **Frontend / UI:** Modificar y crear componentes React en `src/`, asegurando compilación con `npm run build`.
2. **Backend / BD:** Crear y ejecutar scripts SQL en PostgreSQL de producción (`100.101.54.28:5435`).
3. **API y Endpoints:** Actualizar `deploy/usermgr/server.mjs` y `nginx.conf` cuando se requieran nuevas rutas autenticadas.
4. **Publicación:** Subir a GitHub en la rama `main` para impacto inmediato en `https://mantenimiento.aguacol.cl`.
