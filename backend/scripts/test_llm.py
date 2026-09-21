"""Script de prueba para verificar conectividad con cualquier proveedor LiteLLM.

Uso:
    cd backend
    python -m scripts.test_llm
    python -m scripts.test_llm --model openai/gpt-4o
    python -m scripts.test_llm --model anthropic/claude-sonnet-4-20250514
    python -m scripts.test_llm --model ollama/llama3.2
    python -m scripts.test_llm --model gemini/gemini-2.0-flash openai/gpt-4o
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.llm.client import health_check, generate  # noqa: E402

DEFAULT_MODELS = [
    "gemini/gemini-2.0-flash",
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4-20250514",
    "ollama/llama3.2",
]


async def test_model(model: str) -> None:
    print(f"\n{'='*50}")
    print(f"  Probando: {model}")
    print(f"{'='*50}")

    print("\n[1/2] Health check...")
    result = await health_check(model=model)
    if result["status"] == "ok":
        print(f"  OK  -> {result['response']}")
    else:
        print(f"  FALLO -> {result.get('detail', 'Error desconocido')}")
        return

    print("\n[2/2] Generación de prueba...")
    prompt = "Genera una función en Python que calcule el factorial de un número."
    reply = await generate(prompt=prompt, model=model, max_tokens=256)
    print(f"  Prompt: {prompt}")
    print(f"  Respuesta:\n{reply}")


async def main(models: list[str] | None = None) -> None:
    targets = models or DEFAULT_MODELS
    for m in targets:
        await test_model(m)
    print(f"\n{'='*50}")
    print("  Pruebas completadas.")
    print(f"{'='*50}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test LLM connectivity (any LiteLLM provider)")
    parser.add_argument(
        "--model",
        nargs="*",
        help="Modelo(s) a probar en formato LiteLLM (ej: openai/gpt-4o)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.model))
