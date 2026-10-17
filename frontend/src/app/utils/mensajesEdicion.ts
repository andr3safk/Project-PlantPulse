import { ApiError } from "../api/client";
import { MSG_SIN_CONEXION, MSG_TIMEOUT, mensajeErrorRegistro } from "./mensajesRegistro";

// Mensajes que ve el usuario al cargar y editar plantas (PLAN-9).
// Mismo patrón que el registro (PLAN-20): nunca se muestra el texto crudo del backend.
export const MSG_PLANTA_NO_ENCONTRADA = "Esta planta ya no existe o no tienes acceso a ella.";
export const MSG_ERROR_CARGA_PLANTA = "No pudimos cargar los datos de la planta. Intenta de nuevo.";
export const MSG_ERROR_CARGA_LISTA = "No pudimos cargar tus plantas. Intenta de nuevo.";
export const mensajeExitoEdicion = (nombre: string) => `Planta «${nombre}» actualizada correctamente`;

/**
 * Texto de error al LEER datos (lista o una planta).
 * status 0 → sin conexión · 408 → timeout · 404 → planta no encontrada · resto → mensaje genérico recibido.
 * El 401 no llega aquí: quien llama sale antes porque el cliente ya redirige a /login.
 */
export function mensajeErrorCarga(error: unknown, generico: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return MSG_SIN_CONEXION;
    if (error.status === 408) return MSG_TIMEOUT;
    if (error.status === 404) return MSG_PLANTA_NO_ENCONTRADA;
  }
  return generico;
}

/**
 * Texto del recuadro de error al GUARDAR la edición.
 * 404 → planta no encontrada; el resto sigue las mismas reglas del registro (mensajeErrorRegistro).
 */
export function mensajeErrorEdicion(error: unknown, otrosErrores: string[]): string {
  if (error instanceof ApiError && error.status === 404) return MSG_PLANTA_NO_ENCONTRADA;
  return mensajeErrorRegistro(error, otrosErrores);
}
