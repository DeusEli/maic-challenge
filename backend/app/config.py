from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI REST API"
    PROJECT_VERSION: str = "1.0.0"
    OPENAI_API_KEY: str  # Sin valor por defecto
    ALLOWED_ORIGINS: str = "http://localhost:3000"  # URLs separadas por comas
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
