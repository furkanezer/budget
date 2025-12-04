from pydantic import BaseSettings, EmailStr


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://budget:budget@db:5432/budget"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    admin_email: EmailStr | None = None
    admin_password: str | None = None

    class Config:
        env_file = ".env"


def get_settings() -> Settings:
    return Settings()
