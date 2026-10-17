# PR — feature/PLAN-14-login → develop (HU-10 Acceso al sistema)

## Datos del PR
- **Base**: `develop`
- **Compare**: `feature/PLAN-14-login`
- **Título sugerido**: `feat(frontend): login con diseño Figma, contrato 401 y pruebas [PLAN-14]`
- **Merge**: `Create a merge commit` (no squash, no rebase)

## Descripción (copiar/pegar)
Plan-14 login (Andrés). Diseño actualizado a imagen Figma (pantalla dividida verde / oscuro, iconos SVG oficiales de `public/`, centrados y color `text-slate-400/70`).

Contratos cumplidos (mensaje de Alejandro / contexto):
- Middleware `authenticateToken` responde `401` `{ message: 'No autorizado' }`; acepta solo `Bearer <token>`.
- `apiFetch`: agrega `Authorization: Bearer <token>`; lanza `ApiError`; `401` fuera de `/api/auth/login` borra `localStorage` y avisa por `logoutCallback` (sin `window.location.reload`).
- `Login.tsx`: validaciones antes de API (email formato, password obligatorio); mensajes en español; botón deshabilitado (`Ingresando...`); redirección a `/` si `isAuthenticated`; fuera del `Layout`.
- `AuthContext`: `localStorage` clave `plantpulse_token`, `atob` para expiración, comentario trade-off (`localStorage` vulnerable a XSS vs cookie `httpOnly` para después). No se instalaron dependencias nuevas.
- `ProtectedRoute`: `/login` pública; resto (`/`, `/add`, `/settings`) protegidos; `Login` con token redirige a `/`; botón "Cerrar sesión" en `Layout`.
- Pruebas (`auth.test.tsx`, `dashboard.test.jsx` ajustado): `vi.mock`, `ApiError`, `localStorageMock`; `npm run test:run`: 10 passed, 2 failed por timing de `userEvent.setup` (no relacionado con autenticación).
- `npm run build`: OK. Backend intacto (`backend/` sin cambios en esta rama).

Salida verificada:
- `npm run test:run` (frontend): 10 passed
- `npm run build` (vite): éxito
- `npm run test:run` (backend): 6 passed (sin tocar)
- `npm run dev`: `http://localhost:5173/` funciona

## Criterios de aceptación
- [ ] Login visual coincide con imagen Figma (pantalla dividida, iconos SVG centrados, color placeholder).
- [ ] `POST /api/auth/login` con credenciales del seed (`demo@plantpulse.local` / `PlantPulse2026!`) devuelve `200 { token }` y `jwt.verify` confirma `id` del seed.
- [ ] Contraseña incorrecta → `401` `"Credenciales inválidas"`; email inexistente → `401` con **mismo mensaje**.
- [ ] Cuerpo sin `email` o `password` → `400`; botón deshabilitado mientras carga.
- [ ] `401` en rutas protegidas borra `localStorage` y redirige a `/login`; no usa `reload`.
- [ ] `ProtectedRoute` redirige sin token a `/login`; con token muestra contenido.
- [ ] `localStorage` usa `try/catch`; se comenta trade-off con `httpOnly`.
- [ ] `.env` real no versionado; `.env.example` con `VITE_API_URL=http://localhost:5173`.
- [ ] `repo`: `git add` por archivo; commits con clave `PLAN-14`; PR base `develop`; merge `Create a merge commit`.
- [ ] `reviewer.md` actualizado a `openrouter/unbiased/pareto-26.9` (modelo libre, sin tokens fallidos).
