import { ApiError } from "../api/client";
import { MSG_SIN_CONEXION, MSG_TIMEOUT } from "./mensajesRegistro";

// Mensajes que ve el usuario al eliminar una planta (PLAN-28).
// Mismo patrón que el registro (PLAN-20) y la edición (PLAN-9): nunca se muestra el texto crudo del backend.
export const MSG_ERROR_ELIMINAR = "No pudimos eliminar la planta. Intenta de nuevo en unos minutos.";
export const MSG_PLANTA_YA_ELIMINADA = "Esta planta ya no existe. La quitamos de tu lista.";
export const mensajeExitoEliminacion = (nombre: string) => `Planta «${nombre}» eliminada correctamente`;

/**
 * Texto del recuadro de error del modal de eliminación.
 * status 0 → sin conexión · 408 → timeout · resto → mensaje genérico.
 * El 401 y el 404 no llegan aquí: el Dashboard los maneja antes (cierra el modal).
 */
export function mensajeErrorEliminacion(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return MSG_SIN_CONEXION;
    if (error.status === 408) return MSG_TIMEOUT;
  }
  return MSG_ERROR_ELIMINAR;
}
