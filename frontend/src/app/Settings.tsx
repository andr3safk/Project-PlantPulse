import { Moon, Sun, Monitor, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ajusta tus preferencias y la apariencia de PlantPulse.</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-green-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <Moon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Apariencia</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Tema de la aplicación</p>
            {mounted && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
                >
                  <Sun className={`w-8 h-8 mb-2 ${theme === 'light' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className={`font-medium ${theme === 'light' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>Claro</span>
                </button>

                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
                >
                  <Moon className={`w-8 h-8 mb-2 ${theme === 'dark' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className={`font-medium ${theme === 'dark' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>Oscuro</span>
                </button>

                <button 
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${theme === 'system' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
                >
                  <Monitor className={`w-8 h-8 mb-2 ${theme === 'system' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className={`font-medium ${theme === 'system' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>Sistema</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-green-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h2>
          </div>
          
          <div className="space-y-4">
            <ToggleRow label="Alertas de riego" description="Recibe notificaciones cuando tus plantas necesiten agua." defaultChecked={true} />
            <ToggleRow label="Reportes de salud" description="Resumen semanal del estado de tus plantas." defaultChecked={true} />
            <ToggleRow label="Consejos estacionales" description="Recomendaciones para el cuidado en diferentes estaciones." defaultChecked={false} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked }: { label: string, description: string, defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button 
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
