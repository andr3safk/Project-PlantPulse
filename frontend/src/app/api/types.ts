export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export type PlantStatus = 'healthy' | 'warning' | 'critical';

// Planta tal como la devuelve la API (GET, POST y PUT de /api/plants)
export interface PlantResponse {
  id: string;
  name: string;
  species: string;
  imageUrl: string | null;
  status: PlantStatus;
  location: string | null;
  lastWateredAt: string | null;
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Campos que acepta el backend al crear una planta (lista blanca)
export interface CreatePlantRequest {
  name: string;
  species: string;
  location?: string;
  imageUrl?: string;
}

// Campos que acepta PUT /api/plants/:id. Es un reemplazo completo:
// un opcional que no se envía queda en NULL (por eso se reenvía el imageUrl actual).
export type UpdatePlantRequest = CreatePlantRequest;
