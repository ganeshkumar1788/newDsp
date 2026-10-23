import os
from typing import List

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    try:
        from pydantic import BaseSettings
        SettingsConfigDict = dict
    except ImportError:
        class BaseSettings:  # type: ignore
            def __init__(self, **values):
                for key, val in self.__class__.__dict__.items():
                    if not key.startswith("_") and not callable(val) and not isinstance(val, property):
                        env_val = os.getenv(key)
                        if env_val is not None:
                            try:
                                val_type = type(val)
                                setattr(self, key, val_type(env_val))
                            except Exception:
                                setattr(self, key, env_val)
                        else:
                            setattr(self, key, val)
                for key, val in values.items():
                    setattr(self, key, val)

        def SettingsConfigDict(**kwargs):  # type: ignore
            return kwargs


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriMap DSP"
    API_V1_STR: str = "/api/v1"
    
    # Database configurations (loaded from environment)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "agrimap_dsp"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "agrimap-dsp-dev-secret-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Optional OpenAI integration
    OPENAI_API_KEY: str = ""
    
    # File Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Computed property for database URL
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
