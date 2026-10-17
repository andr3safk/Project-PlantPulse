// Pruebas de integración de POST /api/readings — PLAN-55
// Requiere SQL Server con el esquema y el seed cargados (ver database/README.md).
// No toca los datos del seed: crea su propio usuario, dos dispositivos (uno con planta
// y otro sin planta) y una planta; todo se borra en afterAll.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sql from 'mssql';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';
import app from './app.js';

const SUFIJO = randomUUID().slice(0, 8);
const USUARIO_ID = randomUUID();
const PLANTA_ID = randomUUID();
const DISPOSITIVO_CON_PLANTA = { id: randomUUID(), key: `test-lect-${SUFIJO}` };
const DISPOSITIVO_SIN_PLANTA = { id: randomUUID(), key: `test-sola-${SUFIJO}` };
const UPDATED_AT_INICIAL = new Date('2026-01-01T00:00:00Z');

const LECTURA_SANA = { moisture: 55.5, temperature: 22.5, light: 65 };
const LECTURA_CRITICA = { moisture: 10, temperature: 22, light: 60 };

const enviar = (key, body) => {
  const peticion = request(app).post('/api/readings');
  if (key) peticion.set('X-Device-Key', key);
  return body === undefined ? peticion : peticion.send(body);
};

const contarLecturas = async (deviceId) => {
  const r = await pool.request()
    .input('deviceId', sql.UniqueIdentifier, deviceId)
    .query('SELECT COUNT(*) AS total FROM SensorReadings WHERE DeviceId = @deviceId');
  return r.recordset[0].total;
};

const leerPlanta = async () => {
  const r = await pool.request()
    .input('id', sql.UniqueIdentifier, PLANTA_ID)
    .query('SELECT Status, UpdatedAt FROM Plants WHERE Id = @id');
  return r.recordset[0];
};

const leerDispositivo = async (id) => {
  const r = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT Status, LastSeenAt FROM Devices WHERE Id = @id');
  return r.recordset[0];
};

beforeAll(async () => {
  await pool.connect();
  await pool.request()
    .input('userId', sql.UniqueIdentifier, USUARIO_ID)
    .input('email', sql.NVarChar(255), `lecturas-${SUFIJO}@plantpulse.test`)
    .input('dev1', sql.UniqueIdentifier, DISPOSITIVO_CON_PLANTA.id)
    .input('key1', sql.NVarChar(50), DISPOSITIVO_CON_PLANTA.key)
    .input('dev2', sql.UniqueIdentifier, DISPOSITIVO_SIN_PLANTA.id)
    .input('key2', sql.NVarChar(50), DISPOSITIVO_SIN_PLANTA.key)
    .input('plantId', sql.UniqueIdentifier, PLANTA_ID)
    .input('updatedAt', sql.DateTime2, UPDATED_AT_INICIAL)
    .query(`
      INSERT INTO Users (Id, Email, PasswordHash, FullName) VALUES (@userId, @email, 'sin-login', 'Pruebas Lecturas');
      INSERT INTO Devices (Id, DeviceKey, Name, Status) VALUES (@dev1, @key1, 'Prueba con planta', 'offline');
      INSERT INTO Devices (Id, DeviceKey, Name, Status) VALUES (@dev2, @key2, 'Prueba sin planta', 'offline');
      INSERT INTO Plants (Id, Name, Species, Status, DeviceId, UserId, UpdatedAt)
        VALUES (@plantId, 'Planta prueba', 'Ficus lyrata', 'healthy', @dev1, @userId, @updatedAt);
    `);
});

afterAll(async () => {
  try {
    // Borrar los dispositivos borra sus lecturas (ON DELETE CASCADE)
    await pool.request()
      .input('plantId', sql.UniqueIdentifier, PLANTA_ID)
      .input('userId', sql.UniqueIdentifier, USUARIO_ID)
      .input('dev1', sql.UniqueIdentifier, DISPOSITIVO_CON_PLANTA.id)
      .input('dev2', sql.UniqueIdentifier, DISPOSITIVO_SIN_PLANTA.id)
      .query(`
        DELETE FROM Plants WHERE Id = @plantId;
        DELETE FROM Devices WHERE Id IN (@dev1, @dev2);
        DELETE FROM Users WHERE Id = @userId;
      `);
  } finally {
    await pool.close();
  }
});

describe('POST /api/readings — autenticación del dispositivo', () => {
  it('sin X-Device-Key → 401 y no guarda nada', async () => {
    const antes = await contarLecturas(DISPOSITIVO_CON_PLANTA.id);
    const res = await enviar(null, LECTURA_SANA);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Dispositivo no autorizado' });
    expect(await contarLecturas(DISPOSITIVO_CON_PLANTA.id)).toBe(antes);
  });

  it('clave inexistente → 401', async () => {
    const res = await enviar('clave-que-no-existe', LECTURA_SANA);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Dispositivo no autorizado' });
  });

  it('clave de más de 50 caracteres → 401 (sin error de SQL)', async () => {
    const res = await enviar('x'.repeat(51), LECTURA_SANA);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/readings — validación', () => {
  it('datos inválidos → 400 con errors y no guarda nada', async () => {
    const antes = await contarLecturas(DISPOSITIVO_CON_PLANTA.id);
    const res = await enviar(DISPOSITIVO_CON_PLANTA.key, { moisture: '50', temperature: 99 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: 'Datos de lectura invalidos',
      errors: {
        moisture: 'debe ser número',
        temperature: 'fuera de rango (-10 a 60)',
        light: 'obligatorio',
      },
    });
    expect(await contarLecturas(DISPOSITIVO_CON_PLANTA.id)).toBe(antes);
  });

  it('sin cuerpo → 400 (no 500)', async () => {
    const res = await enviar(DISPOSITIVO_CON_PLANTA.key);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Datos de lectura invalidos');
  });
});

describe('POST /api/readings — lectura válida', () => {
  it('201 con el contrato completo y la fila guardada', async () => {
    const antes = await contarLecturas(DISPOSITIVO_CON_PLANTA.id);
    const res = await enviar(DISPOSITIVO_CON_PLANTA.key, { ...LECTURA_SANA, plantId: randomUUID(), extra: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      deviceId: DISPOSITIVO_CON_PLANTA.id,
      plantId: PLANTA_ID,
      moisture: 55.5,
      temperature: 22.5,
      light: 65,
      recordedAt: expect.any(String),
      plantStatus: 'healthy',
    });
    expect(await contarLecturas(DISPOSITIVO_CON_PLANTA.id)).toBe(antes + 1);

    const fila = await pool.request()
      .input('id', sql.BigInt, res.body.id)
      .query('SELECT LOWER(CAST(PlantId AS NVARCHAR(50))) AS plantId, Moisture, Temperature, Light, RecordedAt FROM SensorReadings WHERE Id = @id');
    expect(fila.recordset).toHaveLength(1);
    expect(fila.recordset[0]).toMatchObject({ plantId: PLANTA_ID, Moisture: 55.5, Temperature: 22.5, Light: 65 });
    expect(fila.recordset[0].RecordedAt).toBeInstanceOf(Date);
  });

  it('lectura crítica → actualiza Plants.Status sin tocar UpdatedAt', async () => {
    const res = await enviar(DISPOSITIVO_CON_PLANTA.key, LECTURA_CRITICA);
    expect(res.status).toBe(201);
    expect(res.body.plantStatus).toBe('critical');

    const planta = await leerPlanta();
    expect(planta.Status).toBe('critical');
    expect(planta.UpdatedAt.toISOString()).toBe(UPDATED_AT_INICIAL.toISOString());
  });

  it('una lectura sana después devuelve la planta a healthy', async () => {
    const res = await enviar(DISPOSITIVO_CON_PLANTA.key, LECTURA_SANA);
    expect(res.body.plantStatus).toBe('healthy');
    expect((await leerPlanta()).Status).toBe('healthy');
  });

  it('marca el dispositivo online y actualiza LastSeenAt', async () => {
    const antes = await leerDispositivo(DISPOSITIVO_CON_PLANTA.id);
    await new Promise((r) => setTimeout(r, 20));
    await enviar(DISPOSITIVO_CON_PLANTA.key, LECTURA_SANA);
    const despues = await leerDispositivo(DISPOSITIVO_CON_PLANTA.id);

    expect(despues.Status).toBe('online');
    expect(despues.LastSeenAt).toBeInstanceOf(Date);
    if (antes.LastSeenAt) expect(despues.LastSeenAt.getTime()).toBeGreaterThan(antes.LastSeenAt.getTime());
  });

  it('dispositivo sin planta → 201 con plantId y plantStatus en null', async () => {
    const res = await enviar(DISPOSITIVO_SIN_PLANTA.key, LECTURA_SANA);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ deviceId: DISPOSITIVO_SIN_PLANTA.id, plantId: null, plantStatus: null });
    expect(await contarLecturas(DISPOSITIVO_SIN_PLANTA.id)).toBe(1);
    expect((await leerDispositivo(DISPOSITIVO_SIN_PLANTA.id)).Status).toBe('online');
  });

  it('redondea a 2 decimales como la columna DECIMAL(5,2)', async () => {
    const res = await enviar(DISPOSITIVO_SIN_PLANTA.key, { moisture: 33.333, temperature: 20.005, light: 70 });
    expect(res.status).toBe(201);
    expect(res.body.moisture).toBe(33.33);
  });
});
