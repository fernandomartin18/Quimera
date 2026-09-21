<div align="center">

# Quimera

**Generación automatizada de código híbrido (clásico + cuántico) mediante sistemas multiagente**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LiteLLM](https://img.shields.io/badge/LiteLLM-1.60+-000000?style=flat-square)](https://docs.litellm.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## Overview

Quimera es una plataforma de investigación que convierte descripciones en lenguaje natural en código ejecutable híbrido: lógica clásica (Python/C++) combinada con circuitos cuánticos (Qiskit/PennyLane). El sistema utiliza una arquitectura multiagente donde agentes especializados colaboran para analizar, generar y validar el código resultante.

El proyecto se enmarca como Trabajo Final de Máster (TFM).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│         UI para prompts, selección de modelo,           │
│         visualización de código generado                │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Analista │→ │Clásico   │→ │ Cuántico │→ │Validar │  │
│  │ /Arq.    │  │Program.  │  │Program.  │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                    Capa de Inferencia                    │
├─────────────────────────────────────────────────────────┤
│  LiteLLM  ←→  Gemini API  |  Ollama / vLLM (local)     │
├─────────────────────────────────────────────────────────┤
│  RAG Mock (context_mock) ←→ Servicio RAG externo (fut.) │
└─────────────────────────────────────────────────────────┘
```

### Agentes del sistema

| Agente | Rol |
|--------|-----|
| **Analista / Arquitecto** | Descompone la descripción en componentes clásicos y cuánticos |
| **Programador Clásico** | Genera código Python / C++ para la lógica tradicional |
| **Programador Cuántico** | Genera circuitos y algoritmos cuánticos (Qiskit / PennyLane) |
| **Validador** | Análisis sintáctico y simulación básica del código resultante |

## Project status

> [!NOTE]
> **Estado actual: MVP - Capa de Generación de Código**

El backend expone una API REST con los siguientes endpoints:

- `GET /health` — Verificación de estado del servicio
- `GET /health/llm/{provider}` — Verificación de conectividad con el proveedor LLM
- `POST /generate` — Generación de código híbrido a partir de un prompt

El módulo de abstracción LLM soporta alternancia dinámica entre **Gemini API** (cloud) y **Ollama** (local) mediante un parámetro explícito en cada llamada.

### Pendiente

- Sistema multiagente completo (orquestación con LangGraph / CrewAI)
- Integración con servicio RAG externo
- Frontend React + Vite
- Parseo estructurado de la respuesta JSON del pipeline

## Getting started

### Prerequisites

- Python 3.11 o superior
- [Ollama](https://ollama.com/) (opcional, para modelos locales)
- Google Gemini API key (opcional, para modelos cloud)

### Installation

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/Quimera.git
cd Quimera

# Crear y activar entorno virtual
python3 -m venv backend/.venv
source backend/.venv/bin/activate

# Instalar dependencias
pip install -e "backend[dev]"

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tu GEMINI_API_KEY
```

### Run the backend

```bash
source backend/.venv/bin/activate
uvicorn app.main:app --reload
```

El servidor estará disponible en `http://localhost:8000`. La documentación interactiva de la API se accede en `http://localhost:8000/docs`.

### Test LLM connectivity

```bash
# Probar Gemini
python -m scripts.test_llm --provider gemini

# Probar Ollama (local)
python -m scripts.test_llm --provider local

# Probar ambos
python -m scripts.test_llm
```

> [!TIP]
> Para usar Ollama localmente, asegúrate de tener el servidor ejecutándose: `ollama serve`. Luego descarga un modelo con `ollama pull llama3.2`.

## Project structure

```
Quimera/
├── AGENTS.md                  # Convenciones y reglas del proyecto
├── backend/
│   ├── pyproject.toml         # Dependencias y configuración
│   ├── .env.example           # Template de variables de entorno
│   ├── app/
│   │   ├── main.py            # FastAPI app y endpoints
│   │   ├── core/
│   │   │   └── config.py      # Settings con pydantic-settings
│   │   ├── llm/
│   │   │   └── client.py      # Abstracción LLM (LiteLLM)
│   │   ├── schemas/
│   │   │   └── pipeline.py    # Modelos Pydantic (request/response)
│   │   ├── agents/            # (Próximamente: sistema multiagente)
│   │   ├── api/               # (Próximamente: rutas adicionales)
│   │   └── rag/               # (Mock connector para RAG)
│   └── scripts/
│       └── test_llm.py        # Script de prueba de conectividad
├── frontend/                  # (Próximamente: React + Vite)
└── .gitignore
```

## Development

```bash
# Linting
ruff check backend/

# Formateo
ruff format backend/

# Tests
pytest backend/tests/
```

## License

Distribuido bajo la licencia MIT. Ver `LICENSE` para más detalles.
