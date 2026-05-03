from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    DEV_BYPASS_AUTH: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
