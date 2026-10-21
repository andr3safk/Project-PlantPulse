import { vi } from 'vitest';
import '@testing-library/jest-dom'

const localStorageMock = {
  getItem: vi.fn((key) => (key === 'plantpulse_token' ? 'tok' : null)),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// jsdom no implementa matchMedia; sonner (Toaster) y next-themes lo usan
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
