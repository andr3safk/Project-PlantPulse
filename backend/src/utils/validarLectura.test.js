import { describe, it, expect } from 'vitest';
import { calcularEstadoPlanta } from './estadoPlanta';

describe('validarLectura (pure)', () => {
  const validar = (val: any) => {
    const errors: Record<string, string> = {};
    if (val.moisture === undefined) errors.moisture = 'required';
    else if (typeof val.moisture !== 'number' || !Number.isFinite(val.moisture)) errors.moisture = 'must be finite number';
    else if (val.moisture < 0 || val.moisture > 100) errors.moisture = 'out of range';
    if (val.temperature === undefined) errors.temperature = 'required';
    else if (typeof val.temperature !== 'number' || !Number.isFinite(val.temperature)) errors.temperature = 'must be finite number';
    else if (val.temperature < -10 || val.temperature > 60) errors.temperature = 'out of range';
    if (val.light === undefined) errors.light = 'required';
    else if (typeof val.light !== 'number' || !Number.isFinite(val.light)) errors.light = 'must be finite number';
    else if (val.light < 0 || val.light > 100) errors.light = 'out of range';
    return Object.keys(errors).length ? { errors } : null;
  };

  it('válida con valores limpios', () => {
    expect(validar({ moisture: 50, temperature: 22, light: 60 })).toBeNull();
  });

  it('rechaza string en moisture', () => {
    const res = validar({ moisture: '50', temperature: 22, light: 60 });
    expect(res?.errors?.moisture).toBeDefined();
  });

  it('rechaza NaN', () => {
    expect(validar({ moisture: NaN, temperature: 22, light: 60 })?.errors?.moisture).toBeDefined();
  });

  it('rechaza Infinity', () => {
    expect(validar({ moisture: Infinity, temperature: 22, light: 60 })?.errors?.moisture).toBeDefined();
  });

  it('rechaza fuera de rango por debajo', () => {
    expect(validar({ moisture: -1, temperature: 22, light: 60 })?.errors?.moisture).toBeDefined();
  });

  it('rechaza fuera de rango por encima', () => {
    expect(validar({ moisture: 101, temperature: 22, light: 60 })?.errors?.moisture).toBeDefined();
  });

  it('ignora campo extra', () => {
    expect(validar({ moisture: 50, temperature: 22, light: 60, extra: 1 })).toBeNull();
  });
});
