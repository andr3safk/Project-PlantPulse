// Servicio de plantas: llamadas a /api/plants usando el cliente común (token y errores)
import { apiFetch } from './client';
import type { CreatePlantRequest, PlantResponse } from './types';

// Crea una planta del usuario autenticado. Lanza ApiError si la API responde con error.
// Se envía el body ya serializado porque RequestInit tipa body como BodyInit;
// apiFetch no vuelve a serializar los string y sigue agregando Content-Type: application/json.
export function createPlant(data: CreatePlantRequest): Promise<PlantResponse> {
  return apiFetch<PlantResponse>('/api/plants', { method: 'POST', body: JSON.stringify(data) });
}
