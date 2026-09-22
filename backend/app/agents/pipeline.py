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

from litellm import RateLimitError, ServiceUnavailableError
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
    """Error irrecuperable en la ejecución del pipeline multiagente."""


# Errores transitorios del proveedor (5xx, rate limits) que conviene reintentar.
_TRANSIENT_ERRORS = (RateLimitError, ServiceUnavailableError, TimeoutError)


async def call_llm_with_retry(
    operation: Callable[[], Awaitable[str]],
    *,
    retries: int = 5,
    base_delay: float = 3.0,
) -> str:
    """Ejecuta una llamada al LLM reintentando ante errores transitorios.

    Args:
        operation: Callable async que invoca al modelo.
        retries: Número máximo de reintentos adicionales.
        base_delay: Espera inicial en segundos (se duplica en cada reintento).

    Returns:
        Respuesta cruda del modelo.

    Raises:
        PipelineError: Si se agotan los reintentos.
        Exception: La última excepción no transitoria recibida.
    """
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return await operation()
        except _TRANSIENT_ERRORS as e:
            last_error = e
            if attempt < retries:
                delay = base_delay * (2**attempt)
                logger.warning(
                    "Error transitorio del proveedor (%s), reintento %d/%d en %.1fs",
                    type(e).__name__,
                    attempt + 1,
                    retries,
                    delay,
                )
                await asyncio.sleep(delay)
    raise PipelineError(f"Agotados los reintentos ante error transitorio: {last_error}")


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
        raise PipelineError(f"No se encontró un objeto JSON en la respuesta: {text[:200]!r}")
    try:
        data = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as e:
        raise PipelineError(f"JSON inválido en la respuesta del modelo: {e}") from e
    if not isinstance(data, dict):
        raise PipelineError("Se esperaba un objeto JSON, se obtuvo otro tipo de dato")
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
            raise PipelineError("El prompt no puede estar vacío")

        logger.info("Pipeline iniciado (model=%s)", self.model)
        plan = await self._analyze(prompt)
        logger.info(
            "Plan del Arquitecto: %d módulos clásicos, %d cuánticos",
            len(plan.classical_specs),
            len(plan.quantum_specs),
        )

        classical_modules: list[CodeModule] = []
        for spec in plan.classical_specs:
            logger.info("Generando módulo clásico: %s", spec.filename)
            classical_modules.append(
                await self._generate_module(
                    spec=spec,
                    plan=plan,
                    system_prompt=CLASSICAL_PROGRAMMER_SYSTEM_PROMPT,
                    model=self.classical_model,
                )
            )

        quantum_modules: list[CodeModule] = []
        for spec in plan.quantum_specs:
            logger.info("Generando módulo cuántico: %s", spec.filename)
            quantum_modules.append(
                await self._generate_module(
                    spec=spec,
                    plan=plan,
                    system_prompt=QUANTUM_PROGRAMMER_SYSTEM_PROMPT,
                    model=self.quantum_model,
                )
            )

        if not classical_modules and not quantum_modules:
            raise PipelineError("El Arquitecto no produjo ninguna especificación de módulo")

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
        user_prompt = f"Descripción del problema:\n\n{prompt}"
        if self.extra_instructions:
            user_prompt += f"\n\nInstrucciones adicionales:\n{self.extra_instructions}"

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
            raise PipelineError(f"Plan del Arquitecto inválido: {e}") from e
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
        user_prompt = (
            "Visión general de la arquitectura híbrida:\n"
            f"{plan.architecture_overview}\n\n"
            "Especificación del módulo a generar:\n"
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
