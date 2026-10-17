import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { apiFetch, ApiError } from './api/client';
import Login from './Login';

// Mock apiFetch
vi.mock('./api/client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public details?: any) {
      super(message);
      this.name = 'ApiError';
    }
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper to render Login with AuthProvider
const renderLogin = () => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Login', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('renderiza el formulario de login con campos de email y contraseña', () => {
    renderLogin();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('muestra validación cuando el formulario está vacío y se intenta enviar', async () => {
    renderLogin();
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.click(submitButton);
    await new Promise((r) => setTimeout(r, 100));
    
    expect(screen.getByText(/el correo electrónico es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/la contraseña es obligatoria/i)).toBeInTheDocument();
  });

  it('muestra error cuando el formato del email es inválido', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    await new Promise((r) => setTimeout(r, 100));
    
    expect(screen.getByText(/el formato del correo electrónico no es válido/i)).toBeInTheDocument();
  });

  it('muestra error cuando se hace login exitoso (401)', async () => {
    (apiFetch as any).mockRejectedValueOnce(
      new ApiError('401 Credenciales inválidas', 401)
    );
    
    renderLogin();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText(/correo electrónico o contraseña incorrectos/i)).toBeInTheDocument();
  });

  it('muestra error cuando hay error de red', async () => {
    (apiFetch as any).mockRejectedValueOnce(
      new ApiError('Error de conexión con el servidor', 0)
    );
    
    renderLogin();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
  });

  it('llama a apiFetch con los datos correctos cuando el login es exitoso', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      token: 'mock-token-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    
    renderLogin();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(apiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
  });

  it('deshabilita el botón y muestra el spinner cuando está procesando', async () => {
    (apiFetch as any).mockImplementationOnce(() => new Promise(() => {})); // Never resolves
    
    renderLogin();
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/ingresando/i)).toBeInTheDocument();
  });
});