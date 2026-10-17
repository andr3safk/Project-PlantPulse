// Pruebas del menú del Layout — PLAN-59
// Diagnóstico (IA) está fuera del MVP: no debe aparecer en el menú de escritorio ni en el móvil.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './Layout';

// Layout con el router en memoria, igual que en routes.tsx pero sin ProtectedRoute
const renderLayout = () => {
  const router = createMemoryRouter(
    [{ path: '/', Component: Layout, children: [{ index: true, element: <p>contenido</p> }] }],
    { initialEntries: ['/'] }
  );
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

// Comprueba los enlaces de un menú: siguen los del MVP y no está Diagnóstico
const revisarEnlacesDelMenu = (menu: HTMLElement) => {
  const enlaces = within(menu).getAllByRole('link');

  expect(within(menu).queryByRole('link', { name: /diagnóstico temprano/i })).not.toBeInTheDocument();
  expect(enlaces.some((enlace) => enlace.getAttribute('href') === '/diagnosis')).toBe(false);

  expect(within(menu).getByRole('link', { name: /mis plantas/i })).toHaveAttribute('href', '/');
  expect(within(menu).getByRole('link', { name: /añadir planta/i })).toHaveAttribute('href', '/add');
  expect(within(menu).getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/settings');
  expect(enlaces).toHaveLength(3);
};

describe('Layout', () => {
  it('el menú de escritorio no muestra Diagnóstico y conserva Dashboard, añadir planta y Configuración', () => {
    const { container } = renderLayout();
    const menuEscritorio = container.querySelector('aside');

    expect(menuEscritorio).not.toBeNull();
    revisarEnlacesDelMenu(menuEscritorio as HTMLElement);
  });

  it('el menú móvil no muestra Diagnóstico y conserva Dashboard, añadir planta y Configuración', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout();

    // El botón del menú móvil solo tiene el ícono Menu de lucide-react
    const botonMenu = container.querySelector('svg.lucide-menu')?.closest('button');
    expect(botonMenu).toBeTruthy();
    await user.click(botonMenu as HTMLButtonElement);

    // Al abrirlo hay dos menús: el de escritorio (aside) y el móvil
    const menuMovil = screen
      .getAllByRole('link', { name: /añadir planta/i })
      .map((enlace) => enlace.parentElement as HTMLElement)
      .find((menu) => !menu.closest('aside'));

    expect(menuMovil).toBeDefined();
    revisarEnlacesDelMenu(menuMovil as HTMLElement);
  });

  it('en toda la página no queda ningún enlace a /diagnosis', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout();
    await user.click(container.querySelector('svg.lucide-menu')?.closest('button') as HTMLButtonElement);

    expect(screen.queryByText(/diagnóstico temprano/i)).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/diagnosis"]')).toBeNull();
  });
});
