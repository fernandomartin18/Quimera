from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración centralizada del backend.

    LiteLLM detecta automáticamente las API keys desde variables de entorno:
      - OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, etc.
    Solo necesitas definir en .env la key del proveedor que vayas a usar.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Default model para el pipeline (cualquier string LiteLLM)
    default_model: str = "gemini/gemini-3.6-flash"

    # Ollama / Local
    ollama_base_url: str = "http://localhost:11434"

    # App
    log_level: str = "INFO"


settings = Settings()
