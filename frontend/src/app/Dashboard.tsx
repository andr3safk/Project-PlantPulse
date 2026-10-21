import React, { useEffect, useRef, useState } from "react";
import { Droplets, Sun, Thermometer, Wifi, WifiOff, Clock, AlertCircle, AlertTriangle, CheckCircle2, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { Link } from "react-router";
import { usePlants, Plant } from "./contexts/PlantContext";
import { deletePlant, getPlant, updatePlant } from "./api/plants";
import { ApiError } from "./api/client";
import type { PlantResponse, UpdatePlantRequest } from "./api/types";
import { validarPlanta, normalizarTexto, NOMBRE_MAX, ESPECIE_MAX, type ErroresPlanta } from "./utils/validarPlanta";
import { esCampoVisible, type CampoVisible } from "./utils/mensajesRegistro";
import {
  MSG_ERROR_CARGA_LISTA,
  MSG_ERROR_CARGA_PLANTA,
  mensajeErrorCarga,
  mensajeErrorEdicion,
  mensajeExitoEdicion,
} from "./utils/mensajesEdicion";
import { MSG_PLANTA_YA_ELIMINADA, mensajeErrorEliminacion, mensajeExitoEliminacion } from "./utils/mensajesEliminacion";
import { UBICACIONES, esUbicacionConocida, etiquetaUbicacion } from "./utils/opcionesPlanta";
import { useRefrescoAutomatico } from "./hooks/useRefrescoAutomatico";
import {
  INTERVALO_REFRESCO_MS,
  MSG_ERROR_REFRESCO,
  TEXTO_CONECTADO,
  TEXTO_DESCONECTADO,
  TEXTO_ESPERANDO_LECTURA,
  TEXTO_SIN_SENSOR,
  TEXTO_SIN_TIEMPO_REAL,
  contarDispositivos,
  formatearValor,
  textoUltimaLectura,
} from "./utils/formatoMonitoreo";

// Valores del formulario de edición. location "" = sin ubicación (el backend la guarda como NULL).
type FormEdicion = { name: string; species: string; location: string };
const FORM_VACIO: FormEdicion = { name: "", species: "", location: "" };
// Orden de los campos: el foco va al primer campo con error
const CAMPOS_EDICION: readonly CampoVisible[] = ["name", "species", "location"];

const formDesdeApi = (p: PlantResponse): FormEdicion => ({
  name: p.name,
  species: p.species,
  location: p.location ?? "",
});

export function Dashboard() {
  const {
    plants, estadoCarga, errorCarga, cargarPlantas, refrescarPlantas, errorRefresco, quitarPlanta, replacePlantFromApi,
  } = usePlants();

  // --- Edición (PLAN-9) ---
  // editingPlant: la tarjeta que se pulsó. original: los datos reales que devolvió GET /api/plants/:id.
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [original, setOriginal] = useState<PlantResponse | null>(null);
  const [editForm, setEditForm] = useState<FormEdicion>(FORM_VACIO);
  const [editErrors, setEditErrors] = useState<ErroresPlanta>({});
  const [editGeneralError, setEditGeneralError] = useState<string | null>(null);
  const [cargandoEdicion, setCargandoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // El ref evita un doble envío antes de que React vuelva a renderizar el botón deshabilitado
  const guardandoRef = useRef(false);
  // Cada apertura del modal recibe un número: una respuesta de un modal anterior se ignora
  const solicitudEdicion = useRef(0);

  // Se guarda el id, no una copia: así el modal muestra los datos que trae cada refresco (PLAN-48)
  // y se cierra solo si la planta ya no está en la lista.
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const detailsPlant = detailsId === null ? null : plants.find(p => p.id === detailsId) ?? null;

  // --- Eliminación (PLAN-15: PLAN-28, PLAN-29) ---
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // El ref evita un doble envío antes de que React vuelva a renderizar el botón deshabilitado
  const eliminandoRef = useRef(false);

  // La lista se pide a la API cada vez que se entra al Dashboard
  useEffect(() => {
    void cargarPlantas();
  }, [cargarPlantas]);

  // PLAN-48: mientras el Dashboard está abierto, la lista se refresca sola cada 10 s
  // (lecturas, estado del dispositivo y aviso de "sin datos en tiempo real")
  useRefrescoAutomatico(() => void refrescarPlantas(), INTERVALO_REFRESCO_MS);

  const healthyCount = plants.filter(p => p.status === 'healthy').length;
  const attentionCount = plants.filter(p => p.status !== 'healthy').length;
  // PLAN-39: dispositivos reales (antes era plantas × 4, un dato inventado)
  const dispositivos = contarDispositivos(plants.map(p => p.dispositivo));

  const editHasChanges = original !== null && (
    normalizarTexto(editForm.name) !== normalizarTexto(original.name) ||
    normalizarTexto(editForm.species) !== normalizarTexto(original.species) ||
    normalizarTexto(editForm.location) !== normalizarTexto(original.location ?? "")
  );

  // Ubicación guardada que no es uno de los códigos (dato antiguo): se agrega como opción
  // para que el select la muestre tal cual y no la cambie sin que el usuario lo decida.
  const ubicacionExtra =
    original?.location && !esUbicacionConocida(original.location) ? original.location : null;

  const resetEdicion = () => {
    setEditingPlant(null);
    setOriginal(null);
    setEditForm(FORM_VACIO);
    setEditErrors({});
    setEditGeneralError(null);
    setCargandoEdicion(false);
  };

  // PLAN-23: al abrir el modal se piden los datos actuales de la planta a la API
  const openEditModal = async (plant: Plant) => {
    const id = ++solicitudEdicion.current;
    resetEdicion();
    setEditingPlant(plant);
    setCargandoEdicion(true);
    try {
      const datos = await getPlant(plant.id);
      if (id !== solicitudEdicion.current) return;
      setOriginal(datos);
      setEditForm(formDesdeApi(datos));
      setCargandoEdicion(false);
    } catch (error) {
      if (id !== solicitudEdicion.current) return;
      // 401: apiFetch ya cerró la sesión y redirige a /login
      if (error instanceof ApiError && error.status === 401) {
        closeEditModal();
        return;
      }
      setCargandoEdicion(false);
      setEditGeneralError(mensajeErrorCarga(error, MSG_ERROR_CARGA_PLANTA));
    }
  };

  const closeEditModal = () => {
    // Invalida cualquier respuesta pendiente de este modal
    solicitudEdicion.current++;
    resetEdicion();
  };

  const handleEditChange = (field: keyof FormEdicion, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    // El error del campo desaparece en cuanto el usuario lo corrige; se vuelve a validar al enviar.
    setEditErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // PLAN-24: guarda los cambios con PUT /api/plants/:id
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!original || guardandoRef.current) return;

    const errors = validarPlanta(editForm);
    const primerError = CAMPOS_EDICION.find((campo) => errors[campo]);
    if (primerError) {
      setEditErrors(errors);
      setEditGeneralError(null);
      document.getElementById(`edit-plant-${primerError}`)?.focus();
      return;
    }

    // El PUT reemplaza todos los campos: se reenvía el imageUrl actual para no borrar la foto
    const datos: UpdatePlantRequest = {
      name: normalizarTexto(editForm.name),
      species: normalizarTexto(editForm.species),
      location: normalizarTexto(editForm.location),
    };
    if (original.imageUrl) datos.imageUrl = original.imageUrl;

    guardandoRef.current = true;
    setGuardando(true);
    setEditErrors({});
    setEditGeneralError(null);

    try {
      const actualizada = await updatePlant(original.id, datos);
      replacePlantFromApi(actualizada);
      // Se usa el nombre que guardó la API, no el del formulario
      toast.success(mensajeExitoEdicion(actualizada.name));
      closeEditModal();
    } catch (error) {
      // 401: apiFetch ya cerró la sesión y redirige a /login
      if (error instanceof ApiError && error.status === 401) {
        closeEditModal();
        return;
      }
      const visibles: ErroresPlanta = {};
      const otros: string[] = [];
      if (error instanceof ApiError) {
        for (const [campo, mensaje] of Object.entries(error.errors ?? {})) {
          if (esCampoVisible(campo)) visibles[campo] = mensaje;
          else otros.push(mensaje);
        }
      }
      setEditErrors(visibles);
      // El texto crudo del backend nunca se muestra: se traduce según el estado
      setEditGeneralError(mensajeErrorEdicion(error, otros));
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const openDeleteModal = (plant: Plant) => {
    setDeleteError(null);
    setPlantToDelete(plant);
  };

  // Mientras se espera la respuesta de la API el modal no se puede cerrar
  const closeDeleteModal = () => {
    if (eliminandoRef.current) return;
    setPlantToDelete(null);
    setDeleteError(null);
  };

  // La tarjeta solo se quita cuando la API confirma (204): la pantalla nunca muestra
  // algo distinto de lo que hay en la base de datos
  const confirmDelete = async () => {
    if (!plantToDelete || eliminandoRef.current) return;
    const { id, name } = plantToDelete;

    eliminandoRef.current = true;
    setEliminando(true);
    setDeleteError(null);

    try {
      await deletePlant(id);
      quitarPlanta(id);
      toast.success(mensajeExitoEliminacion(name));
      setPlantToDelete(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // apiFetch ya cerró la sesión y redirige a /login
        setPlantToDelete(null);
      } else if (error instanceof ApiError && error.status === 404) {
        // Ya no existe (o no es del usuario): se quita de la lista para no mostrar una tarjeta fantasma
        quitarPlanta(id);
        toast.info(MSG_PLANTA_YA_ELIMINADA);
        setPlantToDelete(null);
      } else {
        // La planta se conserva y el modal sigue abierto para reintentar o cancelar
        setDeleteError(mensajeErrorEliminacion(error));
      }
    } finally {
      eliminandoRef.current = false;
      setEliminando(false);
    }
  };

  // Atributos de accesibilidad y borde de un control del modal de edición
  const editControlProps = (field: CampoVisible) => ({
    id: `edit-plant-${field}`,
    "aria-invalid": editErrors[field] ? true : undefined,
    "aria-describedby": editErrors[field] ? `edit-plant-${field}-error` : undefined,
    className: `w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 outline-none text-slate-800 dark:text-slate-100 ${editErrors[field] ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : "border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500"}`,
  });

  const renderEditError = (field: CampoVisible) =>
    editErrors[field] && (
      <p id={`edit-plant-${field}-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
        {editErrors[field]}
      </p>
    );

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
        <SummaryCard title="Atención Req." value={attentionCount.toString()} icon={<AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />} bgColor="bg-amber-50 dark:bg-amber-900/20" />
        <SummaryCard title="Dispositivos conectados" value={`${dispositivos.conectados} de ${dispositivos.total}`} icon={<Wifi className="w-5 h-5 text-purple-500 dark:text-purple-400" />} bgColor="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Estado de la carga de la lista */}
      {estadoCarga === "error" && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <span>{mensajeErrorCarga(errorCarga, MSG_ERROR_CARGA_LISTA)}</span>
          <button
            type="button"
            onClick={() => void cargarPlantas()}
            className="self-start sm:self-auto px-4 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* PLAN-48: un refresco automático falló; la lista sigue con los últimos datos */}
      {estadoCarga === "ready" && errorRefresco && (
        <p role="status" className="px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
          {MSG_ERROR_REFRESCO}
        </p>
      )}

      {estadoCarga === "loading" && plants.length === 0 && (
        <p role="status" className="text-center text-slate-500 dark:text-slate-400 py-12">Cargando tus plantas...</p>
      )}

      {estadoCarga === "ready" && plants.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-slate-500 dark:text-slate-400">Aún no tienes plantas registradas.</p>
          <Link to="/add" className="inline-block text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300">
            Registrar mi primera planta
          </Link>
        </div>
      )}

      {/* Plant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plants.map((plant) => (
          <PlantCard 
            key={plant.id} 
            plant={plant} 
            onEdit={() => void openEditModal(plant)}
            onDelete={() => openDeleteModal(plant)}
            onViewDetails={() => setDetailsId(plant.id)}
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
                type="button"
                onClick={closeEditModal}
                disabled={guardando}
                aria-label="Cerrar"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            {cargandoEdicion && (
              <p role="status" className="py-8 text-center text-slate-500 dark:text-slate-400">Cargando datos de la planta...</p>
            )}

            {/* Error al cargar: sin datos reales no se muestra el formulario */}
            {!cargandoEdicion && !original && editGeneralError && (
              <div className="space-y-4">
                <div role="alert" className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {editGeneralError}
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Volver a mis plantas
                </button>
              </div>
            )}

            {original && (
              /* noValidate: los mensajes los muestra validarPlanta, no el globo nativo del navegador */
              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="edit-plant-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => handleEditChange("name", e.target.value)}
                    maxLength={NOMBRE_MAX}
                    aria-required="true"
                    {...editControlProps("name")}
                  />
                  {renderEditError("name")}
                </div>
                <div>
                  <label htmlFor="edit-plant-species" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Especie</label>
                  <input
                    type="text"
                    value={editForm.species}
                    onChange={e => handleEditChange("species", e.target.value)}
                    maxLength={ESPECIE_MAX}
                    aria-required="true"
                    {...editControlProps("species")}
                  />
                  {renderEditError("species")}
                </div>
                <div>
                  <label htmlFor="edit-plant-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                  <select
                    value={editForm.location}
                    onChange={e => handleEditChange("location", e.target.value)}
                    {...editControlProps("location")}
                  >
                    <option value="">Sin ubicación</option>
                    {ubicacionExtra && <option value={ubicacionExtra}>{ubicacionExtra}</option>}
                    {UBICACIONES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  {renderEditError("location")}
                </div>

                {editGeneralError && (
                  <div role="alert" className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {editGeneralError}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={guardando}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!editHasChanges || guardando}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {plantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plant-title"
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center"
          >
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 id="delete-plant-title" className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">¿Estás seguro?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              ¿Deseas eliminar a <strong>{plantToDelete.name}</strong> de tus registros? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 text-left">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={eliminando}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={eliminando}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {eliminando ? "Eliminando..." : "Eliminar"}
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
                onClick={() => setDetailsId(null)}
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
                    ) : detailsPlant.status === 'critical' ? (
                      <><AlertTriangle size={18} className="text-red-500" /><span className="font-semibold text-slate-700 dark:text-slate-200">Estado Crítico</span></>
                    ) : (
                      <><AlertCircle size={18} className="text-amber-500" /><span className="font-semibold text-slate-700 dark:text-slate-200">Requiere Atención</span></>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ubicación</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{etiquetaUbicacion(detailsPlant.location)}</p>
                </div>
              </div>
              
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-wider">Métricas Actuales</h3>
              <EstadoMonitoreo plant={detailsPlant} />
              <div className="space-y-3 mt-3">
                <MetricaDetalle icono={<Droplets size={18} />} clase="bg-blue-50 dark:bg-blue-900/20 text-blue-500" etiqueta="Humedad del suelo" valor={formatearValor(detailsPlant.lectura?.moisture ?? null, "%")} />
                <MetricaDetalle icono={<Sun size={18} />} clase="bg-amber-50 dark:bg-amber-900/20 text-amber-500" etiqueta="Luz recibida" valor={formatearValor(detailsPlant.lectura?.light ?? null, "%")} />
                <MetricaDetalle icono={<Thermometer size={18} />} clase="bg-rose-50 dark:bg-rose-900/20 text-rose-500" etiqueta="Temperatura" valor={formatearValor(detailsPlant.lectura?.temperature ?? null, "°C")} />
              </div>
              <TextoLectura plant={detailsPlant} />
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

// Insignia de estado de la tarjeta. warning dice "Requiere atención" porque puede venir de la humedad,
// la temperatura o la luz (PLAN-46), no solo de la falta de agua (decisión de PO, 21/10/2026).
const INSIGNIA_ESTADO: Record<Plant["status"], { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  healthy: { texto: "Saludable", clase: "bg-emerald-500/90 text-white", Icono: CheckCircle2 },
  warning: { texto: "Requiere atención", clase: "bg-amber-500/90 text-white", Icono: AlertCircle },
  critical: { texto: "Estado Crítico", clase: "bg-red-600/90 text-white", Icono: AlertTriangle },
};

function PlantCard({ plant, onEdit, onDelete, onViewDetails }: { plant: Plant; onEdit: () => void; onDelete: () => void; onViewDetails: () => void; }) {
  const insignia = INSIGNIA_ESTADO[plant.status];

  return (
    <article aria-label={plant.name} className="bg-white dark:bg-slate-900 rounded-3xl border border-green-100/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all duration-300">
      {/* Header / Image Area */}
      <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
        <ImageWithFallback 
          src={plant.image} 
          alt={plant.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <div className="absolute top-4 right-4 flex gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm ${insignia.clase}`}>
            <insignia.Icono className="w-3.5 h-3.5" />
            {insignia.texto}
          </div>
        </div>

        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
            title="Editar"
            aria-label="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold leading-tight text-white">{plant.name}</h3>
          <p className="text-white/80 text-sm font-medium">{plant.species}</p>
        </div>
      </div>

      {/* Datos de los sensores (PLAN-39): última lectura real de la API, solo las 3 variables medidas */}
      <div className="p-5 flex-1 flex flex-col">
        <EstadoMonitoreo plant={plant} />
        <div className="grid grid-cols-3 gap-3 mt-4">
          <SensorItem 
            icon={<Droplets size={16} />} 
            label="Humedad" 
            value={formatearValor(plant.lectura?.moisture ?? null, "%")} 
            color="blue"
            isLow={plant.lectura?.moisture != null && plant.lectura.moisture < 30}
          />
          <SensorItem 
            icon={<Sun size={16} />} 
            label="Luz" 
            value={formatearValor(plant.lectura?.light ?? null, "%")} 
            color="amber"
          />
          <SensorItem 
            icon={<Thermometer size={16} />} 
            label="Temp." 
            value={formatearValor(plant.lectura?.temperature ?? null, "°C")} 
            color="rose"
          />
        </div>
        <TextoLectura plant={plant} />

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Último riego: {plant.lastWatered}</span>
          <button onClick={onViewDetails} className="text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Ver Detalles</button>
        </div>
      </div>
    </article>
  );
}

// Estado del dispositivo y aviso de "sin datos en tiempo real" (PLAN-39, criterio de PLAN-11).
// Los dos valores los calcula el backend con la hora de SQL Server.
function EstadoMonitoreo({ plant }: { plant: Plant }) {
  const { lectura, dispositivo } = plant;
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {dispositivo === null ? (
        <span className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400`}>
          {TEXTO_SIN_SENSOR}
        </span>
      ) : dispositivo.conectado ? (
        <span className={`${base} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400`}>
          <Wifi size={14} aria-hidden="true" />
          {TEXTO_CONECTADO}
        </span>
      ) : (
        <span className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}>
          <WifiOff size={14} aria-hidden="true" />
          {TEXTO_DESCONECTADO}
        </span>
      )}
      {lectura?.desactualizada && (
        <span className={`${base} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400`}>
          <Clock size={14} aria-hidden="true" />
          {TEXTO_SIN_TIEMPO_REAL}
        </span>
      )}
    </div>
  );
}

// Fecha de la última lectura o, si hay dispositivo pero aún no hay lecturas, "Esperando la primera lectura"
function TextoLectura({ plant }: { plant: Plant }) {
  const { lectura, dispositivo } = plant;
  const texto = lectura !== null
    ? textoUltimaLectura(lectura.recordedAt)
    : dispositivo !== null ? TEXTO_ESPERANDO_LECTURA : null;
  if (texto === null) return null;
  return <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{texto}</p>;
}

function MetricaDetalle({ icono, clase, etiqueta, valor }: { icono: React.ReactNode; clase: string; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${clase}`}>{icono}</div>
        <span className="font-medium text-slate-700 dark:text-slate-200">{etiqueta}</span>
      </div>
      <span className="font-bold text-slate-800 dark:text-slate-100">{valor}</span>
    </div>
  );
}

function SensorItem({ icon, label, value, color, isLow }: { icon: React.ReactNode, label: string, value: string, color: string, isLow?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    amber: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    rose: "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
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
