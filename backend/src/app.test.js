// Pruebas del manejo global de errores de app.js — PLAN-54
// No requieren SQL Server: ninguna peticion llega a consultar la base de datos.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('Manejo global de errores (PLAN-54)', () => {
  it('JSON malformado en POST /api/auth/login -> 400 en formato JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "demo@plantpulse.local", ');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.message).toBe('El cuerpo de la petición no es un JSON válido');
  });

  it('ruta inexistente (GET /api/no-existe) -> 404 en formato JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.message).toBe('Ruta no encontrada');
  });

  it('GET /api/health sigue respondiendo 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
