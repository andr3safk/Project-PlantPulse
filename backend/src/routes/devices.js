// Rutas de dispositivos — PLAN-56
// POST /api/devices/heartbeat: el ESP32 avisa que está conectado (cada 20 s)
import express from 'express';
import sql from 'mssql';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { pool } from '../db.js';

const router = express.Router();

router.post('/heartbeat', deviceAuth, async (req, res) => {
  try {
    // Un solo UPDATE que devuelve la fila actualizada (OUTPUT)
    const result = await pool.request()
      .input('deviceId', sql.UniqueIdentifier, req.device.id)
      .query(`
        UPDATE Devices SET LastSeenAt = SYSUTCDATETIME(), Status = 'online'
        OUTPUT LOWER(CAST(INSERTED.Id AS NVARCHAR(50))) AS deviceId, INSERTED.Status AS status, INSERTED.LastSeenAt AS lastSeenAt
        WHERE Id = @deviceId
      `);
    const row = result.recordset[0];
    res.json({ deviceId: row.deviceId, status: row.status, lastSeenAt: row.lastSeenAt });
  } catch (err) {
    console.error('Error heartbeat:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
