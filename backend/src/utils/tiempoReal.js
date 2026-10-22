// Reglas de "tiempo real" del dashboard — PLAN-39 / PLAN-48
// Decisión del PO (21/10/2026):
// - El dispositivo está CONECTADO si su último latido (Devices.LastSeenAt) tiene MENOS de 60 s.
//   El ESP32 envía un latido cada 20 s: así se toleran dos latidos perdidos.
// - La última lectura está DESACTUALIZADA si tiene MÁS de 5 minutos (criterio de aceptación
//   de PLAN-11: "si deja de recibir datos por más de 5 minutos...").
// La comparación se hace en SQL Server con SYSUTCDATETIME() (ver routes/plants.js), no con el
// reloj del navegador: así un reloj desfasado en la PC del usuario no cambia el resultado.
// Las funciones de este archivo son puras: no usan base de datos ni Express.

export const SEGUNDOS_DISPOSITIVO_CONECTADO = 60;
export const SEGUNDOS_LECTURA_EN_TIEMPO_REAL = 300;

// Convierte las columnas Lectura* de la consulta de la lista al objeto lastReading de la API.
// Devuelve null si la planta no tiene lecturas (el OUTER APPLY no encontró filas).
export function mapLastReading(fila) {
  if (fila.LecturaRecordedAt === null || fila.LecturaRecordedAt === undefined) {
    return null;
  }
  return {
    moisture: fila.LecturaMoisture,
    temperature: fila.LecturaTemperature,
    light: fila.LecturaLight,
    recordedAt: fila.LecturaRecordedAt,
    isStale: fila.LecturaDesactualizada === 1,
  };
}

// Convierte las columnas Dispositivo* de la consulta de la lista al objeto device de la API.
// Devuelve null si la planta no tiene dispositivo (Plants.DeviceId es NULL).
export function mapDevice(fila) {
  if (fila.DispositivoId === null || fila.DispositivoId === undefined) {
    return null;
  }
  return {
    id: fila.DispositivoId.toLowerCase(),
    lastSeenAt: fila.DispositivoLastSeenAt,
    connected: fila.DispositivoConectado === 1,
  };
}
