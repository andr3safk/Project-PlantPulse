// Servicio de plantas: llamadas a /api/plants usando el cliente común (token y errores)
import { apiFetch } from './client';
import type { CreatePlantRequest, PlantResponse, UpdatePlantRequest } from './types';

// El id se codifica para que nunca pueda cambiar la ruta (p. ej. un id con "/" o "?").
const rutaPlanta = (id: string) => `/api/plants/${encodeURIComponent(id)}`;

// Lista las plantas del usuario autenticado (el backend las ordena por CreatedAt DESC).
export function listPlants(): Promise<PlantResponse[]> {
  return apiFetch<PlantResponse[]>('/api/plants');
}

// Trae una planta del usuario. Lanza ApiError 404 si no existe o es de otro usuario.
export function getPlant(id: string): Promise<PlantResponse> {
  return apiFetch<PlantResponse>(rutaPlanta(id));
}

// Crea una planta del usuario autenticado. Lanza ApiError si la API responde con error.
// Se envía el body ya serializado porque RequestInit tipa body como BodyInit;
// apiFetch no vuelve a serializar los string y sigue agregando Content-Type: application/json.
export function createPlant(data: CreatePlantRequest): Promise<PlantResponse> {
  return apiFetch<PlantResponse>('/api/plants', { method: 'POST', body: JSON.stringify(data) });
}

// Reemplaza los campos editables de una planta (PUT). Devuelve la planta actualizada.
export function updatePlant(id: string, data: UpdatePlantRequest): Promise<PlantResponse> {
  return apiFetch<PlantResponse>(rutaPlanta(id), { method: 'PUT', body: JSON.stringify(data) });
}

// Elimina una planta del usuario (DELETE). La API responde 204 sin cuerpo: apiFetch devuelve undefined.
// Lanza ApiError 404 si la planta no existe o es de otro usuario.
export function deletePlant(id: string): Promise<void> {
  return apiFetch<void>(rutaPlanta(id), { method: 'DELETE' });
}
