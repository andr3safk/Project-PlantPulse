import { describe, it, expect } from "vitest";
import { ApiError } from "../api/client";
import {
  mensajeErrorRegistro,
  mensajeExitoRegistro,
  MSG_REVISA_CAMPOS,
  MSG_SIN_CONEXION,
  MSG_TIMEOUT,
  MSG_GENERICO,
} from "./mensajesRegistro";

const MSG_IMAGEN = "La URL de la imagen no es válida.";

describe("mensajeErrorRegistro", () => {
  it("un error que no es ApiError da el mensaje genérico", () => {
    expect(mensajeErrorRegistro(new Error("x"), [])).toBe(MSG_GENERICO);
    expect(mensajeErrorRegistro("texto suelto", [])).toBe(MSG_GENERICO);
  });

  it("status 0 (sin red) da el mensaje de sin conexión", () => {
    const error = new ApiError("Error de conexión con el servidor", 0);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_SIN_CONEXION);
  });

  it("status 408 da el mensaje de timeout", () => {
    const error = new ApiError("Solicitud cancelada por timeout", 408);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_TIMEOUT);
  });

  it("400 con error en un campo visible da \"Revisa los campos marcados.\"", () => {
    const error = new ApiError("Datos de planta inválidos", 400, { name: "El nombre ya existe." });
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_REVISA_CAMPOS);
  });

  it("400 con campo visible y no visible agrega los mensajes no visibles después, con un espacio", () => {
    const error = new ApiError("Datos de planta inválidos", 400, {
      species: "La especie es un campo obligatorio.",
      imageUrl: MSG_IMAGEN,
    });
    expect(mensajeErrorRegistro(error, [MSG_IMAGEN])).toBe(`${MSG_REVISA_CAMPOS} ${MSG_IMAGEN}`);
  });

  it("400 solo con campos no visibles muestra esos mensajes unidos con un espacio", () => {
    const otro = "El dispositivo no existe.";
    const error = new ApiError("Datos de planta inválidos", 400, { imageUrl: MSG_IMAGEN, deviceId: otro });
    expect(mensajeErrorRegistro(error, [MSG_IMAGEN, otro])).toBe(`${MSG_IMAGEN} ${otro}`);
  });

  it("400 sin errors da el mensaje genérico (no el texto del backend)", () => {
    const error = new ApiError("Datos de planta inválidos", 400);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_GENERICO);
  });

  it("404 da el mensaje genérico", () => {
    const error = new ApiError("Ruta no encontrada", 404);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_GENERICO);
  });

  it("500 da el mensaje genérico", () => {
    const error = new ApiError("Error interno del servidor", 500);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_GENERICO);
  });

  it("502 sin message del backend (\"Error 502: Bad Gateway\") da el mensaje genérico", () => {
    const error = new ApiError("Error 502: Bad Gateway", 502);
    expect(mensajeErrorRegistro(error, [])).toBe(MSG_GENERICO);
  });
});

describe("mensajeExitoRegistro", () => {
  it("incluye el nombre de la planta entre comillas angulares", () => {
    expect(mensajeExitoRegistro("Pepita")).toBe("Planta «Pepita» registrada correctamente");
  });
});
