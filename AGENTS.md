# AGENTS.md

## 1. Propósito del Proyecto
Desarrollar una plataforma para la generación automatizada de código híbrido (clásico y cuántico) a partir de descripciones en lenguaje natural mediante un sistema multiagente. El proyecto se enmarca en un trabajo de investigación y Trabajo Final de Máster (TFM).

## 2. Arquitectura del Sistema
El sistema se divide en los siguientes componentes principales:
* **Frontend:** Aplicación web en React con Vite para la introducción de requisitos, selección del modelo y visualización del código generado.
* **Backend de IA:** Servicio en FastAPI (Python) encargado de orquestar la lógica multiagente y gestionar la inferencia de los LLM.
* **Capa de Inferencia (Multiagente):**
  * **Agente Arquitecto/Analista:** Procesa la entrada textual y descompone los requisitos en componentes clásicos y cuánticos.
  * **Agente Programador Clásico:** Genera el código para la capa tradicional (Python / C++).
  * **Agente Programador Cuántico:** Genera circuitos y algoritmos cuánticos (Qiskit / PennyLane).
  * **Agente de Validación:** Realiza análisis sintáctico y simulación básica del código resultante.
* **Capa RAG (Módulo Externo):** Microservicio para la gestión de contexto y patrones de diseño. En la fase actual se encuentra aislado mediante un conector simulado (`context_mock`).

## 3. Stack Tecnológico
* **Lenguaje Backend:** Python 3.11+
* **Framework Web:** FastAPI / Uvicorn
* **Orquestación Multiagente / LLM:** LangGraph / CrewAI / LiteLLM
* **Soporte de Modelos LLM:**
  * **API Cloud:** Google Gemini (`GEMINI_API_KEY`), OpenAI (`OPENAI_API_KEY`), Anthropic (`ANTHROPIC_API_KEY`)
  * **Ejecución Local:** Ollama / vLLM (`http://localhost:11434`)
  * **Cualquier otro proveedor** soportado por LiteLLM (Mistral, Cohere, Bedrock, Together, Groq, etc.)
* **Frontend:** React, Vite, Tailwind CSS, `@monaco-editor/react`

## 4. Reglas de Desarrollo y Convenciones
1. **Aislamiento de RAG:** No implementar bases de datos vectoriales en este repositorio. Toda consulta de contexto debe pasar por el módulo `context_mock`.
2. **Soporte Multi-Proveedor de LLMs:** Las funciones de inferencia deben aceptar un parámetro `model` con cualquier string compatible con LiteLLM (ej: `openai/gpt-4o`, `anthropic/claude-sonnet-4-20250514`, `ollama/llama3.2`, `bedrock/anthropic.claude-3-sonnet...`). Cada usuario configura únicamente la API key del proveedor que vaya a utilizar en su archivo `.env`. Los agentes pueden usar modelos distintos según su rol.
3. **Estructura de Respuesta del Pipeline:** Las salidas del sistema multiagente deben ajustarse al siguiente esquema JSON:
   * `classical_code`: Código ejecutable clásico.
   * `quantum_code`: Código ejecutable cuántico.
   * `architecture_notes`: Explicación técnica de la solución híbrida.
4. **Tipado y Validación:** Todo el código Python debe incluir `type hints` y validación de esquemas mediante Pydantic.

## 5. Estado del Repositorio (MVP)
El objetivo de la iteración actual es disponer de un pipeline de generación funcional de extremo a extremo, capaz de procesar prompts textuales, generar el código híbrido correspondiente y exponerlo a través de la interfaz web sin dependencia directa del servicio RAG final.
