# Backend — PlantPulse

API REST en Node.js + Express. Recibe las lecturas del simulador, las guarda en Microsoft SQL Server y las expone al frontend.

- Puerto local: 3000
- Scripts SQL de la base de datos: `database/`
- Variables de entorno en `.env` (nunca se sube al repositorio). Plantilla sin valores reales: `.env.example`.

## Comandos

Desde `backend/` (terminal de Antigravity o VS Code):

```powershell
npm ci            # instalar dependencias
npm run dev       # servidor con recarga en http://localhost:3000
npm run test:run  # pruebas (requieren SQL Server con el esquema y el seed cargados)
```

## Endpoints

Todas las respuestas son JSON. Las rutas marcadas con 🔒 requieren el header `Authorization: Bearer <token>`; sin token o con un token inválido responden `401`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión y devuelve un JWT |
| GET | `/api/health` | Verificación de que la API está arriba |
| GET 🔒 | `/api/plants` | Lista las plantas del usuario |
| GET 🔒 | `/api/plants/:id` | Obtiene una planta |
| POST 🔒 | `/api/plants` | Crea una planta |
| PUT 🔒 | `/api/plants/:id` | Actualiza una planta |
| DELETE 🔒 | `/api/plants/:id` | Elimina una planta |

### Plantas (`/api/plants`)

Cada usuario solo ve y modifica **sus** plantas: el id del usuario sale del token, nunca del body. Si la planta no existe, es de otro usuario o el `:id` no es un UUID válido, la respuesta es la misma: `404`.

**Objeto planta** (lo devuelven GET, POST y PUT; el `UserId` no se expone):

```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "name": "Monstera",
  "species": "Monstera deliciosa",
  "imageUrl": null,
  "status": "healthy",
  "location": "Sala",
  "lastWateredAt": null,
  "deviceId": "22222222-2222-2222-2222-222222222222",
  "createdAt": "2026-10-16T20:00:00.000Z",
  "updatedAt": "2026-10-16T20:00:00.000Z"
}
```

`status` es `healthy`, `warning` o `critical`. Las fechas están en UTC (ISO 8601).

**Body de POST y PUT.** Solo se leen estos cuatro campos; cualquier otro (`status`, `userId`, `deviceId`, `id`…) se ignora:

| Campo | Obligatorio | Reglas |
|---|---|---|
| `name` | Sí | Texto de 2 a 50 caracteres |
| `species` | Sí | Texto de 2 a 100 caracteres |
| `location` | No | Texto de hasta 50 caracteres |
| `imageUrl` | No | Hasta 500 caracteres; debe empezar por `http://` o `https://` |

- `name`, `species` y `location` solo admiten letras (con tildes, diéresis y ñ), números, espacios, guion, punto y paréntesis.
- Los textos se normalizan antes de guardarse: Unicode NFC, sin espacios en los extremos y con los espacios repetidos unificados (`"  Mi    planta "` → `"Mi planta"`).
- `location` o `imageUrl` vacíos, `null` o ausentes se guardan como `null`.

```json
{ "name": "Mi planta", "species": "Ficus lyrata", "location": "Sala", "imageUrl": "https://ejemplo.com/ficus.jpg" }
```

#### `GET /api/plants`

- `200`: arreglo de plantas del usuario, de la más reciente a la más antigua (`createdAt` descendente). Arreglo vacío si no tiene plantas.

#### `GET /api/plants/:id`

- `200`: la planta.
- `404`: `{ "message": "Planta no encontrada" }`

#### `POST /api/plants`

- `201`: la planta creada. `status` queda en `healthy` (valor por defecto de la BD) y `deviceId` en `null`.
- `400`: datos inválidos, con un mensaje por campo:

  ```json
  {
    "message": "Datos de planta inválidos",
    "errors": {
      "name": "El nombre es un campo obligatorio.",
      "species": "La especie debe tener al menos 2 caracteres."
    }
  }
  ```

#### `PUT /api/plants/:id`

Reemplaza `name`, `species`, `location` e `imageUrl` (un opcional que no se envía queda en `null`) y actualiza `updatedAt`. No cambia `status`, `deviceId` ni `createdAt`.

- `200`: la planta actualizada.
- `400`: datos inválidos (mismo formato que POST).
- `404`: `{ "message": "Planta no encontrada" }`

#### `DELETE /api/plants/:id`

Las alertas de la planta se borran en cascada y sus lecturas quedan con `PlantId = NULL` (claves foráneas del esquema).

- `204`: eliminada, sin cuerpo.
- `404`: `{ "message": "Planta no encontrada" }`

#### Errores comunes

- `401`: `{ "message": "No autorizado" }` — sin token, con formato distinto a `Bearer <token>`, o con token inválido o vencido.
- `500`: `{ "message": "Error interno del servidor" }`. El detalle solo se escribe en la consola del servidor.

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
| 404 | La planta no existe o pertenece a otro usuario | `Planta no encontrada` | `src/routes/plants.js` |
| 413 | El cuerpo supera el límite de `express.json()` (100 kb por defecto) | `El cuerpo de la petición es demasiado grande` | Manejador de errores en `src/app.js` |
| 500 | Error inesperado del servidor. El detalle se registra en la consola del servidor y nunca se envía al cliente | `Error interno del servidor` | Manejador de errores en `src/app.js` y `src/routes/auth.js` |
