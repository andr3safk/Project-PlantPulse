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
| Frontend | React + Vite (el prototipo actual está en TypeScript con Tailwind CSS) |
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

- [Node.js](https://nodejs.org/) 22 LTS o superior (probado con v24)
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
| `npm run preview` | Sirve localmente la versión generada en `dist/` |
| `npm test` | Ejecuta las pruebas en modo vigilancia |
| `npm run test:run` | Ejecuta las pruebas una sola vez |

> El backend y el simulador están en construcción. Sus instrucciones se agregarán en sus carpetas.

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