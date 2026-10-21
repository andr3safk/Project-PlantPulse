// Pruebas reales del login — PLAN-54 (entregable 6). Requieren SQL Server.
// Las del middleware authenticateToken están en middleware/auth.test.js (sin BD, PLAN-58).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { pool } from './db.js';
import app from './app.js';

const VALID = { email: 'demo@plantpulse.local', password: 'PlantPulse2026!' };

describe('Login (PLAN-54)', () => {
  beforeAll(async () => {
    await pool.connect();
  });

  afterAll(async () => {
    await pool.close();
  });

  it('a) login valido -> 200, token existe, id del seed', async () => {
    const res = await request(app).post('/api/auth/login').send(VALID);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('b) contraseña incorrecta -> 401 y mensaje generico', async () => {
    const res = await request(app).post('/api/auth/login').send({ ...VALID, password: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('c) email inexistente -> 401 y MISMO mensaje', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no@existe.com', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('d) body sin email o sin password -> 400', async () => {
    const r1 = await request(app).post('/api/auth/login').send({ password: 'x' });
    const r2 = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(r1.status).toBe(400);
    expect(r1.body.message).toBe('Email y password son requeridos');
    expect(r2.status).toBe(400);
    expect(r2.body.message).toBe('Email y password son requeridos');
  });
});
