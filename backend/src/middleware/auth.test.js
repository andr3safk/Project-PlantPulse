// Pruebas del middleware authenticateToken — PLAN-54 / PLAN-58
// No requieren SQL Server: el token válido se firma aquí con un secreto de prueba.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './auth.js';

const SECRETO_PRUEBA = 'secreto-solo-para-pruebas';
const USER_ID = '11111111-1111-1111-1111-111111111111';

const appProtegida = () => {
  const app = express();
  app.get('/test', authenticateToken, (req, res) => res.json({ id: req.user.id }));
  return app;
};

describe('authenticateToken', () => {
  beforeAll(() => {
    vi.stubEnv('JWT_SECRET', SECRETO_PRUEBA);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('sin header Authorization → 401', async () => {
    const res = await request(appProtegida()).get('/test');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'No autorizado' });
  });

  it('formato distinto a Bearer → 401', async () => {
    const res = await request(appProtegida()).get('/test').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'No autorizado' });
  });

  it('"Bearer" sin token → 401', async () => {
    const res = await request(appProtegida()).get('/test').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('token mal formado (Bearer abc.def.ghi) → 401', async () => {
    const res = await request(appProtegida()).get('/test').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'No autorizado' });
  });

  it('token firmado con otro secreto → 401', async () => {
    const token = jwt.sign({ id: USER_ID }, 'otro-secreto');
    const res = await request(appProtegida()).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token vencido → 401', async () => {
    const token = jwt.sign({ id: USER_ID }, SECRETO_PRUEBA, { expiresIn: -10 });
    const res = await request(appProtegida()).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token válido → 200 y req.user.id es el del token', async () => {
    const token = jwt.sign({ id: USER_ID }, SECRETO_PRUEBA, { expiresIn: '1h' });
    const res = await request(appProtegida()).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: USER_ID });
  });
});
