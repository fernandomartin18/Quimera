from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Entrada para el pipeline de generación de código."""

    prompt: str = Field(..., min_length=1, description="Descripción del código a generar")
    provider: str = Field(default="gemini", pattern="^(gemini|local)$")
    system_prompt: str | None = Field(default=None, description="Instrucciones adicionales")


class GenerateResponse(BaseModel):
    """Salida estructurada del pipeline híbrido."""

    classical_code: str = Field(description="Código clásico generado (Python/C++)")
    quantum_code: str = Field(description="Código cuántico generado (Qiskit/PennyLane)")
    architecture_notes: str = Field(description="Explicación técnica de la solución híbrida")
    provider_used: str


class HealthResponse(BaseModel):
    status: str
    provider: str
    detail: str
