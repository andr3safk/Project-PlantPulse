# Backend — PlantPulse

API REST en Node.js + Express. Recibe las lecturas del simulador, las guarda en Microsoft SQL Server y las expone al frontend.

- Puerto local: 3000
- Scripts SQL de la base de datos: `database/`
- Variables de entorno en `.env` (nunca se sube al repositorio). Plantilla sin valores reales: `.env.example`.

Estado: pendiente de inicializar.

## Formato de errores

Todas las respuestas de error de la API son JSON con una única forma:

```json
{ "message": "Texto legible del error" }
```

Así el frontend maneja cualquier error de la misma manera: lee el código HTTP y muestra `body.message`.

| Código | Cuándo ocurre | `message` | Dónde se genera |
|---|---|---|---|
| 400 | Falta `email` o `password` en el login | `Email y password son requeridos` | `src/routes/auth.js` |
| 400 | El cuerpo de la petición no es un JSON válido | `El cuerpo de la petición no es un JSON válido` | Manejador de errores en `src/app.js` |
| 401 | Email o contraseña incorrectos (mismo mensaje en ambos casos, para no revelar qué emails existen) | `Credenciales inválidas` | `src/routes/auth.js` |
| 401 | Ruta protegida sin token, con formato distinto a `Bearer <token>`, o con token inválido o vencido | `No autorizado` | `src/middleware/auth.js` |
| 404 | La ruta solicitada no existe | `Ruta no encontrada` | Manejador 404 en `src/app.js` |
| 413 | El cuerpo supera el límite de `express.json()` (100 kb por defecto) | `El cuerpo de la petición es demasiado grande` | Manejador de errores en `src/app.js` |
| 500 | Error inesperado del servidor. El detalle se registra en la consola del servidor y nunca se envía al cliente | `Error interno del servidor` | Manejador de errores en `src/app.js` y `src/routes/auth.js` |
