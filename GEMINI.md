# Memoria y Reglas del Proyecto Sistema_Mantenimiento (AGUACOL)

## Repositorio Remoto Oficial
- **GitHub:** `https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git`
- **Rama principal:** `main`

## Regla de Sincronización Automática
1. **Push en cada cambio:** Siempre que se realicen y validen modificaciones, mejoras o correcciones en el proyecto, el asistente debe:
   - Preparar el commit asegurando que no se incluyan archivos sensibles o temporales.
   - Realizar el commit local con un mensaje claro y descriptivo.
   - Ejecutar `git push origin main` hacia `https://github.com/carrascoorellana4-boop/Mantenimiento-Aguacol.git`.

## Seguridad y Exclusiones Estrictas
- **NUNCA subir a Git:**
  - Archivos `.env*` o variables de entorno con credenciales.
  - Archivos `.xlsx` con datos confidenciales de planta.
  - Tokens, sesiones o credenciales (`scratch/*.json`, `scratch/*.txt`, `scratch/*.mjs` con llaves hardcodeadas).
  - La carpeta de respaldos `backup/` y archivos `.zip`.
- Solo deben versionarse archivos de código fuente (`src/`), configuración pública, documentación (`*.md`) y scripts SQL del esquema.

