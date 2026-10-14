# Base de datos — PlantPulse

Scripts SQL de Microsoft SQL Server. Orden de ejecución:

1. `01_app_user.sql` — usuario de aplicacion `plantpulse_app` (permisos minimos; definir su contraseña al ejecutar, nunca versionarla). El login se crea en `master`; el usuario y roles en `PlantPulse`.
2. `schema/00_create_database.sql` — crea la BD `PlantPulse` (se ejecuta en `master`).
3. `schema/01_schema.sql` — tablas (incluye `USE PlantPulse;` al inicio).
4. `seed/` — datos de prueba (pendiente).

- Puerto local: 1433
- Las credenciales de conexión viven en `backend/.env` (plantilla: `backend/.env.example`).

## Convenciones

- Archivos numerados (`00_...`, `01_...`) y ejecutados en orden ascendente.
- Nombres de archivo en minúsculas, con guiones bajos, sin tildes ni ñ.
- Desde el backend, todas las consultas usan **parámetros** (`request.input(...)`), nunca concatenación de texto del usuario (evita inyección SQL).
- El backend se conecta con `plantpulse_app`, **no** con `sa`.
