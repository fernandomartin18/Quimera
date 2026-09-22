from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Entrada para el pipeline de generación de código."""

    prompt: str = Field(min_length=1, description="Descripción del código a generar")
    model: str = Field(
        default="gemini/gemini-3.6-flash",
        description="Modelo LiteLLM (ej: 'openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514')",
    )
    api_key: str | None = Field(default=None, description="API key explícita (opcional)")
    api_base: str | None = Field(default=None, description="URL base API para proveedores locales")
    system_prompt: str | None = Field(default=None, description="Instrucciones adicionales")


class CodeModule(BaseModel):
    """Módulo/archivo generado (clásico o cuántico)."""

    filename: str = Field(description="Nombre del archivo (ej: main.py, ansatz_builder.py)")
    code: str = Field(description="Código fuente completo del módulo")
    description: str = Field(description="Propósito de este archivo/módulo")


class ModuleSpec(BaseModel):
    """Especificación de un módulo producida por el Agente Arquitecto."""

    filename: str = Field(description="Nombre del archivo a generar")
    description: str = Field(description="Propósito del módulo")
    requirements: str = Field(
        description="Requisitos técnicos detallados para el agente programador"
    )
    language: str | None = Field(default=None, description="Lenguaje clásico (python, cpp, ...)")
    framework: str | None = Field(
        default=None, description="Framework cuántico (qiskit, pennylane, ...)"
    )


class ArchitectPlan(BaseModel):
    """Descomposición del problema en especificaciones clásicas y cuánticas."""

    classical_specs: list[ModuleSpec] = Field(
        default_factory=list, description="Especificaciones de módulos clásicos"
    )
    quantum_specs: list[ModuleSpec] = Field(
        default_factory=list, description="Especificaciones de módulos cuánticos"
    )
    architecture_overview: str = Field(
        description="Visión general de la solución híbrida y la interacción entre módulos"
    )


class PipelineResult(BaseModel):
    """Salida obligatoria del pipeline multiagente."""

    classical_modules: list[CodeModule] = Field(
        description="Módulos/archivos de la parte clásica del sistema"
    )
    quantum_modules: list[CodeModule] = Field(
        description="Módulos/circuitos de la parte cuántica del sistema"
    )
    architecture_notes: str = Field(
        description="Explicación técnica de la solución híbrida y cómo interactúan los módulos"
    )


class GenerateResponse(PipelineResult):
    """Salida estructurada del endpoint /generate."""

    model_used: str = Field(description="Modelo LiteLLM utilizado por el pipeline")


class HealthResponse(BaseModel):
    status: str
    model: str
    detail: str
