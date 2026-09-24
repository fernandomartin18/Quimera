from litellm import acompletion


async def generate(
    prompt: str,
    model: str = "gemini/gemini-3.6-flash",
    system_prompt: str | None = None,
    temperature: float | None = None,
    max_tokens: int = 4096,
    api_key: str | None = None,
    api_base: str | None = None,
) -> str:
    """Genera una respuesta usando cualquier modelo soportado por LiteLLM.

    El parámetro `model` acepta cualquier string compatible con LiteLLM:
      - gemini/gemini-3.6-flash
      - openai/gpt-4o
      - anthropic/claude-sonnet-4-20250514
      - ollama/llama3.2
      - etc.

    LiteLLM resuelve automáticamente el proveedor a partir del prefijo del modelo
    y busca la API key en variables de entorno (OPENAI_API_KEY, GEMINI_API_KEY, etc.).

    Args:
        prompt: Texto del usuario.
        model: String de modelo LiteLLM (prefijo/proveedor + modelo).
        system_prompt: Instrucción de sistema opcional.
        temperature: Control de aleatoriedad (0.0-1.0). Si es None se usa el
            valor por defecto del proveedor (recomendado para Gemini 3+).
        max_tokens: Longitud máxima de la respuesta.
        api_key: API key explícita (opcional, overrides la variable de entorno).
        api_base: URL base del API (para Ollama, vLLM, etc.).

    Returns:
        Texto generado por el modelo.
    """
    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, object] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }

    if temperature is not None:
        kwargs["temperature"] = temperature
    if api_key:
        kwargs["api_key"] = api_key
    if api_base:
        kwargs["api_base"] = api_base

    response = await acompletion(**kwargs)
    return response.choices[0].message.content or ""


async def health_check(
    model: str = "gemini/gemini-3.6-flash",
    api_key: str | None = None,
    api_base: str | None = None,
) -> dict[str, str | bool]:
    """Verifica que el modelo/proveedor esté accesible."""
    try:
        reply = await generate(
            prompt="Respond with only: OK",
            model=model,
            max_tokens=8,
            api_key=api_key,
            api_base=api_base,
        )
        return {"status": "ok", "model": model, "response": reply.strip()}
    except Exception as e:
        return {"status": "error", "model": model, "detail": str(e)}
