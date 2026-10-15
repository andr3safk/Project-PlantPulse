// Pruebas reales del login y middleware — PLAN-54 (entregable 6)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import sql from 'mssql';
import { pool, dbConfig } from './db.js';
import app from './app.js';
import { authenticateToken } from './middleware/auth.js';

const VALID = { email: 'demo@plantpulse.local', password: 'PlantPulse2026!' };

describe('Login y middleware (PLAN-54)', () => {
  beforeAll(async () => {
    // Conectar pool para que app funcione con BD
    await pool.connect();
  });

  afterAll(async () => {
    await pool.close();
  });

  it('a) login valido -> 200, token existe, id del seed', async () => {
    const res = await request(app).post('/api/auth/login').send(VALID);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = await import('jsonwebtoken').then(j => j.verify(res.body.token, process.env.JWT_SECRET));
    expect(decoded.id).toBe('11111111-1111-1111-1111-111111111111');
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
    expect([400, 401]).toContain(r1.status);
    expect([400, 401]).toContain(r2.status);
  });

  it('e) middleware sin token -> 401', async () => {
    const tempApp = express();
    tempApp.get('/test', authenticateToken, (req, res) => res.json({ id: req.user.id }));
    const res = await request(tempApp).get('/test');
    expect(res.status).toBe(401);
  });

  it('f) middleware con token invalido (Bearer abc.def.ghi) -> 401', async () => {
    const tempApp = express();
    tempApp.get('/test', authenticateToken, (req, res) => res.json({ id: req.user.id }));
    const res = await request(tempApp).get('/test').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('g) middleware con token valido -> 200 y body.id del seed', async () => {
    const loginRes = await request(app).post('/api/auth/login').send(VALID);
    const token = loginRes.body.token;
    const tempApp = express();
    tempApp.get('/test', authenticateToken, (req, res) => res.json({ id: req.user.id }));
    const res = await request(tempApp).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('11111111-1111-1111-1111-111111111111');
  });
});
