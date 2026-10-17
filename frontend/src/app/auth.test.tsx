// Pruebas de autenticacion del frontend — PLAN-14 (PLAN-37)
// - apiFetch se prueba REAL, simulando solo fetch (no se necesita el backend).
// - Login, ProtectedRoute y rutas se prueban con el router en memoria y los componentes reales.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { PlantProvider } from './contexts/PlantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import Login from './Login';
import { apiFetch, ApiError, setUnauthorizedHandler } from './api/client';

// --- Ayudas ---------------------------------------------------------------

// Codifica en base64url, igual que un JWT real
const base64url = (obj: object) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// JWT de prueba (la firma no se verifica en el frontend)
const crearToken = (expEnSegundos: number) =>
  `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    id: '11111111-1111-1111-1111-111111111111',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expEnSegundos,
  })}.firma`;

const TOKEN_VALIDO = () => crearToken(3600);
const TOKEN_VENCIDO = () => crearToken(-3600);

// Respuesta simulada de fetch
const respuesta = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(body === undefined ? {} : { 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

// Misma estructura de rutas que routes.tsx, pero con router en memoria
const renderApp = (rutaInicial: string) => {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: Login },
      {
        path: '/',
        Component: ProtectedRoute,
        children: [{ Component: Layout, children: [{ index: true, Component: Dashboard }] }],
      },
    ],
    { initialEntries: [rutaInicial] }
  );
  render(
    <PlantProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PlantProvider>
  );
  return router;
};

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// --- apiFetch -------------------------------------------------------------

describe('apiFetch', () => {
  it('llama a la URL completa del login, serializa el body y no envía credentials', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { token: 't' }));
    await apiFetch('/api/auth/login', { method: 'POST', body: { email: 'a@b.com', password: 'x' } as any });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/auth/login');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'x' });
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.credentials).toBeUndefined();
  });

  it('envía el header Bearer cuando hay token guardado', async () => {
    localStorage.setItem('plantpulse_token', 'tok');
    fetchMock.mockResolvedValueOnce(respuesta(200, []));
    await apiFetch('/api/plants');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('lanza ApiError con status, message y errors de la API', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(400, { message: 'Datos de planta inválidos', errors: { name: 'El nombre es un campo obligatorio.' } })
    );
    const error = await apiFetch('/api/plants', { method: 'POST', body: {} as any }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Datos de planta inválidos');
    expect(error.errors).toEqual({ name: 'El nombre es un campo obligatorio.' });
  });

  it('un 401 fuera del login borra el token y llama al manejador registrado', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    localStorage.setItem('plantpulse_token', 'tok');
    fetchMock.mockResolvedValueOnce(respuesta(401, { message: 'No autorizado' }));

    await expect(apiFetch('/api/plants')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('plantpulse_token')).toBeNull();
  });

  it('un 401 del login NO llama al manejador (son credenciales inválidas)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(respuesta(401, { message: 'Credenciales inválidas' }));

    await expect(apiFetch('/api/auth/login', { method: 'POST', body: {} as any })).rejects.toThrow('Credenciales inválidas');
    expect(handler).not.toHaveBeenCalled();
  });

  it('un 204 devuelve undefined', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(204));
    await expect(apiFetch('/api/plants/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('si falla la red lanza ApiError con status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await apiFetch('/api/plants').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});

// --- Login ----------------------------------------------------------------

describe('Login', () => {
  it('muestra errores de validación sin llamar a la API', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText(/correo electrónico es obligatorio/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con credenciales correctas guarda el token y muestra el Dashboard', async () => {
    const user = userEvent.setup();
    const token = TOKEN_VALIDO();
    fetchMock.mockResolvedValueOnce(respuesta(200, { token }));
    const router = renderApp('/login');

    await user.type(screen.getByLabelText(/correo electrónico/i), 'demo@plantpulse.local');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'PlantPulse2026!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(localStorage.getItem('plantpulse_token')).toBe(token);
    expect(await screen.findByRole('heading', { name: 'Mis Plantas' })).toBeInTheDocument();
  });

  it('con un 401 muestra "Credenciales inválidas" y no guarda token', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respuesta(401, { message: 'Credenciales inválidas' }));
    const router = renderApp('/login');

    await user.type(screen.getByLabelText(/correo electrónico/i), 'demo@plantpulse.local');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'mala');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(localStorage.getItem('plantpulse_token')).toBeNull();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('deshabilita el botón mientras se procesa la petición', async () => {
    const user = userEvent.setup();
    fetchMock.mockReturnValueOnce(new Promise(() => {})); // nunca responde
    renderApp('/login');

    await user.type(screen.getByLabelText(/correo electrónico/i), 'demo@plantpulse.local');
    await user.type(screen.getByLabelText(/^contraseña$/i), 'x');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByRole('button', { name: /ingresando/i })).toBeDisabled();
  });
});

// --- ProtectedRoute y rutas ----------------------------------------------

describe('ProtectedRoute y rutas', () => {
  it('sin token, entrar a "/" redirige a /login', async () => {
    const router = renderApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('con token vencido, entrar a "/" redirige a /login y borra el token', async () => {
    localStorage.setItem('plantpulse_token', TOKEN_VENCIDO());
    const router = renderApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(localStorage.getItem('plantpulse_token')).toBeNull();
  });

  it('con token válido, en "/" se ve el Dashboard dentro del Layout', async () => {
    localStorage.setItem('plantpulse_token', TOKEN_VALIDO());
    renderApp('/');

    // h1 del Dashboard + enlace del menú lateral del Layout
    expect(await screen.findByRole('heading', { name: 'Mis Plantas' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /mis plantas/i }).length).toBeGreaterThan(0);
  });

  it('con sesión, entrar a /login redirige a "/"', async () => {
    localStorage.setItem('plantpulse_token', TOKEN_VALIDO());
    const router = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('cerrar sesión borra el token y vuelve a /login', async () => {
    const user = userEvent.setup();
    localStorage.setItem('plantpulse_token', TOKEN_VALIDO());
    const router = renderApp('/');

    await user.click(await screen.findByTitle('Cerrar sesión'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(localStorage.getItem('plantpulse_token')).toBeNull();
  });
});
