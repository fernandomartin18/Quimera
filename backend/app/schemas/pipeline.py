from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Entrada para el pipeline de generación de código."""

    prompt: str = Field(..., min_length=1, description="Descripción del código a generar")
    model: str = Field(
        default="gemini/gemini-2.0-flash",
        description="Modelo LiteLLM (ej: 'openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'ollama/llama3.2')",
    )
    api_key: str | None = Field(default=None, description="API key explícita (opcional)")
    api_base: str | None = Field(default=None, description="URL base API para proveedores locales")
    system_prompt: str | None = Field(default=None, description="Instrucciones adicionales")


class GenerateResponse(BaseModel):
    """Salida estructurada del pipeline híbrido."""

    classical_code: str = Field(description="Código clásico generado (Python/C++)")
    quantum_code: str = Field(description="Código cuántico generado (Qiskit/PennyLane)")
    architecture_notes: str = Field(description="Explicación técnica de la solución híbrida")
    model_used: str


class HealthResponse(BaseModel):
    status: str
    model: str
    detail: str
