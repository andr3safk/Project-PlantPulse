// Calcula el estado de una planta a partir de una lectura de sensores — PLAN-46
// Decisión del PO (16/10/2026): umbrales fijos (por especie en Sprint 2), límites exclusivos
// y regla del peor estado.
// - Límites exclusivos: humedad 30 es healthy y 29.99 warning; 15 es warning y 14.99 critical.
// - Peor estado: si una variable es critical y otra warning, el resultado es critical.
// Función pura: no usa base de datos ni Express.

export const UMBRALES = {
  moisture: { criticalLow: 15, warningLow: 30, warningHigh: 80, criticalHigh: 90 },
  temperature: { criticalLow: 10, warningLow: 15, warningHigh: 30, criticalHigh: 35 },
  light: { criticalLow: 10, warningLow: 20 },
};

const GRAVEDAD = { healthy: 0, warning: 1, critical: 2 };

// Estado de una sola variable según sus límites (los que no existan se ignoran)
function estadoVariable(valor, limites) {
  const { criticalLow, warningLow, warningHigh, criticalHigh } = limites;
  if (criticalLow !== undefined && valor < criticalLow) return 'critical';
  if (criticalHigh !== undefined && valor > criticalHigh) return 'critical';
  if (warningLow !== undefined && valor < warningLow) return 'warning';
  if (warningHigh !== undefined && valor > warningHigh) return 'warning';
  return 'healthy';
}

// Devuelve 'healthy' | 'warning' | 'critical' (los valores del CHECK de Plants.Status)
export function calcularEstadoPlanta({ moisture, temperature, light }) {
  const estados = [
    estadoVariable(moisture, UMBRALES.moisture),
    estadoVariable(temperature, UMBRALES.temperature),
    estadoVariable(light, UMBRALES.light),
  ];
  return estados.reduce((peor, actual) => (GRAVEDAD[actual] > GRAVEDAD[peor] ? actual : peor), 'healthy');
}
