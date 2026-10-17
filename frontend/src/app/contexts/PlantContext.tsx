import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PlantResponse } from "../api/types";
import { listPlants } from "../api/plants";
import { ApiError } from "../api/client";

// Imagen local que se muestra cuando la planta no tiene foto (imageUrl null)
export const DEFAULT_PLANT_IMAGE = "/plant-placeholder.svg";

export type Plant = {
  id: string;
  name: string;
  species: string;
  image: string;
  status: "healthy" | "warning" | "critical";
  sensors: {
    moisture: number;
    light: number;
    temperature: number;
    humidity: number;
  };
  lastWatered: string;
  location?: string;
};

// Estado de la carga de la lista desde GET /api/plants
export type EstadoCarga = "idle" | "loading" | "ready" | "error";

// Lecturas provisionales hasta PLAN-39 (la API todavía no devuelve la última lectura)
function sensoresProvisionales(): Plant["sensors"] {
  return {
    moisture: Math.floor(Math.random() * 40) + 40, // 40-80
    light: Math.floor(Math.random() * 50) + 30, // 30-80
    temperature: Math.floor(Math.random() * 10) + 18, // 18-28
    humidity: Math.floor(Math.random() * 40) + 30, // 30-70
  };
}

// Convierte la planta que devuelve la API al tipo Plant que usa la interfaz.
// Si se pasan sensores (planta que ya estaba en pantalla), se conservan para que no salten.
export function plantFromApi(plant: PlantResponse, sensors?: Plant["sensors"]): Plant {
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
    sensors: sensors ?? sensoresProvisionales(),
  };
}

type PlantContextType = {
  plants: Plant[];
  estadoCarga: EstadoCarga;
  errorCarga: unknown;
  cargarPlantas: () => Promise<void>;
  addPlantFromApi: (plant: PlantResponse) => void;
  replacePlantFromApi: (plant: PlantResponse) => void;
  updatePlant: (id: string, plant: Partial<Plant>) => void;
  deletePlant: (id: string) => void;
  varySensors: () => void;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("idle");
  const [errorCarga, setErrorCarga] = useState<unknown>(null);
  // Cada carga recibe un número; solo la más reciente puede actualizar el estado
  const cargaActual = useRef(0);

  // Carga la lista del usuario desde GET /api/plants (la llama el Dashboard al montarse).
  // Mientras carga se conserva la lista anterior, así la pantalla no parpadea al volver de /add.
  const cargarPlantas = useCallback(async () => {
    const id = ++cargaActual.current;
    setEstadoCarga("loading");
    setErrorCarga(null);
    try {
      const lista = await listPlants();
      if (id !== cargaActual.current) return;
      setPlants((prev) => {
        const sensoresPrevios = new Map(prev.map((p) => [p.id, p.sensors]));
        return lista.map((p) => plantFromApi(p, sensoresPrevios.get(p.id)));
      });
      setEstadoCarga("ready");
    } catch (error) {
      if (id !== cargaActual.current) return;
      // 401: apiFetch ya cerró la sesión y redirige a /login; no se muestra error
      if (error instanceof ApiError && error.status === 401) {
        setEstadoCarga("idle");
        return;
      }
      setErrorCarga(error);
      setEstadoCarga("error");
    }
  }, []);

  // Agrega al inicio la planta creada en la API (el backend ordena por CreatedAt DESC).
  const addPlantFromApi = (plant: PlantResponse) => {
    setPlants((prev) => [plantFromApi(plant), ...prev.filter((p) => p.id !== plant.id)]);
  };

  // Reemplaza una planta con la respuesta de la API (PUT), conservando sus sensores
  const replacePlantFromApi = (plant: PlantResponse) => {
    setPlants((prev) => prev.map((p) => (p.id === plant.id ? plantFromApi(plant, p.sensors) : p)));
  };

  // Temporal: el modal de edición todavía guarda en local (se quita al usar PUT /api/plants/:id)
  const updatePlant = (id: string, updatedData: Partial<Plant>) => {
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p)));
  };

  // Provisional hasta PLAN-15 (PLAN-28): solo quita la planta de la pantalla, no llama a la API
  const deletePlant = (id: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  };

  // Provisional hasta PLAN-39/48: varía las lecturas en pantalla.
  // No toca status: el estado real lo calcula el backend (PLAN-46) y llega en la API.
  const varySensors = () => {
    setPlants((prev) => 
      prev.map((p) => {
        const vary = (val: number, max: number, change: number = 2) => {
          const delta = Math.floor(Math.random() * (change * 2 + 1)) - change;
          return Math.max(0, Math.min(max, val + delta));
        };
        
        const newSensors = {
          moisture: vary(p.sensors.moisture, 100),
          light: vary(p.sensors.light, 100),
          temperature: vary(p.sensors.temperature, 40, 1),
          humidity: vary(p.sensors.humidity, 100),
        };

        return { ...p, sensors: newSensors };
      })
    );
  };

  // Vary sensors every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      varySensors();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PlantContext.Provider
      value={{ plants, estadoCarga, errorCarga, cargarPlantas, addPlantFromApi, replacePlantFromApi, updatePlant, deletePlant, varySensors }}
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
