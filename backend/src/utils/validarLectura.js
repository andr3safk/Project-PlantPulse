// Validación de datos de lectura de sensores — PLAN-46
// Los tres campos son obligatorios y numéricos (no se aceptan textos como "50").
// Devuelve null si la lectura es válida, o { message, errors } para responder 400.

export const RANGOS_LECTURA = {
  moisture: { min: 0, max: 100 },
  temperature: { min: -10, max: 60 },
  light: { min: 0, max: 100 },
};

function validarCampo(valor, { min, max }) {
  if (valor === undefined || valor === null) return 'obligatorio';
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'debe ser número';
  if (valor < min || valor > max) return `fuera de rango (${min} a ${max})`;
  return null;
}

export function validarLectura(body) {
  // Un cuerpo ausente, nulo, un arreglo o un valor suelto se tratan como objeto vacío
  const datos = body !== null && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};

  for (const [campo, rango] of Object.entries(RANGOS_LECTURA)) {
    const error = validarCampo(datos[campo], rango);
    if (error) errors[campo] = error;
  }

  if (Object.keys(errors).length > 0) return { message: 'Datos de lectura invalidos', errors };
  return null;
}
