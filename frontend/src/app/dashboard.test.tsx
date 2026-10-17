// Pruebas del Dashboard: lista desde la API y edición de plantas — PLAN-9 (PLAN-23, 24, 25, 26)
// - El servicio ./api/plants está simulado: no se necesita el backend.
// - PlantProvider y Dashboard son los reales.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Dashboard } from './Dashboard';
import { PlantProvider } from './contexts/PlantContext';
import { ApiError } from './api/client';
import { listPlants } from './api/plants';
import type { PlantResponse } from './api/types';
import { MSG_SIN_CONEXION, MSG_TIMEOUT } from './utils/mensajesRegistro';
import { MSG_ERROR_CARGA_LISTA } from './utils/mensajesEdicion';

vi.mock('./api/plants', () => ({
  listPlants: vi.fn(),
  getPlant: vi.fn(),
  updatePlant: vi.fn(),
  createPlant: vi.fn(),
}));
const listPlantsMock = vi.mocked(listPlants);

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

const tituloTarjeta = (nombre: string) => screen.findByRole('heading', { level: 3, name: nombre });
const esperarLista = () => tituloTarjeta('Monstruo');

const botonesEditar = () => screen.getAllByRole('button', { name: 'Editar' });
const inputNombre = () => screen.getByLabelText('Nombre');
const inputEspecie = () => screen.getByLabelText('Especie');
const botonGuardar = () => screen.getByRole('button', { name: 'Guardar' });
const modalAbierto = () => screen.queryByRole('heading', { name: 'Editar Planta' });

// Abre el modal de la planta en la posición indicada (0 = Monstruo, 1 = Serpientina, 2 = Suculenta)
const abrirEditar = async (user: ReturnType<typeof userEvent.setup>, indice = 0) => {
  await user.click(botonesEditar()[indice]);
};

beforeEach(() => {
  listPlantsMock.mockReset();
  listPlantsMock.mockResolvedValue(PLANTAS);
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

// --- Edición (todavía guarda en local) ----------------------------------------

describe('Editar planta', () => {
  it('al pulsar Editar abre el modal con nombre y especie precargados', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);

    expect(screen.getByRole('heading', { name: 'Editar Planta' })).toBeInTheDocument();
    expect(inputNombre()).toHaveValue('Monstruo');
    expect(inputEspecie()).toHaveValue('Monstera Deliciosa');
  });

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

  it('con el nombre vacío muestra el error y no cambia la planta', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.click(botonGuardar());

    expect(screen.getByRole('alert')).toHaveTextContent(/nombre es un campo obligatorio/i);
    expect(inputNombre()).toHaveAttribute('aria-invalid', 'true');
    expect(inputEspecie()).not.toHaveAttribute('aria-invalid');
    // El modal sigue abierto y la tarjeta conserva el nombre original
    expect(modalAbierto()).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo' })).toBeInTheDocument();
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
