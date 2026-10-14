// Prueba de integración: conexión a SQL Server y esquema
// Requiere SQL Server corriendo en localhost:1433 y la BD creada.
// Ejecutar: cp .env.example .env  (ajustar DB_PASSWORD)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sql from 'mssql';
import { dbConfig } from './db.js';

let pool;

beforeAll(async () => {
  pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();
});

afterAll(async () => {
  await pool.close();
});

describe('conexion a SQL Server', () => {
  it('se conecta a la base de datos', async () => {
    const res = await pool.request().query('SELECT DB_NAME() AS db');
    expect(res.recordset[0].db).toBe(process.env.DB_NAME || 'PlantPulse');
  });

  it('tiene las 5 tablas del esquema', async () => {
    const res = await pool.request().query(
      "SELECT COUNT(*) AS n FROM sys.tables WHERE name IN ('Users','Devices','Plants','SensorReadings','Alerts')"
    );
    expect(Number(res.recordset[0].n)).toBe(5);
  });

  it('acepta consultas parametrizadas (anti-inyeccion)', async () => {
    const res = await pool.request()
      .input('nombre', sql.NVarChar, 'Monserrat')
      .query('SELECT @nombre AS nombre');
    expect(res.recordset[0].nombre).toBe('Monserrat');
  });
});
