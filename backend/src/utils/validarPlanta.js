// Validación de datos de planta en el servidor — PlantPulse (PLAN-53)
// Mismas reglas y mensajes que frontend/src/app/utils/validarPlanta.ts (PLAN-9).
// El frontend valida para dar buena experiencia; el backend valida porque
// cualquiera puede llamar a la API sin pasar por el formulario.

export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 50;
export const ESPECIE_MIN = 2;
export const ESPECIE_MAX = 100;
export const UBICACION_MAX = 50;
export const IMAGEN_URL_MAX = 500;

// Letras (con tildes, diéresis y ñ), números, espacios, guion, punto y paréntesis.
const CARACTERES_PERMITIDOS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .()-]+$/;
const MENSAJE_CARACTERES = 'solo puede contener letras, números, espacios, guiones, puntos y paréntesis.';

// http:// o https:// seguido de al menos un carácter y sin espacios.
// Bloquea esquemas peligrosos como javascript: o data:.
const URL_IMAGEN = /^https?:\/\/\S+$/i;

/**
 * Normaliza un texto antes de validarlo o guardarlo:
 * 1. Lo pasa a Unicode NFC ("e" + tilde combinada → "é").
 * 2. Quita los espacios al inicio y al final.
 * 3. Unifica los espacios repetidos en uno solo.
 * Ejemplo: "  Mi    planta " → "Mi planta".
 */
export function normalizarTexto(texto) {
  return texto.normalize('NFC').trim().replace(/ +/g, ' ');
}

/**
 * Valida un texto obligatorio (ya normalizado).
 * Devuelve el primer error encontrado o undefined si es válido.
 */
function validarObligatorio(valor, etiqueta, min, max) {
  if (valor.length === 0) {
    return `${etiqueta} es un campo obligatorio.`;
  }
  if (valor.length < min) {
    return `${etiqueta} debe tener al menos ${min} caracteres.`;
  }
  if (valor.length > max) {
    return `${etiqueta} no puede superar los ${max} caracteres.`;
  }
  if (!CARACTERES_PERMITIDOS.test(valor)) {
    return `${etiqueta} ${MENSAJE_CARACTERES}`;
  }
  return undefined;
}

/**
 * Valida y normaliza los datos de una planta que llegan en el body.
 * Solo lee name, species, location e imageUrl; cualquier otro campo se ignora.
 * Función pura: no modifica la entrada ni lanza excepciones.
 *
 * @returns {{ datos: { name, species, location, imageUrl }, errores: Object<string, string> }}
 *   datos: valores normalizados listos para guardar (opcionales vacíos → null).
 *   errores: un mensaje por cada campo inválido; objeto vacío si todo es válido.
 */
export function validarPlanta(entrada) {
  const body = entrada !== null && typeof entrada === 'object' ? entrada : {};
  const datos = { name: '', species: '', location: null, imageUrl: null };
  const errores = {};

  // --- Obligatorios: name y species ---
  const obligatorios = [
    ['name', 'El nombre', NOMBRE_MIN, NOMBRE_MAX],
    ['species', 'La especie', ESPECIE_MIN, ESPECIE_MAX],
  ];
  for (const [campo, etiqueta, min, max] of obligatorios) {
    const valor = body[campo];
    if (valor === undefined || valor === null) {
      errores[campo] = `${etiqueta} es un campo obligatorio.`;
    } else if (typeof valor !== 'string') {
      errores[campo] = `${etiqueta} debe ser un texto.`;
    } else {
      datos[campo] = normalizarTexto(valor);
      const error = validarObligatorio(datos[campo], etiqueta, min, max);
      if (error) errores[campo] = error;
    }
  }

  // --- Opcional: location (vacío o null → NULL en la BD) ---
  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== 'string') {
      errores.location = 'La ubicación debe ser un texto.';
    } else {
      const ubicacion = normalizarTexto(body.location);
      if (ubicacion.length > UBICACION_MAX) {
        errores.location = `La ubicación no puede superar los ${UBICACION_MAX} caracteres.`;
      } else if (ubicacion.length > 0 && !CARACTERES_PERMITIDOS.test(ubicacion)) {
        errores.location = `La ubicación ${MENSAJE_CARACTERES}`;
      }
      datos.location = ubicacion.length > 0 ? ubicacion : null;
    }
  }

  // --- Opcional: imageUrl (solo trim: una URL no debe tener espacios internos) ---
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (typeof body.imageUrl !== 'string') {
      errores.imageUrl = 'La URL de la imagen debe ser un texto.';
    } else {
      const url = body.imageUrl.trim();
      if (url.length > IMAGEN_URL_MAX) {
        errores.imageUrl = `La URL de la imagen no puede superar los ${IMAGEN_URL_MAX} caracteres.`;
      } else if (url.length > 0 && !URL_IMAGEN.test(url)) {
        errores.imageUrl = 'La URL de la imagen debe empezar por http:// o https://.';
      }
      datos.imageUrl = url.length > 0 ? url : null;
    }
  }

  return { datos, errores };
}
