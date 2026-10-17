// Pruebas del servicio de plantas (listPlants, getPlant, updatePlant) — PLAN-9
// Se prueba el servicio REAL con apiFetch real, simulando solo fetch (no se necesita el backend).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listPlants, getPlant, updatePlant } from './plants';
import { ApiError } from './client';
import type { PlantResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Respuesta simulada de fetch
const respuesta = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(body === undefined ? {} : { 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

const PLANTA: PlantResponse = {
  id: ID,
  name: 'Monstruo',
  species: 'Monstera Deliciosa',
  imageUrl: 'https://ejemplo.com/monstruo.jpg',
  status: 'healthy',
  location: 'sala',
  lastWateredAt: null,
  deviceId: null,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
};

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('plantpulse_token', 'tok');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listPlants', () => {
  it('hace GET a /api/plants con el token, sin body ni Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, [PLANTA]));

    await expect(listPlants()).resolves.toEqual([PLANTA]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/plants`);
    expect(init.method).toBeUndefined(); // fetch usa GET por defecto
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('con un 500 lanza ApiError con status 500', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(500, { message: 'Error interno del servidor' }));

    const error = await listPlants().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
  });
});

describe('getPlant', () => {
  it('hace GET a /api/plants/:id con el token y devuelve la planta', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, PLANTA));

    await expect(getPlant(ID)).resolves.toEqual(PLANTA);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/plants/${ID}`);
    expect(init.method).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('codifica el id: un id con "/" o "?" no cambia la ruta', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(404, { message: 'Planta no encontrada' }));

    await getPlant('../auth/login?x=1').catch(() => undefined);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/plants/..%2Fauth%2Flogin%3Fx%3D1`);
  });

  it('con un 404 lanza ApiError con status 404', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(404, { message: 'Planta no encontrada' }));

    const error = await getPlant(ID).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
  });
});

describe('updatePlant', () => {
  it('hace PUT a /api/plants/:id con el token, Content-Type JSON y el body serializado', async () => {
    const datos = { name: 'Mi Monstera', species: 'Monstera Deliciosa', location: 'oficina', imageUrl: PLANTA.imageUrl! };
    fetchMock.mockResolvedValueOnce(respuesta(200, { ...PLANTA, ...datos }));

    await expect(updatePlant(ID, datos)).resolves.toEqual({ ...PLANTA, ...datos });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/plants/${ID}`);
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(datos);
  });

  it('con un 400 lanza ApiError con los errores por campo', async () => {
    const errors = { name: 'El nombre es un campo obligatorio.' };
    fetchMock.mockResolvedValueOnce(respuesta(400, { message: 'Datos de planta inválidos', errors }));

    const error = await updatePlant(ID, { name: '', species: 'Pothos' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.errors).toEqual(errors);
  });
});
