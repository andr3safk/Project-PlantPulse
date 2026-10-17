# Simulador de sensores — PlantPulse

Script en Node.js que genera lecturas simuladas de humedad del suelo, temperatura y luz, y las envía al backend mediante la API REST.

## Ejecución del simulador

```bash
cp .env.example .env
npm ci
npm start
```

El simulador envía lecturas cada `INTERVALO_MS` (por defecto 10000 ms) a `POST /api/readings` con `X-Device-Key`. Si el backend responde 5xx o hay error de red, guarda la lectura en una cola en memoria (máx. 100) y reintenta antes de enviar la nueva.

## Validación (PLAN-49)

Con backend corriendo (`npm run dev` en `backend/`):
```sql
SELECT TOP 5 * FROM SensorReadings ORDER BY RecordedAt DESC;
SELECT Name, Status FROM Plants;
```

## Estado inicial

Estado: funcional para desarrollo. No es entregable final (Sprint 2: notificaciones automáticas, historial, gráficos avanzados).

---
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
