"""Pipeline multiagente: Arquitecto -> Programador Clásico -> Programador Cuántico.

Flujo:
1. Agente Arquitecto/Analista: descompone el prompt del usuario en
   especificaciones de módulos clásicos y cuánticos.
2. Agente Programador Clásico: genera el código de cada módulo clásico.
3. Agente Programador Cuántico: genera el código de cada módulo cuántico.

El resultado se valida con los esquemas Pydantic de `app.schemas.pipeline`
(`PipelineResult`), listo para una futura empaquetación del código.
"""

import asyncio
import json
import logging
import re
from collections.abc import Awaitable, Callable
from typing import Any

from litellm import (
    APIError,
    AuthenticationError,
    BadRequestError,
    ContextWindowExceededError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
)
from pydantic import ValidationError

from app.agents.prompts import (
    ARCHITECT_SYSTEM_PROMPT,
    CLASSICAL_PROGRAMMER_SYSTEM_PROMPT,
    QUANTUM_PROGRAMMER_SYSTEM_PROMPT,
)
from app.core.config import settings
from app.llm.client import generate
from app.schemas.pipeline import ArchitectPlan, CodeModule, ModuleSpec, PipelineResult

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"```(?:json|python|cpp)?\s*(.*?)```", re.DOTALL)


class PipelineError(Exception):
    """Error irrecuperable en la ejecución del pipeline multiagente.

    Attributes:
        message: Descripción técnica del error (para logs).
        code: Código estable que el frontend traduce a un mensaje amigable.
    """

    def __init__(self, message: str, *, code: str = "pipeline") -> None:
        super().__init__(message)
        self.code = code


_RETRY_DELAY_RE = re.compile(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"')


def _suggested_retry_delay(error: Exception) -> float | None:
    """Extrae el `retryDelay` (segundos) que Google/LiteLLM sugiere en el error 429."""
    match = _RETRY_DELAY_RE.search(str(error))
    return float(match.group(1)) if match else None


def _is_daily_quota_exceeded(error: Exception) -> bool:
    """Detecta si el 429 corresponde a la cuota diaria free-tier del proveedor."""
    msg = str(error)
    return "Quota exceeded" in msg or "GenerateRequestsPerDay" in msg


_MISSING_CREDENTIALS_RE = re.compile(
    r"missing credentials|api[_ ]key.{0,40}(is not set|must be set|not found|invalid)"
    r"|no auth credentials|unauthorized|invalid api key",
    re.IGNORECASE,
)


def as_pipeline_error(error: Exception) -> PipelineError:
    """Convierte un error de proveedor/LiteLLM en un `PipelineError` con un
    `code` que el frontend traduce a un mensaje amigable."""
    message = str(error)
    if isinstance(error, AuthenticationError) or _MISSING_CREDENTIALS_RE.search(message):
        return PipelineError(
            f"Provider authentication failed (missing or invalid API key): {error}",
            code="auth_error",
        )
    if isinstance(error, NotFoundError):
        return PipelineError(f"Model not found on the provider: {error}", code="model_not_found")
    if isinstance(error, ContextWindowExceededError):
        return PipelineError(f"Context window exceeded: {error}", code="context_window")
    if isinstance(error, BadRequestError):
        return PipelineError(f"Provider rejected the request: {error}", code="bad_request")
    if isinstance(error, APIError):
        return PipelineError(f"Provider error: {error}", code="provider_error")
    return PipelineError(f"Unexpected error calling the provider: {error}", code="unexpected")


async def call_llm_with_retry(
    operation: Callable[[], Awaitable[str]],
    *,
    transient_retries: int = 5,
    rate_limit_retries: int = 2,
    base_delay: float = 3.0,
    max_delay: float = 60.0,
) -> str:
    """Ejecuta una llamada al LLM reintentando ante errores del proveedor.

    Dos estrategias según el tipo de error:
      - 503 "high demand" / timeouts: backoff exponencial (hasta `transient_retries`).
      - 429 rate limit / cuota: se respeta el `retryDelay` que sugiere el proveedor
        (normalmente ~30-50s) y se limita a `rate_limit_retries` intentos, porque
        reintentar más solo quema tiempo cuando la cuota está agotada.

    Args:
        operation: Callable async que invoca al modelo.
        transient_retries: Reintentos ante 503/timeout.
        rate_limit_retries: Reintentos ante 429 (cuota/límite de tasa).
        base_delay: Espera inicial en segundos (se duplica en cada reintento).
        max_delay: Techo superior para la espera entre reintentos.

    Returns:
        Respuesta cruda del modelo.

    Raises:
        PipelineError: Si se agotan los reintentos, con un mensaje claro si la
            causa es la cuota diaria del proveedor.
    """
    transient_attempt = 0
    rate_attempt = 0
    last_error: Exception | None = None

    while True:
        try:
            return await operation()
        except RateLimitError as e:
            last_error = e
            rate_attempt += 1
            if rate_attempt > rate_limit_retries:
                break
            suggested = _suggested_retry_delay(e) or 0.0
            delay = min(
                max(base_delay * (2 ** (rate_attempt - 1)), suggested),
                max(max_delay, suggested),
            )
            logger.warning(
                "Rate limit del proveedor (429), reintento %d/%d esperando %.0fs "
                "(delay sugerido por el proveedor: %ss)",
                rate_attempt,
                rate_limit_retries,
                delay,
                suggested or "n/a",
            )
            await asyncio.sleep(delay)
        except (ServiceUnavailableError, TimeoutError) as e:
            last_error = e
            transient_attempt += 1
            if transient_attempt > transient_retries:
                break
            suggested = _suggested_retry_delay(e) or 0.0
            delay = min(
                max(base_delay * (2 ** (transient_attempt - 1)), suggested),
                max(max_delay, suggested),
            )
            logger.warning(
                "Error transitorio del proveedor (%s), reintento %d/%d en %.0fs",
                type(e).__name__,
                transient_attempt,
                transient_retries,
                delay,
            )
            await asyncio.sleep(delay)
        except Exception as e:
            # Errores no retransmisibles (auth, modelo inexistente, petición
            # inválida, error del proveedor...): se mapean a un código amigable
            # para que el frontend muestre un mensaje corto en su toast.
            raise as_pipeline_error(e) from e

    if isinstance(last_error, RateLimitError) and _is_daily_quota_exceeded(last_error):
        raise PipelineError(
            "Provider daily free-tier quota exhausted "
            "(Gemini free-tier: 20 requests/day per model; every health check "
            "and every pipeline agent consumes 1). It renews at midnight "
            "(Pacific time). Alternatives: enable billing in Google AI Studio "
            "or use another key in .env (OPENAI_API_KEY / ANTHROPIC_API_KEY) with "
            f"--model openai/... / --model anthropic/... Detail: {last_error}",
            code="quota_exhausted",
        ) from last_error
    raise PipelineError(
        f"Retries exhausted after a transient provider error: {last_error}",
        code="retries_exhausted",
    )


def extract_json(text: str) -> dict[str, Any]:
    """Extrae el primer objeto JSON de una respuesta de LLM.

    Elimina fences de markdown (```json ... ```) y busca el objeto JSON
    envolvente si el modelo añadió texto adicional.

    Args:
        text: Respuesta cruda del modelo.

    Returns:
        Dict parseado.

    Raises:
        PipelineError: Si no se encuentra JSON válido.
    """
    cleaned = text.strip()
    fence = _FENCE_RE.search(cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise PipelineError(
            f"No JSON object found in the model response: {text[:200]!r}",
            code="invalid_json",
        )
    try:
        data = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as e:
        raise PipelineError(f"Invalid JSON in the model response: {e}", code="invalid_json") from e
    if not isinstance(data, dict):
        raise PipelineError(
            "Expected a JSON object, got a different data type",
            code="invalid_json",
        )
    return data


def strip_code_fences(text: str) -> str:
    """Elimina fences de markdown de un bloque de código, si existen."""
    fence = _FENCE_RE.search(text.strip())
    return fence.group(1).strip() if fence else text.strip()


class MultiAgentPipeline:
    """Orquesta los 3 agentes del sistema multiagente.

    El parámetro `model` acepta cualquier string compatible con LiteLLM
    (ej: 'gemini/gemini-3.6-flash', 'openai/gpt-4o', 'ollama/llama3.2').
    Cada agente puede usar un modelo distinto mediante los overrides
    `architect_model`, `classical_model` y `quantum_model`.
    """

    def __init__(
        self,
        model: str | None = None,
        *,
        architect_model: str | None = None,
        classical_model: str | None = None,
        quantum_model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 8192,
        api_key: str | None = None,
        api_base: str | None = None,
        extra_instructions: str | None = None,
    ) -> None:
        self.model = model or settings.default_model
        self.architect_model = architect_model or self.model
        self.classical_model = classical_model or self.model
        self.quantum_model = quantum_model or self.model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = api_key
        self.api_base = api_base
        self.extra_instructions = extra_instructions

    async def run(self, prompt: str) -> PipelineResult:
        """Ejecuta el flujo completo y devuelve los módulos híbridos.

        Args:
            prompt: Descripción textual del problema en lenguaje natural.

        Returns:
            `PipelineResult` con módulos clásicos, cuánticos y notas de arquitectura.

        Raises:
            PipelineError: Si un agente falla o el plan no contiene módulos.
        """
        if not prompt.strip():
            raise PipelineError("The prompt cannot be empty", code="empty_prompt")

        logger.info("Pipeline iniciado (model=%s)", self.model)
        plan = await self._analyze(prompt)
        logger.info(
            "Plan del Arquitecto: %d módulos clásicos, %d cuánticos",
            len(plan.classical_specs),
            len(plan.quantum_specs),
        )

        # Todos los specs son independientes tras el plan: se ejecutan en paralelo
        # y gather preserva el orden (clásicos primero, luego cuánticos).
        classical_tasks = [
            self._generate_module(
                spec=spec,
                plan=plan,
                system_prompt=CLASSICAL_PROGRAMMER_SYSTEM_PROMPT,
                model=self.classical_model,
            )
            for spec in plan.classical_specs
        ]
        quantum_tasks = [
            self._generate_module(
                spec=spec,
                plan=plan,
                system_prompt=QUANTUM_PROGRAMMER_SYSTEM_PROMPT,
                model=self.quantum_model,
            )
            for spec in plan.quantum_specs
        ]

        logger.info(
            "Lanzando %d subagentes programadores en paralelo",
            len(classical_tasks) + len(quantum_tasks),
        )
        results = await asyncio.gather(*classical_tasks, *quantum_tasks)
        classical_modules = list(results[: len(classical_tasks)])
        quantum_modules = list(results[len(classical_tasks) :])

        if not classical_modules and not quantum_modules:
            raise PipelineError(
                "The Architect did not produce any module specification",
                code="no_specs",
            )

        result = PipelineResult(
            classical_modules=classical_modules,
            quantum_modules=quantum_modules,
            architecture_notes=plan.architecture_overview,
        )
        logger.info(
            "Pipeline completado: %d clásicos, %d cuánticos",
            len(result.classical_modules),
            len(result.quantum_modules),
        )
        return result

    async def _analyze(self, prompt: str) -> ArchitectPlan:
        """Ejecuta el Agente Arquitecto/Analista y valida su plan."""
        user_prompt = f"Problem description:\n\n{prompt}"
        if self.extra_instructions:
            user_prompt += f"\n\nAdditional instructions:\n{self.extra_instructions}"

        raw = await call_llm_with_retry(
            lambda: generate(
                prompt=user_prompt,
                model=self.architect_model,
                system_prompt=ARCHITECT_SYSTEM_PROMPT,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                api_key=self.api_key,
                api_base=self.api_base,
            )
        )
        try:
            plan = ArchitectPlan.model_validate(extract_json(raw))
        except ValidationError as e:
            raise PipelineError(f"Invalid Architect plan: {e}", code="invalid_plan") from e
        return plan

    async def _generate_module(
        self,
        spec: ModuleSpec,
        plan: ArchitectPlan,
        system_prompt: str,
        model: str,
    ) -> CodeModule:
        """Ejecuta un agente programador para UN módulo y valida su salida.

        Si la respuesta no es JSON parseable, se usa el código crudo como
        contenido del módulo con filename/description de la especificación
        (fallback para que un solo módulo malformado no tumbe todo el pipeline).
        """
        logger.info("Generando módulo: %s", spec.filename)
        user_prompt = (
            "Overall hybrid architecture:\n"
            f"{plan.architecture_overview}\n\n"
            "Module specification to generate:\n"
            f"{spec.model_dump_json(indent=2)}"
        )
        raw = await call_llm_with_retry(
            lambda: generate(
                prompt=user_prompt,
                model=model,
                system_prompt=system_prompt,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                api_key=self.api_key,
                api_base=self.api_base,
            )
        )
        try:
            data = extract_json(raw)
            return CodeModule(
                filename=data.get("filename") or spec.filename,
                code=data["code"],
                description=data.get("description") or spec.description,
            )
        except (PipelineError, KeyError, ValidationError, TypeError) as e:
            logger.warning(
                "Respuesta no JSON del programador para %s, usando fallback: %s",
                spec.filename,
                e,
            )
            return CodeModule(
                filename=spec.filename,
                code=strip_code_fences(raw),
                description=spec.description,
            )
