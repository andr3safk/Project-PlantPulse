import { describe, it, expect } from "vitest";
import {
  validarPlanta,
  normalizarTexto,
  NOMBRE_MIN,
  NOMBRE_MAX,
  ESPECIE_MIN,
  ESPECIE_MAX,
  UBICACION_MAX,
  type DatosPlanta,
} from "./validarPlanta";

// Datos válidos de partida: cada prueba cambia solo el campo que está probando.
const DATOS_VALIDOS: DatosPlanta = { name: "Monstruo", species: "Monstera Deliciosa" };

describe("normalizarTexto", () => {
  it("quita los espacios al inicio y al final", () => {
    expect(normalizarTexto("   Monstruo   ")).toBe("Monstruo");
  });

  it("unifica los espacios repetidos en uno solo", () => {
    expect(normalizarTexto("Mi    planta   favorita")).toBe("Mi planta favorita");
  });

  it("convierte una tilde combinada (NFD) a un solo carácter (NFC)", () => {
    const nfd = "Jazmín";
    expect(nfd).toHaveLength(7);

    const resultado = normalizarTexto(nfd);
    expect(resultado).toBe("Jazmín");
    expect(resultado).toHaveLength(6);
  });
});

describe("validarPlanta", () => {
  it("devuelve un objeto vacío si los datos son válidos", () => {
    expect(validarPlanta(DATOS_VALIDOS)).toEqual({});
  });

  it("valida los dos campos a la vez", () => {
    const errores = validarPlanta({ name: "", species: "Rosa@" });
    expect(Object.keys(errores).sort()).toEqual(["name", "species"]);
    expect(errores.name).toMatch(/obligatorio/);
    expect(errores.species).toMatch(/solo puede contener/);
  });

  // Las mismas reglas aplican a nombre y especie; solo cambian los límites.
  describe.each([
    { campo: "name" as const, etiqueta: "nombre", min: NOMBRE_MIN, max: NOMBRE_MAX },
    { campo: "species" as const, etiqueta: "especie", min: ESPECIE_MIN, max: ESPECIE_MAX },
  ])("campo $etiqueta", ({ campo, min, max }) => {
    const validar = (valor: string) => validarPlanta({ ...DATOS_VALIDOS, [campo]: valor });

    // Comprueba que solo hay error en el campo probado y que el mensaje es el esperado.
    const esperarError = (valor: string, mensaje: RegExp) => {
      const errores = validar(valor);
      expect(Object.keys(errores)).toEqual([campo]);
      expect(errores[campo]).toMatch(mensaje);
    };

    it("rechaza el texto vacío", () => {
      esperarError("", /obligatorio/);
    });

    it("rechaza un texto con solo espacios", () => {
      esperarError("     ", /obligatorio/);
    });

    it("rechaza un texto menor al mínimo", () => {
      esperarError("a".repeat(min - 1), new RegExp(`al menos ${min}`));
    });

    it("acepta un texto con exactamente el mínimo", () => {
      expect(validar("a".repeat(min))).toEqual({});
    });

    it("acepta un texto con exactamente el máximo", () => {
      expect(validar("a".repeat(max))).toEqual({});
    });

    it("rechaza un texto con el máximo + 1", () => {
      esperarError("a".repeat(max + 1), new RegExp(`superar los ${max}`));
    });

    it("rechaza caracteres no permitidos", () => {
      esperarError("Rosa@", /solo puede contener/);
    });

    it("rechaza un tabulador dentro del texto", () => {
      esperarError("Rosa\tRoja", /solo puede contener/);
    });

    it("acepta tildes, diéresis y ñ", () => {
      expect(validar("Ñame de jardín")).toEqual({});
      expect(validar("Güira")).toEqual({});
    });

    it("acepta guion, punto y paréntesis", () => {
      expect(validar("Ficus (lyrata) var. alta-1")).toEqual({});
    });

    it("acepta texto con tildes combinadas (NFD)", () => {
      expect(validar("Jazmín")).toEqual({});
    });

    it("no cuenta los espacios repetidos para la longitud", () => {
      // Sin normalizar mide max + 10; normalizado mide exactamente max.
      const valor = "a" + " ".repeat(11) + "a".repeat(max - 2);
      expect(valor.length).toBe(max + 10);
      expect(validar(valor)).toEqual({});
    });
  });

  // Ubicación: opcional, máximo 50 y mismos caracteres que nombre y especie.
  describe("location", () => {
    const MENSAJE_MAXIMO = "La ubicación no puede superar los 50 caracteres.";
    const MENSAJE_CARACTERES =
      "La ubicación solo puede contener letras, números, espacios, guiones, puntos y paréntesis.";
    const validar = (location: string | null) => validarPlanta({ ...DATOS_VALIDOS, location });

    it("el límite es 50, igual que en el backend", () => {
      expect(UBICACION_MAX).toBe(50);
    });

    it("no da error si no se envía la ubicación", () => {
      expect(validarPlanta({ name: "Monstruo", species: "Monstera Deliciosa" })).toEqual({});
    });

    it("no da error con null", () => {
      expect(validar(null)).toEqual({});
    });

    it("no da error con texto vacío ni con solo espacios", () => {
      expect(validar("")).toEqual({});
      expect(validar("     ")).toEqual({});
    });

    it("acepta exactamente 50 caracteres", () => {
      expect(validar("a".repeat(UBICACION_MAX))).toEqual({});
    });

    it("rechaza 51 caracteres con el mensaje de máximo", () => {
      expect(validar("a".repeat(UBICACION_MAX + 1))).toEqual({ location: MENSAJE_MAXIMO });
    });

    it("rechaza caracteres no permitidos con el mensaje de caracteres", () => {
      expect(validar("Sala<script>")).toEqual({ location: MENSAJE_CARACTERES });
      expect(validar("Sala@casa").location).toBe(MENSAJE_CARACTERES);
    });

    it.each(["sala", "dormitorio", "cocina", "bano", "oficina", "exterior"])(
      "acepta el código del formulario %s",
      (codigo) => {
        expect(validar(codigo)).toEqual({});
      }
    );

    it("no cuenta los espacios repetidos para la longitud", () => {
      // Sin normalizar mide 60; normalizado mide exactamente 50.
      const valor = "a" + " ".repeat(11) + "a".repeat(UBICACION_MAX - 2);
      expect(valor.length).toBe(UBICACION_MAX + 10);
      expect(validar(valor)).toEqual({});
    });

    it("se reporta junto con los errores de nombre y especie", () => {
      const errores = validarPlanta({ name: "", species: "", location: "Sala<script>" });
      expect(errores).toEqual({
        name: "El nombre es un campo obligatorio.",
        species: "La especie es un campo obligatorio.",
        location: MENSAJE_CARACTERES,
      });
    });
  });
});
