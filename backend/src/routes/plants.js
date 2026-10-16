// Rutas CRUD de plantas — PlantPulse (PLAN-53)
// Todas las rutas requieren JWT y solo operan sobre las plantas del usuario autenticado.
import { Router } from 'express';
import sql from 'mssql';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validarPlanta, NOMBRE_MAX, ESPECIE_MAX, UBICACION_MAX, IMAGEN_URL_MAX } from '../utils/validarPlanta.js';

const router = Router();

// Formato de un UNIQUEIDENTIFIER de SQL Server (8-4-4-4-12 hexadecimales)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Columnas que se devuelven al cliente. UserId NO está: no se expone.
const COLUMNAS = 'Id, Name, Species, ImageUrl, Status, Location, LastWateredAt, DeviceId, CreatedAt, UpdatedAt';
const COLUMNAS_INSERTED = COLUMNAS.split(', ').map((c) => `INSERTED.${c}`).join(', ');

const NO_ENCONTRADA = { message: 'Planta no encontrada' };

// Convierte una fila de SQL Server (PascalCase) al JSON de la API (camelCase)
export function mapPlant(fila) {
  return {
    id: fila.Id.toLowerCase(),
    name: fila.Name,
    species: fila.Species,
    imageUrl: fila.ImageUrl,
    status: fila.Status,
    location: fila.Location,
    lastWateredAt: fila.LastWateredAt,
    deviceId: fila.DeviceId ? fila.DeviceId.toLowerCase() : null,
    createdAt: fila.CreatedAt,
    updatedAt: fila.UpdatedAt,
  };
}

// Respuesta 500 genérica: el detalle va solo a la consola del servidor, nunca al cliente
function errorInterno(res, contexto, err) {
  console.error(`Error en ${contexto}:`, err);
  res.status(500).json({ message: 'Error interno del servidor' });
}

// Valida el body; si hay errores responde 400 y devuelve null
function datosValidos(req, res) {
  const { datos, errores } = validarPlanta(req.body);
  if (Object.keys(errores).length > 0) {
    res.status(400).json({ message: 'Datos de planta inválidos', errors: errores });
    return null;
  }
  return datos;
}

// Request con el id del usuario autenticado ya cargado (lo usan todas las consultas)
function requestDelUsuario(req) {
  return pool.request().input('userId', sql.UniqueIdentifier, req.user.id);
}

// Request con los campos editables de la planta (POST y PUT)
function conDatosPlanta(request, datos) {
  return request
    .input('name', sql.NVarChar(NOMBRE_MAX), datos.name)
    .input('species', sql.NVarChar(ESPECIE_MAX), datos.species)
    .input('location', sql.NVarChar(UBICACION_MAX), datos.location)
    .input('imageUrl', sql.NVarChar(IMAGEN_URL_MAX), datos.imageUrl);
}

// 1. Todo el router exige un JWT válido (si no, 401)
router.use(authenticateToken);

// 2. Un :id que no es UUID no puede existir → 404 sin consultar SQL
router.param('id', (req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return res.status(404).json(NO_ENCONTRADA);
  }
  next();
});

// GET /api/plants — plantas del usuario, de la más reciente a la más antigua
router.get('/', async (req, res) => {
  try {
    const result = await requestDelUsuario(req).query(
      `SELECT ${COLUMNAS} FROM Plants WHERE UserId = @userId ORDER BY CreatedAt DESC, Name ASC`
    );
    res.json(result.recordset.map(mapPlant));
  } catch (err) {
    errorInterno(res, 'GET /api/plants', err);
  }
});

// GET /api/plants/:id — una planta del usuario
router.get('/:id', async (req, res) => {
  try {
    const result = await requestDelUsuario(req)
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query(`SELECT ${COLUMNAS} FROM Plants WHERE Id = @id AND UserId = @userId`);
    if (result.recordset.length === 0) {
      return res.status(404).json(NO_ENCONTRADA);
    }
    res.json(mapPlant(result.recordset[0]));
  } catch (err) {
    errorInterno(res, 'GET /api/plants/:id', err);
  }
});

// POST /api/plants — crear planta. Solo se usan name, species, location e imageUrl;
// Status toma su DEFAULT ('healthy') y UserId sale del token, nunca del body.
router.post('/', async (req, res) => {
  const datos = datosValidos(req, res);
  if (!datos) return;

  try {
    const result = await conDatosPlanta(requestDelUsuario(req), datos).query(
      `INSERT INTO Plants (Name, Species, Location, ImageUrl, UserId)
       OUTPUT ${COLUMNAS_INSERTED}
       VALUES (@name, @species, @location, @imageUrl, @userId)`
    );
    res.status(201).json(mapPlant(result.recordset[0]));
  } catch (err) {
    errorInterno(res, 'POST /api/plants', err);
  }
});

// PUT /api/plants/:id — reemplazar los campos editables y actualizar UpdatedAt
router.put('/:id', async (req, res) => {
  const datos = datosValidos(req, res);
  if (!datos) return;

  try {
    const result = await conDatosPlanta(requestDelUsuario(req), datos)
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query(
        `UPDATE Plants
         SET Name = @name, Species = @species, Location = @location, ImageUrl = @imageUrl,
             UpdatedAt = SYSUTCDATETIME()
         OUTPUT ${COLUMNAS_INSERTED}
         WHERE Id = @id AND UserId = @userId`
      );
    if (result.recordset.length === 0) {
      return res.status(404).json(NO_ENCONTRADA);
    }
    res.json(mapPlant(result.recordset[0]));
  } catch (err) {
    errorInterno(res, 'PUT /api/plants/:id', err);
  }
});

// DELETE /api/plants/:id — borrar planta (sus alertas se borran en cascada
// y sus lecturas quedan con PlantId = NULL, según las FK del esquema)
router.delete('/:id', async (req, res) => {
  try {
    const result = await requestDelUsuario(req)
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Plants WHERE Id = @id AND UserId = @userId');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json(NO_ENCONTRADA);
    }
    res.status(204).end();
  } catch (err) {
    errorInterno(res, 'DELETE /api/plants/:id', err);
  }
});

export default router;
