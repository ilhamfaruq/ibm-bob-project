from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/labinsight"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/labinsight"
    SECRET_KEY: str = "changeme-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20

    @property
    def use_groq(self) -> bool:
        return bool(self.GROQ_API_KEY)

    @property
    def ai_available(self) -> bool:
        if self.use_groq:
            return True
        return bool(self.OPENAI_API_KEY) and not self.OPENAI_API_KEY.startswith("sk-your")

    class Config:
        env_file = ".env"


settings = Settings()
