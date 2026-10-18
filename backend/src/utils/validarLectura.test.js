// Pruebas de la validación de lecturas — PLAN-55 (no usa base de datos)
import { describe, it, expect } from 'vitest';
import { validarLectura } from './validarLectura.js';

const VALIDA = { moisture: 50, temperature: 22, light: 60 };

describe('validarLectura', () => {
  it('lectura válida → null', () => {
    expect(validarLectura(VALIDA)).toBeNull();
  });

  it('acepta los extremos de cada rango', () => {
    expect(validarLectura({ moisture: 0, temperature: -10, light: 0 })).toBeNull();
    expect(validarLectura({ moisture: 100, temperature: 60, light: 100 })).toBeNull();
  });

  it('ignora campos extra', () => {
    expect(validarLectura({ ...VALIDA, extra: 1, plantId: 'x' })).toBeNull();
  });

  it('devuelve el mensaje del contrato', () => {
    expect(validarLectura({})).toMatchObject({ message: 'Datos de lectura invalidos' });
  });

  it.each(['moisture', 'temperature', 'light'])('%s faltante → obligatorio', (campo) => {
    const { [campo]: _omitido, ...resto } = VALIDA;
    expect(validarLectura(resto)).toEqual({
      message: 'Datos de lectura invalidos',
      errors: { [campo]: 'obligatorio' },
    });
  });

  it('null cuenta como faltante', () => {
    expect(validarLectura({ ...VALIDA, light: null }).errors).toEqual({ light: 'obligatorio' });
  });

  it.each([
    ['texto numérico', '50'],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['booleano', true],
    ['objeto', {}],
  ])('rechaza %s', (_nombre, valor) => {
    expect(validarLectura({ ...VALIDA, moisture: valor }).errors).toEqual({ moisture: 'debe ser número' });
  });

  it.each([
    ['moisture', -0.01, 'fuera de rango (0 a 100)'],
    ['moisture', 100.01, 'fuera de rango (0 a 100)'],
    ['temperature', -10.01, 'fuera de rango (-10 a 60)'],
    ['temperature', 60.01, 'fuera de rango (-10 a 60)'],
    ['light', -1, 'fuera de rango (0 a 100)'],
    ['light', 101, 'fuera de rango (0 a 100)'],
  ])('%s = %s → %s', (campo, valor, mensaje) => {
    expect(validarLectura({ ...VALIDA, [campo]: valor }).errors).toEqual({ [campo]: mensaje });
  });

  it('informa todos los campos con error a la vez', () => {
    expect(Object.keys(validarLectura({ moisture: 'x', temperature: 99 }).errors).sort())
      .toEqual(['light', 'moisture', 'temperature']);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['un arreglo', [50, 22, 60]],
    ['un número', 5],
  ])('cuerpo %s → los tres campos obligatorios (sin lanzar error)', (_nombre, cuerpo) => {
    expect(validarLectura(cuerpo).errors).toEqual({
      moisture: 'obligatorio',
      temperature: 'obligatorio',
      light: 'obligatorio',
    });
  });
});
