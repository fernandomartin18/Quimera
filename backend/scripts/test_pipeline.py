"""Script de prueba independiente del pipeline multiagente.

Ejecuta el flujo completo (Arquitecto -> Programador Clásico -> Programador Cuántico)
con un ejemplo de prueba y valida la salida con el esquema Pydantic obligatorio.

Uso:
    cd backend
    python -m scripts.test_pipeline
    python -m scripts.test_pipeline --model openai/gpt-4o
    python -m scripts.test_pipeline --model ollama/llama3.2
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.pipeline import MultiAgentPipeline  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.schemas.pipeline import PipelineResult  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

TEST_PROMPT = (
    "Diseña un sistema de optimización híbrido para logística de distribución. "
    "En la parte clásica, necesito un archivo de preprocesamiento e ingesta de datos "
    "(data_loader.py) y un orquestador principal que invoque la resolución y aplique "
    "post-procesamiento (main_orchestrator.py). En la parte cuántica, necesito un "
    "módulo independiente que defina la construcción del circuito ansatz con Qiskit "
    "(ansatz_builder.py) y otro módulo encargado de la ejecución del algoritmo VQE y "
    "comunicación con el simulador/QPU (vqe_solver.py)."
)


async def main(model: str | None, prompt: str) -> None:
    target = model or settings.default_model
    print(f"{'=' * 60}")
    print(f"  Pipeline multiagente — modelo: {target}")
    print(f"{'=' * 60}")
    print(f"\nPrompt de prueba:\n{prompt}\n")

    pipeline = MultiAgentPipeline(model=target)
    result = await pipeline.run(prompt)

    validated = PipelineResult.model_validate(result.model_dump())

    print("\n[OK] Salida validada con PipelineResult (Pydantic)\n")
    print(f"architecture_notes ({len(validated.architecture_notes)} chars):")
    print(f"  {validated.architecture_notes[:300]}...\n")

    print(f"Módulos clásicos ({len(validated.classical_modules)}):")
    for m in validated.classical_modules:
        print(f"  - {m.filename}: {m.description} ({len(m.code)} chars)")

    print(f"\nMódulos cuánticos ({len(validated.quantum_modules)}):")
    for m in validated.quantum_modules:
        print(f"  - {m.filename}: {m.description} ({len(m.code)} chars)")

    full_json = json.dumps(validated.model_dump(), indent=2, ensure_ascii=False)
    print(f"\nJSON completo de salida:\n{full_json}")
    print(f"\n{'=' * 60}\n  Prueba completada con éxito.\n{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prueba del pipeline multiagente (LiteLLM)")
    parser.add_argument(
        "--model",
        help="Modelo LiteLLM (ej: openai/gpt-4o). Por defecto: DEFAULT_MODEL de .env",
    )
    parser.add_argument(
        "--prompt",
        default=TEST_PROMPT,
        help="Prompt de prueba (por defecto: ejemplo de logística híbrida)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.model, args.prompt))
