# Guía de contribución — PlantPulse

Convenciones de trabajo acordadas por el equipo (Alejandro Salgado y Andrés Carrillo).

## 1. Ramas

```
main      ← solo entregas estables (merge desde develop al cerrar un sprint)
develop   ← integración de historias terminadas
 └── feature/PLAN-10-registro-plantas                  ← rama de la HISTORIA de usuario
      ├── feature/PLAN-10-registro-plantas-alejandro   ← subrama de Alejandro
      └── feature/PLAN-10-registro-plantas-andres      ← subrama de Andrés
```

1. La **rama de la historia** sale de `develop`. La crea quien empiece primero y la sube a GitHub.
2. Cada integrante crea **su subrama** desde la rama de la historia y trabaja ahí sus subtareas.
3. Cada uno abre un **PR de su subrama hacia la rama de la historia**. El otro integrante lo revisa.
4. Con la historia completa y funcionando, se abre un **PR de la rama de la historia hacia `develop`**.
5. Si en una historia solo trabaja una persona, no hace falta subrama.
6. Las tareas transversales van en su propia rama desde `develop`. Ejemplo: `chore/PLAN-50-reorganizar-estructura`.

| Prefijo | Uso |
|---|---|
| `feature/` | Historia de usuario o funcionalidad |
| `fix/` | Corrección de un error ya integrado en `develop` |
| `chore/` | Estructura, configuración o dependencias |
| `docs/` | Documentación (opcional, ver excepción) |

Los nombres de rama van en minúsculas, con guiones, sin tildes ni ñ, e incluyen la clave de Jira cuando la hay.

## 2. Commits (Conventional Commits)

```
<tipo>(<alcance>): <descripción en imperativo, minúscula, sin punto final> [PLAN-XX]
```

- **Tipos:** `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`.
- **Alcances:** `frontend`, `backend`, `db`, `simulador`, `esp32`, `docs`, `repo`.
- `[PLAN-XX]` es la clave de la **subtarea** de Jira.

Ejemplos:

```
feat(frontend): validar nombre del formulario de registro [PLAN-17]
feat(backend): agregar login con bcrypt y jwt [PLAN-54]
docs(repo): agregar guia de contribucion
```

Haz commits pequeños: un cambio lógico por commit.

## 3. Pull Requests

- Todo cambio de **código o configuración** entra a `develop` por Pull Request, y lo revisa el otro integrante.
- Antes de abrir un PR, verifica que el proyecto instala (`npm ci`) y que las pruebas pasan (`npm run test:run`). En el frontend, verifica además los tipos (`npm run typecheck`) y la compilación (`npm run build`).
- La descripción del PR indica qué se hizo, qué subtareas de Jira incluye y cómo probarlo.

## 4. Excepción: cambios solo de documentación

Los cambios que **solo** modifican archivos de documentación (`*.md`, diagramas en `docs/`) pueden subirse **directamente a `develop`**, sin rama ni PR, con estas condiciones:

- **No tocan** código, `package.json`, archivos de configuración ni scripts SQL.
- El commit usa el tipo `docs`. Ejemplo: `docs(repo): actualizar readme`.
- Se avisa al otro integrante después de subirlo.
- Hacer `git pull` de `develop` antes de editar, para no generar conflictos.

Si un cambio mezcla documentación con código, **no** aplica la excepción: va por rama y PR.

## 5. Seguridad

- Nunca subir `node_modules/`, `dist/` ni archivos `.env`.
- Las credenciales (contraseña de SQL Server, secreto JWT) van en `.env`. En el repositorio solo va `.env.example`, sin valores reales.
- Las contraseñas de usuarios se guardan con hash **bcrypt**.
