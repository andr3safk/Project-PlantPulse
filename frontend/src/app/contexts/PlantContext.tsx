import React, { createContext, useContext, useState, useEffect } from "react";

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
  sensorId?: string;
};

const INITIAL_PLANTS: Plant[] = [
  {
    id: "1",
    name: "Monstruo",
    species: "Monstera Deliciosa",
    image: "https://images.unsplash.com/photo-1654179280639-3de6d9d7f996?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25zdGVyYSUyMHBsYW50JTIwaG9tZXxlbnwxfHx8fDE3NzMxNzE3MDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    status: "healthy",
    sensors: { moisture: 65, light: 80, temperature: 24, humidity: 55 },
    lastWatered: "Hace 2 días",
    location: "sala",
  },
  {
    id: "2",
    name: "Serpientina",
    species: "Sansevieria Trifasciata",
    image: "https://images.unsplash.com/photo-1601467860749-56d59825dcb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmFrZSUyMHBsYW50JTIwcG90JTIwaW5kb29yfGVufDF8fHx8MTc3MzI0MDQyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    status: "warning",
    sensors: { moisture: 15, light: 40, temperature: 22, humidity: 40 },
    lastWatered: "Hace 3 semanas",
    location: "dormitorio",
  },
  {
    id: "3",
    name: "Higuera",
    species: "Ficus Lyrata",
    image: "https://images.unsplash.com/photo-1608329857883-5998ebea6f76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWRkbGUlMjBsZWFmJTIwZmlnJTIwaW5kb29yfGVufDF8fHx8MTc3MzI0MDQyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    status: "healthy",
    sensors: { moisture: 45, light: 90, temperature: 26, humidity: 60 },
    lastWatered: "Hace 5 días",
    location: "sala",
  }
];

type PlantContextType = {
  plants: Plant[];
  addPlant: (plant: Omit<Plant, "id" | "status" | "sensors" | "lastWatered">) => void;
  updatePlant: (id: string, plant: Partial<Plant>) => void;
  deletePlant: (id: string) => void;
  varySensors: () => void;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS);

  const addPlant = (plantData: Omit<Plant, "id" | "status" | "sensors" | "lastWatered">) => {
    const newPlant: Plant = {
      ...plantData,
      id: Math.random().toString(36).substr(2, 9),
      status: "healthy",
      sensors: {
        moisture: Math.floor(Math.random() * 40) + 40, // 40-80
        light: Math.floor(Math.random() * 50) + 30, // 30-80
        temperature: Math.floor(Math.random() * 10) + 18, // 18-28
        humidity: Math.floor(Math.random() * 40) + 30, // 30-70
      },
      lastWatered: "Hoy",
    };
    setPlants((prev) => [...prev, newPlant]);
  };

  const updatePlant = (id: string, updatedData: Partial<Plant>) => {
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p)));
  };

  const deletePlant = (id: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  };

  const varySensors = () => {
    setPlants((prev) => 
      prev.map(p => {
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

        // Update status based on moisture
        const status = newSensors.moisture < 20 ? "warning" : "healthy";

        return { ...p, sensors: newSensors, status };
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
    <PlantContext.Provider value={{ plants, addPlant, updatePlant, deletePlant, varySensors }}>
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
