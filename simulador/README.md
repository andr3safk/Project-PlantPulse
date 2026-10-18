# Simulador de sensores — PlantPulse

Script en Node.js que genera lecturas simuladas de humedad del suelo, temperatura y luz, y las envía al backend mediante la API REST (`POST /api/readings`, con el header `X-Device-Key`).

Requiere Node 22 o superior (usa `fetch` nativo).

## Archivos

| Archivo | Para qué |
|---|---|
| `generarLectura.js` | Genera cada lectura a partir de la anterior: varía poco, sube o baja, y tiende a un valor típico (PLAN-45) |
| `ciclo.js` | Envío con cola de reintentos (PLAN-47) |
| `index.js` | Arranca el simulador: un ciclo cada `INTERVALO_MS` |
| `.env.example` | Variables de configuración (copiar como `.env`; `.env` no se sube al repositorio) |

## Ejecución

Con el backend corriendo (`npm run dev` en `backend/`), desde la carpeta `simulador/`:

```bash
npm ci
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
npm start
```

Variables de `.env`:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `API_URL` | `http://localhost:3000` | URL del backend |
| `DEVICE_KEY` | (obligatoria) | `Devices.DeviceKey`; en el seed es `plantpulse_001` |
| `INTERVALO_MS` | `10000` | Tiempo entre lecturas, en milisegundos |

Cada lectura muestra en consola el resultado y el estado calculado de la planta. Para detenerlo: `Ctrl+C`.

## Reintentos

- Si el backend no responde (o tarda más de 5 s) o responde 5xx, la lectura se guarda en una cola en memoria (máximo 100; si se llena, se descarta la más antigua).
- En el ciclo siguiente se envían primero los pendientes, uno por uno y en orden; si uno vuelve a fallar, el ciclo se detiene sin perder nada.
- Las respuestas 400 (datos inválidos) y 401 (clave inválida) no se reintentan.
- La cola vive en memoria: si se detiene el simulador, las lecturas pendientes se pierden.

## Pruebas

```bash
npm run test:run
```

## Validar la comunicación (PLAN-49)

1. Iniciar el backend y el simulador como se indica arriba.
2. En SQL Server Management Studio, ver las lecturas recientes:
   ```sql
   SELECT TOP 10 * FROM SensorReadings ORDER BY RecordedAt DESC;
   ```
3. Ver el estado de la planta vinculada al dispositivo (en el seed, la Monstera) y del dispositivo:
   ```sql
   SELECT Id, Name, Status, DeviceId FROM Plants;
   SELECT DeviceKey, Status, LastSeenAt FROM Devices;
   ```
4. Detener el backend con el simulador corriendo: el simulador encola las lecturas. Al volver a arrancar el backend, las envía en orden.
