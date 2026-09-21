from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración centralizada del backend cargada desde variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gemini
    gemini_api_key: str = ""

    # Ollama / Local
    ollama_base_url: str = "http://localhost:11434"
    local_model: str = "llama3.2"

    # App
    log_level: str = "INFO"


settings = Settings()
