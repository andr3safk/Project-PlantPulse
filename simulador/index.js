// Simulador de sensores de PlantPulse — PLAN-45 / PLAN-47
// Cada INTERVALO_MS genera una lectura y la envía a POST /api/readings con X-Device-Key.
// Si el backend no responde o responde 5xx, la guarda en una cola (máx. 100) y la reintenta.
import dotenv from 'dotenv';
import { generarLectura, LECTURA_INICIAL } from './generarLectura.js';
import { crearCola, ejecutarCiclo } from './ciclo.js';

dotenv.config();

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const DEVICE_KEY = process.env.DEVICE_KEY;
const INTERVALO_MS = Number(process.env.INTERVALO_MS) || 10000;
const TIEMPO_ESPERA_MS = 5000;

if (!DEVICE_KEY) {
  console.error('Falta DEVICE_KEY. Copia .env.example como .env y revisa los valores.');
  process.exit(1);
}

const hora = () => new Date().toLocaleTimeString();
const log = (texto) => console.log(`[${hora()}] ${texto}`);

// Nunca lanza: un fallo de red o un timeout se devuelven como status 0
async function enviar(lectura) {
  try {
    const res = await fetch(`${API_URL}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': DEVICE_KEY },
      body: JSON.stringify(lectura),
      signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

const cola = crearCola();
let anterior = LECTURA_INICIAL;
let temporizador = null;
let detenido = false;

// El siguiente ciclo se programa cuando termina el actual: nunca se solapan
async function ciclo() {
  const lectura = generarLectura(anterior);
  anterior = lectura;
  await ejecutarCiclo({ cola, enviar, lectura, log });
  if (!detenido) temporizador = setTimeout(ciclo, INTERVALO_MS);
}

process.on('SIGINT', () => {
  detenido = true;
  clearTimeout(temporizador);
  log(`Simulador detenido. Lecturas en cola sin enviar: ${cola.tamano}`);
  process.exit(0);
});

log(`Simulador iniciado: ${API_URL}/api/readings cada ${INTERVALO_MS} ms (Ctrl+C para detener)`);
ciclo();
