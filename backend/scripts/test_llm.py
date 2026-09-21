"""Script de prueba para verificar la conectividad con Gemini y Ollama.

Uso:
    cd backend
    python -m scripts.test_llm
    python -m scripts.test_llm --provider gemini
    python -m scripts.test_llm --provider local
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.llm.client import health_check, generate, Provider  # noqa: E402


async def test_provider(provider: Provider) -> None:
    print(f"\n{'='*50}")
    print(f"  Probando proveedor: {provider.upper()}")
    print(f"{'='*50}")

    print("\n[1/2] Health check...")
    result = await health_check(provider)
    if result["status"] == "ok":
        print(f"  OK  -> {result['response']}")
    else:
        print(f"  FALLO -> {result.get('detail', 'Error desconocido')}")
        return

    print("\n[2/2] Generación de prueba...")
    prompt = "Genera una función en Python que calcule el factorial de un número."
    reply = await generate(prompt=prompt, provider=provider, max_tokens=256)
    print(f"  Prompt: {prompt}")
    print(f"  Respuesta:\n{reply}")


async def main(providers: list[Provider] | None = None) -> None:
    targets = providers or ["gemini", "local"]
    for p in targets:
        await test_provider(p)
    print(f"\n{'='*50}")
    print("  Pruebas completadas.")
    print(f"{'='*50}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test LLM connectivity")
    parser.add_argument(
        "--provider",
        choices=["gemini", "local"],
        help="Proveedor a probar (por defecto: ambos)",
    )
    args = parser.parse_args()
    targets = [args.provider] if args.provider else None
    asyncio.run(main(targets))
