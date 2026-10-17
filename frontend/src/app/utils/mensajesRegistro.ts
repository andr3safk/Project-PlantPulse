import { ApiError } from "../api/client";

// Mensajes que ve el usuario al registrar una planta (PLAN-20).
// Nunca se muestra el texto crudo del backend.
export const MSG_REVISA_CAMPOS = 'Revisa los campos marcados.';
export const MSG_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
export const MSG_TIMEOUT = 'El servidor tardó demasiado en responder. Intenta de nuevo.';
export const MSG_GENERICO = 'No pudimos guardar la planta. Intenta de nuevo en unos minutos.';
export const mensajeExitoRegistro = (nombre: string) => `Planta «${nombre}» registrada correctamente`;

// Campos del formulario que muestran su error debajo del control
export const CAMPOS_VISIBLES = ["name", "species", "location"] as const;
export type CampoVisible = (typeof CAMPOS_VISIBLES)[number];

export const esCampoVisible = (campo: string): campo is CampoVisible =>
  (CAMPOS_VISIBLES as readonly string[]).includes(campo);

/**
 * Texto del recuadro de error general del formulario.
 * - otrosErrores: mensajes de la API para campos sin control en el formulario (p. ej. imageUrl).
 * Reglas, en orden:
 * 1. No es ApiError → genérico.  2. status 0 → sin conexión.  3. status 408 → timeout.
 * 4. 400 con algún campo visible → "Revisa los campos marcados." + otrosErrores.
 * 5. 400 solo con campos no visibles → otrosErrores.
 * 6. 400 sin errores y cualquier otro estado → genérico.
 * El 401 no llega aquí: AddPlant sale antes porque el cliente ya redirige a /login.
 */
export function mensajeErrorRegistro(error: unknown, otrosErrores: string[]): string {
  if (!(error instanceof ApiError)) return MSG_GENERICO;
  if (error.status === 0) return MSG_SIN_CONEXION;
  if (error.status === 408) return MSG_TIMEOUT;

  if (error.status === 400 && error.errors) {
    if (Object.keys(error.errors).some(esCampoVisible)) {
      return [MSG_REVISA_CAMPOS, ...otrosErrores].join(" ");
    }
    if (otrosErrores.length > 0) return otrosErrores.join(" ");
  }

  return MSG_GENERICO;
}
