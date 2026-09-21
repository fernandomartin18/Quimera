from litellm import acompletion
from typing import Literal

from app.core.config import settings

Provider = Literal["gemini", "local"]

PROVIDER_CONFIG: dict[Provider, dict[str, str]] = {
    "gemini": {
        "model": "gemini/gemini-3.6-flash",
        "api_key": settings.gemini_api_key,
    },
    "local": {
        "model": f"ollama/{settings.local_model}",
        "api_base": settings.ollama_base_url,
    },
}


async def generate(
    prompt: str,
    provider: Provider = "gemini",
    system_prompt: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    """Genera una respuesta usando el proveedor LLM indicado.

    Args:
        prompt: Texto del usuario.
        provider: 'gemini' o 'local'.
        system_prompt: Instrucción de sistema opcional.
        temperature: Control de aleatoriedad (0.0-1.0).
        max_tokens: Longitud máxima de la respuesta.

    Returns:
        Texto generado por el modelo.
    """
    config = PROVIDER_CONFIG[provider]

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, object] = {
        "model": config["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if provider == "gemini":
        kwargs["api_key"] = config["api_key"]
    elif provider == "local":
        kwargs["api_base"] = config["api_base"]

    response = await acompletion(**kwargs)
    return response.choices[0].message.content or ""


async def health_check(provider: Provider) -> dict[str, str | bool]:
    """Verifica que el proveedor esté accesible.

    Returns:
        Dict con status ok/error y un mensaje descriptivo.
    """
    try:
        reply = await generate(
            prompt="Responde unicamente: OK",
            provider=provider,
            max_tokens=8,
        )
        return {"status": "ok", "provider": provider, "response": reply.strip()}
    except Exception as e:
        return {"status": "error", "provider": provider, "detail": str(e)}
