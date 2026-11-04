# Memoria del Proyecto - Sistema de Mantenimiento AGUACOL

> Este archivo actúa como memoria persistente del proyecto junto con `GEMINI.md`.

## Repositorio Oficial y Producción
- **URL remota:** `https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git`
- **Rama:** `main`
- **Dominio web productivo:** `https://mantenimiento.aguacol.cl`

## Base de Datos de Producción (PostgreSQL vía Tailscale)
Conexión directa habilitada para que el asistente aplique migraciones, esquemas y mantenimiento:
- **Host:** `100.101.54.28` (administrador-ms-7d78)
- **Puerto:** `5435`
- **Base de datos:** `mantenimiento`
- **Usuario:** `mant_externo`
- **Clave:** `f0a31d0b5c08cf5b30d9d089e3692092`
- **SSL:** `disable` / `prefer` (`ssl: false`)
- **PostgREST reload:** Ejecutar `NOTIFY pgrst, 'reload schema';` tras cualquier cambio de esquema.

## Módulos del Sistema
1. **Órdenes de Trabajo:** Tablero Kanban, control de estados, prioridades, técnicos y trazabilidad.
2. **Árbol de Activos:** Jerarquía de planta AGUACOL, componentes y relaciones funcionales.
3. **Inventario General de Repuestos:** Stock, retiros, movimientos y valorización.
4. **Compras:** Solicitudes, cotizaciones y proveedores.
5. **Mantenimiento Preventivo:** Planes por equipo (Extrusoras M1 a M5 con 95 tareas oficiales), captura de evidencias (foto/video) e historial cronológico.
6. **KPI de Disponibilidad Operacional:** Consolidación de disponibilidad a partir de planillas de producción con la fórmula oficial:
   $$\text{Disponibilidad} = \frac{\text{Horas disponibles}}{\text{Horas disponibles} + \text{Horas en mantenci\acute{o}n}} \times 100$$
   Incluye importador inteligente de Excel (`.xlsx`), cálculo fila a fila y dashboard interactivo por máquina y fecha.

## Reglas Obligatorias en cada Tarea / Cambio
1. **Sincronización automática con GitHub:** Cada vez que se realice y verifique cualquier cambio, mejora, corrección o funcionalidad nueva en el proyecto, se debe:
   - Hacer `git add` de los archivos modificados.
   - Crear un `git commit` descriptivo.
   - Ejecutar `git push origin main` inmediatamente al repositorio remoto para que se publique en producción.
