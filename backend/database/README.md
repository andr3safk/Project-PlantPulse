# Base de datos — PlantPulse

Scripts SQL de Microsoft SQL Server. **Todos se ejecutan con un usuario administrador** (SSMS con autenticación de Windows, o `sa` en Linux). El backend se conecta con `plantpulse_app`, no con `sa`.

## Orden de ejecución

1. `schema/00_create_database.sql` — crea la BD `PlantPulse` (se ejecuta en `master`).
2. `schema/01_schema.sql` — tablas. ⚠️ **Re-ejecutarlo borra TODAS las tablas y sus datos** (hace `DROP TABLE`).
3. `schema/02_app_user.sql` — login y usuario `plantpulse_app`. **Reemplazar `CAMBIAR_CLAVE` antes de ejecutar y no guardar el archivo con la contraseña real.**
4. `seed/01_seed.sql` — datos de prueba (usuario `demo@plantpulse.local` / `PlantPulse2026!`, **solo para desarrollo local**).

Ejemplo con `sqlcmd` (Windows):

```
sqlcmd -S tcp:localhost,1433 -E -C -i schema\00_create_database.sql
```

## Unidades de los sensores

- `Moisture` (humedad del suelo) y `Light` (luz): **porcentaje 0–100**
- `Temperature`: **grados Celsius** (rango válido −10 a 60)

## Convenciones

- Archivos numerados (`00_...`, `01_...`, `02_...`) y ejecutados en orden ascendente.
- Nombres de archivo en minúsculas, con guiones bajos, sin tildes ni ñ.
- Desde el backend, todas las consultas usan **parámetros** (`request.input(...)`), nunca concatenación de texto del usuario (evita inyección SQL).

## Credenciales

Las credenciales de conexión viven en `backend/.env` (plantilla: `backend/.env.example`). `.env` nunca se sube al repositorio.
