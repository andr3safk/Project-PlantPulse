// Pruebas de integración del CRUD de plantas — PLAN-53
// Requiere SQL Server con el esquema y el seed cargados (ver database/README.md).
// No modifica las 3 plantas del seed: todo lo que crea lo borra en afterAll.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sql from 'mssql';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';
import app from './app.js';

const DEMO = { email: 'demo@plantpulse.local', password: 'PlantPulse2026!' };
const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';
const SEED_IDS = [
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
];
const ID_INEXISTENTE = '99999999-9999-9999-9999-999999999999';

// Segundo usuario y su planta (se crean con SQL directo en beforeAll)
const OTRO_USER_ID = randomUUID();
const OTRA_PLANTA_ID = randomUUID();

let token;
const idsCreados = []; // plantas creadas por las pruebas, para borrarlas al final

const auth = () => ({ Authorization: `Bearer ${token}` });

// Crea una planta por la API y guarda su id para limpiarla en afterAll
async function crearPlanta(body) {
  const res = await request(app).post('/api/plants').set(auth()).send(body);
  if (res.body?.id) idsCreados.push(res.body.id);
  return res;
}

beforeAll(async () => {
  await pool.connect();

  const login = await request(app).post('/api/auth/login').send(DEMO);
  token = login.body.token;

  await pool.request()
    .input('userId', sql.UniqueIdentifier, OTRO_USER_ID)
    .input('email', sql.NVarChar(255), `otro-${OTRO_USER_ID}@plantpulse.test`)
    .input('plantId', sql.UniqueIdentifier, OTRA_PLANTA_ID)
    .query(`
      INSERT INTO Users (Id, Email, PasswordHash, FullName) VALUES (@userId, @email, 'sin-login', 'Otro Usuario');
      INSERT INTO Plants (Id, Name, Species, UserId) VALUES (@plantId, 'Ajena', 'Ficus lyrata', @userId);
    `);
});

afterAll(async () => {
  try {
    // Borrar solo lo creado por las pruebas (filtrando por el usuario demo por seguridad)
    for (const id of idsCreados) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('userId', sql.UniqueIdentifier, DEMO_USER_ID)
        .query('DELETE FROM Plants WHERE Id = @id AND UserId = @userId');
    }
    await pool.request()
      .input('plantId', sql.UniqueIdentifier, OTRA_PLANTA_ID)
      .input('userId', sql.UniqueIdentifier, OTRO_USER_ID)
      .query('DELETE FROM Plants WHERE Id = @plantId; DELETE FROM Users WHERE Id = @userId;');
  } finally {
    await pool.close();
  }
});

describe('autenticación de /api/plants', () => {
  it('sin token → 401 en las 5 rutas', async () => {
    const id = SEED_IDS[0];
    const respuestas = await Promise.all([
      request(app).get('/api/plants'),
      request(app).get(`/api/plants/${id}`),
      request(app).post('/api/plants').send({ name: 'X1', species: 'Y1' }),
      request(app).put(`/api/plants/${id}`).send({ name: 'X1', species: 'Y1' }),
      request(app).delete(`/api/plants/${id}`),
    ]);
    for (const res of respuestas) expect(res.status).toBe(401);
  });

  it('token inválido → 401', async () => {
    const res = await request(app).get('/api/plants').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/plants', () => {
  it('devuelve las plantas del seed en camelCase y sin userId', async () => {
    const res = await request(app).get('/api/plants').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((p) => p.id);
    for (const id of SEED_IDS) expect(ids).toContain(id);
    for (const planta of res.body) {
      expect(planta).not.toHaveProperty('userId');
      expect(planta).not.toHaveProperty('UserId');
      expect(Object.keys(planta).sort()).toEqual([
        'createdAt', 'deviceId', 'id', 'imageUrl', 'lastWateredAt',
        'location', 'name', 'species', 'status', 'updatedAt',
      ]);
    }
  });

  it('no incluye plantas de otro usuario', async () => {
    const res = await request(app).get('/api/plants').set(auth());
    expect(res.body.map((p) => p.id)).not.toContain(OTRA_PLANTA_ID);
  });

  it('viene ordenada por createdAt descendente', async () => {
    const res = await request(app).get('/api/plants').set(auth());
    const fechas = res.body.map((p) => new Date(p.createdAt).getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });
});

describe('GET /api/plants/:id', () => {
  it('planta del seed → 200 con sus datos', async () => {
    const res = await request(app).get(`/api/plants/${SEED_IDS[0]}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: SEED_IDS[0],
      name: 'Monstera',
      species: 'Monstera deliciosa',
      status: 'healthy',
      location: 'Sala',
      deviceId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('id inexistente → 404', async () => {
    const res = await request(app).get(`/api/plants/${ID_INEXISTENTE}`).set(auth());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Planta no encontrada' });
  });

  it("id malformado ('abc') → 404", async () => {
    const res = await request(app).get('/api/plants/abc').set(auth());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Planta no encontrada' });
  });
});

describe('POST /api/plants', () => {
  it('válido → 201 con la planta creada y los datos normalizados', async () => {
    const res = await crearPlanta({
      name: '  Mi    planta ',
      species: ' Ficus   lyrata ',
      location: '  Sala   principal ',
      imageUrl: ' https://ejemplo.com/ficus.jpg ',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Mi planta',
      species: 'Ficus lyrata',
      location: 'Sala principal',
      imageUrl: 'https://ejemplo.com/ficus.jpg',
      status: 'healthy',
      deviceId: null,
      lastWateredAt: null,
    });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).not.toHaveProperty('userId');

    // La fila existe de verdad y es del usuario demo
    const get = await request(app).get(`/api/plants/${res.body.id}`).set(auth());
    expect(get.status).toBe(200);
    expect(get.body.name).toBe('Mi planta');
  });

  it('opcionales vacíos → se guardan como null', async () => {
    const res = await crearPlanta({ name: 'Cactus', species: 'Opuntia', location: '   ', imageUrl: '' });
    expect(res.status).toBe(201);
    expect(res.body.location).toBeNull();
    expect(res.body.imageUrl).toBeNull();
  });

  it('ignora status, userId, deviceId e id enviados en el body', async () => {
    const idForzado = randomUUID();
    const res = await crearPlanta({
      name: 'Intrusa',
      species: 'Rosa',
      status: 'critical',
      userId: OTRO_USER_ID,
      deviceId: '22222222-2222-2222-2222-222222222222',
      id: idForzado,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('healthy');
    expect(res.body.deviceId).toBeNull();
    expect(res.body.id).not.toBe(idForzado);

    // Quedó a nombre del usuario demo, no del otro usuario
    const fila = await pool.request()
      .input('id', sql.UniqueIdentifier, res.body.id)
      .query('SELECT UserId FROM Plants WHERE Id = @id');
    expect(fila.recordset[0].UserId.toLowerCase()).toBe(DEMO_USER_ID);
  });

  it('inválido → 400 con errors.name y errors.species', async () => {
    const res = await crearPlanta({ name: '', species: 123 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Datos de planta inválidos');
    expect(res.body.errors.name).toBe('El nombre es un campo obligatorio.');
    expect(res.body.errors.species).toBe('La especie debe ser un texto.');
  });

  it('imageUrl con otro esquema → 400 con errors.imageUrl', async () => {
    const res = await crearPlanta({ name: 'Rosa', species: 'Rosa sp.', imageUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(res.body.errors.imageUrl).toBe('La URL de la imagen debe empezar por http:// o https://.');
  });
});

describe('PUT /api/plants/:id', () => {
  it('válido → 200, cambia los datos y updatedAt', async () => {
    const creada = await crearPlanta({ name: 'Antes', species: 'Especie antes', location: 'Sala' });
    expect(creada.status).toBe(201);
    await new Promise((r) => setTimeout(r, 20)); // asegura un instante distinto para UpdatedAt

    const res = await request(app)
      .put(`/api/plants/${creada.body.id}`)
      .set(auth())
      .send({ name: '  Despues  ', species: 'Especie despues', status: 'critical' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: creada.body.id,
      name: 'Despues',
      species: 'Especie despues',
      location: null, // PUT reemplaza: si no se envía, queda en NULL
      status: 'healthy', // status del body se ignora
      createdAt: creada.body.createdAt,
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(creada.body.updatedAt).getTime());
  });

  it('inválido → 400', async () => {
    const res = await request(app).put(`/api/plants/${SEED_IDS[0]}`).set(auth()).send({ name: 'A', species: '<b>' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('name');
    expect(res.body.errors).toHaveProperty('species');
  });

  it('id inexistente → 404', async () => {
    const res = await request(app).put(`/api/plants/${ID_INEXISTENTE}`).set(auth()).send({ name: 'Rosa', species: 'Rosa' });
    expect(res.status).toBe(404);
  });

  it('id malformado → 404', async () => {
    const res = await request(app).put('/api/plants/abc').set(auth()).send({ name: 'Rosa', species: 'Rosa' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/plants/:id', () => {
  it('→ 204 sin cuerpo y luego GET → 404', async () => {
    const creada = await crearPlanta({ name: 'Para borrar', species: 'Rosa' });
    const res = await request(app).delete(`/api/plants/${creada.body.id}`).set(auth());
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const get = await request(app).get(`/api/plants/${creada.body.id}`).set(auth());
    expect(get.status).toBe(404);
  });

  it('id inexistente → 404', async () => {
    const res = await request(app).delete(`/api/plants/${ID_INEXISTENTE}`).set(auth());
    expect(res.status).toBe(404);
  });

  it('id malformado → 404', async () => {
    const res = await request(app).delete('/api/plants/abc').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('planta de otro usuario', () => {
  it('GET, PUT y DELETE con el token demo → 404 y la planta no cambia', async () => {
    const get = await request(app).get(`/api/plants/${OTRA_PLANTA_ID}`).set(auth());
    const put = await request(app).put(`/api/plants/${OTRA_PLANTA_ID}`).set(auth()).send({ name: 'Robada', species: 'Rosa' });
    const del = await request(app).delete(`/api/plants/${OTRA_PLANTA_ID}`).set(auth());
    expect(get.status).toBe(404);
    expect(put.status).toBe(404);
    expect(del.status).toBe(404);

    const fila = await pool.request()
      .input('id', sql.UniqueIdentifier, OTRA_PLANTA_ID)
      .query('SELECT Name FROM Plants WHERE Id = @id');
    expect(fila.recordset).toHaveLength(1);
    expect(fila.recordset[0].Name).toBe('Ajena');
  });
});

describe('seed intacto', () => {
  it('las 3 plantas del seed siguen con sus datos originales', async () => {
    const res = await request(app).get('/api/plants').set(auth());
    const porId = Object.fromEntries(res.body.map((p) => [p.id, p]));
    expect(porId[SEED_IDS[0]]).toMatchObject({ name: 'Monstera', status: 'healthy' });
    expect(porId[SEED_IDS[1]]).toMatchObject({ name: 'Potos', status: 'warning' });
    expect(porId[SEED_IDS[2]]).toMatchObject({ name: 'Suculenta', status: 'critical' });
  });
});
