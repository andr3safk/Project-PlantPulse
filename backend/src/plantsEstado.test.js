// Pruebas de integración: última lectura y estado del dispositivo en GET /api/plants — PLAN-39
// Requiere SQL Server con el esquema cargado (ver database/README.md).
// No toca los datos del seed: crea su propio usuario, 3 dispositivos, 4 plantas y sus lecturas;
// todo se borra en afterAll. Las fechas se calculan en SQL Server (SYSUTCDATETIME), igual que la API.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';
import app from './app.js';

const SUFIJO = randomUUID().slice(0, 8);
const USUARIO_ID = randomUUID();

// Dispositivos: conectado (latido ahora), desconectado (latido hace 90 s) y sin latido nunca
const DISP_CONECTADO = randomUUID();
const DISP_DESCONECTADO = randomUUID();
const DISP_SIN_LATIDO = randomUUID();

// Plantas:
// - EN_VIVO: dispositivo conectado, lectura de hace 30 s (y otra más antigua que NO debe salir)
// - DESACTUALIZADA: dispositivo desconectado, última lectura de hace 6 minutos
// - CUATRO_MIN: dispositivo sin latido, última lectura de hace 4 minutos (todavía en tiempo real)
// - SIN_SENSOR: sin dispositivo y sin lecturas
const EN_VIVO = randomUUID();
const DESACTUALIZADA = randomUUID();
const CUATRO_MIN = randomUUID();
const SIN_SENSOR = randomUUID();

let token;
let porId;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await pool.connect();

  // Token firmado igual que en POST /api/auth/login (payload { id }); el usuario no necesita contraseña
  token = jwt.sign({ id: USUARIO_ID }, process.env.JWT_SECRET, { expiresIn: '5m' });

  await pool.request()
    .input('userId', sql.UniqueIdentifier, USUARIO_ID)
    .input('email', sql.NVarChar(255), `estado-${SUFIJO}@plantpulse.test`)
    .input('d1', sql.UniqueIdentifier, DISP_CONECTADO)
    .input('k1', sql.NVarChar(50), `test-con-${SUFIJO}`)
    .input('d2', sql.UniqueIdentifier, DISP_DESCONECTADO)
    .input('k2', sql.NVarChar(50), `test-des-${SUFIJO}`)
    .input('d3', sql.UniqueIdentifier, DISP_SIN_LATIDO)
    .input('k3', sql.NVarChar(50), `test-sin-${SUFIJO}`)
    .input('p1', sql.UniqueIdentifier, EN_VIVO)
    .input('p2', sql.UniqueIdentifier, DESACTUALIZADA)
    .input('p3', sql.UniqueIdentifier, CUATRO_MIN)
    .input('p4', sql.UniqueIdentifier, SIN_SENSOR)
    .query(`
      INSERT INTO Users (Id, Email, PasswordHash, FullName) VALUES (@userId, @email, 'sin-login', 'Pruebas Estado');
      INSERT INTO Devices (Id, DeviceKey, Name, Status, LastSeenAt) VALUES
        (@d1, @k1, 'Prueba conectado', 'online', SYSUTCDATETIME()),
        (@d2, @k2, 'Prueba desconectado', 'online', DATEADD(SECOND, -90, SYSUTCDATETIME())),
        (@d3, @k3, 'Prueba sin latido', 'offline', NULL);
      INSERT INTO Plants (Id, Name, Species, Status, DeviceId, UserId) VALUES
        (@p1, 'En vivo', 'Ficus lyrata', 'healthy', @d1, @userId),
        (@p2, 'Desactualizada', 'Ficus lyrata', 'warning', @d2, @userId),
        (@p3, 'Cuatro minutos', 'Ficus lyrata', 'healthy', @d3, @userId),
        (@p4, 'Sin sensor', 'Ficus lyrata', 'healthy', NULL, @userId);
      INSERT INTO SensorReadings (DeviceId, PlantId, Moisture, Temperature, Light, RecordedAt) VALUES
        (@d1, @p1, 10, 10, 10, DATEADD(MINUTE, -20, SYSUTCDATETIME())),
        (@d1, @p1, 45.25, 22.5, 60, DATEADD(SECOND, -30, SYSUTCDATETIME())),
        (@d2, @p2, 25, 18, 40, DATEADD(MINUTE, -6, SYSUTCDATETIME())),
        (@d3, @p3, 50, 21, 70, DATEADD(MINUTE, -4, SYSUTCDATETIME()));
    `);

  const res = await request(app).get('/api/plants').set(auth());
  porId = Object.fromEntries((res.body ?? []).map((p) => [p.id, p]));
});

afterAll(async () => {
  try {
    // Borrar los dispositivos borra sus lecturas (ON DELETE CASCADE); las plantas se borran antes
    await pool.request()
      .input('userId', sql.UniqueIdentifier, USUARIO_ID)
      .input('d1', sql.UniqueIdentifier, DISP_CONECTADO)
      .input('d2', sql.UniqueIdentifier, DISP_DESCONECTADO)
      .input('d3', sql.UniqueIdentifier, DISP_SIN_LATIDO)
      .query(`
        DELETE FROM Plants WHERE UserId = @userId;
        DELETE FROM Devices WHERE Id IN (@d1, @d2, @d3);
        DELETE FROM Users WHERE Id = @userId;
      `);
  } finally {
    await pool.close();
  }
});

describe('GET /api/plants — última lectura y dispositivo (PLAN-39)', () => {
  it('devuelve las 4 plantas del usuario de prueba', () => {
    expect(Object.keys(porId).sort()).toEqual([EN_VIVO, DESACTUALIZADA, CUATRO_MIN, SIN_SENSOR].sort());
  });

  it('trae la lectura MÁS RECIENTE de la planta (no la antigua) y en tiempo real', () => {
    const { lastReading } = porId[EN_VIVO];
    expect(lastReading).toMatchObject({ moisture: 45.25, temperature: 22.5, light: 60, isStale: false });
    expect(Object.keys(lastReading).sort()).toEqual(['isStale', 'light', 'moisture', 'recordedAt', 'temperature']);
    expect(Number.isNaN(Date.parse(lastReading.recordedAt))).toBe(false);
  });

  it('dispositivo con latido reciente → connected true', () => {
    expect(porId[EN_VIVO].device).toMatchObject({ id: DISP_CONECTADO, connected: true });
    expect(Number.isNaN(Date.parse(porId[EN_VIVO].device.lastSeenAt))).toBe(false);
  });

  it('última lectura de hace más de 5 minutos → isStale true', () => {
    expect(porId[DESACTUALIZADA].lastReading).toMatchObject({ moisture: 25, temperature: 18, light: 40, isStale: true });
  });

  it('latido de hace 90 s → connected false (aunque Devices.Status diga online)', () => {
    expect(porId[DESACTUALIZADA].device).toMatchObject({ id: DISP_DESCONECTADO, connected: false });
  });

  it('lectura de hace 4 minutos → todavía en tiempo real (isStale false)', () => {
    expect(porId[CUATRO_MIN].lastReading).toMatchObject({ moisture: 50, isStale: false });
  });

  it('dispositivo que nunca envió latido → lastSeenAt null y connected false', () => {
    expect(porId[CUATRO_MIN].device).toEqual({ id: DISP_SIN_LATIDO, lastSeenAt: null, connected: false });
  });

  it('planta sin dispositivo ni lecturas → lastReading null y device null', () => {
    expect(porId[SIN_SENSOR].lastReading).toBeNull();
    expect(porId[SIN_SENSOR].device).toBeNull();
    expect(porId[SIN_SENSOR].deviceId).toBeNull();
  });

  it('GET /api/plants/:id NO incluye lastReading ni device (solo la lista)', async () => {
    const res = await request(app).get(`/api/plants/${EN_VIVO}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('lastReading');
    expect(res.body).not.toHaveProperty('device');
  });
});
