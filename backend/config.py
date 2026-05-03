from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: Optional[str] = None
    OPENAI_INTAKE_MODEL: Optional[str] = None
    OPENAI_CONTENT_MODEL: Optional[str] = None
    OPENAI_REVIEW_MODEL: Optional[str] = None
    SERPER_API_KEY: str = ""
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    DEV_BYPASS_AUTH: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
