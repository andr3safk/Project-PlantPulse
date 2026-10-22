// Pruebas del Dashboard con lecturas reales y estado del dispositivo — PLAN-39
// - El servicio ./api/plants está simulado: no se necesita el backend.
// - PlantProvider y Dashboard son los reales.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { Dashboard } from './Dashboard';
import { PlantProvider } from './contexts/PlantContext';
import { Toaster } from './components/ui/sonner';
import { listPlants, getPlant, updatePlant, deletePlant } from './api/plants';
import type { PlantListItemResponse, PlantResponse } from './api/types';
import {
  SIN_DATO,
  TEXTO_CONECTADO,
  TEXTO_DESCONECTADO,
  TEXTO_ESPERANDO_LECTURA,
  TEXTO_SIN_SENSOR,
  TEXTO_SIN_TIEMPO_REAL,
  textoUltimaLectura,
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

const DISP_1 = 'dddddddd-0000-0000-0000-000000000001';
const DISP_2 = 'dddddddd-0000-0000-0000-000000000002';
const FECHA_RECIENTE = '2026-10-21T22:30:00.000Z';
const FECHA_ANTIGUA = '2026-10-21T22:00:00.000Z';

// Objeto planta sin lectura ni dispositivo (lo que devuelven GET /:id, POST y PUT)
const base = (cambios: Partial<PlantResponse>): PlantResponse => ({
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  name: 'Monstruo',
  species: 'Monstera Deliciosa',
  imageUrl: null,
  status: 'healthy',
  location: 'sala',
  lastWateredAt: null,
  deviceId: null,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  ...cambios,
});

// En vivo: dispositivo conectado y lectura reciente
const EN_VIVO: PlantListItemResponse = {
  ...base({ deviceId: DISP_1 }),
  lastReading: { moisture: 45.25, temperature: 22.5, light: 60, recordedAt: FECHA_RECIENTE, isStale: false },
  device: { id: DISP_1, lastSeenAt: FECHA_RECIENTE, connected: true },
};
// Sin datos en tiempo real: dispositivo desconectado y lectura de hace más de 5 minutos
const DESACTUALIZADA: PlantListItemResponse = {
  ...base({ id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Potos', status: 'warning', deviceId: DISP_2 }),
  lastReading: { moisture: 25, temperature: 18, light: 40, recordedAt: FECHA_ANTIGUA, isStale: true },
  device: { id: DISP_2, lastSeenAt: FECHA_ANTIGUA, connected: false },
};
// Sin dispositivo ni lecturas (como las plantas creadas desde el formulario)
const SIN_SENSOR: PlantListItemResponse = {
  ...base({ id: 'aaaaaaaa-0000-0000-0000-000000000003', name: 'Suculenta', status: 'critical' }),
  lastReading: null,
  device: null,
};
// Con dispositivo (comparte DISP_1) pero sin lecturas todavía
const ESPERANDO: PlantListItemResponse = {
  ...base({ id: 'aaaaaaaa-0000-0000-0000-000000000004', name: 'Helecho', deviceId: DISP_1 }),
  lastReading: null,
  device: { id: DISP_1, lastSeenAt: FECHA_RECIENTE, connected: true },
};

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

// toLocaleString usa espacios especiales (p. ej. antes de "p. m."); Testing Library los
// normaliza a espacios comunes en la página, así que el texto esperado se normaliza igual.
const ultimaLectura = (fechaIso: string) => textoUltimaLectura(fechaIso).replace(/\s+/g, ' ');

const tarjeta = (nombre: string) => within(screen.getByRole('article', { name: nombre }));
const esperarTarjeta = (nombre: string) => screen.findByRole('article', { name: nombre });

beforeEach(() => {
  listPlantsMock.mockReset();
  getPlantMock.mockReset();
  updatePlantMock.mockReset();
  deletePlantMock.mockReset();
  listPlantsMock.mockResolvedValue([EN_VIVO, DESACTUALIZADA, SIN_SENSOR]);
});

afterEach(() => {
  toast.dismiss();
});

// --- Tarjetas ---------------------------------------------------------------

describe('Dashboard: lecturas reales en las tarjetas (PLAN-39)', () => {
  it('planta en vivo: muestra los valores de la API, dispositivo conectado y la fecha de la lectura', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');
    const t = tarjeta('Monstruo');

    expect(t.getByText('45,3%')).toBeInTheDocument();
    expect(t.getByText('60%')).toBeInTheDocument();
    expect(t.getByText('22,5°C')).toBeInTheDocument();
    expect(t.getByText(TEXTO_CONECTADO)).toBeInTheDocument();
    expect(t.getByText(ultimaLectura(FECHA_RECIENTE))).toBeInTheDocument();
    expect(t.queryByText(TEXTO_SIN_TIEMPO_REAL)).not.toBeInTheDocument();
  });

  it('lectura de más de 5 minutos: aviso "Sin datos en tiempo real" y dispositivo desconectado', async () => {
    renderDashboard();
    await esperarTarjeta('Potos');
    const t = tarjeta('Potos');

    expect(t.getByText(TEXTO_SIN_TIEMPO_REAL)).toBeInTheDocument();
    expect(t.getByText(TEXTO_DESCONECTADO)).toBeInTheDocument();
    // Se siguen mostrando los últimos valores recibidos, con su fecha
    expect(t.getByText('25%')).toBeInTheDocument();
    expect(t.getByText(ultimaLectura(FECHA_ANTIGUA))).toBeInTheDocument();
  });

  it('planta sin dispositivo: "Sin sensor vinculado" y — en las 3 variables', async () => {
    renderDashboard();
    await esperarTarjeta('Suculenta');
    const t = tarjeta('Suculenta');

    expect(t.getByText(TEXTO_SIN_SENSOR)).toBeInTheDocument();
    expect(t.getAllByText(SIN_DATO)).toHaveLength(3);
    expect(t.queryByText(/Última lectura/)).not.toBeInTheDocument();
    expect(t.queryByText(TEXTO_SIN_TIEMPO_REAL)).not.toBeInTheDocument();
  });

  it('dispositivo sin lecturas todavía: "Esperando la primera lectura"', async () => {
    listPlantsMock.mockResolvedValue([ESPERANDO]);
    renderDashboard();
    await esperarTarjeta('Helecho');
    const t = tarjeta('Helecho');

    expect(t.getByText(TEXTO_CONECTADO)).toBeInTheDocument();
    expect(t.getByText(TEXTO_ESPERANDO_LECTURA)).toBeInTheDocument();
    expect(t.getAllByText(SIN_DATO)).toHaveLength(3);
  });

  it('solo muestra humedad del suelo, luz y temperatura (sin humedad ambiental)', async () => {
    renderDashboard();
    await esperarTarjeta('Monstruo');
    const t = tarjeta('Monstruo');

    expect(t.getByText('Humedad')).toBeInTheDocument();
    expect(t.getByText('Luz')).toBeInTheDocument();
    expect(t.getByText('Temp.')).toBeInTheDocument();
    expect(screen.queryByText('Ambiente')).not.toBeInTheDocument();
  });

  it('la insignia warning dice "Requiere atención" (no "Necesita Agua")', async () => {
    renderDashboard();
    await esperarTarjeta('Potos');

    expect(tarjeta('Potos').getByText('Requiere atención')).toBeInTheDocument();
    expect(screen.queryByText('Necesita Agua')).not.toBeInTheDocument();
  });
});

// --- Resumen ----------------------------------------------------------------

describe('Dashboard: resumen de dispositivos (PLAN-39)', () => {
  it('"Dispositivos conectados" cuenta dispositivos reales y distintos', async () => {
    // DISP_1 conectado (en 2 plantas, cuenta una vez), DISP_2 desconectado, una planta sin dispositivo
    listPlantsMock.mockResolvedValue([EN_VIVO, DESACTUALIZADA, SIN_SENSOR, ESPERANDO]);
    renderDashboard();
    await esperarTarjeta('Monstruo');

    expect(screen.getByText('Dispositivos conectados')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('sin dispositivos → 0 de 0 (ya no es plantas × 4)', async () => {
    listPlantsMock.mockResolvedValue([SIN_SENSOR]);
    renderDashboard();
    await esperarTarjeta('Suculenta');

    expect(screen.getByText('0 de 0')).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });
});

// --- Modal de detalles --------------------------------------------------------

describe('Dashboard: modal de detalles con lecturas reales (PLAN-39)', () => {
  it('muestra las 3 variables, el estado del dispositivo y la fecha; no la humedad ambiental', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarTarjeta('Monstruo');

    await user.click(tarjeta('Monstruo').getByRole('button', { name: 'Ver Detalles' }));

    const titulo = await screen.findByRole('heading', { level: 3, name: 'Métricas Actuales' });
    const modal = within(titulo.parentElement as HTMLElement);
    expect(modal.getByText('Humedad del suelo')).toBeInTheDocument();
    expect(modal.getByText('45,3%')).toBeInTheDocument();
    expect(modal.getByText('Luz recibida')).toBeInTheDocument();
    expect(modal.getByText('22,5°C')).toBeInTheDocument();
    expect(modal.getByText(TEXTO_CONECTADO)).toBeInTheDocument();
    expect(modal.getByText(ultimaLectura(FECHA_RECIENTE))).toBeInTheDocument();
    expect(screen.queryByText('Humedad Ambiental')).not.toBeInTheDocument();
  });
});

// --- Edición: no se pierden las lecturas -------------------------------------

describe('Dashboard: editar conserva la lectura y el dispositivo (PLAN-39)', () => {
  it('la respuesta del PUT no trae lastReading: la tarjeta sigue mostrando los valores', async () => {
    const user = userEvent.setup();
    getPlantMock.mockResolvedValue(base({ deviceId: DISP_1 }));
    // Respuesta real del PUT: objeto planta SIN lastReading ni device
    updatePlantMock.mockResolvedValue(base({ name: 'Monstruo editado', deviceId: DISP_1 }));
    renderDashboard();
    await esperarTarjeta('Monstruo');

    await user.click(tarjeta('Monstruo').getByRole('button', { name: 'Editar' }));
    const nombre = await screen.findByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Monstruo editado');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editar Planta' })).not.toBeInTheDocument());
    const t = tarjeta('Monstruo editado');
    expect(t.getByText('45,3%')).toBeInTheDocument();
    expect(t.getByText(TEXTO_CONECTADO)).toBeInTheDocument();
    expect(t.getByText(ultimaLectura(FECHA_RECIENTE))).toBeInTheDocument();
  });
});
