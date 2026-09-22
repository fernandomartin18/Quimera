import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.pipeline import MultiAgentPipeline
from app.core.config import settings
from app.llm.client import health_check
from app.schemas.pipeline import GenerateRequest, GenerateResponse, HealthResponse

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Quimera Backend",
    description="Generación automatizada de código híbrido clásico-cuántico",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def root_health() -> dict[str, str]:
    return {"status": "ok", "service": "quimera-backend"}


@app.get("/health/llm/{model:path}", response_model=HealthResponse)
async def llm_health(model: str, api_key: str | None = None) -> HealthResponse:
    result = await health_check(model=model, api_key=api_key)
    return HealthResponse(**result)  # type: ignore[arg-type]


@app.post("/generate", response_model=GenerateResponse)
async def generate_code(req: GenerateRequest) -> GenerateResponse:
    """Endpoint principal: ejecuta el pipeline multiagente y devuelve los módulos híbridos."""
    pipeline = MultiAgentPipeline(
        model=req.model,
        api_key=req.api_key,
        api_base=req.api_base,
        extra_instructions=req.system_prompt,
    )
    result = await pipeline.run(req.prompt)
    return GenerateResponse(**result.model_dump(), model_used=req.model)


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    run()
