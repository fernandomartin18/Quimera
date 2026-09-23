<div align="center">
  <img src="./frontend/public/favicon.svg" alt="Quimera" height="72" />

# Quimera

**Generación automatizada de código híbrido (clásico + cuántico) mediante sistemas multiagente**

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LiteLLM](https://img.shields.io/badge/LiteLLM-1.60+-000000?style=flat-square)](https://docs.litellm.ai/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Arquitectura](#arquitectura) • [Pipeline de agentes](#pipeline-de-agentes) • [API REST](#api-rest) • [Frontend](#frontend) • [Puesta en marcha](#puesta-en-marcha)
</div>

---

Quimera es una plataforma para generar **código ejecutable híbrido**: lógica clásica combinada con circuitos y algoritmos cuánticos.

Un sistema multiagente analiza el requerimiento, descompone la solución en módulos clásicos y cuánticos, genera el código de cada uno de ellos en paralelo y devuelve el resultado con una explicación de la arquitectura. Toda la inferencia pasa por [LiteLLM](https://docs.litellm.ai), por lo que **cualquier proveedor** (Gemini, OpenAI, Anthropic, Mistral u Ollama local) funciona con el mismo código.

## Características

- **Pipeline multiagente** — Agente Arquitecto que planifica, y programadores clásico y cuántico que generan cada módulo en paralelo (`asyncio.gather`).
- **Respuesta estructurada** — Salida Pydantic validada: `classical_modules`, `quantum_modules`, `architecture_notes`.
- **Multi-proveedor** — Un único string LiteLLM (`openai/gpt-4o`, `anthropic/claude-sonnet-4-20250514`, `ollama/llama3.2`, …) por petición.
- **Reintentos inteligentes** — Backoff exponencial ante errores transitorios y respeto del `retryDelay` de los rate limits.
- **Frontend React + Vite** — Generador con selector cascada proveedor → modelo (lista los modelos instalados en Ollama), visor de código Monaco, notas de arquitectura en Markdown.
- **Internacionalización y temas** — ES/EN con detección de sistema, temas claro/oscuro/automático, preferencias persistidas.
- **Funciona en local** — Desarrollo completo contra Ollama sin coste de API cloud.

## Arquitectura

```
┌────────────────────────────────────────────────────────────┐
│  Frontend · React 19 + Vite  (:5173)                       │
└──────────────────────────┬─────────────────────────────────┘
                           │  POST /api/generate-code
                           │  (proxy Vite → POST /generate)
┌──────────────────────────▼─────────────────────────────────┐
│  Backend · FastAPI  (:8000)                                │
│                                                            │
│   MultiAgentPipeline                                       │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ 1. Agente Arquitecto     prompt → ArchitectPlan      │ │
│   │ 2. Programador clásico × N specs  ┐                  │ │
│   │    Programador cuántico × M specs ┴─ en paralelo     │ │
│   └──────────────────────────────────────────────────────┘ │
│              │                                             │
│   Capa de inferencia · LiteLLM (litellm.acompletion)       │
├────────────────────────────────────────────────────────────┤
```

| Componente | Tecnología | Rol |
|---|---|---|
| `frontend/` | React 19, Vite 8 | UI: prompt, selección de proveedor/modelo, resultados y ajustes |
| `backend/app/` | FastAPI, Pydantic | API REST y orquestación del pipeline multiagente |
| `backend/app/agents/` | asyncio | Prompts y orquestación de los agentes |
| `backend/app/llm/` | LiteLLM | Abstracción única de proveedores LLM |

## Pipeline de agentes

El corazón del sistema es `MultiAgentPipeline` (`backend/app/agents/pipeline.py`), orquestador asíncrono con **tres roles de agente** y un único punto de entrada `await pipeline.run(prompt)`.

### Flujo de ejecución

```
prompt (lenguaje natural)
   │
   ▼
[1] Agente Arquitecto ──► ArchitectPlan
        │                   ├─ classical_specs[]  (ModuleSpec)
        │                   ├─ quantum_specs[]    (ModuleSpec)
        │                   └─ architecture_overview (str)
        │
        ▼
[2] asyncio.gather ── todos los specs, en paralelo y preservando orden
        ├─ spec clásica × N ──► Programador Clásico ──► CodeModule
        └─ spec cuántica × M ─► Programador Cuántico ─► CodeModule
   │
   ▼
[3] PipelineResult { classical_modules, quantum_modules,
                     architecture_notes ← architecture_overview }
```

1. **Análisis (secuencial).** El Arquitecto recibe la descripción del problema (más las instrucciones adicionales, si existen) y devuelve un plan JSON con las especificaciones de cada módulo y una visión general de la arquitectura híbrida.
2. **Generación (paralela).** Cada `ModuleSpec` se convierte en una tarea independiente; los programadores clásico y cuántico se lanzan juntos con `asyncio.gather`, que preserva el orden de los resultados. Un fallo en cualquier tarea aborta la ejecución completa.
3. **Ensamblado.** Se devuelve `PipelineResult`. `architecture_notes` es literalmente el `architecture_overview` producido por el Arquitecto. Si el plan no contiene ninguna especificación, se lanza `PipelineError`.

### Agentes

| Agente | Clase/Prompt | Entrada | Salida | Modelo |
|---|---|---|---|---|
| **Arquitecto / Analista** | `ARCHITECT_SYSTEM_PROMPT` | Descripción del problema + instrucciones extra | `ArchitectPlan` (specs + overview) | `architect_model` |
| **Programador Clásico** | `CLASSICAL_PROGRAMMER_SYSTEM_PROMPT` | 1 spec clásica + overview | `CodeModule` (`filename`, `code`, `description`) | `classical_model` |
| **Programador Cuántico** | `QUANTUM_PROGRAMMER_SYSTEM_PROMPT` | 1 spec cuántica + overview | `CodeModule` | `quantum_model` |

Los tres roles comparten la función `generate()` de `app/llm/client.py`; solo cambian el *system prompt* y, opcionalmente, el modelo. En el constructor del pipeline, cada `architect_model` / `classical_model` / `quantum_model` cae al `model` general si no se indica (el endpoint HTTP solo expone el modelo general).

> [!NOTE]
> La validación de resultados se realiza con los esquemas Pydantic (`ArchitectPlan`, `CodeModule`). No hay hoy un agente "validador" con simulación de circuitos; está previsto en la hoja de ruta.

### Prompts de los agentes

Los tres *system prompts* viven en `backend/app/agents/prompts.py`, instruyen en español y terminan siempre con la misma regla: **responder solo con un objeto JSON válido**, sin markdown ni texto adicional. El prompt embebe la estructura JSON esperada.

**Arquitecto:**

- Descomponer el problema respetando los `filename` indicados por el usuario; si no los hay, proponer nombres descriptivos en *snake_case* con extensión (`.py`, `.cpp`…).
- Generar tantos módulos como hagan falta, sin fusionar responsabilidades distintas.
- Cada spec debe incluir `requirements` accionables (funciones/clases, bibliotecas, conexiones con otros módulos).
- Rellenar `language` en specs clásicas (`python`, `cpp`…) y `framework` en las cuánticas (`qiskit`, `pennylane`…).
- `architecture_overview` debe explicar el flujo de datos completo y qué módulo invoca a cuál.

```json
{
  "classical_specs": [
    { "filename": "main.py", "description": "…",
      "requirements": "…", "language": "python" }
  ],
  "quantum_specs": [
    { "filename": "ansatz.py", "description": "…",
      "requirements": "…", "framework": "qiskit" }
  ],
  "architecture_overview": "explicación técnica de la solución híbrida"
}
```

**Programador Clásico:**

- Código completo y ejecutable.
- Python con *type hints*, nombres descriptivos y docstrings breves.
- Si debe invocar módulos cuánticos, definir una interfaz de llamada clara (imports y firmas) según el overview recibido.

**Programador Cuántico:**

- Código ejecutable en simulador local usando el `framework` de la spec.
- Firmas claras para que la capa clásica lo importe y lo ejecute (construcción de circuito, ejecución simulador/QPU, obtención de resultados).
- Comentarios solo donde la notación cuántica lo requiera.

```json
{ "filename": "…", "code": "código fuente completo", "description": "…" }
```

El mensaje de usuario de cada programador combina el overview con la spec serializada:

```text
Visión general de la arquitectura híbrida:
{architecture_overview}

Especificación del módulo a generar:
{spec en JSON}
```

### Reintentos y manejo de errores

`call_llm_with_retry()` protege **cada** llamada LLM del pipeline con dos estrategias:

| Error | Reintentos | Espera |
|---|---|---|
| `litellm.RateLimitError` (429) | 2 | Respeta el `retryDelay` sugerido por el proveedor; si no lo hay, backoff 3 s → 6 s |
| `ServiceUnavailableError` / `TimeoutError` | 5 | Backoff exponencial 3 → 6 → 12 → 24 → 48 s (tope 60 s) |
| Cualquiera otro | 0 | Se propaga de inmediato |

- Al agotar los reintentos se lanza `PipelineError` con el detalle del último error.
- Si el rate limit corresponde a una **cuota diaria agotada** (`Quota exceeded`, `GenerateRequestsPerDay`), el mensaje explica la causa (free-tier de Gemini), cuándo se renueva y las alternativas (activar billing u otra `API_KEY` en `.env`).
- Prompt vacío → `PipelineError("El prompt no puede estar vacío")` antes de tocar el LLM.

### Extracción y validación del JSON

Los LLM a veces enmarcan la respuesta en bloques ```json```. El pipeline lo tolera:

- `extract_json(text)` — recorta fences markdown, extrae el primer objeto `{…}` entre llaves y lo parsea. JSON ausente o inválido → `PipelineError`.
- **Arquitecto** — el resultado se valida con `ArchitectPlan.model_validate()`. Un `ValidationError` aborta el pipeline (no se reintenta el plan).
- **Programadores** — `CodeModule(filename, code, description)`. Si la respuesta no es JSON, falla la validación o falta `code`, se aplica un **fallback por módulo**: se usa `spec.filename`, `strip_code_fences(raw)` como código y `spec.description`. Así un solo módulo malformado no tumba toda la ejecución (queda un `logger.warning`).

### Parámetros de inferencia

| Parámetro | Valor | Nota |
|---|---|---|
| `max_tokens` | `8192` (pipeline) | `generate()` usa 4096 por defecto; el pipeline lo eleva |
| `temperature` | no enviada | Se omite para usar el valor por defecto del proveedor |
| `timeout`/streaming | — | No se configuran en el cliente |
| `api_key` / `api_base` | opcionales por petición | Sobrescriben las variables de entorno |

## Modelos y proveedores

El cliente LLM es una envoltura fina sobre `litellm.acompletion`. **El proveedor se resuelve a partir del prefijo del modelo**, sin lista de permitidos:

| Proveedor | Ejemplo de `model` | Variable de entorno |
|---|---|---|
| Google Gemini | `gemini/gemini-3.6-flash` | `GEMINI_API_KEY` |
| OpenAI | `openai/gpt-4o` | `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral/mistral-large-latest` | `MISTRAL_API_KEY` |
| Ollama (local) | `ollama/llama3.2` | ninguna (usa `api_base`) |
| Otros LiteLLM | Bedrock, Together, Groq, Cohere… | según documentación LiteLLM |

> [!TIP]
> Con [Ollama](https://ollama.com) instalado puedes recorrer todo el pipeline sin ninguna API key cloud.

## API REST

Base URL: `http://localhost:8000` · Documentación interactiva en `/docs`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/generate` | Ejecuta el pipeline y devuelve los módulos híbridos |
| `GET` | `/health` | Estado del servicio (sin tocar el LLM) |
| `GET` | `/health/llm/{model:path}` | Comprobación de conectividad con un modelo concreto |

### `POST /generate`

**Request**

```json
{
  "prompt": "Optimiza una ruta de reparto combinando heurística clásica y Grover",
  "model": "gemini/gemini-3.6-flash",
  "api_key": null,
  "api_base": null,
  "system_prompt": null
}
```

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `prompt` | `str` (≥1) | — | Descripción del código a generar |
| `model` | `str` | `gemini/gemini-3.6-flash` | Cualquier string LiteLLM |
| `api_key` | `str \| null` | `null` | API key explícita (opcional) |
| `api_base` | `str \| null` | `null` | URL base para proveedores locales |
| `system_prompt` | `str \| null` | `null` | Instrucciones adicionales: se **añaden al mensaje del Arquitecto** (no sustituyen su system prompt ni llegan a los programadores) |

**Response `200`**

```json
{
  "classical_modules": [
    { "filename": "main.py", "code": "…", "description": "…" }
  ],
  "quantum_modules": [
    { "filename": "grover_search.py", "code": "…", "description": "…" }
  ],
  "architecture_notes": "…visión general de la arquitectura híbrida…",
  "model_used": "gemini/gemini-3.6-flash"
}
```

| Campo | Tipo | Origen |
|---|---|---|
| `classical_modules` | `CodeModule[]` | Programador clásico (en paralelo) |
| `quantum_modules` | `CodeModule[]` | Programador cuántico (en paralelo) |
| `architecture_notes` | `str` | `architecture_overview` del Arquitecto |
| `model_used` | `str` | Eco del `model` recibido |

Errores: `422` si la petición no valida (Pydantic/FastAPI); un `PipelineError` no capturado devuelve `500`.

> [!IMPORTANT]
> El frontend llama a `POST /api/generate-code`; el proxy de Vite lo reescribe a `POST /generate` (ver [Frontend → Integración con la API](#integración-con-la-api)).

### Scripts de comprobación

```bash
# Conectividad: health check + generación de prueba
python -m scripts.test_llm
python -m scripts.test_llm --model proveedor/modelo

# Pipeline end-to-end con logging y JSON final formateado
python -m scripts.test_pipeline
python -m scripts.test_pipeline --model proveedor/modelo --prompt "Tu descripción"
```

## Frontend

Aplicación SPA en `frontend/`: React 19 + Vite 8, enrutamiento con `react-router-dom`, i18n con `i18next`, toasts con `react-hot-toast`, visor de código con `@monaco-editor/react` (Monaco **empaquetado localmente**, sin CDN, para que funcione offline) y notas de arquitectura con `react-markdown`.

### Rutas

| Ruta | Página | Contenido |
|---|---|---|
| `/` | `pages/Generator.jsx` | Generador de código híbrido |
| `/settings` | `pages/Settings.jsx` | Ajustes (secciones modulares) |

### Generador (`/`)

- **Descripción del problema** en un `textarea` con hint de contexto.
- **Selector cascada proveedor → modelo**, bajo la caja de texto:
  - Proveedores: Google Gemini, OpenAI, Anthropic, Mistral AI y Ollama (local), con catálogo de modelos propios (`src/constants/providers.js`).
  - **Ollama**: al seleccionarlo se consultan los modelos instalados (`GET /ollama/api/tags`) y se listan dinámicamente. Estados de carga ("Cargando modelos…" + spinner en el propio select), sin modelos, o error con **botón Reintentar** si el demonio no responde. Se descartan respuestas tardías de una selección que ya cambió.
- **Botón "Generar código"** con validación previa (prompt vacío o sin modelo → toast de error).
- **Estado de carga**: spinner en el botón y panel indicando que el pipeline multiagente está trabajando (el timeout de petición es de **10 minutos** para modelos locales lentos).
- **Panel de resultados** con tres pestañas:
  - *Módulos clásicos* y *Módulos cuánticos*: lista de archivos a la izquierda + visor Monaco a la derecha (resaltado según extensión, tema sincronizado con la app) y **botón de copiar código** al portapapeles.
  - *Notas de arquitectura*: `architecture_notes` renderizado como Markdown.
  - Cabecera con badge del `model_used` y contadores por pestaña.

### Ajustes (`/settings`)

Navegación lateral modular (`SETTINGS_SECTIONS` + `SECTION_COMPONENTS`): hoy activa **Preferencias**; *Proveedores de IA* y *Perfil* aparecen como "Próximamente" y se habilitan añadiendo su componente al mapa.

- **Idioma**: Español / English / Automático (Sistema) — detecta `navigator.languages`.
- **Tema**: Claro / Oscuro / Automático (Sistema) — respeta `prefers-color-scheme` y reacciona a cambios en vivo.
- Ambas preferencias se persisten en `localStorage` (`quimera.preferences`) y se muestran con el valor resuelto ("En uso ahora: …").

### Internacionalización y tema

- Recursos en `src/i18n/locales/{es,en}.json`; fallback a `en`.
- Un script inline en `index.html` aplica tema e idioma **antes de que React pinte**, evitando el destello de tema incorrecto (FOUC).
- Los tokens de diseño (colores, superficies, bordes, sombras) viven en `src/styles/variables.css` bajo `:root` / `[data-theme='dark']`; todos los componentes consumen `var(--…)`, así que cambiar `data-theme` recolorea toda la UI (toasts incluidos).
- Botón en la cabecera para ciclar `system → light → dark`.

### Integración con la API

| Servicio | Llamada | Timeout | Tras el proxy de Vite |
|---|---|---|---|
| `src/services/api.js` → `generateCode()` | `POST /api/generate-code` `{"prompt","model"}` | **10 min** (`AbortSignal`) | → backend `POST /generate` |
| `src/services/ollama.js` → `fetchOllamaModels()` | `GET /ollama/api/tags` | 8 s | → Ollama `GET /api/tags` |

- `ApiError` con códigos `network` / `timeout` / `http` (+ `status`, `detail`): cada código se traduce a un toast localizado (sin backend, timeout, detalle del servidor o genérico).
- Los fallos al listar modelos de Ollama se gestionan inline, con reintento.

### Estilos

- `src/styles/` — **globales**: `variables.css` (tokens y temas) y `global.css` (reset, shell, botones, campos, estados vacíos).
- `src/css/` — **un archivo por componente**: `Header`, `Generator`, `Results`, `FileList`, `CodeViewer`, `Markdown`, `Settings`, `SegmentedControl`, `Spinner`.

### Estructura del frontend

```
frontend/src
├── App.jsx                  # Rutas + <Toaster>
├── main.jsx                 # Provider de preferencias + i18n
├── components/              # Header, ResultsPanel, CodeViewer, FileList,
│                             # MarkdownPanel, SegmentedControl, Spinner,
│                             # Icons, settings/PreferencesSection
├── constants/providers.js   # Proveedores y catálogos de modelos
├── context/                 # Preferencias de idioma y tema
├── css/                     # Estilos por componente
├── i18n/                    # index.js + locales es/en
├── lib/monaco.js            # Monaco local (sin CDN)
├── pages/                   # Generator, Settings
├── services/                # api.js (generate), ollama.js (modelos)
└── styles/                  # variables.css, global.css
```

## Puesta en marcha

### Requisitos

- Python **3.11+**
- Node.js **20+** (probado con 24) y npm
- [Ollama](https://ollama.com) *(opcional)*, para modelos locales
- Una API key de al menos un proveedor LLM *(no necesaria con Ollama)*

### 1. Backend

```bash
# Entorno virtual e instalación
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -e "backend[dev]"

# Variables de entorno
cp backend/.env.example backend/.env
# Edita backend/.env con la API key del proveedor que vayas a usar

# Arrancar (http://localhost:8000, con recarga automática)
cd backend && uvicorn app.main:app --reload
```

Con el entorno activado también existe el script de consola `quimera` (equivale a `app.main:run`).

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # opcional: los proxies ya vienen por defecto
npm install
npm run dev                 # http://localhost:5173
```

> [!IMPORTANT]
> Arranca **primero el backend** y después el frontend: el formulario llama a `/api/generate-code` y, si FastAPI no está levantado, verás el toast de error de conexión.

### 3. Generar código

1. Abre `http://localhost:5173`.
2. Escribe la descripción del problema.
3. Elige proveedor → modelo (con Ollama verás los modelos instalados en tu equipo).
4. Pulsa **Generar código** y revisa los tres resultados.

### Variables de entorno

**`backend/.env`**

| Variable | Default | Descripción |
|---|---|---|
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, … | — | Define solo la del proveedor que uses; LiteLLM las detecta solo |
| `DEFAULT_MODEL` | `gemini/gemini-3.6-flash` | Modelo por defecto del pipeline |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Reservado para Ollama (hoy la conexión se hace vía `api_base`) |
| `LOG_LEVEL` | `INFO` | Nivel de logging (`Settings` + `logging.basicConfig`) |

**`frontend/.env`**

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base del cliente API |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Destino del proxy `/api` |
| `VITE_OLLAMA_BASE_URL` | `/ollama` | Base del cliente Ollama (o URL directa si habilitas CORS) |
| `OLLAMA_PROXY_TARGET` | `http://localhost:11434` | Destino del proxy `/ollama` |

## Desarrollo

```bash
# Backend — lint y formato (ruff, línea 100, reglas E,F,I,N,UP,B)
ruff check backend/
ruff format backend/

# Frontend — lint (oxlint), build y preview
cd frontend
npm run lint
npm run build
npm run preview
```

## Estructura del repositorio

```
Quimera/
├── AGENTS.md                  # Convenciones y reglas del proyecto
├── README.md
├── backend/
│   ├── pyproject.toml         # Dependencias, ruff, pytest, script `quimera`
│   ├── .env.example           # Template de variables de entorno
│   ├── app/
│   │   ├── main.py            # App FastAPI: CORS y endpoints
│   │   ├── core/config.py     # Settings (pydantic-settings)
│   │   ├── llm/client.py      # generate() y health_check() sobre LiteLLM
│   │   ├── agents/
│   │   │   ├── pipeline.py    # MultiAgentPipeline, reintentos, extract_json
│   │   │   └── prompts.py     # System prompts de los 3 agentes
│   │   ├── schemas/pipeline.py# Modelos Pydantic request/response
│   │   ├── api/               # (reservado)
│   │   └── rag/               # Placeholder aislado del RAG externo
│   └── scripts/
│       ├── test_llm.py        # Conectividad con proveedores
│       └── test_pipeline.py   # Pipeline end-to-end por CLI
└── frontend/                  # React + Vite
    ├── index.html             # Bootstrap de tema/idioma antes de pintar
    ├── vite.config.js         # Proxy /api y /ollama
    └── src/
        ├── pages/  components/  services/
        ├── i18n/   context/    constants/
        ├── styles/ (globales)  css/ (por componente)
        └── lib/monaco.js
```

## Estado y hoja de ruta

**Funciona hoy**

- Pipeline multiagente de extremo a extremo (Arquitecto → programadores en paralelo → respuesta estructurada)
- API REST `/generate` con reintentos y fallback por módulo
- Frontend completo: generador, selector proveedor → modelo con listado dinámico de Ollama, resultados en pestañas, visor Monaco, i18n y temas
- Soporte de cualquier proveedor LiteLLM (cloud y local)

**Pendiente**

- Agente validador (análisis sintáctico y simulación de circuitos)
- Integración real con el servicio RAG externo (hoy `app/rag/` es un placeholder)
- Orquestación con LangGraph / CrewAI
- Parseo estructurado con re-intento del plan del Arquitecto
- Secciones de Ajustes: Proveedores/API keys y Perfil
- Tests automatizados (backend y frontend)
