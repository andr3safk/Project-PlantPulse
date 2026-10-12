# PlantPulse — instrucciones para Claude Code

## Cómo trabajar conmigo

- Responde siempre en **español**.
- Trabaja **paso a paso**: explica qué vas a hacer y por qué antes de cambiar archivos. Es un proyecto académico y debemos poder explicar el código en la sustentación.
- Indica siempre **dónde** se ejecuta cada comando (terminal de Antigravity o de VS Code/PowerShell, SQL Server Management Studio). Alejandro usa Antigravity y Andrés usa VS Code; los comandos son los mismos en ambos y en qué carpeta.
- Cuando haya un error, resuélvelo paso a paso, sin teoría larga.
- Revisa el código como un desarrollador senior: errores, seguridad, buenas prácticas y legibilidad.
- Si ves una inconsistencia entre el código, la documentación o el alcance del MVP, avísame antes de seguir.
- No hagas `git push`, merges ni cambios en `develop`/`main` sin que yo lo pida.

## Proyecto

Sistema de monitoreo de plantas de interior: humedad del suelo, temperatura y luz.
Proyecto académico PGC 2026-1, Universidad de Cundinamarca (Seccional Ubaté).
Equipo: Alejandro Salgado (Product Owner y Developer) y Andrés Carrillo (Scrum Master y Developer). Gestión en Jira (clave `PLAN`).

Flujo de datos: **simulador de sensores → backend (API REST) → SQL Server → frontend**.

- Las **lecturas** las genera un script simulador en Node.js (`simulador/`).
- Un **ESP32 físico** se conecta **solo** para mostrar el estado conectado/desconectado del dispositivo. No envía lecturas (`esp32/`, subtarea PLAN-56).

## Stack (definitivo, no proponer cambios)

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite (`frontend/`). El prototipo está en TypeScript y usa Tailwind |
| Backend | Node.js + Express, API REST (`backend/`) |
| Base de datos | Microsoft SQL Server; scripts en `backend/database/` |
| Autenticación | bcrypt + JWT; secretos en `.env` (nunca en el repositorio, solo `.env.example`) |
| Pruebas | Vitest + Testing Library (frontend) |

Puertos locales: frontend 5173, backend 3000, SQL Server 1433.

## Alcance del MVP (Sprint 1, entrega 29/10/2026)

**Dentro:** login, dashboard, registrar/editar/eliminar plantas, API REST, base de datos, envío de lecturas simuladas, integración backend–frontend, pruebas unitarias y de integración.

**Fuera:** notificaciones automáticas, historial, gráficas avanzadas, app móvil, riego automático, IA, múltiples dispositivos. La mascota virtual se eliminó. `Diagnosis.tsx` (IA) y las notificaciones de `Settings.tsx` no se trabajan en el MVP.

Hoy las plantas y lecturas son datos falsos en `frontend/src/app/contexts/PlantContext.tsx`; se reemplazarán por llamadas a la API.

## Convenciones de Git

Ver `CONTRIBUTING.md`. Resumen:

- Rama por historia de usuario desde `develop` (`feature/PLAN-10-registro-plantas`), con subrama por persona cuando ambos trabajan en la historia (`...-alejandro`, `...-andres`).
- Commits: `<tipo>(<alcance>): <descripción en minúscula> [PLAN-XX]`, con la clave de la **subtarea**.
- Todo código entra a `develop` por PR. Solo los cambios exclusivamente de documentación pueden ir directo a `develop`.

## Comandos útiles

```powershell
# Frontend (terminal de Antigravity o VS Code, desde frontend/)
npm ci            # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run test:run  # pruebas
npm run build     # compilar
```
