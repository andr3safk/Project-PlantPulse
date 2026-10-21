// Pruebas del refresco automático del Dashboard — PLAN-48
// Criterios de aceptación (PLAN-11): (1) el sistema actualiza automáticamente los valores mostrados;
// (2) si deja de recibir datos por más de 5 minutos, indica que la información no está en tiempo real.
// - El servicio ./api/plants está simulado; PlantProvider y Dashboard son los reales.
// - Solo se simulan setInterval/clearInterval: Testing Library y userEvent usan el reloj real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { Dashboard } from './Dashboard';
import { PlantProvider } from './contexts/PlantContext';
import { Toaster } from './components/ui/sonner';
import { ApiError } from './api/client';
import { listPlants, getPlant, updatePlant, deletePlant } from './api/plants';
import type { PlantListItemResponse } from './api/types';
import {
  INTERVALO_REFRESCO_MS,
  MSG_ERROR_REFRESCO,
  TEXTO_CONECTADO,
  TEXTO_DESCONECTADO,
  TEXTO_SIN_TIEMPO_REAL,
} from './utils/formatoMonitoreo';

vi.mock('./api/plants', () => ({
  listPlants: vi.fn(),
  getPlant: vi.fn(),
  updatePlant: vi.fn(),
  createPlant: vi.fn(),
  deletePlant: vi.fn(),
}));
const listPlantsMock = vi.mocked(listPlants);
const getPlantMock = vi.mocked(getPlant);
const updatePlantMock = vi.mocked(updatePlant);
const deletePlantMock = vi.mocked(deletePlant);

// --- Datos de prueba --------------------------------------------------------

const DISP = 'dddddddd-0000-0000-0000-000000000001';
const ID_MONSTRUO = 'aaaaaaaa-0000-0000-0000-000000000001';
const ID_POTOS = 'aaaaaaaa-0000-0000-0000-000000000002';

const MONSTRUO: PlantListItemResponse = {
  id: ID_MONSTRUO,
  name: 'Monstruo',
  species: 'Monstera Deliciosa',
  imageUrl: null,
  status: 'healthy',
  location: 'sala',
  lastWateredAt: null,
  deviceId: DISP,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  lastReading: { moisture: 45, temperature: 22, light: 60, recordedAt: '2026-10-21T22:30:00.000Z', isStale: false },
  device: { id: DISP, lastSeenAt: '2026-10-21T22:30:00.000Z', connected: true },
};
const POTOS: PlantListItemResponse = {
  ...MONSTRUO,
  id: ID_POTOS,
  name: 'Potos',
  deviceId: null,
  lastReading: null,
  device: null,
};

// Monstruo con una lectura nueva (lo que llega en el siguiente refresco)
const conLectura = (moisture: number, cambios: Partial<PlantListItemResponse> = {}): PlantListItemResponse => ({
  ...MONSTRUO,
  lastReading: { ...MONSTRUO.lastReading!, moisture, recordedAt: '2026-10-21T22:30:10.000Z' },
  ...cambios,
});

// --- Ayudas -----------------------------------------------------------------

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <PlantProvider>
        <Dashboard />
        <Toaster />
      </PlantProvider>
    </MemoryRouter>
  );

function diferida<T>() {
  let resolve!: (valor: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const tarjeta = (nombre: string) => within(screen.getByRole('article', { name: nombre }));
const esperarTarjeta = (nombre: string) => screen.findByRole('article', { name: nombre });

// Avanza el reloj simulado un intervalo: dispara un refresco
const avanzarIntervalo = () => act(async () => {
  vi.advanceTimersByTime(INTERVALO_REFRESCO_MS);
});

function cambiarVisibilidad(estado: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  listPlantsMock.mockReset();
  getPlantMock.mockReset();
  updatePlantMock.mockReset();
  deletePlantMock.mockReset();
  listPlantsMock.mockResolvedValue([MONSTRUO, POTOS]);
});

afterEach(() => {
  vi.useRealTimers();
  delete (document as unknown as Record<string, unknown>).visibilityState;
  toast.dismiss();
});

// --- Criterio 1: actualización automática ------------------------------------

describe('Dashboard: refresco automático (PLAN-48)', () => {
  it('el intervalo es de 10 segundos (igual al simulador)', () => {
    expect(INTERVALO_REFRESCO_MS).toBe(10_000);
  });

  it('cada 10 s vuelve a pedir la lista y muestra los valores nuevos sin "Cargando..."', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');
    expect(tarjeta('Monstruo').getByText('45%')).toBeInTheDocument();
    expect(listPlantsMock).toHaveBeenCalledTimes(1);

    listPlantsMock.mockResolvedValue([conLectura(50), POTOS]);
    await avanzarIntervalo();

    expect(await tarjeta('Monstruo').findByText('50%')).toBeInTheDocument();
    expect(listPlantsMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Cargando tus plantas...')).not.toBeInTheDocument();
  });

  it('antes de los 10 s no vuelve a pedir la lista', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');

    await act(async () => {
      vi.advanceTimersByTime(INTERVALO_REFRESCO_MS - 1);
    });
    expect(listPlantsMock).toHaveBeenCalledTimes(1);
  });

  it('el estado del dispositivo cambia de conectado a desconectado sin recargar', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');
    expect(tarjeta('Monstruo').getByText(TEXTO_CONECTADO)).toBeInTheDocument();

    listPlantsMock.mockResolvedValue([conLectura(45, { device: { ...MONSTRUO.device!, connected: false } }), POTOS]);
    await avanzarIntervalo();

    expect(await tarjeta('Monstruo').findByText(TEXTO_DESCONECTADO)).toBeInTheDocument();
    expect(tarjeta('Monstruo').queryByText(TEXTO_CONECTADO)).not.toBeInTheDocument();
  });

  it('el modal de detalles abierto muestra los valores del refresco', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarTarjeta('Monstruo');
    await user.click(tarjeta('Monstruo').getByRole('button', { name: 'Ver Detalles' }));
    const titulo = await screen.findByRole('heading', { level: 3, name: 'Métricas Actuales' });
    expect(within(titulo.parentElement as HTMLElement).getByText('45%')).toBeInTheDocument();

    listPlantsMock.mockResolvedValue([conLectura(52), POTOS]);
    await avanzarIntervalo();

    const modal = within(screen.getByRole('heading', { level: 3, name: 'Métricas Actuales' }).parentElement as HTMLElement);
    expect(await modal.findByText('52%')).toBeInTheDocument();
  });

  it('si la planta del modal de detalles ya no viene en la lista, el modal se cierra', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarTarjeta('Monstruo');
    await user.click(tarjeta('Monstruo').getByRole('button', { name: 'Ver Detalles' }));
    await screen.findByRole('heading', { level: 3, name: 'Métricas Actuales' });

    listPlantsMock.mockResolvedValue([POTOS]);
    await avanzarIntervalo();

    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 3, name: 'Métricas Actuales' })).not.toBeInTheDocument()
    );
  });

  it('al desmontar el Dashboard deja de refrescar', async () => {
    const { unmount } = renderDashboard();
    await esperarTarjeta('Monstruo');

    unmount();
    await avanzarIntervalo();
    await avanzarIntervalo();
    expect(listPlantsMock).toHaveBeenCalledTimes(1);
  });
});

// --- Criterio 2: aviso de "sin datos en tiempo real" --------------------------

describe('Dashboard: aviso de más de 5 minutos sin datos (PLAN-48, criterio de PLAN-11)', () => {
  it('cuando el refresco trae la lectura desactualizada aparece "Sin datos en tiempo real"', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');
    expect(tarjeta('Monstruo').queryByText(TEXTO_SIN_TIEMPO_REAL)).not.toBeInTheDocument();

    listPlantsMock.mockResolvedValue([
      { ...MONSTRUO, lastReading: { ...MONSTRUO.lastReading!, isStale: true } },
      POTOS,
    ]);
    await avanzarIntervalo();

    expect(await tarjeta('Monstruo').findByText(TEXTO_SIN_TIEMPO_REAL)).toBeInTheDocument();
  });

  it('cuando vuelven a llegar datos, el aviso desaparece', async () => {
    listPlantsMock.mockResolvedValue([{ ...MONSTRUO, lastReading: { ...MONSTRUO.lastReading!, isStale: true } }, POTOS]);
    renderDashboard();
    await esperarTarjeta('Monstruo');
    expect(tarjeta('Monstruo').getByText(TEXTO_SIN_TIEMPO_REAL)).toBeInTheDocument();

    listPlantsMock.mockResolvedValue([conLectura(47), POTOS]);
    await avanzarIntervalo();

    await waitFor(() => expect(tarjeta('Monstruo').queryByText(TEXTO_SIN_TIEMPO_REAL)).not.toBeInTheDocument());
    expect(tarjeta('Monstruo').getByText('47%')).toBeInTheDocument();
  });
});

// --- Errores del refresco -----------------------------------------------------

describe('Dashboard: errores del refresco automático (PLAN-48)', () => {
  it('si falla, conserva los datos y muestra un aviso; el siguiente refresco correcto lo quita', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');

    listPlantsMock.mockRejectedValueOnce(new ApiError('Sin conexión', 0));
    await avanzarIntervalo();

    expect(await screen.findByText(MSG_ERROR_REFRESCO)).toBeInTheDocument();
    expect(tarjeta('Monstruo').getByText('45%')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Potos' })).toBeInTheDocument();
    // No es el error de la carga inicial (no hay botón Reintentar)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();

    listPlantsMock.mockResolvedValue([conLectura(48), POTOS]);
    await avanzarIntervalo();

    await waitFor(() => expect(screen.queryByText(MSG_ERROR_REFRESCO)).not.toBeInTheDocument());
    expect(tarjeta('Monstruo').getByText('48%')).toBeInTheDocument();
  });

  it('un 401 en el refresco no muestra aviso (el cliente ya cierra la sesión)', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');

    listPlantsMock.mockRejectedValueOnce(new ApiError('No autorizado', 401));
    await avanzarIntervalo();

    await waitFor(() => expect(listPlantsMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(MSG_ERROR_REFRESCO)).not.toBeInTheDocument();
  });

  it('si la carga inicial falló, un refresco correcto muestra la lista sin pulsar Reintentar', async () => {
    listPlantsMock.mockRejectedValueOnce(new ApiError('Sin conexión', 0));
    renderDashboard();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();

    await avanzarIntervalo();

    expect(await esperarTarjeta('Monstruo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('no lanza un segundo refresco mientras el anterior sigue esperando a la API', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');

    const lenta = diferida<PlantListItemResponse[]>();
    listPlantsMock.mockReturnValueOnce(lenta.promise);
    await avanzarIntervalo();
    await avanzarIntervalo();
    await avanzarIntervalo();
    expect(listPlantsMock).toHaveBeenCalledTimes(2);

    await act(async () => lenta.resolve([conLectura(49), POTOS]));
    expect(await tarjeta('Monstruo').findByText('49%')).toBeInTheDocument();
  });
});

// --- Pestaña oculta -----------------------------------------------------------

describe('Dashboard: pestaña oculta (PLAN-48)', () => {
  it('con la pestaña oculta no refresca; al volver refresca de inmediato', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');

    cambiarVisibilidad('hidden');
    await avanzarIntervalo();
    await avanzarIntervalo();
    expect(listPlantsMock).toHaveBeenCalledTimes(1);

    listPlantsMock.mockResolvedValue([conLectura(51), POTOS]);
    await act(async () => cambiarVisibilidad('visible'));

    expect(await tarjeta('Monstruo').findByText('51%')).toBeInTheDocument();
    expect(listPlantsMock).toHaveBeenCalledTimes(2);
  });
});

// --- Respuestas viejas no deshacen lo que hizo el usuario -----------------------

describe('Dashboard: un refresco que salió antes de un cambio del usuario se descarta (PLAN-48)', () => {
  it('eliminar mientras un refresco está en curso: la planta no reaparece', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarTarjeta('Potos');

    // El refresco sale con la lista de ANTES de eliminar y tarda en responder
    const lenta = diferida<PlantListItemResponse[]>();
    listPlantsMock.mockReturnValueOnce(lenta.promise);
    await avanzarIntervalo();

    deletePlantMock.mockResolvedValueOnce(undefined);
    await user.click(tarjeta('Potos').getByRole('button', { name: 'Eliminar' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Estás seguro?' });
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Potos' })).not.toBeInTheDocument());

    // Llega la respuesta vieja (todavía con Potos): se descarta
    await act(async () => lenta.resolve([MONSTRUO, POTOS]));
    expect(screen.queryByRole('article', { name: 'Potos' })).not.toBeInTheDocument();

    // El siguiente refresco ya trae la lista real
    listPlantsMock.mockResolvedValue([conLectura(53)]);
    await avanzarIntervalo();
    expect(await tarjeta('Monstruo').findByText('53%')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Potos' })).not.toBeInTheDocument();
  });

  it('editar mientras un refresco está en curso: el nombre nuevo no se pierde', async () => {
    const user = userEvent.setup();
    getPlantMock.mockResolvedValue({ ...MONSTRUO });
    // Respuesta real del PUT: objeto planta sin lastReading ni device
    const { lastReading: _l, device: _d, ...soloPlanta } = MONSTRUO;
    updatePlantMock.mockResolvedValue({ ...soloPlanta, name: 'Monstruo nuevo' });
    renderDashboard();
    await esperarTarjeta('Monstruo');

    const lenta = diferida<PlantListItemResponse[]>();
    listPlantsMock.mockReturnValueOnce(lenta.promise);
    await avanzarIntervalo();

    await user.click(tarjeta('Monstruo').getByRole('button', { name: 'Editar' }));
    const nombre = await screen.findByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Monstruo nuevo');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await esperarTarjeta('Monstruo nuevo');

    // Respuesta vieja con el nombre anterior: se descarta
    await act(async () => lenta.resolve([MONSTRUO, POTOS]));
    expect(screen.getByRole('article', { name: 'Monstruo nuevo' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Monstruo' })).not.toBeInTheDocument();
  });
});
