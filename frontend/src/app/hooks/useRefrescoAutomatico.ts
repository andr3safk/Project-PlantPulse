import { useEffect, useRef } from "react";

// Llama a `refrescar` cada `intervaloMs` mientras el componente esté montado — PLAN-48
// - Si la pestaña está oculta (otra pestaña, ventana minimizada) no llama: no gasta peticiones.
// - Al volver a la pestaña llama de inmediato, así los datos no se ven viejos hasta el siguiente ciclo.
// - Se guarda la última versión de `refrescar` en un ref: cambiarla no reinicia el intervalo.
export function useRefrescoAutomatico(refrescar: () => void, intervaloMs: number) {
  const refrescarRef = useRef(refrescar);

  useEffect(() => {
    refrescarRef.current = refrescar;
  }, [refrescar]);

  useEffect(() => {
    const visible = () => document.visibilityState !== "hidden";

    const id = setInterval(() => {
      if (visible()) refrescarRef.current();
    }, intervaloMs);

    const alCambiarVisibilidad = () => {
      if (visible()) refrescarRef.current();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [intervaloMs]);
}
