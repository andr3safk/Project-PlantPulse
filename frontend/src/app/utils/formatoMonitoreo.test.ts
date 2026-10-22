// Pruebas del formato del monitoreo — PLAN-39
import { describe, it, expect } from "vitest";
import {
  SIN_DATO,
  contarDispositivos,
  formatearFechaLectura,
  formatearValor,
  textoUltimaLectura,
} from "./formatoMonitoreo";

describe("formatearValor", () => {
  it("entero → sin decimales y con la unidad", () => {
    expect(formatearValor(60, "%")).toBe("60%");
  });

  it("decimal → máximo un decimal con coma (es-CO)", () => {
    expect(formatearValor(22.5, "°C")).toBe("22,5°C");
    expect(formatearValor(45.25, "%")).toBe("45,3%");
  });

  it("negativo → conserva el signo", () => {
    expect(formatearValor(-5, "°C")).toBe("-5°C");
  });

  it("null o no finito → —", () => {
    expect(formatearValor(null, "%")).toBe(SIN_DATO);
    expect(formatearValor(Number.NaN, "%")).toBe(SIN_DATO);
    expect(formatearValor(Number.POSITIVE_INFINITY, "%")).toBe(SIN_DATO);
  });
});

describe("formatearFechaLectura y textoUltimaLectura", () => {
  const FECHA = "2026-10-21T22:30:00.000Z";

  it("fecha válida → mismo formato que toLocaleString es-CO (zona del navegador)", () => {
    const esperado = new Date(FECHA).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    expect(formatearFechaLectura(FECHA)).toBe(esperado);
    expect(textoUltimaLectura(FECHA)).toBe(`Última lectura: ${esperado}`);
  });

  it("fecha inválida → —", () => {
    expect(formatearFechaLectura("no-es-fecha")).toBe(SIN_DATO);
  });
});

describe("contarDispositivos", () => {
  it("lista vacía o solo plantas sin dispositivo → 0 de 0", () => {
    expect(contarDispositivos([])).toEqual({ conectados: 0, total: 0 });
    expect(contarDispositivos([null, null])).toEqual({ conectados: 0, total: 0 });
  });

  it("cuenta conectados y total de dispositivos distintos", () => {
    expect(contarDispositivos([
      { id: "a", conectado: true },
      null,
      { id: "b", conectado: false },
    ])).toEqual({ conectados: 1, total: 2 });
  });

  it("un dispositivo compartido por dos plantas cuenta una sola vez", () => {
    expect(contarDispositivos([
      { id: "a", conectado: true },
      { id: "a", conectado: true },
    ])).toEqual({ conectados: 1, total: 1 });
  });
});
