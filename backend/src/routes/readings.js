import express from 'express';
import sql from 'mssql';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { calcularEstadoPlanta } from '../utils/estadoPlanta.js';
import { validarLectura } from '../utils/validarLectura.js';
import { pool } from '../db.js';

const router = express.Router();

router.post('/', deviceAuth, async (req, res) => {
  try {
    const validation = validarLectura(req.body);
    if (validation) {
      return res.status(400).json(validation);
    }
    const { moisture, temperature, light } = req.body;
    const deviceId = req.device.id;

    const plantResult = await pool.request()
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .query('SELECT Id FROM Plants WHERE DeviceId = @deviceId');
    const plantId = plantResult.recordset.length > 0 ? plantResult.recordset[0].Id : null;

    const insertResult = await pool.request()
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .input('plantId', sql.UniqueIdentifier, plantId)
      .input('moisture', sql.Decimal(5, 2), moisture)
      .input('temperature', sql.Decimal(5, 2), temperature)
      .input('light', sql.Decimal(5, 2), light)
      .query("INSERT INTO SensorReadings (DeviceId, PlantId, Moisture, Temperature, Light) OUTPUT INSERTED.Id, INSERTED.RecordedAt VALUES (@deviceId, @plantId, @moisture, @temperature, @light)");

    if (plantId) {
      const status = calcularEstadoPlanta({ moisture, temperature, light });
      await pool.request()
        .input('plantId', sql.UniqueIdentifier, plantId)
        .input('status', sql.NVarChar, status)
        .query("UPDATE Plants SET Status = @status WHERE Id = @plantId");
    }

    await pool.request()
      .input('deviceId', sql.UniqueIdentifier, deviceId)
      .query("UPDATE Devices SET LastSeenAt = SYSUTCDATETIME(), Status = 'online' WHERE Id = @deviceId");

    res.status(201).json({
      id: insertResult.recordset[0].Id,
      deviceId: deviceId.toString().toLowerCase(),
      plantId: plantId ? plantId.toString().toLowerCase() : null,
      moisture,
      temperature,
      light,
      recordedAt: insertResult.recordset[0].RecordedAt,
      plantStatus: plantId ? calcularEstadoPlanta({ moisture, temperature, light }) : null,
    });
  } catch (err) {
    console.error('Error readings:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
