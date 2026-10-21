# 🌱 PlantPulse

**PlantPulse** es un sistema de monitoreo inteligente orientado al cuidado de plantas de interior, que permite visualizar y analizar variables ambientales como la humedad del suelo, la temperatura y la luz en tiempo real.

El proyecto simula un entorno IoT: las lecturas de los sensores las genera un script de software, lo que permite validar el flujo completo de datos, desde su captura hasta su visualización, sin depender de hardware físico.

Proyecto académico PGC 2026-1 — Universidad de Cundinamarca, Seccional Ubaté.

---

## 🚀 Funcionalidades

- 📊 Monitoreo en tiempo real de variables ambientales.
- 🌿 Gestión de plantas (crear, editar, eliminar).
- 📈 Visualización de datos históricos y gráficos.
- ⚠️ Generación de alertas ante condiciones críticas.
- 💡 Recomendaciones para el cuidado de plantas.
- 🔐 Autenticación de usuarios.

---

## 🏗️ Arquitectura

```
Simulador de sensores → Backend (API REST) → Base de datos → Frontend
```

- El **simulador** genera lecturas de humedad, temperatura y luz y las envía al backend.
- Un **ESP32** físico se conecta solo para mostrar en el dashboard que el dispositivo está conectado. No envía lecturas.

---

## 🛠️ Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | React + Vite con TypeScript y Tailwind CSS (decisión del PO, 17/10/2026) |
| Backend | Node.js + Express (API REST) |
| Base de datos | Microsoft SQL Server |
| Sensores | Simulados por software (Node.js) |
| Pruebas | Vitest + Testing Library |
| Modelado | UML (casos de uso, clases, diagramas de flujo) |

---

## 📂 Estructura del proyecto

```
Project-PlantPulse/
├── frontend/      # Aplicación React (Vite)
├── backend/       # API REST en Node.js + Express
│   └── database/  # Scripts SQL de SQL Server
├── simulador/     # Script que envía lecturas simuladas al backend
├── esp32/         # Código del ESP32 (solo estado de conexión)
├── docs/          # Diagramas UML y documentación técnica
└── README.md
```

---

## ⚙️ Requisitos

- [Node.js](https://nodejs.org/) 22 o 24 LTS. **Todavía no usar Node 25 o superior:** varias pruebas del frontend fallan (se corregirá en una tarea aparte).
- npm (incluido con Node.js). **No usar yarn ni pnpm:** el proyecto se instala solo con npm.
- Git

---

## ▶️ Ejecutar el frontend

```bash
# 1. Clonar el repositorio
git clone https://github.com/andr3safk/Project-PlantPulse.git

# 2. Entrar a la carpeta del frontend
cd Project-PlantPulse/frontend

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Luego abrir en el navegador: http://localhost:5173

### Scripts disponibles (dentro de `frontend/`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run typecheck` | Revisa los tipos de TypeScript sin generar archivos |
| `npm run preview` | Sirve localmente la versión generada en `dist/` |
| `npm test` | Ejecuta las pruebas en modo vigilancia |
| `npm run test:run` | Ejecuta las pruebas una sola vez |

> Instrucciones del backend en [`backend/README.md`](backend/README.md), del simulador en [`simulador/README.md`](simulador/README.md) y del ESP32 en [`esp32/README.md`](esp32/README.md).

---

## 📡 Estado del dispositivo en el dashboard

El dashboard se refresca solo cada 10 segundos. En la tarjeta de cada planta se ve:

| Indicador | Cuándo aparece |
|---|---|
| **Dispositivo conectado** | El último aviso del dispositivo llegó hace **menos de 60 s** |
| **Dispositivo desconectado** | La planta tiene dispositivo, pero no ha avisado en el último minuto |
| **Sin sensor vinculado** | La planta no tiene dispositivo (por ejemplo, las creadas desde el formulario) |
| **Sin datos en tiempo real** | La última lectura tiene **más de 5 minutos** |

El **ESP32** y el **simulador** usan la misma clave de dispositivo (`plantpulse_001`, el dispositivo del seed vinculado a la Monstera), y los dos cuentan como aviso de vida:

- El ESP32 envía un latido cada 20 s (`POST /api/devices/heartbeat`). **No envía lecturas.**
- El simulador envía una lectura cada 10 s (`POST /api/readings`).

| Simulador | ESP32 | Dashboard (Monstera) |
|---|---|---|
| Apagado | Apagado | Dispositivo desconectado · Sin datos en tiempo real |
| **Apagado** | **Encendido** | **Dispositivo conectado · Sin datos en tiempo real** |
| Encendido | Apagado o encendido | Dispositivo conectado · lecturas en tiempo real |

### Orden para la demostración

1. Con el **simulador apagado**, encender el ESP32: en menos de 20 s la Monstera pasa a **"Dispositivo conectado"** y sigue con **"Sin datos en tiempo real"**. Esto demuestra que el ESP32 está conectado (es la única combinación que solo puede producir el ESP32).
2. Encender el simulador: empiezan las lecturas en tiempo real y el aviso desaparece.

Con el simulador encendido, el dashboard no puede distinguir si el ESP32 está conectado o no (decisión de PO, 21/10/2026).

---

## 🔐 Variables de entorno

Los archivos `.env` contienen contraseñas y secretos, y **nunca se suben al repositorio** (están en `.gitignore`). Cada componente que los necesite incluirá un `.env.example` con los nombres de las variables, sin valores reales.

---

## 🤝 Flujo de trabajo

- **Ramas:** `main` (versión entregable), `develop` (integración), `feature/PLAN-XX-...` (historias de usuario), `fix/...`, `chore/...` y `docs/...`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/) con la clave de Jira al final. Ejemplo: `feat(frontend): validar formulario de registro [PLAN-17]`.
- **Integración:** todo cambio llega a `develop` mediante Pull Request revisado por el otro integrante.
- **Gestión:** Scrumban en Jira (proyecto PLAN).

---

## 📌 Estado del proyecto

🚧 En desarrollo — Sprint 1 (MVP).

- ✅ Prototipo visual del frontend
- ✅ Estructura del repositorio y entorno de desarrollo
- ⏳ Backend y API REST
- ⏳ Base de datos en SQL Server
- ⏳ Inicio de sesión
- ⏳ Simulador de sensores
- ⏳ Diagramas UML en `docs/`

---

## 🎯 Objetivo

Desarrollar una plataforma que facilite el monitoreo y cuidado de plantas mediante el uso de tecnologías digitales, mejorando la toma de decisiones del usuario y promoviendo prácticas sostenibles.

---

## 👨‍💻 Autores

- **Andrés Carrillo** — Scrum Master y Developer
- **Alejandro Salgado** — Product Owner