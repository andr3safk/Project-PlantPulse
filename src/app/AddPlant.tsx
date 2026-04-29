import { useState } from "react";
import { Camera, Save, ArrowLeft, Cpu } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { usePlants } from "./contexts/PlantContext";

const PREDEFINED_SPECIES = [
  "Monstera Deliciosa",
  "Ficus Elastica",
  "Pothos",
  "Sansevieria",
  "Calathea",
  "Aloe Vera",
  "Helecho Boston",
  "Cinta (Malamadre)",
  "Spatifilo (Cuna de Moisés)"
];

export function AddPlant() {
  const navigate = useNavigate();
  const { addPlant } = usePlants();
  const [formData, setFormData] = useState({
    name: "",
    species: "Detección Automática",
    location: "sala",
    sensorId: ""
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalSpecies = formData.species;
    if (finalSpecies === "Detección Automática") {
      finalSpecies = PREDEFINED_SPECIES[Math.floor(Math.random() * PREDEFINED_SPECIES.length)];
    }

    addPlant({
      name: formData.name,
      species: finalSpecies,
      location: formData.location,
      sensorId: formData.sensorId,
      image: "https://images.unsplash.com/photo-1629426956944-40c6a994111a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMHBsYW50JTIwaW5kb29yfGVufDF8fHx8MTc3Njk3NjA5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    });
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Registrar Nueva Planta</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Añade una planta para comenzar a monitorearla.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-green-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        
        <div className="mb-8 flex justify-center">
          <div className="w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border-2 border-dashed border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center text-emerald-500 dark:text-emerald-400 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-xs font-medium">Añadir Foto</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre o Apodo</label>
              <input 
                type="text" 
                placeholder="Ej. Sr. Helecho"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Especie de Planta</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-all"
                value={formData.species}
                onChange={e => setFormData({...formData, species: e.target.value})}
              >
                <option value="Detección Automática">Detección Automática</option>
                {PREDEFINED_SPECIES.map((species, index) => (
                  <option key={index} value={species}>{species}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ubicación en Casa</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-700 dark:text-slate-200 transition-all"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            >
              <option value="sala">Sala de Estar</option>
              <option value="dormitorio">Dormitorio</option>
              <option value="cocina">Cocina</option>
              <option value="bano">Baño</option>
              <option value="oficina">Oficina / Estudio</option>
              <option value="exterior">Balcón / Exterior</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Vincular Sensor</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Conecta tu hardware PlantPulse (Opcional)</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="ID del Dispositivo (ej. PP-8X2F)"
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all uppercase font-mono text-sm"
                value={formData.sensorId}
                onChange={e => setFormData({...formData, sensorId: e.target.value})}
              />
              <button type="button" className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 transition-colors">
                Buscar
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm shadow-emerald-200 dark:shadow-none transition-all"
            >
              <Save size={20} />
              Guardar Planta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
