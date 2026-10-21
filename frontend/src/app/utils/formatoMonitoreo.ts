// Textos y formato del monitoreo en el dashboard — PLAN-39 (lecturas reales)
// Decisiones de PO (21/10/2026):
// - Solo se muestran las 3 variables que mide el sistema: humedad del suelo, temperatura y luz.
// - Una planta sin dispositivo o sin lecturas muestra "—" en cada variable.
// - "Conectado" y "sin datos en tiempo real" los calcula el backend (device.connected, lastReading.isStale).

export const SIN_DATO = "—";

export const TEXTO_SIN_SENSOR = "Sin sensor vinculado";
export const TEXTO_ESPERANDO_LECTURA = "Esperando la primera lectura";
export const TEXTO_CONECTADO = "Dispositivo conectado";
export const TEXTO_DESCONECTADO = "Dispositivo desconectado";
export const TEXTO_SIN_TIEMPO_REAL = "Sin datos en tiempo real";

// Valor de una variable con su unidad ("45,3%", "22,5°C"), con máximo un decimal.
// Una variable sin dato (null) se muestra como "—".
export function formatearValor(valor: number | null, unidad: string): string {
  if (valor === null || !Number.isFinite(valor)) return SIN_DATO;
  return `${valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })}${unidad}`;
}

// Fecha y hora de una lectura en la zona horaria del navegador ("21/10/26, 5:30 p. m.")
export function formatearFechaLectura(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return SIN_DATO;
  return fecha.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

// Texto de la última lectura que se muestra debajo de las variables
export function textoUltimaLectura(fechaIso: string): string {
  return `Última lectura: ${formatearFechaLectura(fechaIso)}`;
}

// Cuenta los dispositivos distintos de la lista y cuántos están conectados.
// Varias plantas podrían compartir dispositivo: se cuenta cada uno una sola vez.
export function contarDispositivos(
  dispositivos: ReadonlyArray<{ id: string; conectado: boolean } | null>
): { conectados: number; total: number } {
  const porId = new Map<string, boolean>();
  for (const d of dispositivos) {
    if (d !== null) porId.set(d.id, d.conectado);
  }
  let conectados = 0;
  for (const conectado of porId.values()) if (conectado) conectados++;
  return { conectados, total: porId.size };
}
