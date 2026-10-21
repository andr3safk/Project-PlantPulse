// Middleware de autenticación por clave de dispositivo — PLAN-56
// Lee X-Device-Key, consulta Devices.DeviceKey; 401 si no coincide
import sql from 'mssql';
import { pool } from '../db.js';

// Devices.DeviceKey es NVARCHAR(50): una clave más larga no puede existir
const DEVICE_KEY_MAX = 50;

export const deviceAuth = async (req, res, next) => {
  const deviceKey = req.headers['x-device-key'];
  if (typeof deviceKey !== 'string' || deviceKey.length === 0 || deviceKey.length > DEVICE_KEY_MAX) {
    return res.status(401).json({ message: 'Dispositivo no autorizado' });
  }
  try {
    const result = await pool.request()
      .input('deviceKey', sql.UniqueIdentifier, deviceKey)
      .query('SELECT CAST(Id AS NVARCHAR(50)) AS Id, DeviceKey FROM Devices WHERE DeviceKey = @deviceKey');
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Dispositivo no autorizado' });
    }
    req.device = { id: result.recordset[0].Id.toLowerCase(), deviceKey: result.recordset[0].DeviceKey };
    next();
  } catch (err) {
    console.error('Error en deviceAuth:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
