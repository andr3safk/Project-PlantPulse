import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import type { LastReadingResponse, PlantDeviceResponse, PlantListItemResponse, PlantResponse } from "../api/types";
import { listPlants } from "../api/plants";
import { ApiError } from "../api/client";

// Imagen local que se muestra cuando la planta no tiene foto (imageUrl null)
export const DEFAULT_PLANT_IMAGE = "/plant-placeholder.svg";

// Última lectura de la planta (PLAN-39). desactualizada = más de 5 minutos (lo calcula el backend).
export type LecturaPlanta = {
  moisture: number | null;
  temperature: number | null;
  light: number | null;
  recordedAt: string;
  desactualizada: boolean;
};

// Dispositivo de la planta (PLAN-39). conectado = último latido de hace menos de 60 s (lo calcula el backend).
export type DispositivoPlanta = {
  id: string;
  conectado: boolean;
  lastSeenAt: string | null;
};

export type Plant = {
  id: string;
  name: string;
  species: string;
  image: string;
  status: "healthy" | "warning" | "critical";
  // null: la planta no tiene lecturas todavía
  lectura: LecturaPlanta | null;
  // null: la planta no tiene dispositivo
  dispositivo: DispositivoPlanta | null;
  lastWatered: string;
  location?: string;
};

// Estado de la carga de la lista desde GET /api/plants
export type EstadoCarga = "idle" | "loading" | "ready" | "error";

function lecturaFromApi(lectura: LastReadingResponse | null): LecturaPlanta | null {
  if (lectura === null) return null;
  return {
    moisture: lectura.moisture,
    temperature: lectura.temperature,
    light: lectura.light,
    recordedAt: lectura.recordedAt,
    desactualizada: lectura.isStale,
  };
}

function dispositivoFromApi(dispositivo: PlantDeviceResponse | null): DispositivoPlanta | null {
  if (dispositivo === null) return null;
  return { id: dispositivo.id, conectado: dispositivo.connected, lastSeenAt: dispositivo.lastSeenAt };
}

// Lectura y dispositivo que ya tenía en pantalla una planta
type EstadoMonitoreo = Pick<Plant, "lectura" | "dispositivo">;

// Convierte la planta que devuelve la API al tipo Plant que usa la interfaz.
// - La lista (GET /api/plants) trae lastReading y device: se usan esos.
// - POST y PUT no los traen: se conservan los que la planta ya tenía en pantalla (previa),
//   así editar una planta no borra sus lecturas hasta el siguiente refresco.
export function plantFromApi(plant: PlantResponse | PlantListItemResponse, previa?: EstadoMonitoreo): Plant {
  const traeMonitoreo = "lastReading" in plant;
  return {
    id: plant.id,
    name: plant.name,
    species: plant.species,
    status: plant.status,
    image: plant.imageUrl ?? DEFAULT_PLANT_IMAGE,
    location: plant.location ?? undefined,
    lastWatered: plant.lastWateredAt === null
      ? "Sin registro"
      : new Date(plant.lastWateredAt).toLocaleDateString("es-CO"),
    lectura: traeMonitoreo ? lecturaFromApi(plant.lastReading) : previa?.lectura ?? null,
    dispositivo: traeMonitoreo ? dispositivoFromApi(plant.device) : previa?.dispositivo ?? null,
  };
}

type PlantContextType = {
  plants: Plant[];
  estadoCarga: EstadoCarga;
  errorCarga: unknown;
  cargarPlantas: () => Promise<void>;
  // PLAN-48: refresco silencioso (sin "Cargando...") que usa el Dashboard cada pocos segundos
  refrescarPlantas: () => Promise<void>;
  // true si el último refresco automático falló (se conservan los datos anteriores)
  errorRefresco: boolean;
  addPlantFromApi: (plant: PlantResponse) => void;
  replacePlantFromApi: (plant: PlantResponse) => void;
  quitarPlanta: (id: string) => void;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("idle");
  const [errorCarga, setErrorCarga] = useState<unknown>(null);
  const [errorRefresco, setErrorRefresco] = useState(false);
  // Cada carga (o refresco) recibe un número; solo la más reciente puede actualizar el estado
  const cargaActual = useRef(0);
  // Copia de estadoCarga para leerla dentro de refrescarPlantas sin recrear la función
  const estadoCargaRef = useRef<EstadoCarga>("idle");
  // Sube cada vez que la lista cambia en pantalla por una acción del usuario (crear, editar, eliminar).
  // Una respuesta de GET /api/plants que salió ANTES de ese cambio ya no sirve: traería la planta
  // eliminada o los datos de antes de editar. Esas respuestas se descartan (PLAN-48).
  const versionLocal = useRef(0);
  // Evita dos refrescos a la vez si la API tarda más que el intervalo
  const refrescando = useRef(false);

  const cambiarEstadoCarga = (estado: EstadoCarga) => {
    estadoCargaRef.current = estado;
    setEstadoCarga(estado);
  };

  // Carga la lista del usuario desde GET /api/plants (la llama el Dashboard al montarse).
  // Mientras carga se conserva la lista anterior, así la pantalla no parpadea al volver de /add.
  const cargarPlantas = useCallback(async () => {
    const id = ++cargaActual.current;
    const version = versionLocal.current;
    cambiarEstadoCarga("loading");
    setErrorCarga(null);
    try {
      const lista = await listPlants();
      if (id !== cargaActual.current) return;
      // Si el usuario cambió la lista mientras cargaba, se conserva lo que ve (el refresco la pondrá al día)
      if (version === versionLocal.current) {
        setPlants(lista.map((p) => plantFromApi(p)));
      }
      setErrorRefresco(false);
      cambiarEstadoCarga("ready");
    } catch (error) {
      if (id !== cargaActual.current) return;
      // 401: apiFetch ya cerró la sesión y redirige a /login; no se muestra error
      if (error instanceof ApiError && error.status === 401) {
        cambiarEstadoCarga("idle");
        return;
      }
      setErrorCarga(error);
      cambiarEstadoCarga("error");
    }
  }, []);

  // Refresco automático (PLAN-48). A diferencia de cargarPlantas:
  // - No pasa por "loading": la lista no parpadea ni se borra.
  // - Si falla, conserva los datos y marca errorRefresco (el Dashboard muestra un aviso pequeño).
  // - Solo corre cuando ya hubo una carga (ready) o cuando la carga falló (error): así un refresco
  //   que funcione recupera la lista sin que el usuario pulse "Reintentar".
  const refrescarPlantas = useCallback(async () => {
    const estado = estadoCargaRef.current;
    if ((estado !== "ready" && estado !== "error") || refrescando.current) return;
    refrescando.current = true;
    const id = ++cargaActual.current;
    const version = versionLocal.current;
    try {
      const lista = await listPlants();
      if (id !== cargaActual.current || version !== versionLocal.current) return;
      setPlants(lista.map((p) => plantFromApi(p)));
      setErrorCarga(null);
      setErrorRefresco(false);
      cambiarEstadoCarga("ready");
    } catch (error) {
      if (id !== cargaActual.current) return;
      // 401: apiFetch ya cerró la sesión y redirige a /login
      if (error instanceof ApiError && error.status === 401) return;
      setErrorRefresco(true);
    } finally {
      refrescando.current = false;
    }
  }, []);

  // Agrega al inicio la planta creada en la API (el backend ordena por CreatedAt DESC).
  const addPlantFromApi = (plant: PlantResponse) => {
    versionLocal.current++;
    setPlants((prev) => [plantFromApi(plant), ...prev.filter((p) => p.id !== plant.id)]);
  };

  // Reemplaza una planta con la respuesta de la API (PUT), conservando su lectura y su dispositivo
  const replacePlantFromApi = (plant: PlantResponse) => {
    versionLocal.current++;
    setPlants((prev) => prev.map((p) => (p.id === plant.id ? plantFromApi(plant, p) : p)));
  };

  // Quita una planta de la lista en pantalla. No llama a la API: el Dashboard la usa
  // después de que DELETE /api/plants/:id responde 204 (o 404, si ya no existía) (PLAN-28, PLAN-29)
  const quitarPlanta = (id: string) => {
    versionLocal.current++;
    setPlants((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <PlantContext.Provider
      value={{
        plants,
        estadoCarga,
        errorCarga,
        cargarPlantas,
        refrescarPlantas,
        errorRefresco,
        addPlantFromApi,
        replacePlantFromApi,
        quitarPlanta,
      }}
    >
      {children}
    </PlantContext.Provider>
  );
}

export function usePlants() {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error("usePlants must be used within a PlantProvider");
  }
  return context;
}
