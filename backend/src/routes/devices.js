import express from 'express';
import sql from 'mssql';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { pool } from '../db.js';

const router = express.Router();

router.post('/heartbeat', deviceAuth, async (req, res) => {
  try {
    const deviceId = req.device.id;
    await pool.request()
      .input('deviceId', sql.NVarChar, deviceId)
      .query("UPDATE Devices SET LastSeenAt = SYSUTCDATETIME(), Status = 'online' WHERE Id = @deviceId");
    const result = await pool.request()
      .input('deviceId', sql.NVarChar, deviceId)
      .query("SELECT CAST(Id AS NVARCHAR(50)) AS deviceId, Status AS status, LastSeenAt AS lastSeenAt FROM Devices WHERE Id = @deviceId");
    const row = result.recordset[0];
    res.json({ deviceId: row.deviceId, status: row.status, lastSeenAt: row.lastSeenAt });
  } catch (err) {
    console.error('Error heartbeat:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
