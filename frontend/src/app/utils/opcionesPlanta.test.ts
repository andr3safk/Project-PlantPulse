import { describe, it, expect } from 'vitest';
import { UBICACIONES, SIN_UBICACION, etiquetaUbicacion, esUbicacionConocida } from './opcionesPlanta';

describe('opcionesPlanta', () => {
  it('los códigos de ubicación son los mismos que guarda el registro', () => {
    expect(UBICACIONES.map((u) => u.value)).toEqual(['sala', 'dormitorio', 'cocina', 'bano', 'oficina', 'exterior']);
  });

  it('etiquetaUbicacion convierte un código en su etiqueta', () => {
    expect(etiquetaUbicacion('sala')).toBe('Sala de Estar');
    expect(etiquetaUbicacion('exterior')).toBe('Balcón / Exterior');
  });

  it('etiquetaUbicacion muestra tal cual un texto que no es un código', () => {
    expect(etiquetaUbicacion('Balcon')).toBe('Balcon');
  });

  it.each([null, undefined, ''])('etiquetaUbicacion(%j) devuelve "No asignada"', (valor) => {
    expect(etiquetaUbicacion(valor)).toBe(SIN_UBICACION);
  });

  it('esUbicacionConocida distingue códigos de textos libres (mayúsculas incluidas)', () => {
    expect(esUbicacionConocida('cocina')).toBe(true);
    expect(esUbicacionConocida('Sala')).toBe(false);
    expect(esUbicacionConocida('')).toBe(false);
  });
});
