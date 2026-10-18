// Pruebas del generador de lecturas — PLAN-45
import { describe, it, expect } from 'vitest';
import { generarLectura, LECTURA_INICIAL, PARAMETROS } from './generarLectura.js';

const tieneMax2Decimales = (n) => Math.round(n * 100) / 100 === n;

describe('generarLectura', () => {
  it('10 000 lecturas encadenadas: siempre dentro del rango y con máximo 2 decimales', () => {
    let prev = LECTURA_INICIAL;
    for (let i = 0; i < 10000; i++) {
      const l = generarLectura(prev);
      for (const [campo, { min, max }] of Object.entries(PARAMETROS)) {
        expect(l[campo]).toBeGreaterThanOrEqual(min);
        expect(l[campo]).toBeLessThanOrEqual(max);
        expect(tieneMax2Decimales(l[campo])).toBe(true);
      }
      prev = l;
    }
  });

  it('cada lectura varía poco respecto a la anterior', () => {
    let prev = LECTURA_INICIAL;
    for (let i = 0; i < 1000; i++) {
      const l = generarLectura(prev);
      for (const [campo, { paso, tipico }] of Object.entries(PARAMETROS)) {
        const maximo = paso + Math.abs(tipico - prev[campo]) * 0.05 + 0.01;
        expect(Math.abs(l[campo] - prev[campo])).toBeLessThanOrEqual(maximo);
      }
      prev = l;
    }
  });

  it('la variación es simétrica: con azar 0 baja y con azar casi 1 sube', () => {
    const baja = generarLectura(LECTURA_INICIAL, () => 0);
    const sube = generarLectura(LECTURA_INICIAL, () => 0.9999);
    expect(baja.moisture).toBeLessThan(LECTURA_INICIAL.moisture);
    expect(sube.moisture).toBeGreaterThan(LECTURA_INICIAL.moisture);
  });

  it('no se queda pegada en un extremo: en 2000 pasos la humedad promedio sigue cerca de lo típico', () => {
    let prev = LECTURA_INICIAL;
    let suma = 0;
    for (let i = 0; i < 2000; i++) {
      prev = generarLectura(prev);
      suma += prev.moisture;
    }
    const promedio = suma / 2000;
    expect(promedio).toBeGreaterThan(30);
    expect(promedio).toBeLessThan(70);
  });

  it('usa la lectura anterior (no vuelve siempre al valor inicial)', () => {
    const prev = { moisture: 20, temperature: 12, light: 15 };
    const l = generarLectura(prev, () => 0.5);
    expect(l.moisture).toBeCloseTo(21.5, 2); // 20 + 0 de variación + (50 - 20) * 0.05
    expect(l.temperature).toBeCloseTo(12.5, 2);
    expect(l.light).toBeCloseTo(17.25, 2);
  });
});
