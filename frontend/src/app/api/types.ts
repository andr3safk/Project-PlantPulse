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

// Última lectura de una planta en GET /api/plants (PLAN-39). null si la planta no tiene lecturas.
// isStale: true si tiene más de 5 minutos (lo calcula el backend con la hora de SQL Server).
export interface LastReadingResponse {
  moisture: number | null;
  temperature: number | null;
  light: number | null;
  recordedAt: string;
  isStale: boolean;
}

// Dispositivo de una planta en GET /api/plants (PLAN-39). null si la planta no tiene dispositivo.
// connected: true si su último latido tiene menos de 60 s (lo calcula el backend).
export interface PlantDeviceResponse {
  id: string;
  lastSeenAt: string | null;
  connected: boolean;
}

// Planta tal como la devuelve la LISTA (GET /api/plants): el objeto planta + lectura y dispositivo.
// GET /api/plants/:id, POST y PUT devuelven solo PlantResponse.
export interface PlantListItemResponse extends PlantResponse {
  lastReading: LastReadingResponse | null;
  device: PlantDeviceResponse | null;
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
