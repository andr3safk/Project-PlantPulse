import React, { useState } from "react";
import { Droplets, Sun, Thermometer, Wind, AlertCircle, CheckCircle2, Trash2, Edit2, X } from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { Link } from "react-router";
import { usePlants, Plant } from "./contexts/PlantContext";

export function Dashboard() {
  const { plants, deletePlant, updatePlant } = usePlants();
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [detailsPlant, setDetailsPlant] = useState<Plant | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);

  const healthyCount = plants.filter(p => p.status === 'healthy').length;
  const warningCount = plants.filter(p => p.status === 'warning').length;

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingPlant) {
      updatePlant(editingPlant.id, {
        name: editingPlant.name,
        species: editingPlant.species,
      });
      setEditingPlant(null);
    }
  };

  const confirmDelete = () => {
    if (plantToDelete) {
      deletePlant(plantToDelete.id);
      setPlantToDelete(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Mis Plantas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitorea la salud y necesidades de tu jardín interior.</p>
        </div>
        <Link 
          to="/add" 
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm shadow-emerald-200 dark:shadow-none transition-colors"
        >
          <span className="text-xl leading-none">+</span> Nueva Planta
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Plantas" value={plants.length.toString()} icon={<Droplets className="w-5 h-5 text-blue-500 dark:text-blue-400" />} bgColor="bg-blue-50 dark:bg-blue-900/20" />
        <SummaryCard title="Saludables" value={healthyCount.toString()} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />} bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
        <SummaryCard title="Atención Req." value={warningCount.toString()} icon={<AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />} bgColor="bg-amber-50 dark:bg-amber-900/20" />
        <SummaryCard title="Sensores Activos" value={(plants.length * 4).toString()} icon={<Wind className="w-5 h-5 text-purple-500 dark:text-purple-400" />} bgColor="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Plant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plants.map((plant) => (
          <PlantCard 
            key={plant.id} 
            plant={plant} 
            onEdit={() => setEditingPlant(plant)}
            onDelete={() => setPlantToDelete(plant)}
            onViewDetails={() => setDetailsPlant(plant)}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {editingPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Planta</h2>
              <button 
                onClick={() => setEditingPlant(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input 
                  type="text"
                  value={editingPlant.name}
                  onChange={e => setEditingPlant({...editingPlant, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Especie</label>
                <input 
                  type="text"
                  value={editingPlant.species}
                  onChange={e => setEditingPlant({...editingPlant, species: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingPlant(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {plantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">¿Estás seguro?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              ¿Deseas eliminar a <strong>{plantToDelete.name}</strong> de tus registros? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPlantToDelete(null)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-sm transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="h-48 relative">
              <ImageWithFallback 
                src={detailsPlant.image} 
                alt={detailsPlant.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              <button 
                onClick={() => setDetailsPlant(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-2xl font-bold">{detailsPlant.name}</h2>
                <p className="text-white/80">{detailsPlant.species}</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estado de Salud</p>
                  <div className="flex items-center gap-2">
                    {detailsPlant.status === 'healthy' ? (
                      <><CheckCircle2 size={18} className="text-emerald-500" /><span className="font-semibold text-slate-700 dark:text-slate-200">Saludable</span></>
                    ) : (
                      <><AlertCircle size={18} className="text-amber-500" /><span className="font-semibold text-slate-700 dark:text-slate-200">Requiere Atención</span></>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ubicación</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{detailsPlant.location || 'No asignada'}</p>
                </div>
              </div>
              
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-wider">Métricas Actuales</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg"><Droplets size={18} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Humedad Suelo</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{detailsPlant.sensors.moisture}%</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg"><Sun size={18} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Luz Recibida</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{detailsPlant.sensors.light}%</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg"><Thermometer size={18} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Temperatura</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{detailsPlant.sensors.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-500 rounded-lg"><Wind size={18} /></div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Humedad Ambiental</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{detailsPlant.sensors.humidity}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-green-100/50 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
      <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function PlantCard({ plant, onEdit, onDelete, onViewDetails }: { plant: Plant; onEdit: () => void; onDelete: () => void; onViewDetails: () => void; }) {
  const isWarning = plant.status === 'warning';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-green-100/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all duration-300">
      {/* Header / Image Area */}
      <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
        <ImageWithFallback 
          src={plant.image} 
          alt={plant.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <div className="absolute top-4 right-4 flex gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm
            ${isWarning ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'}
          `}>
            {isWarning ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isWarning ? 'Necesita Agua' : 'Saludable'}
          </div>
        </div>

        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold leading-tight text-white">{plant.name}</h3>
          <p className="text-white/80 text-sm font-medium">{plant.species}</p>
        </div>
      </div>

      {/* Sensor Data */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-y-4 gap-x-3 mb-5">
          <SensorItem 
            icon={<Droplets size={16} />} 
            label="Humedad" 
            value={`${plant.sensors.moisture}%`} 
            color="blue"
            isLow={plant.sensors.moisture < 30}
          />
          <SensorItem 
            icon={<Sun size={16} />} 
            label="Luz" 
            value={`${plant.sensors.light}%`} 
            color="amber"
          />
          <SensorItem 
            icon={<Thermometer size={16} />} 
            label="Temp." 
            value={`${plant.sensors.temperature}°C`} 
            color="rose"
          />
          <SensorItem 
            icon={<Wind size={16} />} 
            label="Ambiente" 
            value={`${plant.sensors.humidity}%`} 
            color="teal"
          />
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Último riego: {plant.lastWatered}</span>
          <button onClick={onViewDetails} className="text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Ver Detalles</button>
        </div>
      </div>
    </div>
  );
}

function SensorItem({ icon, label, value, color, isLow }: { icon: React.ReactNode, label: string, value: string, color: string, isLow?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    amber: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    rose: "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
    teal: "text-teal-500 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
  };

  const bgClass = colorMap[color] || "text-slate-500 bg-slate-50 dark:bg-slate-800";

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgClass} ${isLow ? 'ring-2 ring-red-400 dark:ring-red-500 animate-pulse' : ''}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`font-semibold ${isLow ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'} transition-all duration-300`}>{value}</p>
      </div>
    </div>
  );
}
