// Validación de datos de lectura de sensores — PLAN-46
export function validarLectura(body) {
  const errors = {};
  if (body.moisture === undefined || body.moisture === null) errors.moisture = 'obligatorio';
  else if (typeof body.moisture !== 'number' || !Number.isFinite(body.moisture)) errors.moisture = 'debe ser número';
  else if (body.moisture < 0 || body.moisture > 100) errors.moisture = 'fuera de rango (0-100)';

  if (body.temperature === undefined || body.temperature === null) errors.temperature = 'obligatorio';
  else if (typeof body.temperature !== 'number' || !Number.isFinite(body.temperature)) errors.temperature = 'debe ser número';
  else if (body.temperature < -10 || body.temperature > 60) errors.temperature = 'fuera de rango (-10 a 60)';

  if (body.light === undefined || body.light === null) errors.light = 'obligatorio';
  else if (typeof body.light !== 'number' || !Number.isFinite(body.light)) errors.light = 'debe ser número';
  else if (body.light < 0 || body.light > 100) errors.light = 'fuera de rango (0-100)';

  if (Object.keys(errors).length > 0) return { message: 'Datos de lectura invalidos', errors };
  return null;
}
