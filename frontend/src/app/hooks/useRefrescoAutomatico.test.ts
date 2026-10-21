// Pruebas del hook de refresco automático — PLAN-48
// Solo se simulan setInterval/clearInterval: el resto del entorno usa el reloj real.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRefrescoAutomatico } from "./useRefrescoAutomatico";

const INTERVALO = 10_000;

// Cambia document.visibilityState (en jsdom siempre es "visible") y avisa con el evento
function cambiarVisibilidad(estado: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.useRealTimers();
  // Quita la propiedad de la instancia: vuelve el valor real de jsdom ("visible")
  delete (document as unknown as Record<string, unknown>).visibilityState;
});

describe("useRefrescoAutomatico", () => {
  it("no llama al montar; llama una vez por cada intervalo", () => {
    const refrescar = vi.fn();
    renderHook(() => useRefrescoAutomatico(refrescar, INTERVALO));

    expect(refrescar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(INTERVALO - 1);
    expect(refrescar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refrescar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTERVALO * 2);
    expect(refrescar).toHaveBeenCalledTimes(3);
  });

  it("con la pestaña oculta no llama", () => {
    const refrescar = vi.fn();
    renderHook(() => useRefrescoAutomatico(refrescar, INTERVALO));

    cambiarVisibilidad("hidden");
    vi.advanceTimersByTime(INTERVALO * 3);
    expect(refrescar).not.toHaveBeenCalled();
  });

  it("al volver a la pestaña llama de inmediato", () => {
    const refrescar = vi.fn();
    renderHook(() => useRefrescoAutomatico(refrescar, INTERVALO));

    cambiarVisibilidad("hidden");
    expect(refrescar).not.toHaveBeenCalled();
    cambiarVisibilidad("visible");
    expect(refrescar).toHaveBeenCalledTimes(1);
  });

  it("al desmontar deja de llamar (intervalo y evento)", () => {
    const refrescar = vi.fn();
    const { unmount } = renderHook(() => useRefrescoAutomatico(refrescar, INTERVALO));

    unmount();
    vi.advanceTimersByTime(INTERVALO * 3);
    cambiarVisibilidad("visible");
    expect(refrescar).not.toHaveBeenCalled();
  });

  it("usa siempre la última función recibida sin reiniciar el intervalo", () => {
    const primera = vi.fn();
    const segunda = vi.fn();
    const { rerender } = renderHook(({ fn }) => useRefrescoAutomatico(fn, INTERVALO), {
      initialProps: { fn: primera },
    });

    vi.advanceTimersByTime(INTERVALO / 2);
    rerender({ fn: segunda });
    vi.advanceTimersByTime(INTERVALO / 2);

    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
  });
});
