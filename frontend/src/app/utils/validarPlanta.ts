// Límites provisionales: ajustarlos cuando esté definida la tabla de plantas en SQL Server.
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 50;
export const ESPECIE_MIN = 2;
export const ESPECIE_MAX = 100;

// Letras (con tildes, diéresis y ñ), números, espacios, guion, punto y paréntesis.
const CARACTERES_PERMITIDOS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .()-]+$/;

export interface DatosPlanta {
  name: string;
  species: string;
}

export interface ErroresPlanta {
  name?: string;
  species?: string;
}

/**
 * Normaliza un texto antes de validarlo o guardarlo:
 * 1. Lo pasa a Unicode NFC, para que una vocal con tilde escrita como letra + tilde
 *    combinada (NFD, p. ej. "e" + "́") quede como un solo carácter ("é").
 * 2. Quita los espacios al inicio y al final.
 * 3. Unifica los espacios repetidos en uno solo.
 * Ejemplo: "  Mi    planta " → "Mi planta".
 */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFC").trim().replace(/ +/g, " ");
}

/**
 * Valida un texto obligatorio (ya normalizado con normalizarTexto).
 * Devuelve el primer error encontrado o undefined si es válido.
 */
function validarCampo(valor: string, etiqueta: string, min: number, max: number): string | undefined {
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
    return `${etiqueta} solo puede contener letras, números, espacios, guiones, puntos y paréntesis.`;
  }
  return undefined;
}

/**
 * Valida los datos de una planta. Función pura: no modifica la entrada.
 * Devuelve un objeto con un mensaje por cada campo inválido; vacío si todo es válido.
 */
export function validarPlanta({ name, species }: DatosPlanta): ErroresPlanta {
  const errores: ErroresPlanta = {};

  const errorNombre = validarCampo(normalizarTexto(name), "El nombre", NOMBRE_MIN, NOMBRE_MAX);
  if (errorNombre) errores.name = errorNombre;

  const errorEspecie = validarCampo(normalizarTexto(species), "La especie", ESPECIE_MIN, ESPECIE_MAX);
  if (errorEspecie) errores.species = errorEspecie;

  return errores;
}
