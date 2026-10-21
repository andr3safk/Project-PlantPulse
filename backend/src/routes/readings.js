// Rutas de lecturas de sensores — PLAN-46
// POST /api/readings: el simulador envía { moisture, temperature, light } con X-Device-Key.
// En una sola transacción: guarda la lectura, actualiza el estado de la planta vinculada
// (sin tocar UpdatedAt, que es para cambios del usuario) y marca el dispositivo como online.
import express from 'express';
import sql from 'mssql';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { calcularEstadoPlanta } from '../utils/estadoPlanta.js';
import { validarLectura } from '../utils/validarLectura.js';
import { pool } from '../db.js';

const router = express.Router();

router.post('/', deviceAuth, async (req, res) => {
  const invalida = validarLectura(req.body);
  if (invalida) {
    return res.status(400).json(invalida);
  }

  // Lista blanca: solo estos tres campos
  const { moisture, temperature, light } = req.body;
  const rMoisture = Math.round(Number(moisture) * 100) / 100;
  const rTemperature = Math.round(Number(temperature) * 100) / 100;
  const rLight = Math.round(Number(light) * 100) / 100;
  const deviceId = req.device.id;

  const transaccion = new sql.Transaction(pool);
  try {
    await transaccion.begin();

    const planta = await new sql.Request(transaccion)
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .query('SELECT TOP 1 LOWER(CAST(Id AS NVARCHAR(50))) AS id FROM Plants WHERE DeviceId = @deviceId ORDER BY CreatedAt');
    const plantId = planta.recordset[0]?.id ?? null;

    const insercion = await new sql.Request(transaccion)
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .input('plantId', sql.UniqueIdentifier, plantId)
      .input('moisture', sql.Decimal(5, 2), rMoisture)
      .input('temperature', sql.Decimal(5, 2), rTemperature)
      .input('light', sql.Decimal(5, 2), rLight)
      .query(`
        INSERT INTO SensorReadings (DeviceId, PlantId, Moisture, Temperature, Light)
        OUTPUT INSERTED.Id AS id, INSERTED.Moisture AS moisture, INSERTED.Temperature AS temperature,
               INSERTED.Light AS light, INSERTED.RecordedAt AS recordedAt
        VALUES (@deviceId, @plantId, @moisture, @temperature, @light)
      `);
    const lectura = insercion.recordset[0];

    // El estado se calcula con los valores guardados (DECIMAL(5,2)), no con los enviados
    let plantStatus = null;
    if (plantId) {
      plantStatus = calcularEstadoPlanta({
        moisture: Number(lectura.moisture),
        temperature: Number(lectura.temperature),
        light: Number(lectura.light),
      });
      await new sql.Request(transaccion)
        .input('plantId', sql.UniqueIdentifier, plantId)
        .input('status', sql.NVarChar(20), plantStatus)
        .query('UPDATE Plants SET Status = @status WHERE Id = @plantId');
    }

    await new sql.Request(transaccion)
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .query("UPDATE Devices SET LastSeenAt = SYSUTCDATETIME(), Status = 'online' WHERE Id = @deviceId");

    await transaccion.commit();

    res.status(201).json({
      id: Number(lectura.id),
      deviceId,
      plantId,
      moisture: Number(lectura.moisture),
      temperature: Number(lectura.temperature),
      light: Number(lectura.light),
      recordedAt: lectura.recordedAt,
      plantStatus,
    });
  } catch (err) {
    console.error('Error readings:', err);
    try {
      await transaccion.rollback();
    } catch {
      // La transacción no llegó a empezar o ya se revirtió sola
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
