// Pruebas del registro de plantas contra la API — PLAN-10 (PLAN-18)
// - createPlant se prueba REAL, simulando solo fetch (no se necesita el backend).
// - El formulario se prueba con createPlant simulado y el PlantProvider real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AddPlant } from './AddPlant';
import { PlantProvider, usePlants, plantFromApi, DEFAULT_PLANT_IMAGE } from './contexts/PlantContext';
import { ApiError } from './api/client';
import { createPlant } from './api/plants';
import type { PlantResponse } from './api/types';

vi.mock('./api/plants', () => ({ createPlant: vi.fn() }));
const createPlantMock = vi.mocked(createPlant);

// --- Ayudas ---------------------------------------------------------------

// Respuesta simulada de fetch
const respuesta = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(body === undefined ? {} : { 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

// Planta como la devuelve la API en el 201
const plantaApi = (cambios: Partial<PlantResponse> = {}): PlantResponse => ({
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  name: 'Pepita',
  species: 'Pothos',
  imageUrl: null,
  status: 'healthy',
  location: 'cocina',
  lastWateredAt: null,
  deviceId: null,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  ...cambios,
});

// Ruta "/" de prueba: muestra los nombres de las plantas del contexto
function ListaPlantas() {
  const { plants } = usePlants();
  return (
    <ul aria-label="plantas">
      {plants.map((p) => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}

const renderFormulario = () => {
  const router = createMemoryRouter(
    [
      { path: '/', Component: ListaPlantas },
      { path: '/add', Component: AddPlant },
    ],
    { initialEntries: ['/add'] }
  );
  render(
    <PlantProvider>
      <RouterProvider router={router} />
    </PlantProvider>
  );
  return router;
};

// Llena el formulario: nombre, especie y ubicación
const llenarFormulario = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/nombre o apodo/i), 'Pepita');
  await user.selectOptions(screen.getByLabelText(/especie de planta/i), 'Pothos');
  await user.selectOptions(screen.getByLabelText(/ubicación en casa/i), 'cocina');
};

const botonGuardar = () => screen.getByRole('button', { name: /guardar planta|guardando/i });

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  createPlantMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// --- Servicio createPlant -------------------------------------------------

describe('createPlant (servicio real)', () => {
  // El módulo está simulado para el formulario; aquí se usa el original
  const createPlantReal = async () =>
    (await vi.importActual<typeof import('./api/plants')>('./api/plants')).createPlant;

  it('hace POST a /api/plants con el token, Content-Type JSON y el body serializado', async () => {
    localStorage.setItem('plantpulse_token', 'tok');
    fetchMock.mockResolvedValueOnce(respuesta(201, plantaApi()));
    const crear = await createPlantReal();

    await crear({ name: 'Pepita', species: 'Pothos', location: 'cocina' });

    const [url, init] = fetchMock.mock.calls[0];
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    expect(url).toBe(`${baseUrl}/api/plants`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ name: 'Pepita', species: 'Pothos', location: 'cocina' });
  });

  it('devuelve la planta del 201', async () => {
    const planta = plantaApi();
    fetchMock.mockResolvedValueOnce(respuesta(201, planta));
    const crear = await createPlantReal();

    await expect(crear({ name: 'Pepita', species: 'Pothos' })).resolves.toEqual(planta);
  });

  it('con un 400 lanza ApiError con status 400 y los errores por campo', async () => {
    const errors = { name: 'El nombre es un campo obligatorio.' };
    fetchMock.mockResolvedValueOnce(respuesta(400, { message: 'Datos de planta inválidos', errors }));
    const crear = await createPlantReal();

    const error = await crear({ name: '', species: 'Pothos' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.errors).toEqual(errors);
  });
});

// --- Conversión plantFromApi ----------------------------------------------

describe('plantFromApi', () => {
  it('usa la imagen por defecto si imageUrl es null, location null -> undefined y "Sin registro"', () => {
    const planta = plantFromApi(plantaApi({ imageUrl: null, location: null }));

    expect(planta.image).toBe(DEFAULT_PLANT_IMAGE);
    expect(planta.location).toBeUndefined();
    expect(planta.lastWatered).toBe('Sin registro');
    expect(planta).toMatchObject({ id: plantaApi().id, name: 'Pepita', species: 'Pothos', status: 'healthy' });
  });

  it('usa la URL de la imagen cuando existe', () => {
    const planta = plantFromApi(plantaApi({ imageUrl: 'https://ejemplo.com/foto.jpg' }));
    expect(planta.image).toBe('https://ejemplo.com/foto.jpg');
    expect(planta.location).toBe('cocina');
  });
});

// --- Formulario AddPlant --------------------------------------------------

describe('Formulario AddPlant', () => {
  it('no tiene "Detección Automática", campo de sensor ni "Añadir Foto"', () => {
    renderFormulario();

    expect(screen.queryByRole('option', { name: /detección automática/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/id del dispositivo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vincular sensor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/añadir foto/i)).not.toBeInTheDocument();
    // La especie empieza vacía y es obligatoria
    expect(screen.getByLabelText(/especie de planta/i)).toHaveValue('');
    expect(screen.getByLabelText(/especie de planta/i)).toBeRequired();
  });

  it('envío correcto: llama a createPlant solo con name, species y location, navega a "/" y muestra la planta', async () => {
    const user = userEvent.setup();
    createPlantMock.mockResolvedValueOnce(plantaApi());
    const router = renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(createPlantMock).toHaveBeenCalledTimes(1);
    expect(createPlantMock).toHaveBeenCalledWith({ name: 'Pepita', species: 'Pothos', location: 'cocina' });
    // La planta nueva queda de primera en la lista
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Pepita');
  });

  it('mientras envía, el botón queda deshabilitado con "Guardando..." y no se envía dos veces', async () => {
    const user = userEvent.setup();
    createPlantMock.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());

    const boton = await screen.findByRole('button', { name: /guardando/i });
    expect(boton).toBeDisabled();

    await user.click(boton);
    fireEvent.submit(boton.closest('form')!);
    expect(createPlantMock).toHaveBeenCalledTimes(1);
  });

  it('un 400 con errores muestra el mensaje bajo el nombre y el mensaje general, sin navegar', async () => {
    const user = userEvent.setup();
    createPlantMock.mockRejectedValueOnce(
      new ApiError('Datos de planta inválidos', 400, { name: 'El nombre ya existe.' })
    );
    const router = renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());

    const mensajeCampo = await screen.findByText('El nombre ya existe.');
    const nombre = screen.getByLabelText(/nombre o apodo/i);
    expect(nombre).toHaveAttribute('aria-invalid', 'true');
    expect(nombre).toHaveAttribute('aria-describedby', mensajeCampo.id);
    expect(mensajeCampo.id).toBe('plant-name-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Datos de planta inválidos');
    expect(router.state.location.pathname).toBe('/add');
  });

  it('un error de red (status 0) muestra "Error de conexión con el servidor" y el botón se vuelve a habilitar', async () => {
    const user = userEvent.setup();
    createPlantMock.mockRejectedValueOnce(new ApiError('Error de conexión con el servidor', 0));
    renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión con el servidor');
    expect(screen.getByRole('button', { name: /guardar planta/i })).toBeEnabled();
  });

  it('un 401 no muestra caja de error (el cliente ya redirige a /login)', async () => {
    const user = userEvent.setup();
    createPlantMock.mockRejectedValueOnce(new ApiError('No autorizado', 401));
    renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());

    await waitFor(() => expect(screen.getByRole('button', { name: /guardar planta/i })).toBeEnabled());
    expect(createPlantMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('al escribir en el campo con error, su mensaje desaparece', async () => {
    const user = userEvent.setup();
    createPlantMock.mockRejectedValueOnce(
      new ApiError('Datos de planta inválidos', 400, { name: 'El nombre ya existe.' })
    );
    renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());
    await screen.findByText('El nombre ya existe.');

    const nombre = screen.getByLabelText(/nombre o apodo/i);
    await user.type(nombre, 's');

    expect(screen.queryByText('El nombre ya existe.')).not.toBeInTheDocument();
    expect(nombre).not.toHaveAttribute('aria-invalid');
  });
});

// --- Validación en el cliente (PLAN-17) -----------------------------------

describe('Formulario AddPlant: validación en el cliente', () => {
  const MENSAJE_CARACTERES_NOMBRE =
    'El nombre solo puede contener letras, números, espacios, guiones, puntos y paréntesis.';

  const campoNombre = () => screen.getByLabelText(/nombre o apodo/i);
  const campoEspecie = () => screen.getByLabelText(/especie de planta/i);

  it('con el nombre vacío muestra el mensaje bajo el nombre, marca aria-invalid y no llama a la API', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.selectOptions(campoEspecie(), 'Pothos');
    await user.click(botonGuardar());

    const mensaje = await screen.findByText('El nombre es un campo obligatorio.');
    expect(mensaje.id).toBe('plant-name-error');
    expect(campoNombre()).toHaveAttribute('aria-invalid', 'true');
    expect(campoNombre()).toHaveAttribute('aria-describedby', 'plant-name-error');
    expect(createPlantMock).not.toHaveBeenCalled();
  });

  it('con un nombre de 1 carácter muestra el mínimo y no llama a la API', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.type(campoNombre(), 'P');
    await user.selectOptions(campoEspecie(), 'Pothos');
    await user.click(botonGuardar());

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres.')).toBeInTheDocument();
    expect(createPlantMock).not.toHaveBeenCalled();
  });

  it('con caracteres no permitidos en el nombre muestra el mensaje de caracteres y no llama a la API', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.type(campoNombre(), 'Planta<b>');
    await user.selectOptions(campoEspecie(), 'Pothos');
    await user.click(botonGuardar());

    expect(await screen.findByText(MENSAJE_CARACTERES_NOMBRE)).toBeInTheDocument();
    expect(createPlantMock).not.toHaveBeenCalled();
  });

  it('sin especie elegida muestra el mensaje bajo la especie y no llama a la API', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.type(campoNombre(), 'Pepita');
    await user.click(botonGuardar());

    const mensaje = await screen.findByText('La especie es un campo obligatorio.');
    expect(mensaje.id).toBe('plant-species-error');
    expect(campoEspecie()).toHaveAttribute('aria-invalid', 'true');
    expect(createPlantMock).not.toHaveBeenCalled();
  });

  it('con nombre y especie inválidos muestra los dos mensajes y el foco queda en el nombre', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.click(botonGuardar());

    expect(await screen.findByText('El nombre es un campo obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La especie es un campo obligatorio.')).toBeInTheDocument();
    expect(document.activeElement).toBe(campoNombre());
    expect(createPlantMock).not.toHaveBeenCalled();
  });

  it('con solo la especie inválida el foco queda en el select de especie', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.type(campoNombre(), 'Pepita');
    await user.click(botonGuardar());

    await screen.findByText('La especie es un campo obligatorio.');
    expect(screen.queryByText(/el nombre/i)).not.toBeInTheDocument();
    expect(document.activeElement).toBe(campoEspecie());
  });

  it('envía el nombre normalizado, sin espacios de más', async () => {
    const user = userEvent.setup();
    createPlantMock.mockResolvedValueOnce(plantaApi({ name: 'Mi Pothos' }));
    const router = renderFormulario();

    await user.type(campoNombre(), '  Mi    Pothos  ');
    await user.selectOptions(campoEspecie(), 'Pothos');
    await user.click(botonGuardar());

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(createPlantMock).toHaveBeenCalledTimes(1);
    expect(createPlantMock).toHaveBeenCalledWith({ name: 'Mi Pothos', species: 'Pothos', location: 'sala' });
  });

  it('al corregir el campo se borra su mensaje y el siguiente envío sí llama a la API', async () => {
    const user = userEvent.setup();
    createPlantMock.mockResolvedValueOnce(plantaApi());
    const router = renderFormulario();

    await user.selectOptions(campoEspecie(), 'Pothos');
    await user.click(botonGuardar());
    await screen.findByText('El nombre es un campo obligatorio.');
    expect(createPlantMock).not.toHaveBeenCalled();

    await user.type(campoNombre(), 'Pepita');
    expect(screen.queryByText('El nombre es un campo obligatorio.')).not.toBeInTheDocument();
    expect(campoNombre()).not.toHaveAttribute('aria-invalid');

    await user.click(botonGuardar());

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(createPlantMock).toHaveBeenCalledTimes(1);
    expect(createPlantMock).toHaveBeenCalledWith({ name: 'Pepita', species: 'Pothos', location: 'sala' });
  });

  it('el nombre tiene maxLength 50', () => {
    renderFormulario();
    expect(campoNombre()).toHaveAttribute('maxLength', '50');
  });

  it('con errores de validación no aparece la caja de error general', async () => {
    const user = userEvent.setup();
    renderFormulario();

    await user.click(botonGuardar());

    await screen.findByText('El nombre es un campo obligatorio.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un error de validación borra la caja general de un envío anterior fallido', async () => {
    const user = userEvent.setup();
    createPlantMock.mockRejectedValueOnce(new ApiError('Error de conexión con el servidor', 0));
    renderFormulario();

    await llenarFormulario(user);
    await user.click(botonGuardar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión con el servidor');

    await user.clear(campoNombre());
    await user.click(botonGuardar());

    await screen.findByText('El nombre es un campo obligatorio.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(createPlantMock).toHaveBeenCalledTimes(1);
  });
});
