// Pruebas del Dashboard: lista desde la API y edición de plantas — PLAN-9 (PLAN-23, 24, 25, 26)
// - El servicio ./api/plants está simulado: no se necesita el backend.
// - PlantProvider y Dashboard son los reales.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { Dashboard } from './Dashboard';
import { PlantProvider } from './contexts/PlantContext';
import { Toaster } from './components/ui/sonner';
import { ApiError } from './api/client';
import { listPlants, getPlant, updatePlant } from './api/plants';
import type { PlantResponse } from './api/types';
import { MSG_GENERICO, MSG_REVISA_CAMPOS, MSG_SIN_CONEXION, MSG_TIMEOUT } from './utils/mensajesRegistro';
import {
  MSG_ERROR_CARGA_LISTA,
  MSG_ERROR_CARGA_PLANTA,
  MSG_PLANTA_NO_ENCONTRADA,
  mensajeExitoEdicion,
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
        <Toaster />
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

afterEach(() => {
  // sonner guarda los avisos en un estado global: se limpian entre pruebas
  toast.dismiss();
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

// --- PLAN-24: actualizar mediante la API --------------------------------------

describe('Editar planta: guardar con PUT (PLAN-24)', () => {
  it('envía los 4 campos con el imageUrl actual, actualiza la tarjeta, cierra el modal y avisa', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockResolvedValueOnce(planta({ name: 'Mi Monstera', location: 'oficina' }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 0);
    await user.clear(inputNombre());
    await user.type(inputNombre(), 'Mi Monstera');
    await user.selectOptions(selectUbicacion(), 'oficina');
    await user.click(botonGuardar());

    await waitFor(() => expect(modalAbierto()).not.toBeInTheDocument());
    expect(updatePlantMock).toHaveBeenCalledTimes(1);
    expect(updatePlantMock).toHaveBeenCalledWith(ID_MONSTRUO, {
      name: 'Mi Monstera',
      species: 'Monstera Deliciosa',
      location: 'oficina',
      imageUrl: 'https://ejemplo.com/monstruo.jpg',
    });
    expect(screen.getByRole('heading', { level: 3, name: 'Mi Monstera' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Monstruo' })).not.toBeInTheDocument();
    expect(await screen.findByText(mensajeExitoEdicion('Mi Monstera'))).toBeInTheDocument();
  });

  it('una planta sin foto no envía imageUrl', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockResolvedValueOnce({ ...SERPIENTINA, name: 'Serpiente' });
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 1);
    await user.clear(inputNombre());
    await user.type(inputNombre(), 'Serpiente');
    await user.click(botonGuardar());

    await waitFor(() => expect(updatePlantMock).toHaveBeenCalledTimes(1));
    const [, datos] = updatePlantMock.mock.calls[0];
    expect(datos).toEqual({ name: 'Serpiente', species: 'Sansevieria Trifasciata', location: '' });
    expect(datos).not.toHaveProperty('imageUrl');
  });

  it('elegir "Sin ubicación" envía location vacía (el backend la guarda como NULL)', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockResolvedValueOnce(planta({ location: null }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user, 0);
    await user.selectOptions(selectUbicacion(), '');
    await user.click(botonGuardar());

    await waitFor(() => expect(updatePlantMock).toHaveBeenCalledTimes(1));
    expect(updatePlantMock.mock.calls[0][1].location).toBe('');
  });

  it('envía el nombre normalizado y la tarjeta muestra el nombre que devolvió la API', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockResolvedValueOnce(planta({ name: 'Mi Monstera' }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.clear(inputNombre());
    await user.type(inputNombre(), '  Mi    Monstera  ');
    await user.click(botonGuardar());

    await waitFor(() => expect(modalAbierto()).not.toBeInTheDocument());
    expect(updatePlantMock.mock.calls[0][1].name).toBe('Mi Monstera');
    // Testing Library unifica espacios al buscar por nombre, así que se compara textContent exacto
    const titulo = screen.getByRole('heading', { level: 3, name: 'Mi Monstera' });
    expect(titulo.textContent).toBe('Mi Monstera');
  });

  it('mientras guarda: "Guardando...", botones deshabilitados y no se envía dos veces', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    // Dos envíos seguidos del formulario: el segundo no debe llamar a la API.
    // (Un segundo clic no sirve: el botón ya está deshabilitado y el clic no llega al manejador.)
    const formulario = inputNombre().closest('form')!;
    fireEvent.submit(formulario);
    fireEvent.submit(formulario);

    expect(botonGuardar()).toHaveTextContent('Guardando...');
    expect(botonGuardar()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
    expect(updatePlantMock).toHaveBeenCalledTimes(1);
  });

  it('un 400 con errors.name muestra el mensaje bajo el nombre y "Revisa los campos marcados."', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockRejectedValueOnce(
      new ApiError('Datos de planta inválidos', 400, { name: 'El nombre debe tener al menos 2 caracteres.' })
    );
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    await user.click(botonGuardar());

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres.')).toBeInTheDocument();
    expect(inputNombre()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(MSG_REVISA_CAMPOS)).toBeInTheDocument();
    expect(screen.queryByText('Datos de planta inválidos')).not.toBeInTheDocument();
    expect(modalAbierto()).toBeInTheDocument();
  });

  it('un 400 solo con errors.imageUrl muestra ese mensaje en el recuadro', async () => {
    const user = userEvent.setup();
    const mensaje = 'La URL de la imagen debe empezar por http:// o https://.';
    updatePlantMock.mockRejectedValueOnce(new ApiError('Datos de planta inválidos', 400, { imageUrl: mensaje }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    await user.click(botonGuardar());

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
  });

  it.each([
    ['404', new ApiError('Planta no encontrada', 404), MSG_PLANTA_NO_ENCONTRADA],
    ['status 0', new ApiError('Error de conexión con el servidor', 0), MSG_SIN_CONEXION],
    ['408', new ApiError('Solicitud cancelada por timeout', 408), MSG_TIMEOUT],
    ['500', new ApiError('Error interno del servidor', 500), MSG_GENERICO],
    ['un error que no es ApiError', new Error('fallo raro'), MSG_GENERICO],
  ])('%s: recuadro con el mensaje traducido, modal abierto y botón habilitado', async (_caso, error, mensaje) => {
    const user = userEvent.setup();
    updatePlantMock.mockRejectedValueOnce(error);
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    await user.click(botonGuardar());

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(mensaje);
    expect(alerta).not.toHaveTextContent(error.message);
    expect(modalAbierto()).toBeInTheDocument();
    expect(botonGuardar()).toBeEnabled();
    expect(botonGuardar()).toHaveTextContent('Guardar');
  });

  it('un 401 al guardar cierra el modal sin recuadro ni aviso de éxito', async () => {
    const user = userEvent.setup();
    updatePlantMock.mockRejectedValueOnce(new ApiError('No autorizado', 401));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    await user.click(botonGuardar());

    await waitFor(() => expect(modalAbierto()).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/actualizada correctamente/)).not.toBeInTheDocument();
  });

  it('después de un error, un segundo intento correcto guarda y cierra el modal', async () => {
    const user = userEvent.setup();
    updatePlantMock
      .mockRejectedValueOnce(new ApiError('Error de conexión con el servidor', 0))
      .mockResolvedValueOnce(planta({ name: 'Monstruo II' }));
    renderDashboard();
    await esperarLista();

    await abrirEditar(user);
    await user.type(inputNombre(), ' II');
    await user.click(botonGuardar());
    await screen.findByRole('alert');

    await user.click(botonGuardar());

    await waitFor(() => expect(modalAbierto()).not.toBeInTheDocument());
    expect(updatePlantMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo II' })).toBeInTheDocument();
  });
});
