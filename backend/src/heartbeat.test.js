// Pruebas endpoint heartbeat — PLAN-56
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { pool } from './db.js';
import app from './app.js';

describe('Heartbeat device (PLAN-56)', () => {
  beforeAll(async () => {
    await pool.connect();
  });

  afterAll(async () => {
    await pool.close();
  });

  it('exito con clave correcta -> 200 y LastSeenAt actualizado', async () => {
    const res = await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Key', 'plantpulse_001');
    expect(res.status).toBe(200);
    expect(res.body.deviceId).toBeDefined();
    expect(res.body.status).toBe('online');
    expect(res.body.lastSeenAt).toBeDefined();
  });

  it('sin header -> 401', async () => {
    const res = await request(app).post('/api/devices/heartbeat');
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
  });

  it('clave mala -> 401', async () => {
    const res = await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Key', 'bad_key');
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
  });

  it('verifica LastSeenAt actualizado tras heartbeat', async () => {
    await request(app)
      .post('/api/devices/heartbeat')
      .set('X-Device-Key', 'plantpulse_001');
    const check = await pool.request()
      .input('dk', 'plantpulse_001')
      .query("SELECT LastSeenAt, Status FROM Devices WHERE DeviceKey = @dk");
    expect(check.recordset.length).toBeGreaterThan(0);
    expect(check.recordset[0].Status).toBe('online');
    expect(check.recordset[0].LastSeenAt).not.toBeNull();
  });
});
