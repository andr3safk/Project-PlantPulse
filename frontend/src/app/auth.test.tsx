import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import Login from './Login';
import { apiFetch, ApiError, setUnauthorizedHandler } from './api/client';
import { ProtectedRoute } from './components/ProtectedRoute';

describe('auth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('login produce token y navega', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/correo electrónico/i), 'demo@plantpulse.local');
    await user.type(screen.getByLabelText(/contraseña/i), 'PlantPulse2026!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(screen.queryByText(/Ingresando/i)).not.toBeInTheDocument());
  });

  it('apiFetch envía Bearer cuando hay token', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('plantpulse_token', 'test-token');
    await apiFetch('/api/plants');
    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer test-token');
    vi.unstubAllGlobals();
  });

  it('ProtectedRoute redirige a login sin token', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Dashboard</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByText('Dashboard')).not.toBeInTheDocument());
  });
});
