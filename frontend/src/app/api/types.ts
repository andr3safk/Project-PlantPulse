export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export type PlantStatus = 'healthy' | 'warning' | 'critical';

// Planta tal como la devuelve la API (POST /api/plants -> 201)
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
