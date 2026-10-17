// Generador de lecturas simuladas — PLAN-45
// Cada lectura varía poco respecto a la anterior (caminata aleatoria) para que el dashboard
// se vea creíble. La variación es simétrica (puede subir o bajar) y tiene una leve atracción
// hacia un valor típico, para que los valores no se queden pegados en un extremo.

export const LECTURA_INICIAL = { moisture: 50, temperature: 22, light: 60 };

// min/max: rango del contrato de POST /api/readings; paso: variación máxima por lectura;
// tipico: valor al que tiende la caminata
export const PARAMETROS = {
  moisture: { min: 0, max: 100, paso: 2, tipico: 50 },
  temperature: { min: -10, max: 60, paso: 0.5, tipico: 22 },
  light: { min: 0, max: 100, paso: 3, tipico: 60 },
};

const ATRACCION = 0.05; // fracción de la distancia al valor típico que se recupera en cada paso

const redondear2 = (n) => Math.round(n * 100) / 100;
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

function siguienteValor(anterior, { min, max, paso, tipico }, aleatorio) {
  const variacion = (aleatorio() * 2 - 1) * paso; // entre -paso y +paso
  const atraccion = (tipico - anterior) * ATRACCION;
  return redondear2(limitar(anterior + variacion + atraccion, min, max));
}

// prev: lectura anterior; aleatorio: función que devuelve [0, 1) (se puede inyectar en pruebas)
export function generarLectura(prev = LECTURA_INICIAL, aleatorio = Math.random) {
  return {
    moisture: siguienteValor(prev.moisture, PARAMETROS.moisture, aleatorio),
    temperature: siguienteValor(prev.temperature, PARAMETROS.temperature, aleatorio),
    light: siguienteValor(prev.light, PARAMETROS.light, aleatorio),
  };
}
