import { describe, it, expect } from 'vitest';
import { calcularEstadoPlanta, UMBRALES } from './estadoPlanta';

describe('calcularEstadoPlanta', () => {
  it('healthy cuando todo en rango', () => {
    expect(calcularEstadoPlanta({ moisture: 50, temperature: 22, light: 50 })).toBe('healthy');
  });

  it('warning humedad 29.99 (justo debajo de 30)', () => {
    expect(calcularEstadoPlanta({ moisture: 29.99, temperature: 22, light: 50 })).toBe('warning');
  });

  it('healthy humedad 30 exacto', () => {
    expect(calcularEstadoPlanta({ moisture: 30, temperature: 22, light: 50 })).toBe('healthy');
  });

  it('critical humedad 14.99', () => {
    expect(calcularEstadoPlanta({ moisture: 14.99, temperature: 22, light: 50 })).toBe('critical');
  });

  it('warning temperatura 14.99', () => {
    expect(calcularEstadoPlanta({ moisture: 50, temperature: 14.99, light: 50 })).toBe('warning');
  });

  it('critical temperatura 9.99', () => {
    expect(calcularEstadoPlanta({ moisture: 50, temperature: 9.99, light: 50 })).toBe('critical');
  });

  it('warning luz 19.99', () => {
    expect(calcularEstadoPlanta({ moisture: 50, temperature: 22, light: 19.99 })).toBe('warning');
  });

  it('critical luz 9.99', () => {
    expect(calcularEstadoPlanta({ moisture: 50, temperature: 22, light: 9.99 })).toBe('critical');
  });

  it('peor estado: critical + warning = critical', () => {
    expect(calcularEstadoPlanta({ moisture: 10, temperature: 14, light: 50 })).toBe('critical');
  });
});
