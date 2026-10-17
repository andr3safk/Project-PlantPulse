import { describe, it, expect } from 'vitest';
import { generarLectura } from './generarLectura.js';

describe('generarLectura', () => {
  it('1000 lecturas dentro de rango y con max 2 decimales', () => {
    let prev = { moisture: 50, temperature: 22, light: 60 };
    for (let i = 0; i < 1000; i++) {
      const l = generarLectura(prev);
      expect(l.moisture).toBeGreaterThanOrEqual(0);
      expect(l.moisture).toBeLessThanOrEqual(100);
      expect(l.temperature).toBeGreaterThanOrEqual(-10);
      expect(l.temperature).toBeLessThanOrEqual(60);
      expect(l.light).toBeGreaterThanOrEqual(0);
      expect(l.light).toBeLessThanOrEqual(100);
      expect(Number(l.moisture.toFixed(2))).toBe(l.moisture);
      prev = l;
    }
  });
});
