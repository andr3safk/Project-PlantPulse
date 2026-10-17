// Generador de lecturas simuladas — PLAN-45
export function generarLectura(prev = { moisture: 50, temperature: 22, light: 60 }) {
  const walk = () => Math.round((Math.random() - 0.5) * 6 + 50) / 100;
  const moisture = Math.max(0, Math.min(100, Number((prev.moisture + walk()).toFixed(2))));
  const temperature = Math.max(-10, Math.min(60, Number((prev.temperature + (Math.random() - 0.5) * 2).toFixed(2))));
  const light = Math.max(0, Math.min(100, Number((prev.light + (Math.random() - 0.5) * 5).toFixed(2))));
  return { moisture, temperature, light };
}
