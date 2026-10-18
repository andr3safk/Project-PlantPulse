// Pruebas del cálculo del estado de la planta — PLAN-55 (no usa base de datos)
import { describe, it, expect } from 'vitest';
import { calcularEstadoPlanta, UMBRALES } from './estadoPlanta.js';

// Lectura sana de referencia: se cambia una variable por prueba
const SANA = { moisture: 50, temperature: 22, light: 60 };
const estado = (cambio) => calcularEstadoPlanta({ ...SANA, ...cambio });

describe('calcularEstadoPlanta', () => {
  it('healthy cuando todo está en rango', () => {
    expect(calcularEstadoPlanta(SANA)).toBe('healthy');
  });

  it('expone los umbrales acordados por el PO', () => {
    expect(UMBRALES).toEqual({
      moisture: { criticalLow: 15, warningLow: 30, warningHigh: 80, criticalHigh: 90 },
      temperature: { criticalLow: 10, warningLow: 15, warningHigh: 30, criticalHigh: 35 },
      light: { criticalLow: 10, warningLow: 20 },
    });
  });

  // [valor, estado esperado]; los límites son exclusivos
  describe.each([
    ['moisture', [
      [0, 'critical'], [14.99, 'critical'], [15, 'warning'], [29.99, 'warning'], [30, 'healthy'],
      [80, 'healthy'], [80.01, 'warning'], [90, 'warning'], [90.01, 'critical'], [100, 'critical'],
    ]],
    ['temperature', [
      [-10, 'critical'], [9.99, 'critical'], [10, 'warning'], [14.99, 'warning'], [15, 'healthy'],
      [30, 'healthy'], [30.01, 'warning'], [35, 'warning'], [35.01, 'critical'], [60, 'critical'],
    ]],
    ['light', [
      [0, 'critical'], [9.99, 'critical'], [10, 'warning'], [19.99, 'warning'], [20, 'healthy'],
      [100, 'healthy'],
    ]],
  ])('%s', (variable, casos) => {
    it.each(casos)('%s → %s', (valor, esperado) => {
      expect(estado({ [variable]: valor })).toBe(esperado);
    });
  });

  describe('regla del peor estado', () => {
    it('critical + warning → critical', () => {
      expect(estado({ moisture: 10, temperature: 14 })).toBe('critical');
    });

    it('warning + healthy → warning', () => {
      expect(estado({ light: 15 })).toBe('warning');
    });

    it('warning en las tres variables → warning', () => {
      expect(calcularEstadoPlanta({ moisture: 25, temperature: 32, light: 15 })).toBe('warning');
    });

    it('el orden de las variables no importa', () => {
      expect(estado({ light: 5, moisture: 85 })).toBe('critical');
      expect(estado({ moisture: 5, light: 15 })).toBe('critical');
    });
  });
});
