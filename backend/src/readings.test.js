import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { pool } from './db.js';
import { connect } from './db.js';
import app from './app.js';

let token = '';

describe('POST /api/readings integración', () => {
  beforeAll(async () => {
    await connect();
    // Login con seed para token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@plantpulse.local', password: 'PlantPulse2026!' });
    token = res.body.token;
  });

  afterAll(async () => {
    await pool.close();
  });

  it('401 sin header', async () => {
    const res = await request(app).post('/api/readings').send({ moisture: 50, temperature: 22, light: 60 });
    expect(res.status).toBe(401);
  });

  it('400 datos inválidos', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('X-Device-Key', 'plantpulse_001')
      .send({ moisture: 'malo', temperature: 22, light: 60 });
    expect(res.status).toBe(400);
  });

  it('201 con lectura válida', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('X-Device-Key', 'plantpulse_001')
      .send({ moisture: 55.5, temperature: 22.5, light: 65.0 });
    expect(res.status).toBe(201);
    expect(res.body.deviceId).toBeDefined();
    expect(res.body.plantStatus).toBeDefined();
  });
});
