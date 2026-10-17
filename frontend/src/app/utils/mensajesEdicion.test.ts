import { describe, it, expect } from 'vitest';
import { ApiError } from '../api/client';
import { MSG_GENERICO, MSG_REVISA_CAMPOS, MSG_SIN_CONEXION, MSG_TIMEOUT } from './mensajesRegistro';
import {
  MSG_ERROR_CARGA_LISTA,
  MSG_PLANTA_NO_ENCONTRADA,
  mensajeErrorCarga,
  mensajeErrorEdicion,
  mensajeExitoEdicion,
} from './mensajesEdicion';

describe('mensajeErrorCarga', () => {
  it.each([
    [new ApiError('x', 0), MSG_SIN_CONEXION],
    [new ApiError('x', 408), MSG_TIMEOUT],
    [new ApiError('x', 404), MSG_PLANTA_NO_ENCONTRADA],
    [new ApiError('Error interno del servidor', 500), MSG_ERROR_CARGA_LISTA],
    [new Error('fallo'), MSG_ERROR_CARGA_LISTA],
  ])('%o → mensaje traducido', (error, esperado) => {
    expect(mensajeErrorCarga(error, MSG_ERROR_CARGA_LISTA)).toBe(esperado);
  });
});

describe('mensajeErrorEdicion', () => {
  it('404 → planta no encontrada', () => {
    expect(mensajeErrorEdicion(new ApiError('Planta no encontrada', 404), [])).toBe(MSG_PLANTA_NO_ENCONTRADA);
  });

  it('el resto sigue las reglas del registro', () => {
    expect(mensajeErrorEdicion(new ApiError('x', 0), [])).toBe(MSG_SIN_CONEXION);
    expect(mensajeErrorEdicion(new ApiError('x', 400, { name: 'm' }), [])).toBe(MSG_REVISA_CAMPOS);
    expect(mensajeErrorEdicion(new ApiError('x', 500), [])).toBe(MSG_GENERICO);
  });
});

it('mensajeExitoEdicion usa el nombre de la planta', () => {
  expect(mensajeExitoEdicion('Pepita')).toBe('Planta «Pepita» actualizada correctamente');
});
