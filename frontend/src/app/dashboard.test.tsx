// Pruebas del Dashboard: lista desde la API y edición de plantas — PLAN-9 (PLAN-23, 24, 25, 26)
// - El servicio ./api/plants está simulado: no se necesita el backend.
// - PlantProvider y Dashboard son los reales.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Dashboard } from './Dashboard';
import { PlantProvider } from './contexts/PlantContext';
import { ApiError } from './api/client';
import { listPlants, getPlant, updatePlant } from './api/plants';
import type { PlantResponse } from './api/types';
import { MSG_SIN_CONEXION, MSG_TIMEOUT } from './utils/mensajesRegistro';
import {
  MSG_ERROR_CARGA_LISTA,
  MSG_ERROR_CARGA_PLANTA,
  MSG_PLANTA_NO_ENCONTRADA,
} from './utils/mensajesEdicion';

vi.mock('./api/plants', () => ({
  listPlants: vi.fn(),
  getPlant: vi.fn(),
  updatePlant: vi.fn(),
  createPlant: vi.fn(),
}));
const listPlantsMock = vi.mocked(listPlants);
const getPlantMock = vi.mocked(getPlant);
const updatePlantMock = vi.mocked(updatePlant);

// --- Datos de prueba --------------------------------------------------------

const ID_MONSTRUO = 'aaaaaaaa-0000-0000-0000-000000000001';
const ID_SERPIENTINA = 'aaaaaaaa-0000-0000-0000-000000000002';
const ID_SUCULENTA = 'aaaaaaaa-0000-0000-0000-000000000003';

const planta = (cambios: Partial<PlantResponse>): PlantResponse => ({
  id: ID_MONSTRUO,
  name: 'Monstruo',
  species: 'Monstera Deliciosa',
  imageUrl: 'https://ejemplo.com/monstruo.jpg',
  status: 'healthy',
  location: 'sala',
  lastWateredAt: null,
  deviceId: null,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  ...cambios,
});

const MONSTRUO = planta({});
// Sin foto y sin ubicación
const SERPIENTINA = planta({
  id: ID_SERPIENTINA, name: 'Serpientina', species: 'Sansevieria Trifasciata',
  imageUrl: null, status: 'warning', location: null,
});
// Ubicación antigua que no es uno de los códigos del formulario
const SUCULENTA = planta({
  id: ID_SUCULENTA, name: 'Suculenta', species: 'Echeveria elegans',
  imageUrl: null, status: 'critical', location: 'Balcon',
});
const PLANTAS = [MONSTRUO, SERPIENTINA, SUCULENTA];

// --- Ayudas -----------------------------------------------------------------

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <PlantProvider>
        <Dashboard />
      </PlantProvider>
    </MemoryRouter>
  );

// Promesa que la prueba resuelve o rechaza cuando quiere
function diferida<T>() {
  let resolve!: (valor: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const tituloTarjeta = (nombre: string) => screen.findByRole('heading', { level: 3, name: nombre });
const esperarLista = () => tituloTarjeta('Monstruo');

const botonesEditar = () => screen.getAllByRole('button', { name: 'Editar' });
const inputNombre = () => screen.getByLabelText('Nombre');
const inputEspecie = () => screen.getByLabelText('Especie');
const selectUbicacion = () => screen.getByLabelText('Ubicación');
const botonGuardar = () => screen.getByRole('button', { name: /^(guardar|guardando\.\.\.)$/i });
const modalAbierto = () => screen.queryByRole('heading', { name: 'Editar Planta' });

// Abre el modal de la planta en la posición indicada (0 = Monstruo, 1 = Serpientina, 2 = Suculenta)
// y espera a que se precargue el formulario
const abrirEditar = async (user: ReturnType<typeof userEvent.setup>, indice = 0) => {
  await user.click(botonesEditar()[indice]);
  await screen.findByLabelText('Nombre');
};

beforeEach(() => {
  listPlantsMock.mockReset();
  getPlantMock.mockReset();
  updatePlantMock.mockReset();
  listPlantsMock.mockResolvedValue(PLANTAS);
  getPlantMock.mockImplementation(async (id: string) => {
    const encontrada = PLANTAS.find((p) => p.id === id);
    if (!encontrada) throw new ApiError('Planta no encontrada', 404);
    return encontrada;
  });
});

// --- Lista ------------------------------------------------------------------

describe('Dashboard: lista de plantas desde la API', () => {
  it('renderiza el título, el enlace para agregar y las 4 tarjetas de resumen', async () => {
    renderDashboard();
    await esperarLista();

    expect(screen.getByRole('heading', { level: 1, name: 'Mis Plantas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nueva Planta/i })).toHaveAttribute('href', '/add');
    expect(screen.getByText('Total Plantas')).toBeInTheDocument();
    expect(screen.getByText('Saludables')).toBeInTheDocument();
    expect(screen.getByText('Atención Req.')).toBeInTheDocument();
    expect(screen.getByText('Sensores Activos')).toBeInTheDocument();
  });

  it('los modales de editar y eliminar no están visibles al inicio', async () => {
    renderDashboard();
    await esperarLista();

    expect(modalAbierto()).not.toBeInTheDocument();
    expect(screen.queryByText('¿Estás seguro?')).not.toBeInTheDocument();
  });

  it('pide la lista una sola vez y muestra las plantas que devuelve la API', async () => {
    renderDashboard();

    expect(await tituloTarjeta('Monstruo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Serpientina' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Suculenta' })).toBeInTheDocument();
    expect(listPlantsMock).toHaveBeenCalledTimes(1);
    // Ya no hay plantas de ejemplo
    expect(screen.queryByRole('heading', { level: 3, name: 'Higuera' })).not.toBeInTheDocument();
  });

  it('cuenta las plantas por estado: warning y critical requieren atención', async () => {
    renderDashboard();
    await esperarLista();

    const valor = (titulo: string) => screen.getByText(titulo).nextElementSibling;
    expect(valor('Total Plantas')).toHaveTextContent('3');
    expect(valor('Saludables')).toHaveTextContent('1');
    expect(valor('Atención Req.')).toHaveTextContent('2');
  });

  it('una planta en estado critical muestra "Estado Crítico", no "Saludable"', async () => {
    renderDashboard();
    await esperarLista();

    expect(screen.getByText('Estado Crítico')).toBeInTheDocument();
    expect(screen.getAllByText('Saludable')).toHaveLength(1);
  });

  it('mientras carga muestra "Cargando tus plantas..."', async () => {
    listPlantsMock.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    renderDashboard();

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando tus plantas...');
  });

  it('sin plantas muestra el mensaje y el enlace para registrar la primera', async () => {
    listPlantsMock.mockResolvedValueOnce([]);
    renderDashboard();

    expect(await screen.findByText('Aún no tienes plantas registradas.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar mi primera planta' })).toHaveAttribute('href', '/add');
  });

  it('un error de red muestra el mensaje de sin conexión y "Reintentar" vuelve a pedir la lista', async () => {
    const user = userEvent.setup();
    listPlantsMock.mockRejectedValueOnce(new ApiError('Error de conexión con el servidor', 0));
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_SIN_CONEXION);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await tituloTarjeta('Monstruo')).toBeInTheDocument();
    expect(listPlantsMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un 500 muestra el mensaje genérico de carga, nunca el texto del backend', async () => {
    listPlantsMock.mockRejectedValueOnce(new ApiError('Error interno del servidor', 500));
    renderDashboard();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(MSG_ERROR_CARGA_LISTA);
    expect(alerta).not.toHaveTextContent('Error interno del servidor');
  });

  it('un 408 muestra el mensaje de timeout', async () => {
    listPlantsMock.mockRejectedValueOnce(new ApiError('Solicitud cancelada por timeout', 408));
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_TIMEOUT);
  });

  it('un 401 no muestra error (el cliente ya redirige a /login)', async () => {
    listPlantsMock.mockRejectedValueOnce(new ApiError('No autorizado', 401));
    renderDashboard();

    await waitFor(() => expect(listPlantsMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el detalle muestra la etiqueta de la ubicación y "No asignada" si no tiene', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await user.click(screen.getAllByRole('button', { name: 'Ver Detalles' })[0]);
    expect(screen.getByText('Sala de Estar')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Ver Detalles' })[1]);
    expect(screen.getByText('No asignada')).toBeInTheDocument();
  });
});

// --- PLAN-23: precargar datos existentes ------------------------------------

describe('Editar planta: precarga desde la API (PLAN-23)', () => {
  it('al pulsar Editar pide la planta por su id y precarga nombre, especie y ubicación', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 0);

    expect(getPlantMock).toHaveBeenCalledWith(ID_MONSTRUO);
    expect(screen.getByRole('heading', { name: 'Editar Planta' })).toBeInTheDocument();
    expect(inputNombre()).toHaveValue('Monstruo');
    expect(inputEspecie()).toHaveValue('Monstera Deliciosa');
    expect(selectUbicacion()).toHaveValue('sala');
  });

  it('usa los datos que devuelve la API aunque la tarjeta tenga otros', async () => {
    const user = userEvent.setup();
    getPlantMock.mockResolvedValueOnce(planta({ name: 'Monstruo editado en otra pestaña', location: 'cocina' }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 0);

    expect(inputNombre()).toHaveValue('Monstruo editado en otra pestaña');
    expect(selectUbicacion()).toHaveValue('cocina');
  });

  it('mientras carga muestra "Cargando datos de la planta..." y todavía no muestra el formulario', async () => {
    const user = userEvent.setup();
    getPlantMock.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando datos de la planta...');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });

  it('una planta sin ubicación precarga "Sin ubicación"', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 1);

    expect(selectUbicacion()).toHaveValue('');
    expect(within(selectUbicacion()).getByRole('option', { selected: true })).toHaveTextContent('Sin ubicación');
  });

  it('una ubicación antigua que no es un código se muestra tal cual y no cuenta como cambio', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 2);

    expect(selectUbicacion()).toHaveValue('Balcon');
    expect(botonGuardar()).toBeDisabled();
  });

  it('un 404 al cargar muestra "planta no encontrada", sin formulario, y "Volver a mis plantas" cierra el modal', async () => {
    const user = userEvent.setup();
    getPlantMock.mockRejectedValueOnce(new ApiError('Planta no encontrada', 404));
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_PLANTA_NO_ENCONTRADA);
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver a mis plantas' }));
    expect(modalAbierto()).not.toBeInTheDocument();
  });

  it('un error de red al cargar muestra el mensaje de sin conexión', async () => {
    const user = userEvent.setup();
    getPlantMock.mockRejectedValueOnce(new ApiError('Error de conexión con el servidor', 0));
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_SIN_CONEXION);
  });

  it('un 500 al cargar muestra el mensaje genérico de carga de la planta', async () => {
    const user = userEvent.setup();
    getPlantMock.mockRejectedValueOnce(new ApiError('Error interno del servidor', 500));
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(MSG_ERROR_CARGA_PLANTA);
    expect(alerta).not.toHaveTextContent('Error interno del servidor');
  });

  it('un 401 al cargar cierra el modal sin mostrar error', async () => {
    const user = userEvent.setup();
    getPlantMock.mockRejectedValueOnce(new ApiError('No autorizado', 401));
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]);

    await waitFor(() => expect(modalAbierto()).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si se cierra el modal antes de que responda la API, esa respuesta tardía se ignora', async () => {
    const user = userEvent.setup();
    const tardia = diferida<PlantResponse>();
    getPlantMock.mockReturnValueOnce(tardia.promise);
    renderDashboard();
    await esperarLista();

    await user.click(botonesEditar()[0]); // Monstruo: queda cargando
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await abrirEditar(user, 1); // Serpientina

    // act espera a que React aplique cualquier cambio de estado que provoque la respuesta tardía
    await act(async () => {
      tardia.resolve(MONSTRUO);
      await tardia.promise;
    });

    expect(inputNombre()).toHaveValue('Serpientina');
    expect(inputEspecie()).toHaveValue('Sansevieria Trifasciata');
  });

  it('al abrir otra planta precarga los datos de esa planta', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 0);
    await user.type(inputNombre(), ' cambiado');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await abrirEditar(user, 1);
    expect(inputNombre()).toHaveValue('Serpientina');
    expect(inputEspecie()).toHaveValue('Sansevieria Trifasciata');
  });
});

// --- PLAN-25: validación ------------------------------------------------------

describe('Editar planta: validación (PLAN-25)', () => {
  it('deshabilita Guardar sin cambios y también si solo se agregan espacios', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    expect(botonGuardar()).toBeDisabled();

    await user.type(inputNombre(), '   ');
    await user.type(inputEspecie(), '  ');
    expect(inputNombre()).toHaveValue('Monstruo   ');
    expect(botonGuardar()).toBeDisabled();
  });

  it('cambiar solo la ubicación habilita Guardar', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.selectOptions(selectUbicacion(), 'cocina');

    expect(botonGuardar()).toBeEnabled();
  });

  it('con el nombre vacío muestra el error, pone el foco en el nombre y no llama a la API', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.click(botonGuardar());

    expect(screen.getByRole('alert')).toHaveTextContent(/nombre es un campo obligatorio/i);
    expect(inputNombre()).toHaveAttribute('aria-invalid', 'true');
    expect(inputNombre()).toHaveFocus();
    expect(inputEspecie()).not.toHaveAttribute('aria-invalid');
    expect(updatePlantMock).not.toHaveBeenCalled();
    // El modal sigue abierto y la tarjeta conserva el nombre original
    expect(modalAbierto()).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo' })).toBeInTheDocument();
  });

  it('con caracteres no permitidos en la especie muestra el error y no llama a la API', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputEspecie());
    await user.type(inputEspecie(), 'Monstera <b>');
    await user.click(botonGuardar());

    expect(screen.getByRole('alert')).toHaveTextContent(/especie solo puede contener/i);
    expect(updatePlantMock).not.toHaveBeenCalled();
  });

  it('el error desaparece al volver a escribir en el campo', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.click(botonGuardar());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(inputNombre(), 'M');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(inputNombre()).not.toHaveAttribute('aria-invalid');
  });

  it('Cancelar descarta los cambios y al reabrir no hay errores', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.click(botonGuardar());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(modalAbierto()).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo' })).toBeInTheDocument();

    await abrirEditar(user);
    expect(inputNombre()).toHaveValue('Monstruo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(inputNombre()).not.toHaveAttribute('aria-invalid');
  });
});

// --- Guardado (todavía en local) ----------------------------------------------

describe('Editar planta: guardado provisional en local', () => {
  it('una edición válida con espacios de más guarda el nombre normalizado y cierra el modal', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.type(inputNombre(), '  Mi    Monstera  ');
    await user.click(botonGuardar());

    expect(modalAbierto()).not.toBeInTheDocument();
    // Testing Library unifica espacios al buscar por nombre, así que se compara textContent exacto
    const titulo = screen.getByRole('heading', { level: 3, name: 'Mi Monstera' });
    expect(titulo.textContent).toBe('Mi Monstera');
    expect(screen.queryByRole('heading', { level: 3, name: 'Monstruo' })).not.toBeInTheDocument();
  });
});
