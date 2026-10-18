// Lógica de envío con cola de reintentos — PLAN-47
// Separada de index.js para poder probarla sin red ni temporizadores.

export const COLA_MAX = 100;

// Cola en memoria: si se llena, descarta la lectura más antigua
export function crearCola(max = COLA_MAX) {
  const elementos = [];
  return {
    agregar(lectura) {
      elementos.push(lectura);
      if (elementos.length > max) elementos.shift();
    },
    primero: () => elementos[0],
    quitarPrimero: () => elementos.shift(),
    get tamano() {
      return elementos.length;
    },
  };
}

// Clasifica la respuesta del backend:
// - 'ok': guardada (201)
// - 'descartar': error de datos o de clave (400/401/otros 4xx); reintentar no sirve
// - 'reintentar': fallo de red (status 0) o del servidor (5xx)
export function clasificar(status) {
  if (status === 201) return 'ok';
  if (status === 0 || status >= 500) return 'reintentar';
  return 'descartar';
}

// Un ciclo: primero envía los pendientes en orden (uno por uno); si uno vuelve a fallar,
// se detiene y lo deja en la cola. Luego envía la lectura nueva; si falla, la encola.
// enviar(lectura) debe devolver { status, body } y no lanzar errores.
export async function ejecutarCiclo({ cola, enviar, lectura, log = () => {} }) {
  while (cola.tamano > 0) {
    const pendiente = cola.primero();
    const res = await enviar(pendiente);
    const accion = clasificar(res.status);
    if (accion === 'reintentar') {
      cola.agregar(lectura);
      log(`Reintento fallido (${res.status}); en cola: ${cola.tamano}`);
      return { enviada: false, enCola: cola.tamano };
    }
    cola.quitarPrimero();
    if (accion === 'ok') log(`Reintento 201 · planta: ${res.body?.plantStatus ?? 'sin planta'}`);
    else log(`Reintento descartado (${res.status}): ${res.body?.message ?? ''}`);
  }

  const res = await enviar(lectura);
  const accion = clasificar(res.status);
  if (accion === 'ok') {
    log(`201 ${JSON.stringify(lectura)} · planta: ${res.body?.plantStatus ?? 'sin planta'}`);
    return { enviada: true, enCola: cola.tamano };
  }
  if (accion === 'reintentar') {
    cola.agregar(lectura);
    log(`Sin respuesta del backend (${res.status}); en cola: ${cola.tamano}`);
    return { enviada: false, enCola: cola.tamano };
  }
  log(`Lectura rechazada (${res.status}): ${res.body?.message ?? ''} ${JSON.stringify(res.body?.errors ?? {})}`);
  return { enviada: false, enCola: cola.tamano };
}
