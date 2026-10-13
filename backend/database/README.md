# Base de datos — PlantPulse

Scripts SQL de Microsoft SQL Server: creación de la base de datos, tablas y datos de prueba.

- Puerto local: 1433
- Las credenciales de conexión viven en `backend/.env` (plantilla: `backend/.env.example`).

## Estructura

```
database/
├── schema/   # DDL: creación de la base de datos y las tablas
└── seed/     # Datos de prueba
```

## Convenciones

- Archivos numerados (`01_...`, `02_...`) y ejecutados en orden ascendente.
- Nombres de archivo en minúsculas, con guiones bajos, sin tildes ni ñ.
- Desde el backend, todas las consultas usan **parámetros** (`request.input(...)`), nunca concatenación de texto del usuario (evita inyección SQL).
