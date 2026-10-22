# ESP32 — PlantPulse (PLAN-56)

Código básico para ESP32 físico: conecta a WiFi y envía POST /api/devices/heartbeat cada 20 s con header X-Device-Key.

## Configuración

1. Copiar `secrets.example.h` → `secrets.h` (ya en .gitignore) y completar:
   - WIFI_SSID / WIFI_PASSWORD
   - DEVICE_KEY (ej. `plantpulse_001`)
   - SERVER_IP (IP del PC donde corre backend, ej. `192.168.1.42`)

2. IP-PC: consultar con `ipconfig` (Windows) o `hostname -I` (Linux) y poner en SERVER_IP.

## Compilación

- Arduino IDE / PlatformIO:
  - Board: ESP32 Dev Module
  - Librerías: WiFi, HTTPClient (incluidas)
  - Archivo: `heartbeat.ino`
  - Subir a ESP32

## Verificación

- Monitor serie: debe mostrar `200` tras conectar al backend.
- Dashboard (con el **simulador apagado**): en menos de 20 s la Monstera muestra **"Dispositivo conectado"** y **"Sin datos en tiempo real"** (el ESP32 no envía lecturas). Si el simulador está encendido, el dashboard ya dice "conectado" por las lecturas y no se nota el ESP32. Ver la sección *Estado del dispositivo en el dashboard* del `README.md` principal.
