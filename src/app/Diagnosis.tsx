import { UploadCloud, CheckCircle2, AlertTriangle, Leaf, Loader2 } from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

export function Diagnosis() {
  const [isUploading, setIsUploading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<null | 'success' | 'issue'>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setDiagnosisResult(null);
    
    // Simulate image upload preview (using a sick plant image)
    setImagePreview("https://images.unsplash.com/photo-1596547609652-9fc5d8d4239e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWNrJTIwcGxhbnR8ZW58MHx8fHwxNzczMTcyNDQ2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral");

    setTimeout(() => {
      setIsUploading(false);
      setDiagnosisResult('issue'); // Simulate finding an issue
    }, 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <Leaf className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Diagnóstico Temprano</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Sube una foto de tu planta y nuestra inteligencia artificial detectará posibles enfermedades, plagas o deficiencias de nutrientes.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-green-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        {!diagnosisResult && !isUploading && (
          <div 
            onClick={handleSimulateUpload}
            className="border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl p-12 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
              <UploadCloud className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Haz clic para subir una foto</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Soporta JPG, PNG (Max 5MB)</p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl overflow-hidden opacity-50 dark:opacity-30">
                <ImageWithFallback src={imagePreview!} alt="Analizando..." className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Analizando follaje...</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Buscando patrones de enfermedades y deficiencias</p>
            </div>
          </div>
        )}

        {diagnosisResult === 'issue' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3">
                <div className="aspect-square rounded-2xl overflow-hidden relative">
                  <ImageWithFallback src={imagePreview!} alt="Planta Analizada" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 ring-4 ring-inset ring-amber-500 dark:ring-amber-400 rounded-2xl"></div>
                  {/* Simulated bounding boxes/hotspots */}
                  <div className="absolute top-1/4 left-1/3 w-12 h-12 border-2 border-amber-400 rounded-full animate-pulse bg-amber-400/20"></div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full shrink-0">
                    <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Deficiencia de Nitrógeno</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg mt-1">Nivel de confianza: 92%</p>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 p-5 rounded-2xl">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Síntomas detectados:</h3>
                  <ul className="list-disc list-inside text-amber-700 dark:text-amber-400/80 space-y-1">
                    <li>Amarillamiento generalizado de las hojas más viejas.</li>
                    <li>Crecimiento atrofiado o más lento de lo normal.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Plan de Acción Recomendado</h3>
                  <div className="space-y-3">
                    <ActionStep number="1" text="Aplica un fertilizante rico en nitrógeno (ej. NPK 10-5-5) diluido a la mitad de su fuerza." />
                    <ActionStep number="2" text="Asegúrate de no regar en exceso, ya que las raíces ahogadas no pueden absorber nutrientes." />
                    <ActionStep number="3" text="Rocía las hojas suavemente con extracto de algas marinas para una absorción foliar rápida." />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setDiagnosisResult(null)}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-center"
                  >
                    Diagnosticar otra planta
                  </button>
                  <button className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center">
                    Guardar reporte
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionStep({ number, text }: { number: string, text: string }) {
  return (
    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
        {number}
      </div>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
