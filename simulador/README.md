# Simulador de sensores — PlantPulse

Script en Node.js que genera lecturas simuladas de humedad del suelo, temperatura y luz, y las envía al backend mediante la API REST.

Estado: pendiente de implementar.

## PLAN-49 — Validar comunicación

Pasos para verificar que el simulador y el backend se comunican correctamente:

1. Iniciar el backend (`node backend/src/index.js`) y confirmar conexión a SQL Server.
2. Consultar lecturas recientes:
   ```sql
   SELECT TOP 10 * FROM SensorReadings ORDER BY RecordedAt DESC;
   ```
3. Verificar estado de plantas vinculadas:
   ```sql
   SELECT Id, Name, Status, DeviceId FROM Plants;
   ```
4. Confirmar que el simulador envía datos y aparecen en `SensorReadings`.
