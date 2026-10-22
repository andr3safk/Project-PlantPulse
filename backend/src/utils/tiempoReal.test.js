// Pruebas de las reglas de tiempo real — PLAN-39
// Funciones puras: no requieren SQL Server.
import { describe, it, expect } from 'vitest';
import {
  SEGUNDOS_DISPOSITIVO_CONECTADO,
  SEGUNDOS_LECTURA_EN_TIEMPO_REAL,
  mapLastReading,
  mapDevice,
} from './tiempoReal.js';

const FECHA = new Date('2026-10-21T22:30:00.000Z');

describe('constantes (decisión de PO 21/10/2026)', () => {
  it('dispositivo conectado: menos de 60 s desde el último latido', () => {
    expect(SEGUNDOS_DISPOSITIVO_CONECTADO).toBe(60);
  });

  it('lectura en tiempo real: hasta 5 minutos (300 s)', () => {
    expect(SEGUNDOS_LECTURA_EN_TIEMPO_REAL).toBe(300);
  });
});

describe('mapLastReading', () => {
  const fila = {
    LecturaMoisture: 45.25,
    LecturaTemperature: 22.5,
    LecturaLight: 60,
    LecturaRecordedAt: FECHA,
    LecturaDesactualizada: 0,
  };

  it('lectura reciente → objeto en camelCase con isStale false', () => {
    expect(mapLastReading(fila)).toEqual({
      moisture: 45.25,
      temperature: 22.5,
      light: 60,
      recordedAt: FECHA,
      isStale: false,
    });
  });

  it('LecturaDesactualizada = 1 → isStale true', () => {
    expect(mapLastReading({ ...fila, LecturaDesactualizada: 1 }).isStale).toBe(true);
  });

  it('sin lecturas (columnas en NULL) → null', () => {
    expect(mapLastReading({
      LecturaMoisture: null,
      LecturaTemperature: null,
      LecturaLight: null,
      LecturaRecordedAt: null,
      LecturaDesactualizada: 0,
    })).toBeNull();
  });

  it('una variable en NULL se conserva como null (las columnas admiten NULL)', () => {
    expect(mapLastReading({ ...fila, LecturaLight: null }).light).toBeNull();
  });
});

describe('mapDevice', () => {
  const fila = {
    DispositivoId: '22222222-AAAA-2222-2222-222222222222',
    DispositivoLastSeenAt: FECHA,
    DispositivoConectado: 1,
  };

  it('dispositivo conectado → id en minúscula y connected true', () => {
    expect(mapDevice(fila)).toEqual({
      id: '22222222-aaaa-2222-2222-222222222222',
      lastSeenAt: FECHA,
      connected: true,
    });
  });

  it('DispositivoConectado = 0 → connected false', () => {
    expect(mapDevice({ ...fila, DispositivoConectado: 0 }).connected).toBe(false);
  });

  it('dispositivo que nunca envió latido → lastSeenAt null y connected false', () => {
    expect(mapDevice({ ...fila, DispositivoLastSeenAt: null, DispositivoConectado: 0 })).toEqual({
      id: '22222222-aaaa-2222-2222-222222222222',
      lastSeenAt: null,
      connected: false,
    });
  });

  it('planta sin dispositivo (columnas en NULL) → null', () => {
    expect(mapDevice({ DispositivoId: null, DispositivoLastSeenAt: null, DispositivoConectado: 0 })).toBeNull();
  });
});
