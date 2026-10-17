import { useRef, useState } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { usePlants } from "./contexts/PlantContext";
import { createPlant } from "./api/plants";
import { ApiError } from "./api/client";
import { validarPlanta, normalizarTexto, NOMBRE_MAX } from "./utils/validarPlanta";
import {
  CAMPOS_VISIBLES,
  esCampoVisible,
  mensajeErrorRegistro,
  mensajeExitoRegistro,
  type CampoVisible,
} from "./utils/mensajesRegistro";
import { UBICACIONES } from "./utils/opcionesPlanta";

const SPECIES_OPTIONS = [
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

// Campos del formulario que tienen un control visible para mostrar su error
type FormField = CampoVisible;
const FORM_FIELDS = CAMPOS_VISIBLES;

const BASE_CONTROL_CLASS = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all";

export function AddPlant() {
  const navigate = useNavigate();
  const { addPlantFromApi } = usePlants();
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    location: "sala"
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // El ref evita un doble envío antes de que React vuelva a renderizar el botón deshabilitado
  const submittingRef = useRef(false);

  const handleChange = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Al corregir un campo se borra solo su error
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    // Validación en el cliente: con errores no se llama a la API
    const errores = validarPlanta(formData);
    const clientErrors: Partial<Record<FormField, string>> = {};
    for (const field of FORM_FIELDS) {
      if (errores[field]) clientErrors[field] = errores[field];
    }
    // FORM_FIELDS está en orden nombre → especie → ubicación: el foco va al primer error
    const firstInvalid = FORM_FIELDS.find((field) => clientErrors[field]);
    if (firstInvalid) {
      setFieldErrors(clientErrors);
      setGeneralError(null);
      document.getElementById(`plant-${firstInvalid}`)?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      const plant = await createPlant({
        name: normalizarTexto(formData.name),
        species: normalizarTexto(formData.species),
        location: normalizarTexto(formData.location),
      });
      addPlantFromApi(plant);
      // Se usa el nombre que guardó la API, no el del formulario
      toast.success(mensajeExitoRegistro(plant.name));
      navigate("/");
      // Éxito: el componente se desmonta al navegar, no se actualiza más estado
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);

      // 401: apiFetch ya borró la sesión y redirige a /login
      if (error instanceof ApiError && error.status === 401) return;

      const visibleErrors: Partial<Record<FormField, string>> = {};
      const otherErrors: string[] = [];
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.errors ?? {})) {
          if (esCampoVisible(field)) {
            visibleErrors[field] = message;
          } else {
            otherErrors.push(message);
          }
        }
      }
      setFieldErrors(visibleErrors);
      // El texto crudo del backend nunca se muestra: se traduce según el estado
      setGeneralError(mensajeErrorRegistro(error, otherErrors));
    }
  };

  // Atributos de accesibilidad y borde rojo para un campo con error
  const errorProps = (field: FormField) =>
    fieldErrors[field]
      ? { "aria-invalid": true, "aria-describedby": `plant-${field}-error` }
      : {};

  const borderClass = (field: FormField) =>
    fieldErrors[field] ? "border-red-500" : "border-slate-200 dark:border-slate-700";

  const renderFieldError = (field: FormField) =>
    fieldErrors[field] && (
      <p id={`plant-${field}-error`} className="text-red-600 dark:text-red-400 text-sm">
        {fieldErrors[field]}
      </p>
    );

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
        {/* noValidate: los mensajes los muestra validarPlanta, no el globo nativo del navegador */}
        <form onSubmit={handleSave} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="plant-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre o Apodo</label>
              <input
                id="plant-name"
                type="text"
                placeholder="Ej. Sr. Helecho"
                className={`${BASE_CONTROL_CLASS} ${borderClass("name")} text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`}
                value={formData.name}
                onChange={e => handleChange("name", e.target.value)}
                maxLength={NOMBRE_MAX}
                aria-required="true"
                {...errorProps("name")}
              />
              {renderFieldError("name")}
            </div>

            <div className="space-y-2">
              <label htmlFor="plant-species" className="text-sm font-medium text-slate-700 dark:text-slate-300">Especie de Planta</label>
              <select
                id="plant-species"
                className={`${BASE_CONTROL_CLASS} ${borderClass("species")} text-slate-800 dark:text-slate-100`}
                value={formData.species}
                onChange={e => handleChange("species", e.target.value)}
                aria-required="true"
                {...errorProps("species")}
              >
                <option value="">Selecciona una especie</option>
                {SPECIES_OPTIONS.map((species) => (
                  <option key={species} value={species}>{species}</option>
                ))}
              </select>
              {renderFieldError("species")}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="plant-location" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ubicación en Casa</label>
            <select
              id="plant-location"
              className={`${BASE_CONTROL_CLASS} ${borderClass("location")} text-slate-700 dark:text-slate-200`}
              value={formData.location}
              onChange={e => handleChange("location", e.target.value)}
              {...errorProps("location")}
            >
              {UBICACIONES.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
            {renderFieldError("location")}
          </div>

          <div className="pt-6 space-y-4">
            {generalError && (
              <div role="alert" className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {generalError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {submitting ? "Guardando..." : "Guardar Planta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
