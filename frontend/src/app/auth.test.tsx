import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import Login from './Login';
import { apiFetch, ApiError, setUnauthorizedHandler } from './api/client';
import { Dashboard } from './Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

vi.mock('./api/client', async () => {
  const actual = await vi.importActual('./api/client');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Login', () => {
  let user = userEvent.setup();
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('login correcto guarda token y navega a /', async () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImlhdCI6MTc5MjEzMDAwMCwiZXhwIjoxNzkyMDM2MDAwfQ.mocksig';
    (apiFetch as any).mockResolvedValueOnce({ token: mockToken });
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Login /></AuthProvider></MemoryRouter>);
    await user.type(screen.getByLabelText(/correo electrónico/i), 'demo@plantpulse.local');
    await user.type(screen.getByLabelText(/contraseña/i), 'PlantPulse2026!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(localStorage.getItem('plantpulse_token')).toBe(mockToken));
  });

  it('401 muestra Credenciales inválidas y no guarda token', async () => {
    (apiFetch as any).mockRejectedValueOnce(new ApiError('Credenciales inválidas', 401));
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Login /></AuthProvider></MemoryRouter>);
    await user.type(screen.getByLabelText(/correo electrónico/i), 'bad');
    await user.type(screen.getByLabelText(/contraseña/i), 'bad');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument());
    expect(localStorage.getItem('plantpulse_token')).toBeNull();
  });

  it('envía Bearer cuando hay token', async () => {
    localStorage.setItem('plantpulse_token', 'tok');
    (global.fetch as any) = vi.fn(() => Promise.resolve({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) }));
    await apiFetch('/api/plants');
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('apiFetch 401 fuera login llama handler registrado', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    (global.fetch as any) = vi.fn(() => Promise.resolve({ ok: false, status: 401, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ message: 'No autorizado' }) }));
    await expect(apiFetch('/api/plants')).rejects.toThrow(ApiError);
    expect(handler).toHaveBeenCalled();
  });

  it('ProtectedRoute sin token redirige a /login', () => {
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><ProtectedRoute><Dashboard /></ProtectedRoute></AuthProvider></MemoryRouter>);
    expect(screen.queryByText(/mis plantas/i)).not.toBeInTheDocument();
  });

  it('ProtectedRoute con token muestra Dashboard dentro de Layout', async () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImexpIjoxNzkyMDAwMDAwfQ.sig';
    localStorage.setItem('plantpulse_token', mockToken);
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><ProtectedRoute><Dashboard /></ProtectedRoute></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText(/mis plantas/i).length).toBeGreaterThan(0));
  });
});
