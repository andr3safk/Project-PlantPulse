// Calcula el estado de una planta según lectura de sensores — PLAN-46
// Regla del peor estado: si una variable es critical y otra warning -> critical.
// Límites exclusivos: 30 es healthy, 29.99 warning; 15 warning, 14.99 critical.

export const UMBRALES = {
  moisture: { warningLow: 30, criticalLow: 15, warningHigh: 80, criticalHigh: 90 },
  temperature: { warningLow: 15, criticalLow: 10, warningHigh: 30, criticalHigh: 35 },
  light: { warningLow: 20, criticalLow: 10 },
};

export function calcularEstadoPlanta({ moisture, temperature, light }: { moisture: number; temperature: number; light: number }): 'healthy' | 'warning' | 'critical' {
  const getStatus = (value: number, lim: { warningLow: number; criticalLow?: number; warningHigh?: number; criticalHigh?: number }) => {
    if (lim.criticalLow !== undefined && value < lim.criticalLow) return 'critical';
    if (lim.criticalHigh !== undefined && value > lim.criticalHigh) return 'critical';
    if (lim.warningLow !== undefined && value < lim.warningLow) return 'warning';
    if (lim.warningHigh !== undefined && value > lim.warningHigh) return 'warning';
    return 'healthy';
  };

  const sMoist = getStatus(moisture, UMBRALES.moisture);
  const sTemp = getStatus(temperature, UMBRALES.temperature);
  const sLight = getStatus(light, UMBRALES.light);

  const scores = { critical: 3, warning: 2, healthy: 1 };
  const worst = [sMoist, sTemp, sLight].reduce((a, b) => scores[a as keyof typeof scores] >= scores[b as keyof typeof scores] ? a : b);
  return worst as 'healthy' | 'warning' | 'critical';
}
