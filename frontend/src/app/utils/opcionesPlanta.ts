// Opciones de los formularios de planta (registro y edición).
// Se guarda el código (value) en la BD y se muestra la etiqueta (label).
export const UBICACIONES = [
  { value: "sala", label: "Sala de Estar" },
  { value: "dormitorio", label: "Dormitorio" },
  { value: "cocina", label: "Cocina" },
  { value: "bano", label: "Baño" },
  { value: "oficina", label: "Oficina / Estudio" },
  { value: "exterior", label: "Balcón / Exterior" },
] as const;

export const SIN_UBICACION = "No asignada";

/**
 * Texto para mostrar una ubicación guardada.
 * - Código conocido ("sala") → su etiqueta ("Sala de Estar").
 * - Texto libre que no es un código (datos antiguos o creados por la API) → se muestra tal cual.
 * - null, undefined o vacío → "No asignada".
 */
export function etiquetaUbicacion(valor: string | null | undefined): string {
  if (!valor) return SIN_UBICACION;
  return UBICACIONES.find((u) => u.value === valor)?.label ?? valor;
}

/** true si el valor es uno de los códigos de UBICACIONES. */
export function esUbicacionConocida(valor: string): boolean {
  return UBICACIONES.some((u) => u.value === valor);
}
