export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

interface ApiFetchOptions extends RequestInit {
  timeout?: number;
}

export async function apiFetch<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : null;

  const isLoginRequest = url === '/api/auth/login';
  const fullUrl = `${API_BASE_URL}${url}`;

  // Bearer token desde localStorage
  const token = localStorage.getItem('plantpulse_token');

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      credentials: undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    // 204 No Content -> undefined
    if (response.status === 204) {
      return undefined as T;
    }

    // Parsear JSON o texto
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        (typeof data === 'string' ? data : `Error ${response.status}: ${response.statusText}`);

      const error = new ApiError(errorMessage, response.status, data?.errors);

      // 401 fuera de login borra sesión
      if (response.status === 401 && !isLoginRequest) {
        localStorage.removeItem('plantpulse_token');
        localStorage.removeItem('plantpulse_user');
        if (unauthorizedHandler) unauthorizedHandler();
      }

      throw error;
    }

    return data as T;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Solicitud cancelada por timeout', 408);
    }

    // Mensaje genérico si falla red
    throw new ApiError('Error de conexión con el servidor', 0);
  }
}
